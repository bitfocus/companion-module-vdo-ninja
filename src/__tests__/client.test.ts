import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import { reconnectDelay, VdoNinjaClient, type ClientOptions } from '../client.js'
import getDetailsDirector from './fixtures/getDetails-director.json' with { type: 'json' }
import getDetailsPush from './fixtures/getDetails-push.json' with { type: 'json' }
import updateDetailsDirector from './fixtures/update-details-director.json' with { type: 'json' }
import { TestRelay } from './helpers/relay.js'
import { director, guest, local, statesOf } from './helpers/streams.js'

const json = (value: unknown) => JSON.stringify(value)

function makeClient(url = 'ws://127.0.0.1:1', options: Partial<ClientOptions> = {}) {
	return new VdoNinjaClient({
		url,
		apiID: 'test-api',
		minReconnectDelay: 50,
		maxReconnectDelay: 200,
		heartbeatInterval: 10_000,
		detailsDelay: 20,
		...options,
	})
}

function withStreams(client: VdoNinjaClient, ...streams: Parameters<typeof statesOf>) {
	client.handleMessage(json({ callback: { action: 'getDetails', result: statesOf(...streams) } }))
}

describe('VdoNinjaClient state', () => {
	it('loads streams from a getDetails reply', () => {
		const client = makeClient()
		const streamsChanged = vi.fn()
		client.on('streamsChanged', streamsChanged)

		client.handleMessage(json(getDetailsPush))

		expect(Object.keys(client.states)).toEqual(['fixturestream'])
		expect(client.streams).toEqual([{ id: 'fixturestream', label: 'Fixture (Local)' }])
		expect(streamsChanged).toHaveBeenCalledOnce()
	})

	it('loads the director and guests from a real director getDetails reply', () => {
		const client = makeClient()
		client.handleMessage(json(getDetailsDirector))
		expect(client.streams).toEqual([
			{ id: 'guestone', label: 'Guest 1 (Alice)' },
			{ id: 'directorstream', label: 'Director (Local)' },
		])
		expect(client.states.guestone.others).toMatchObject({ 'mute-guest': '1', 'hand-raised': false })
	})

	it('only reports a stream change when a stream is added or relabelled', () => {
		const client = makeClient()
		const streamsChanged = vi.fn()
		const stateChanged = vi.fn()
		client.on('streamsChanged', streamsChanged)
		client.on('stateChanged', stateChanged)

		withStreams(client, guest)
		withStreams(client, { ...guest, muted: true })
		expect(streamsChanged).toHaveBeenCalledOnce()
		expect(stateChanged).toHaveBeenCalledTimes(2)

		withStreams(client, { ...guest, position: 3 })
		expect(streamsChanged).toHaveBeenCalledTimes(2)
	})

	it('applies the details carried by a details update', () => {
		const client = makeClient()
		client.handleMessage(json(updateDetailsDirector))
		expect(client.streams).toEqual([{ id: 'guestone', label: 'Guest 1 (Alice)' }])
	})

	it('labels the director, guests and local stream', () => {
		const client = makeClient()
		withStreams(client, director, guest, local)
		expect(client.streams).toEqual([
			{ id: 'directorStream', label: 'Director' },
			{ id: 'guestStream', label: 'Guest 2 (Alice)' },
			{ id: 'localStream', label: 'localStream (Local)' },
		])
	})

	it('replaces a stream it already knows rather than adding it again', () => {
		const client = makeClient()
		withStreams(client, guest)
		withStreams(client, { ...guest, label: 'Bob' })
		expect(client.streams).toEqual([{ id: 'guestStream', label: 'Guest 2 (Bob)' }])
	})

	it.each([
		['muted', 'muted'],
		['remoteMuted', 'muted'],
		['videoMuted', 'videoMuted'],
		['remoteVideoMuted', 'videoMuted'],
		['speakerMuted', 'speakerMuted'],
	] as const)('applies a %s update to %s', (action, field) => {
		const client = makeClient()
		withStreams(client, local)
		const stateChanged = vi.fn()
		client.on('stateChanged', stateChanged)

		client.handleMessage(json({ update: { streamID: 'localStream', action, value: true } }))

		expect(client.states.localStream[field]).toBe(true)
		expect(stateChanged).toHaveBeenCalledOnce()
	})

	it('records director mute and hide as the director controls do', () => {
		const client = makeClient()
		withStreams(client, guest)
		client.handleMessage(json({ update: { streamID: 'guestStream', action: 'directorMuted', value: true } }))
		client.handleMessage(json({ update: { streamID: 'guestStream', action: 'directorVideoHide', value: true } }))
		expect(client.states.guestStream.others).toEqual({ 'mute-guest': '1', 'hide-guest': '1' })
	})

	it('keeps streams missing from a getDetails reply to another controller', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		withStreams(client, director)
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream', 'guestStream'])
	})

	it('keeps streams missing from a details update, which may be partial', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		client.handleMessage(json({ update: { streamID: 'directorStream', action: 'details', value: statesOf(guest) } }))
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream', 'guestStream'])
	})

	it('removes a stream that hangs up without a value', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		client.handleMessage(json({ update: { streamID: 'guestStream', action: 'hangup' } }))
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream'])
	})

	it('keeps a hung up stream gone though its page goes on listing it in getDetails', () => {
		const client = makeClient()
		withStreams(client, local)
		client.handleMessage(json({ update: { streamID: 'localStream', action: 'hangup', value: true } }))

		withStreams(client, local)

		expect(client.streams).toEqual([])
		expect(client.states.localStream).toBeUndefined()
	})

	it('brings a hung up stream back when its page reports itself again, as after a reload', () => {
		const client = makeClient()
		withStreams(client, local)
		client.handleMessage(json({ update: { streamID: 'localStream', action: 'hangup', value: true } }))

		client.handleMessage(json({ update: { streamID: 'localStream', action: 'details', value: statesOf(local) } }))
		withStreams(client, local)

		expect(client.streams.map((s) => s.id)).toEqual(['localStream'])
	})

	it('removes a stream that hangs up', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		client.handleMessage(json({ update: { streamID: 'guestStream', action: 'hangup', value: true } }))
		expect(Object.keys(client.states)).toEqual(['directorStream'])
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream'])
	})

	it('removes the stream named by endViewConnection', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		client.handleMessage(
			json({ update: { streamID: 'directorStream', action: 'endViewConnection', value: 'guestStream' } }),
		)
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream'])
	})

	it('leaves the other streams alone when an unknown stream ends', () => {
		const client = makeClient()
		withStreams(client, director, guest)
		client.handleMessage(json({ update: { streamID: 'directorStream', action: 'endViewConnection', value: 'nobody' } }))
		expect(client.streams.map((s) => s.id)).toEqual(['directorStream', 'guestStream'])
	})

	it('ignores updates for streams it does not know', () => {
		const client = makeClient()
		withStreams(client, local)
		const stateChanged = vi.fn()
		client.on('stateChanged', stateChanged)
		client.handleMessage(json({ update: { streamID: 'stranger', action: 'muted', value: true } }))
		expect(stateChanged).not.toHaveBeenCalled()
	})

	it('ignores command results without a request of its own', () => {
		const client = makeClient()
		withStreams(client, local)
		client.handleMessage(json({ callback: { action: 'mic', cid: 1, value: false, result: true } }))
		expect(client.states.localStream.muted).toBe(false)
	})

	it('only reports a state change when something changed', () => {
		const client = makeClient()
		withStreams(client, local)
		const stateChanged = vi.fn()
		client.on('stateChanged', stateChanged)

		withStreams(client, local)
		client.handleMessage(json({ update: { streamID: 'localStream', action: 'muted', value: false } }))
		expect(stateChanged).not.toHaveBeenCalled()

		client.handleMessage(json({ update: { streamID: 'localStream', action: 'muted', value: true } }))
		expect(stateChanged).toHaveBeenCalledOnce()
	})

	it('only rebuilds definitions on a director update that changes the label', () => {
		const client = makeClient()
		withStreams(client, director)
		const streamsChanged = vi.fn()
		client.on('streamsChanged', streamsChanged)

		client.handleMessage(json({ update: { streamID: 'directorStream', action: 'director', value: true } }))
		expect(streamsChanged).not.toHaveBeenCalled()

		client.handleMessage(json({ update: { streamID: 'directorStream', action: 'director', value: false } }))
		expect(streamsChanged).toHaveBeenCalledOnce()
		expect(client.streams).toEqual([{ id: 'directorStream', label: 'directorStream' }])
	})

	it('keeps streams in a store that stream IDs cannot reach the internals of', () => {
		const client = makeClient()
		client.handleMessage(json({ callback: { action: 'getDetails', result: { a: { streamID: '__proto__' } } } }))
		expect(Object.getPrototypeOf(client.states)).toBeNull()
		expect(client.streams).toEqual([])
	})

	it('drops device details and other fields it does not use', () => {
		const client = makeClient()
		client.handleMessage(
			json({ callback: { action: 'getDetails', result: { s: { ...local, miscellaneous: { CPU: 'x' } } } } }),
		)
		expect(client.states.localStream).not.toHaveProperty('miscellaneous')
	})

	it('logs messages it ignores', () => {
		const client = makeClient()
		const log = vi.fn()
		client.on('log', log)
		client.handleMessage('{nope')
		expect(log).toHaveBeenCalledWith('debug', 'Ignored VDO.Ninja message: invalid JSON')
	})
})

