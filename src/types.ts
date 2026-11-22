export type StreamState = {
	streamID: string
	label?: string | false
	director?: boolean | null
	position?: number | null
	localStream?: boolean
	muted?: boolean
	videoMuted?: boolean
	speakerMuted?: boolean
	/** The state of each director control for this guest, keyed by control name */
	others?: Record<string, string | boolean>
	scenes?: Record<string, boolean>
	/** Highlighted for everyone (the director's solo-video control) */
	featured?: boolean
	/** Mixer slot, or false when unassigned; only reported when slots are in use */
	slot?: number | false
	/** Groups the guest is in, such as ["2"] */
	group?: (string | number)[]
}

export type StreamChoice = {
	id: string
	label: string
}
