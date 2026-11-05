import { EventEmitter } from 'node:events'
import { isDeepStrictEqual } from 'node:util'
import WebSocket from 'ws'
import type { JsonValue } from '@companion-module/base'
import {
	buildRequest,
	parseDetails,
	parseMessage,
	type ApiUpdate,
	type GuestCommands,
	type GuestTarget,
	type LocalCommands,
} from './api.js'
import type { StreamChoice, StreamState } from './types.js'

export type ClientStatus = 'connecting' | 'ok' | 'disconnected' | 'connection_failure'
export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error'

export type ClientEvents = {
	status: [status: ClientStatus, message: string | null]
	log: [level: ClientLogLevel, message: string]
	/** The set of streams changed, so anything defined per stream needs rebuilding */
	streamsChanged: []
	/** The state of one or more streams changed */
	stateChanged: []
}

/** Local commands whose callback result is the new muted state of the local stream */
const LocalStateResults = {
	mic: 'muted',
	camera: 'videoMuted',
	speaker: 'speakerMuted',
} as const satisfies Partial<Record<keyof LocalCommands, keyof StreamState>>

type PendingRequest = {
	action: string
	target: GuestTarget | null
	value: JsonValue | undefined
	timer: NodeJS.Timeout
}

/** How long to wait for a callback; VDO.Ninja normally replies within a second */
const PendingTimeout = 10_000

export type ClientOptions = {
	url: string
	apiID: string
	/** Delay before the first reconnect attempt, doubling on each failure up to maxReconnectDelay */
	minReconnectDelay: number
	maxReconnectDelay: number
	/** How often to ping the server; a connection that misses a pong is dropped and reconnected */
	heartbeatInterval: number
	/** How long to gather getDetails requests into one */
	detailsDelay: number
}

/** Delay before reconnect attempt `attempt` (0-based): doubling from min, capped at max */
export function reconnectDelay(attempt: number, min: number, max: number): number {
	return Math.min(max, min * 2 ** attempt)
}

/** A null-prototype record, so stream IDs can never reach object internals */
function emptyStates(): Record<string, StreamState> {
	return Object.create(null) as Record<string, StreamState>
}

/** Connection to the VDO.Ninja API relay, tracking the state of every stream it reports */
export class VdoNinjaClient extends EventEmitter<ClientEvents> {
	states: Record<string, StreamState> = emptyStates()
	streams: StreamChoice[] = []

	readonly #options: ClientOptions
	#ws: WebSocket | undefined
	#reconnectTimer: NodeJS.Timeout | undefined
	#reconnectAttempts = 0
	#heartbeatTimer: NodeJS.Timeout | undefined
	#everOpened = false
	#failed = false
	#destroyed = false
	#nextCid = 1
	readonly #pending = new Map<number, PendingRequest>()
	/** A hung up page stays attached and goes on listing itself in getDetails, until it reports itself as back */
	readonly #hungUp = new Set<string>()
	#detailsTimer: NodeJS.Timeout | undefined
	#detailsInFlight: number | undefined
	#detailsQueued = false

	constructor(options: ClientOptions) {
		super()
		this.#options = options
	}

