/**
 * Types for the VDO.Ninja remote control API ("Companion Ninja").
 *
 * There is no published schema. These are derived from
 * https://github.com/steveseguin/Companion-Ninja#readme and from VDO.Ninja's own handlers in lib.js
 * (`setupCommands`, `targetGuest`, `processMessage` and the `pokeAPI` calls), so re-check them
 * against new VDO.Ninja releases.
 */
import type { JsonObject, JsonValue } from '@companion-module/base'
import type { StreamState } from './types.js'

/** VDO.Ninja converts the strings "true"/"false" to booleans before handling a command */
export type BoolLike = boolean | 'true' | 'false'
export type Toggle = BoolLike | 'toggle'
/** Numeric values are parsed with parseInt/parseFloat, so numeric strings are accepted too */
export type NumberLike = number | string
/** Scene 0 to 8, or the name of an active custom scene */
export type SceneId = string | number
/** Guest slot (1 to 99), stream ID or peer UUID */
export type GuestTarget = string | number

type NoValue = Record<string, never>
type Value<T> = { value: T }
type Ptz = { value: NumberLike; value2?: 'abs' | BoolLike }

export type LayoutItem = {
	x: number
	y: number
	w: number
	h: number
	slot: number
	z?: number
	c?: boolean
}

/** Commands sent without a target, acting on the page the API ID is attached to */
export interface LocalCommands {
	speaker: Value<Toggle>
	mic: Value<Toggle>
	camera: Value<Toggle>
	/** 0 to 100, or true/false for 100%/muted */
	volume: Value<NumberLike | BoolLike>
	sendChat: Value<string>
	showChatOverlay: Value<string>
	record: Value<BoolLike>
	reload: NoValue
	hangup: NoValue
	/** true resets, false pauses, a number sets kbps */
	bitrate: Value<NumberLike | BoolLike>
	/** 0 (left) to 180 (right), or true/false to centre */
	panning: Value<NumberLike | BoolLike>
	togglehand: NoValue
	togglescreenshare: NoValue
	forceKeyframe: NoValue
	group: Value<NumberLike>
	joinGroup: Value<NumberLike>
	leaveGroup: Value<NumberLike>
	viewGroup: Value<NumberLike>
	joinViewGroup: Value<NumberLike>
	leaveViewGroup: Value<NumberLike>
	getDetails: NoValue
	getGuestList: NoValue
	requestStats: NoValue
	/** Optional inbound stream ID */
	getStats: { value?: string }
	nextSlide: NoValue
	prevSlide: NoValue
	/** A missing value toggles */
	soloVideo: { value?: Toggle }
	startRoomTimer: Value<NumberLike>
	stopRoomTimer: NoValue
	pauseRoomTimer: NoValue
	/** Delay in ms; value2 is the stream ID or UUID, or omitted for all streams */
	setBufferDelay: { value: NumberLike; value2?: string }
	activeSpeaker: { value?: 'toggle' | BoolLike | 1 | 2 | 3 }
	tallylight: Value<'onair' | 'active' | 'standby' | 'off' | number>
	aspectRatio: Value<NumberLike>
	/** value is the constraint name, value2 its value */
	videoConstraint: { value: string; value2: JsonValue }
	/** Relative adjustment, or absolute 0 to 1 when value2 is "abs" */
	zoom: Ptz
	focus: Ptz
	pan: Ptz
	tilt: Ptz
	exposure: Ptz
	/** 0 is the auto mixer, 1+ the custom layouts from &layouts, or a layout to apply directly */
	layout: Value<number | LayoutItem[]>
}

/** Commands sent by a director with a guest as the target */
export interface GuestCommands {
	forward: Value<string>
	/** Toggles, unless value2 forces membership */
	addScene: { value: SceneId; value2?: BoolLike }
	muteScene: Value<SceneId>
	/** Destination slot, or 0 to unset */
	setslot: Value<NumberLike>
	group: Value<NumberLike>
	mic: NoValue
	camera: NoValue
	hangup: NoValue
	soloChat: NoValue
	soloChatBidirectional: NoValue
	speaker: NoValue
	display: NoValue
	mirror: Value<Toggle>
	/** true advances 90 degrees, false resets */
	rotate: Value<BoolLike | 90 | 180 | 270>
	channel: Value<0 | 1 | 2>
	sendDirectorChat: Value<string>
	sendPinnedDirectorChat: Value<string>
	forceKeyframe: NoValue
	soloVideo: NoValue
	/** 0 to 200 */
	volume: Value<NumberLike>
	startRoomTimer: Value<NumberLike>
	stopRoomTimer: NoValue
	pauseRoomTimer: NoValue
	ptzZoom: Ptz
	ptzFocus: Ptz
	ptzPan: Ptz
	ptzTilt: Ptz
	ptzAutofocus: Value<BoolLike | 'manual' | 'off'>
	/** WIDTHxHEIGHT */
	requestResolution: Value<`${number}x${number}`>
	/** value2 is the max dimension */
	requestAspectRatio: { value: NumberLike; value2?: NumberLike }
	setWidth: Value<NumberLike>
	setHeight: Value<NumberLike>
	setAspectRatio: Value<NumberLike>
	refreshVideo: NoValue
	refreshConnection: NoValue
	recoverStream: NoValue
	mixorder: Value<-1 | 1>
}

/** The JSON object sent over the websocket */
export type ApiRequest = {
	action: string
	target: GuestTarget
	value: JsonValue
	value2?: JsonValue
	/** Request ID. Not part of the API, but VDO.Ninja echoes every request field back in its callback */
	cid: number
}

