import type { StreamState } from './types.js'

/** Guest states read from the director controls that VDO.Ninja reports in `others` */
export function isHandRaised(state: StreamState): boolean {
	return state.others?.['hand-raised'] === true
}

/** The guest is waiting in the room's queue for the director to admit them */
export function isQueued(state: StreamState): boolean {
	return state.others?.['remove-queue'] === true
}

/** The director controls VDO.Ninja reports the state of, as '1' or '0', once they have been used */
export const GuestControls = {
	deafened: 'toggle-remote-speaker',
	blind: 'toggle-remote-display',
	sceneMuted: 'mute-scene',
} as const

export function isControlOn(state: StreamState, control: keyof typeof GuestControls): boolean {
	return state.others?.[GuestControls[control]] === '1'
}

/** The volume set by the director, 0 to 200; a guest it has never changed is reported at 100 */
export function volumeOf(state: StreamState): number {
	const volume = Number(state.others?.volume)
	return Number.isFinite(volume) ? volume : 100
}

export function isHighlighted(state: StreamState): boolean {
	return state.featured === true
}

export function isInGroup(state: StreamState, group: number | string): boolean {
	return state.group?.some((g) => String(g) === String(group)) ?? false
}

export function slotOf(state: StreamState): number | null {
	return typeof state.slot === 'number' ? state.slot : null
}