	connect(): void {
		clearTimeout(this.#reconnectTimer)
		if (this.#destroyed) return

		this.#closeSocket()

		let ws: WebSocket
		try {
			ws = new WebSocket(this.#options.url)
		} catch (error) {
			this.emit('log', 'error', `Unable to connect to ${this.#options.url}: ${error}`)
			this.emit('status', 'connection_failure', 'Invalid server address')
			return
		}
		this.#ws = ws
		let opened = false

		ws.on('open', () => {
			opened = true
			this.#reconnectAttempts = 0
			// The hosted relay drops idle sockets, so routine reconnects are not logged
			if (!this.#everOpened || this.#failed) this.emit('log', 'info', `Connection opened to VDO.Ninja`)
			this.#everOpened = true
			this.#failed = false
			this.emit('status', 'ok', null)
			this.#startHeartbeat(ws)

			ws.send(JSON.stringify({ join: this.#options.apiID }))
			this.#sendDetailsRequest()
		})

		ws.on('close', (code) => {
			// A socket replaced by connect() or closed by destroy() must not schedule a reconnect
			if (ws !== this.#ws || this.#destroyed) return
			this.#stopHeartbeat()
			this.#detailsInFlight = undefined
			if (code !== 1000 && code !== 1006) {
				this.emit('log', 'debug', `Websocket closed:  ${code}`)
			}
			if (opened) this.emit('status', 'disconnected', 'Reconnecting')
			this.#scheduleReconnect()
		})

		ws.on('message', (data: WebSocket.RawData) => {
			if (ws !== this.#ws) return
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			this.handleMessage(data.toString())
		})

		ws.on('error', (error: NodeJS.ErrnoException) => {
			// Closing a socket that is still connecting raises an error, after connect() or destroy() replaced it
			if (ws !== this.#ws) return
			// Only report the first failure of a run, not every reconnect attempt
			if (!this.#failed) {
				this.#failed = true
				// A connection that worked before stays disconnected while it retries
				if (!this.#everOpened) this.emit('status', 'connection_failure', null)
				if (error?.code == 'ENOTFOUND') {
					this.emit('log', 'error', `Unable to reach ${this.#options.url}`)
				} else {
					this.emit('log', 'error', `WebSocket ${error}`)
				}
			}
			ws.close()
		})
	}

	destroy(): void {
		this.#destroyed = true
		clearTimeout(this.#reconnectTimer)
		clearTimeout(this.#detailsTimer)
		this.#closeSocket()
		for (const { timer } of this.#pending.values()) clearTimeout(timer)
		this.#pending.clear()
		this.states = emptyStates()
		this.streams = []
	}

	sendLocal<K extends keyof LocalCommands>(action: K, args: LocalCommands[K]): void {
		if (!this.#checkConnected(action)) return
		this.#send(action, null, args)
	}

	sendGuest<K extends keyof GuestCommands>(action: K, target: GuestTarget, args: GuestCommands[K]): void {
		// VDO.Ninja treats an empty or "null" target as no target, which would run the command on this page
		const text = String(target).trim()
		if (text === '' || text.toLowerCase() === 'null' || (typeof target === 'number' && !Number.isFinite(target))) {
			this.emit('log', 'warn', `Not sending "${action}": no guest given`)
			return
		}
		if (!this.#checkConnected(action)) return
		this.#send(action, typeof target === 'number' ? target : text, args)
	}

	/** Requests awaiting a callback, for tests */
	get pendingRequests(): number {
		return this.#pending.size
	}

	#checkConnected(action: string): boolean {
		if (this.#ws?.readyState === WebSocket.OPEN) return true
		this.emit('log', 'warn', `Not connected to VDO.Ninja, "${action}" was not sent`)
		return false
	}

	#send(action: string, target: GuestTarget | null, args: { value?: JsonValue; value2?: JsonValue }): number | null {
		if (this.#ws?.readyState !== WebSocket.OPEN) return null

		const cid = this.#nextCid++
		const timer = setTimeout(() => this.#settle(cid), PendingTimeout)
		this.#pending.set(cid, { action, target, value: args.value, timer })
		this.#ws.send(JSON.stringify(buildRequest(action, target, args, cid)))
		return cid
	}

	/** Forgets a request once it is answered or times out, returning it if it was ours */
	#settle(cid: number | undefined): PendingRequest | undefined {
		if (cid === undefined) return undefined
		const request = this.#pending.get(cid)
		if (!request) return undefined

		clearTimeout(request.timer)
		this.#pending.delete(cid)
		if (cid === this.#detailsInFlight) {
			this.#detailsInFlight = undefined
			if (this.#detailsQueued) {
				this.#detailsQueued = false
				this.requestDetails()
			}
		}
		return request
	}

	/** Asks for fresh details soon, gathering requests made close together into one */
	requestDetails(): void {
		if (this.#detailsTimer) return
		if (this.#detailsInFlight !== undefined) {
			this.#detailsQueued = true
			return
		}
		this.#detailsTimer = setTimeout(() => this.#sendDetailsRequest(), this.#options.detailsDelay)
	}

	#sendDetailsRequest(): void {
		clearTimeout(this.#detailsTimer)
		this.#detailsTimer = undefined
		this.#detailsInFlight = this.#send('getDetails', null, {}) ?? undefined
	}

	#scheduleReconnect(): void {
		const delay = reconnectDelay(
			this.#reconnectAttempts++,
			this.#options.minReconnectDelay,
			this.#options.maxReconnectDelay,
		)
		this.#reconnectTimer = setTimeout(() => this.connect(), delay)
	}

	#startHeartbeat(ws: WebSocket): void {
		this.#stopHeartbeat()
		let alive = true
		ws.on('pong', () => (alive = true))
		this.#heartbeatTimer = setInterval(() => {
			if (!alive) {
				this.emit('log', 'warn', 'VDO.Ninja stopped responding, reconnecting')
				ws.terminate()
				return
			}
			alive = false
			ws.ping()
		}, this.#options.heartbeatInterval)
	}

	#stopHeartbeat(): void {
		clearInterval(this.#heartbeatTimer)
		this.#heartbeatTimer = undefined
	}

	#closeSocket(): void {
		const ws = this.#ws
		this.#ws = undefined
		this.#stopHeartbeat()
		this.#detailsInFlight = undefined
		if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1000)
	}

	#applyResult(request: PendingRequest, result: JsonValue): void {
		// A toggle is followed by an update with the new state, so only explicit values are applied here
		if (request.value === 'toggle' || typeof result !== 'boolean') return
		if (!(request.action in LocalStateResults)) return

		const field = LocalStateResults[request.action as keyof typeof LocalStateResults]
		let changed = false
		for (const state of Object.values(this.states)) {
			if (state.localStream && state[field] !== result) {
				state[field] = result
				changed = true
			}
		}
		if (changed) this.emit('stateChanged')
	}

	handleMessage(text: string): void {
		const message = parseMessage(text)
		switch (message.type) {
			case 'callback': {
				const { action, cid, result } = message.callback
				const request = this.#settle(cid)
				if (action == 'getDetails') {
					// Another controller's getDetails reply is just as current, so it is applied too
					this.#applyDetails(result, request !== undefined)
				} else if (request?.target === null) {
					this.#applyResult(request, result)
				} else if (request) {
					// VDO.Ninja doesn't push an update after every guest command (setslot, for one)
					this.requestDetails()
				}
				break
			}
			case 'update':
				this.processUpdate(message.update)
				break
			case 'ignored':
				this.emit('log', 'debug', `Ignored VDO.Ninja message: ${message.reason}`)
				break
		}
	}

	/**
	 * Stores the details of each stream given, returning false when there were none. `complete` says
	 * the result lists every stream, so any others have gone; a details update may list only some.
	 */
	#applyDetails(result: JsonValue, complete: boolean): boolean {
		const entries = parseDetails(result).filter((details) => !this.#hungUp.has(details.streamID))

		let streamsChanged = false
		let stateChanged = false
		// A failed getDetails gives a string or null, which says nothing about which streams exist
		if (complete && typeof result === 'object' && result !== null) {
			const reported = new Set(entries.map((details) => details.streamID))
			for (const streamID of Object.keys(this.states)) {
				if (reported.has(streamID)) continue
				this.#forgetStream(streamID)
				streamsChanged = true
				stateChanged = true
			}
		}
		for (const details of entries) {
			const changes = this.#storeDetails(details)
			streamsChanged ||= changes.streams
			stateChanged ||= changes.state
		}
		if (streamsChanged) this.emit('streamsChanged')
		if (stateChanged) this.emit('stateChanged')
		return entries.length > 0
	}

	/**
	 * Stores a stream's details. `streams` is true when the stream is new or its label changed, which
	 * is what per-stream definitions depend on; `state` is true when anything about it changed.
	 */
	#storeDetails(data: StreamState): { streams: boolean; state: boolean } {
		const state = !isDeepStrictEqual(this.states[data.streamID], data)
		this.states[data.streamID] = data

		let label = data.streamID
		const name = data.label ? `(${data.label})` : ''

		if (data.director) {
			label = 'Director'
		} else if (data.position) {
			label = `Guest ${data.position} ${name}`
		} else if (data.label) {
			label = data.label
		}

		if (data.localStream) {
			label = `${label} (Local)`
		}

		const index = this.streams.findIndex((o) => o.id === data.streamID)
		if (index === -1) {
			this.streams.push({ id: data.streamID, label })
			return { streams: true, state }
		}
		if (this.streams[index].label === label) return { streams: false, state }
		this.streams.splice(index, 1, { id: data.streamID, label })
		return { streams: true, state }
	}

	processUpdate(data: ApiUpdate): void {
		if (data.action === 'hangup' && data.streamID) this.#hungUp.add(data.streamID)

		if (data.action === 'details') {
			// Only a page that is live pushes its own details, as it does after reloading
			for (const { streamID } of parseDetails(data.value)) this.#hungUp.delete(streamID)
			const known = this.streams.length
			const found = this.#applyDetails(data.value, false)
			// A page that has just attached or reloaded reports only itself, and may never announce its guests
			if (!found || this.streams.length > known) this.requestDetails()
			return
		}

		const state = data.streamID ? this.states[data.streamID] : undefined
		if (state) {
			const before = structuredClone(state)
			switch (data.action) {
				case 'hangup':
					this.#removeStream(state.streamID)
					return
				case 'endViewConnection':
					this.#removeStream(data.value)
					// The remaining guests move up a position, which isn't always announced
					this.requestDetails()
					return
				case 'director':
					if (state.director !== data.value) {
						const changes = this.#storeDetails({ ...state, director: data.value })
						if (changes.streams) this.emit('streamsChanged')
						this.emit('stateChanged')
					}
					return
				case 'directorMuted':
					state.others = { ...state.others, 'mute-guest': data.value ? '1' : '0' }
					break
				case 'directorVideoHide':
					state.others = { ...state.others, 'hide-guest': data.value ? '1' : '0' }
					break
				case 'muted':
				case 'remoteMuted':
					state.muted = data.value
					break
				case 'videoMuted':
				case 'remoteVideoMuted':
					state.videoMuted = data.value
					break
				case 'speakerMuted':
					state.speakerMuted = data.value
					break
				case 'positionChange':
				case 'newViewConnection':
					this.requestDetails()
					break
			}
			if (!isDeepStrictEqual(before, state)) this.emit('stateChanged')
		}
		if (data.action === 'seeding' || (data.action === 'tracksAdded' && data.value)) {
			this.requestDetails()
		}
	}

	#removeStream(streamID: string): void {
		if (!(streamID in this.states)) return
		this.#forgetStream(streamID)
		this.emit('streamsChanged')
		this.emit('stateChanged')
	}

	#forgetStream(streamID: string): void {
		delete this.states[streamID]
		const index = this.streams.findIndex((o) => o.id === streamID)
		if (index !== -1) this.streams.splice(index, 1)
	}
}