describe('VdoNinjaClient connection', () => {
	let relay: TestRelay
	let page: WebSocket
	const fromClient: unknown[] = []

	beforeEach(async () => {
		relay = await TestRelay.start()
		fromClient.length = 0
		// Plays the part of the VDO.Ninja page, joined to the same API ID
		page = new WebSocket(relay.url)
		await new Promise((resolve) => page.once('open', resolve))
		page.send(json({ join: 'test-api' }))
		page.on('message', (data: Buffer) => fromClient.push(JSON.parse(data.toString())))
	})

	afterEach(async () => {
		page.close()
		await relay.stop()
	})

	it('joins the API ID and asks for details once connected', async () => {
		const client = makeClient(relay.url)
		const status = vi.fn()
		client.on('status', status)
		client.connect()

		await vi.waitFor(() => expect(fromClient).toContainEqual(expect.objectContaining({ action: 'getDetails' })))
		expect(status).toHaveBeenCalledWith('ok', null)
		client.destroy()
	})

	it('loads the streams the page reports', async () => {
		const client = makeClient(relay.url)
		client.connect()
		await vi.waitFor(() => expect(fromClient).toHaveLength(1))

		page.send(json(getDetailsPush))

		await vi.waitFor(() => expect(client.streams).toEqual([{ id: 'fixturestream', label: 'Fixture (Local)' }]))
		client.destroy()
	})

	it('reconnects after the relay drops it', async () => {
		const client = makeClient(relay.url)
		client.connect()
		await vi.waitFor(() => expect(relay.members('test-api')).toBe(2))

		relay.disconnectAll()
		page = new WebSocket(relay.url)
		await new Promise((resolve) => page.once('open', resolve))
		page.send(json({ join: 'test-api' }))

		await vi.waitFor(() => expect(relay.members('test-api')).toBe(2))
		client.destroy()
	})

	it('stays disconnected after destroy', async () => {
		const client = makeClient(relay.url)
		client.connect()
		await vi.waitFor(() => expect(relay.members('test-api')).toBe(2))

		client.destroy()
		await vi.waitFor(() => expect(relay.members('test-api')).toBe(1))
		await new Promise((resolve) => setTimeout(resolve, 200))
		expect(relay.members('test-api')).toBe(1)
	})

	it('reports nothing when destroyed while still connecting', async () => {
		const client = makeClient(relay.url)
		const status = vi.fn()
		const log = vi.fn()
		client.on('status', status)
		client.on('log', log)

		client.connect()
		client.destroy()

		await new Promise((resolve) => setTimeout(resolve, 50))
		expect(status).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
	})

	describe('command results', () => {
		type Request = { action: string; cid: number }

		async function connected() {
			const client = makeClient(relay.url)
			client.connect()
			await vi.waitFor(() => expect(fromClient).toHaveLength(1))
			// Answer the initial getDetails with a local stream and a guest
			const getDetails = fromClient[0] as Request
			page.send(json({ callback: { ...getDetails, result: statesOf(local, guest) } }))
			await vi.waitFor(() => expect(client.streams).toHaveLength(2))
			return client
		}

		/** Replies to the latest request, as VDO.Ninja does: the request echoed back with its result */
		async function reply(result: unknown) {
			await vi.waitFor(() => expect(fromClient.length).toBeGreaterThan(1))
			const request = fromClient.at(-1) as Request
			page.send(json({ callback: { ...request, result } }))
			return request
		}

		it.each([
			['mic', 'muted'],
			['camera', 'videoMuted'],
			['speaker', 'speakerMuted'],
		] as const)('applies the result of a local %s command to the local stream', async (action, field) => {
			const client = await connected()
			client.sendLocal(action, { value: false })
			await reply(true)

			await vi.waitFor(() => expect(client.states.localStream[field]).toBe(true))
			expect(client.states.guestStream[field]).toBe(guest[field])
			expect(client.pendingRequests).toBe(0)
			client.destroy()
		})

		it('waits for the update after a local toggle rather than using its result', async () => {
			const client = await connected()
			client.sendLocal('mic', { value: 'toggle' })
			await reply(true)

			await vi.waitFor(() => expect(client.pendingRequests).toBe(0))
			expect(client.states.localStream.muted).toBe(false)
			client.destroy()
		})

		it('refreshes the details after a guest command instead of applying its result', async () => {
			const client = await connected()
			client.sendGuest('setslot', 2, { value: 3 })
			await reply(true)

			await vi.waitFor(() => expect(fromClient.at(-1)).toMatchObject({ action: 'getDetails' }))
			expect(client.states.localStream.muted).toBe(false)
			client.destroy()
		})

		it.each([2, '2', 'guestStream'])(
			'reports a guest volume as soon as it is sent to guest %j, so a dial can step from it',
			async (target) => {
				const client = await connected()
				const stateChanged = vi.fn()
				client.on('stateChanged', stateChanged)

				client.sendGuest('volume', target, { value: 105 })
				client.sendGuest('volume', target, { value: 110 })

				expect(client.states.guestStream.others?.volume).toBe('110')
				expect(stateChanged).toHaveBeenCalledTimes(2)
				client.destroy()
			},
		)

		it('leaves the volume alone when no guest matches the target', async () => {
			const client = await connected()
			client.sendGuest('volume', 7, { value: 50 })

			expect(client.states.guestStream.others?.volume).toBeUndefined()
			client.destroy()
		})

		it('gathers getDetails requests made close together into one', async () => {
			const client = await connected()
			for (let i = 0; i < 5; i++) client.requestDetails()

			await vi.waitFor(() => expect(fromClient).toHaveLength(2))
			await new Promise((resolve) => setTimeout(resolve, 100))
			expect(fromClient).toHaveLength(2)
			client.destroy()
		})

		it('waits for the getDetails in flight before asking again', async () => {
			const client = await connected()
			client.requestDetails()
			await vi.waitFor(() => expect(fromClient).toHaveLength(2))

			client.requestDetails()
			client.requestDetails()
			await new Promise((resolve) => setTimeout(resolve, 100))
			expect(fromClient).toHaveLength(2)

			await reply(statesOf(local, guest))
			await vi.waitFor(() => expect(fromClient).toHaveLength(3))
			expect(fromClient.at(-1)).toMatchObject({ action: 'getDetails' })
			client.destroy()
		})

		it('forgets streams missing from the reply to its own getDetails', async () => {
			const client = await connected()
			const streamsChanged = vi.fn()
			const stateChanged = vi.fn()
			client.on('streamsChanged', streamsChanged)
			client.on('stateChanged', stateChanged)

			client.requestDetails()
			await reply(statesOf(local))

			await vi.waitFor(() => expect(client.streams.map((s) => s.id)).toEqual(['localStream']))
			expect(Object.keys(client.states)).toEqual(['localStream'])
			expect(streamsChanged).toHaveBeenCalledOnce()
			expect(stateChanged).toHaveBeenCalledOnce()
			client.destroy()
		})

		it('forgets every stream when its own getDetails reports none', async () => {
			const client = await connected()
			client.requestDetails()
			await reply({})

			await vi.waitFor(() => expect(client.streams).toEqual([]))
			client.destroy()
		})

		it('keeps its streams when its own getDetails fails', async () => {
			const client = await connected()
			client.requestDetails()
			await reply('timeout')

			await vi.waitFor(() => expect(client.pendingRequests).toBe(0))
			expect(client.streams).toHaveLength(2)
			client.destroy()
		})

		it('asks for every stream when a details update reveals a new one, as after the page reloads', async () => {
			const client = await connected()
			page.send(json({ update: { streamID: 'directorStream', action: 'details', value: statesOf(director) } }))
			await vi.waitFor(() => expect(fromClient).toHaveLength(2))
			expect(fromClient.at(-1)).toMatchObject({ action: 'getDetails' })
			client.destroy()
		})

		it('asks for fresh positions when a guest leaves', async () => {
			const client = await connected()
			page.send(json({ update: { streamID: 'localStream', action: 'endViewConnection', value: 'guestStream' } }))
			await vi.waitFor(() => expect(fromClient).toHaveLength(2))
			expect(fromClient.at(-1)).toMatchObject({ action: 'getDetails' })
			client.destroy()
		})

		it('does not ask again when a details update only changes a known stream', async () => {
			const client = await connected()
			page.send(
				json({ update: { streamID: 'guestStream', action: 'details', value: statesOf({ ...guest, muted: true }) } }),
			)
			await vi.waitFor(() => expect(client.states.guestStream.muted).toBe(true))
			await new Promise((resolve) => setTimeout(resolve, 60))
			expect(fromClient).toHaveLength(1)
			client.destroy()
		})

		it('gives every request its own ID', async () => {
			const client = await connected()
			client.sendLocal('reload', {})
			client.sendLocal('reload', {})
			await vi.waitFor(() => expect(fromClient).toHaveLength(3))
			const ids = (fromClient as Request[]).map((request) => request.cid)
			expect(new Set(ids).size).toBe(3)
			client.destroy()
		})

		it('asks for details when a details update carries none', async () => {
			const client = await connected()
			page.send(json({ update: { streamID: 'localStream', action: 'details', value: null } }))
			await vi.waitFor(() =>
				expect(fromClient.slice(1)).toContainEqual(expect.objectContaining({ action: 'getDetails' })),
			)
			client.destroy()
		})
	})

	it('warns rather than sending while disconnected', () => {
		const client = makeClient(relay.url)
		const log = vi.fn()
		client.on('log', log)
		client.sendLocal('reload', {})
		expect(log).toHaveBeenCalledWith('warn', 'Not connected to VDO.Ninja, "reload" was not sent')
	})

	it('reports reconnecting after the relay drops it', async () => {
		const client = makeClient(relay.url)
		const status = vi.fn()
		client.on('status', status)
		client.connect()
		await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ok', null))

		relay.disconnectAll()

		await vi.waitFor(() => expect(status).toHaveBeenCalledWith('disconnected', 'Reconnecting'))
		await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ok', null))
		client.destroy()
	})

	it('reports a server address it cannot use', () => {
		const client = makeClient('wss://not a host:443')
		const status = vi.fn()
		client.on('status', status)
		client.connect()
		expect(status).toHaveBeenCalledWith('connection_failure', 'Invalid server address')
		client.destroy()
	})

	describe('guest targets', () => {
		it.each(['', '  ', 'null', ' NULL '])(
			'refuses the target %j, which VDO.Ninja would treat as none',
			async (target) => {
				const client = makeClient(relay.url)
				const log = vi.fn()
				client.on('log', log)
				client.connect()
				await vi.waitFor(() => expect(fromClient).toHaveLength(1))

				client.sendGuest('hangup', target, {})

				expect(log).toHaveBeenCalledWith('warn', 'Not sending "hangup": no guest given')
				await new Promise((resolve) => setTimeout(resolve, 50))
				expect(fromClient).toHaveLength(1)
				client.destroy()
			},
		)

		it('sends a trimmed stream ID or a slot number', async () => {
			const client = makeClient(relay.url)
			client.connect()
			await vi.waitFor(() => expect(fromClient).toHaveLength(1))

			client.sendGuest('mic', ' guestStream ', {})
			client.sendGuest('mic', 2, {})

			await vi.waitFor(() => expect(fromClient).toHaveLength(3))
			expect(fromClient.slice(1)).toMatchObject([{ target: 'guestStream' }, { target: 2 }])
			client.destroy()
		})
	})
})