export function buildRequest(
	action: string,
	target: GuestTarget | null,
	args: { value?: JsonValue; value2?: JsonValue },
	cid: number,
): ApiRequest {
	const request: ApiRequest = {
		action,
		target: target ?? 'null',
		value: args.value ?? 'null',
		cid,
	}
	if (args.value2 !== undefined) request.value2 = args.value2
	return request
}

/** Updates whose value is the new boolean state */
const BooleanUpdateActions = [
	'muted',
	'videoMuted',
	'speakerMuted',
	'director',
	'directorMuted',
	'directorVideoHide',
	'remoteVideoMuted',
	// Not sent by current VDO.Ninja releases, but handled by earlier versions of this module
	'remoteMuted',
] as const

/** Updates that signal that a fresh getDetails is needed; `details` usually carries the new details itself */
const RefreshUpdateActions = ['details', 'positionChange', 'newViewConnection', 'seeding', 'tracksAdded'] as const

export type BooleanUpdateAction = (typeof BooleanUpdateActions)[number]
export type RefreshUpdateAction = (typeof RefreshUpdateActions)[number]

type UpdateBase = { streamID: string | null }

export type ApiUpdate =
	| (UpdateBase & { action: BooleanUpdateAction; value: boolean })
	| (UpdateBase & { action: 'hangup'; value: JsonValue })
	| (UpdateBase & { action: 'endViewConnection'; value: string })
	| (UpdateBase & { action: RefreshUpdateAction; value: JsonValue })

/** A command response: the original request echoed back with its result */
export type ApiCallback = {
	action: string
	cid?: number
	result: JsonValue
}

export type ApiMessage =
	| { type: 'update'; update: ApiUpdate }
	| { type: 'callback'; callback: ApiCallback }
	| { type: 'ignored'; reason: string }

/**
 * VDO.Ninja stream IDs are word characters. Anything else, including IDs that would collide with
 * object internals, is rejected before it can reach the module's state or variable names.
 */
const StreamIDPattern = /^[\w-]{1,128}$/

export function isValidStreamID(value: unknown): value is string {
	return typeof value === 'string' && StreamIDPattern.test(value) && value !== '__proto__'
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoolean(value: unknown): boolean {
	return typeof value === 'boolean'
}

/**
 * The getDetails fields the module reads, with the shape each must have. Anything else (device info,
 * buffers, stats) is dropped, as is a field of the wrong shape, as if VDO.Ninja had not reported it.
 */
const DetailsFields = {
	label: (value) => typeof value === 'string' || value === false,
	director: (value) => isBoolean(value) || value === null,
	// Used in variable names
	position: (value) => Number.isInteger(value) || value === null,
	localStream: isBoolean,
	muted: isBoolean,
	videoMuted: isBoolean,
	speakerMuted: isBoolean,
	others: isObject,
	scenes: isObject,
	featured: isBoolean,
	slot: (value) => typeof value === 'number' || value === false,
	group: (value) =>
		Array.isArray(value) && value.every((group) => typeof group === 'string' || typeof group === 'number'),
} satisfies Record<Exclude<keyof StreamState, 'streamID'>, (value: unknown) => boolean>

function includes<T extends string>(list: readonly T[], value: string): value is T {
	return (list as readonly string[]).includes(value)
}

function parseUpdate(raw: unknown): ApiUpdate | string {
	if (!isObject(raw) || typeof raw.action !== 'string') return 'malformed update'
	if (raw.streamID !== undefined && raw.streamID !== null && !isValidStreamID(raw.streamID)) {
		return 'invalid stream ID'
	}
	const streamID = raw.streamID ?? null
	const { action, value } = raw

	if (includes(BooleanUpdateActions, action)) {
		return typeof value === 'boolean' ? { streamID, action, value } : `non-boolean value for ${action}`
	}
	if (action === 'hangup') {
		return { streamID, action: 'hangup', value: value ?? null }
	}
	if (action === 'endViewConnection') {
		return isValidStreamID(value)
			? { streamID, action: 'endViewConnection', value }
			: 'invalid stream ID for endViewConnection'
	}
	if (includes(RefreshUpdateActions, action)) {
		return { streamID, action, value: value ?? null }
	}
	return `unhandled update ${action}`
}

function parseCallback(raw: unknown): ApiCallback | string {
	if (!isObject(raw) || typeof raw.action !== 'string') return 'malformed callback'
	return {
		action: raw.action,
		cid: typeof raw.cid === 'number' ? raw.cid : undefined,
		result: raw.result ?? null,
	}
}

export function parseMessage(text: string): ApiMessage {
	let raw: unknown
	try {
		raw = JSON.parse(text)
	} catch {
		return { type: 'ignored', reason: 'invalid JSON' }
	}
	if (!isObject(raw)) return { type: 'ignored', reason: 'not an object' }

	if ('callback' in raw) {
		const callback = parseCallback(raw.callback)
		return typeof callback === 'string' ? { type: 'ignored', reason: callback } : { type: 'callback', callback }
	}
	if ('update' in raw) {
		const update = parseUpdate(raw.update)
		return typeof update === 'string' ? { type: 'ignored', reason: update } : { type: 'update', update }
	}
	return { type: 'ignored', reason: 'unknown message' }
}

/** getDetails returns one entry per stream; entries without a valid stream ID are dropped */
export function parseDetails(result: JsonValue): StreamState[] {
	if (!isObject(result) && !Array.isArray(result)) return []

	const streams: StreamState[] = []
	for (const entry of Object.values(result)) {
		if (!isObject(entry) || !isValidStreamID(entry.streamID)) continue
		const picked: Record<string, unknown> = { streamID: entry.streamID }
		for (const [field, isValid] of Object.entries(DetailsFields)) {
			if (isValid(entry[field])) picked[field] = entry[field]
		}
		streams.push(picked as StreamState)
	}
	return streams
}
