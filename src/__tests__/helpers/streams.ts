import type { StreamState } from '../../types.js'

export const director: StreamState = {
	streamID: 'directorStream',
	director: true,
	muted: false,
	videoMuted: false,
	speakerMuted: false,
}

export const guest: StreamState = {
	streamID: 'guestStream',
	label: 'Alice',
	position: 2,
	muted: false,
	videoMuted: true,
	scenes: { '1': true, '2': false, '3': true },
	others: { 'mute-guest': '0', 'hide-guest': '0' },
}

export const local: StreamState = {
	streamID: 'localStream',
	localStream: true,
	muted: false,
	videoMuted: false,
	speakerMuted: false,
}

export function statesOf(...streams: StreamState[]): Record<string, StreamState> {
	return Object.fromEntries(streams.map((stream) => [stream.streamID, structuredClone(stream)]))
}