describe('VdoNinjaClient heartbeat and backoff', () => {
	it('drops a connection that stops answering pings and reconnects', async () => {
		const relay = await TestRelay.start(false)
		const client = makeClient(relay.url, { heartbeatInterval: 50 })
		const log = vi.fn()
		client.on('log', log)
		const connect = vi.spyOn(client, 'connect')
		client.connect()

		await vi.waitFor(() => expect(log).toHaveBeenCalledWith('warn', 'VDO.Ninja stopped responding, reconnecting'))
		await vi.waitFor(() => expect(connect.mock.calls.length).toBeGreaterThan(1))
		client.destroy()
		await relay.stop()
	})

	it('keeps a connection that answers pings', async () => {
		const relay = await TestRelay.start()
		const client = makeClient(relay.url, { heartbeatInterval: 20 })
		const log = vi.fn()
		client.on('log', log)
		client.connect()

		await new Promise((resolve) => setTimeout(resolve, 200))
		expect(log).not.toHaveBeenCalledWith('warn', expect.anything())
		expect(relay.members('test-api')).toBe(1)
		client.destroy()
		await relay.stop()
	})

	it('stays disconnected while reconnecting to a server that has gone away', async () => {
		const relay = await TestRelay.start()
		const client = makeClient(relay.url)
		const status = vi.fn()
		const log = vi.fn()
		client.on('status', status)
		client.on('log', log)
		client.connect()
		await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('ok', null))

		await relay.stop()

		await vi.waitFor(() => expect(log).toHaveBeenCalledWith('error', expect.stringContaining('WebSocket')))
		expect(status).toHaveBeenLastCalledWith('disconnected', 'Reconnecting')
		expect(status).not.toHaveBeenCalledWith('connection_failure', null)
		client.destroy()
	})

	it('reports a connection failure when it has never connected', async () => {
		const client = makeClient()
		const status = vi.fn()
		client.on('status', status)
		client.connect()

		await vi.waitFor(() => expect(status).toHaveBeenCalledWith('connection_failure', null))
		client.destroy()
	})

	it('backs off between failed attempts, up to the maximum', () => {
		expect([0, 1, 2, 3, 4, 10].map((attempt) => reconnectDelay(attempt, 1000, 30_000))).toEqual([
			1000, 2000, 4000, 8000, 16_000, 30_000,
		])
	})

	it('resets the backoff once connected', async () => {
		const relay = await TestRelay.start()
		const client = makeClient(relay.url, { minReconnectDelay: 20, maxReconnectDelay: 10_000 })
		let opened = 0
		client.on('status', (status) => {
			if (status === 'ok') opened++
		})
		client.connect()
		await vi.waitFor(() => expect(opened).toBe(1))

		// Several drops in a row would back off to seconds if each successful connection didn't reset it
		for (let i = 2; i <= 5; i++) {
			relay.disconnectAll()
			await vi.waitFor(() => expect(opened).toBe(i), { timeout: 500 })
		}
		client.destroy()
		await relay.stop()
	})
})
