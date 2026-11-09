import type { CompanionVariableDefinitions, CompanionVariableValue } from '@companion-module/base'
import { isDeepStrictEqual } from 'node:util'
import { isControlOn, isHandRaised, isHighlighted, isQueued, slotOf, volumeOf } from './state.js'
import type { StreamState } from './types.js'

/** Director-view state of a guest, defined under both its slot and its stream ID */
const GuestStateVariables = {
	hand: 'Hand',
	queued: 'Queued',
	highlighted: 'Highlighted',
	slot: 'Slot',
	groups: 'Groups',
	volume: 'Volume',
	deafened: 'Deafened',
	blind: 'Blind',
	scene_mic: 'Mic in Scenes',
} as const

function isGuest(data: StreamState): boolean {
	return !data.director && !!data.position
}

function guestStateValues(data: StreamState): Record<keyof typeof GuestStateVariables, CompanionVariableValue> {
	return {
		hand: isHandRaised(data) ? 'Raised' : 'Lowered',
		queued: isQueued(data) ? 'Queued' : 'Admitted',
		highlighted: isHighlighted(data) ? 'Highlighted' : 'Not highlighted',
		slot: slotOf(data) ?? 'None',
		groups: data.group?.length ? data.group : 'None',
		volume: volumeOf(data),
		deafened: isControlOn(data, 'deafened') ? 'Deafened' : 'Off',
		blind: isControlOn(data, 'blind') ? 'Blind' : 'Off',
		scene_mic: isControlOn(data, 'sceneMuted') ? 'Muted' : 'Live',
	}
}

export type VariablesSchema = Record<string, CompanionVariableValue>

export function GetVariableDefinitions(
	states: Record<string, StreamState>,
): CompanionVariableDefinitions<VariablesSchema> {
	const variables: CompanionVariableDefinitions<VariablesSchema> = {}

	if (Object.values(states).some((data) => data.localStream)) {
		variables.local_streamID = { name: 'This page - StreamID' }
		variables.local_mic = { name: 'This page - Mic' }
		variables.local_camera = { name: 'This page - Camera' }
		variables.local_speaker = { name: 'This page - Speaker' }
		variables.local_highlighted = { name: 'This page - Highlighted' }
	}

	for (const data of Object.values(states)) {
		const name = data.label ? `(${data.label})` : ''

		if (data.streamID) {
			if (data.director) {
				variables[`director_mic`] = { name: `Director - Mic` }
				variables[`director_camera`] = { name: `Director - Camera` }
				variables[`director_speaker`] = { name: `Director - Speaker` }
			} else if (data.position) {
				variables[`guest_${data.position}_streamID`] = { name: `Guest ${data.position} - StreamID` }
				variables[`guest_${data.position}_mic`] = { name: `Guest ${data.position} ${name} - Mic` }
				variables[`guest_${data.position}_camera`] = { name: `Guest ${data.position} ${name} - Camera` }
				variables[`guest_${data.position}_label`] = { name: `Guest ${data.position} - Label` }
				variables[`guest_${data.position}_scenes`] = { name: `Guest ${data.position} - Scenes` }
			}
			variables[`${data.streamID}_mic`] = { name: `Stream ID: ${data.streamID} - Mic` }
			variables[`${data.streamID}_camera`] = { name: `Stream ID: ${data.streamID} - Camera` }
			variables[`${data.streamID}_label`] = { name: `Stream ID: ${data.streamID} - Label` }
			variables[`${data.streamID}_scenes`] = { name: `Stream ID: ${data.streamID} - Scenes` }

			if (isGuest(data)) {
				for (const [key, label] of Object.entries(GuestStateVariables)) {
					variables[`guest_${data.position}_${key}`] = { name: `Guest ${data.position} - ${label}` }
					variables[`${data.streamID}_${key}`] = { name: `Stream ID: ${data.streamID} - ${label}` }
				}
			}
		}
	}

	return variables
}

export function GetVariableValues(states: Record<string, StreamState>): VariablesSchema {
	const values: VariablesSchema = {}

	for (const data of Object.values(states)) {
		let label = data.label ? data.label : `Guest ${data.position}`
		const sceneList: string[] = []

		if (data.scenes) {
			for (const scene in data.scenes) {
				if (data.scenes[scene] === true) {
					sceneList.push(scene)
				}
			}
		}

		if (data.streamID) {
			if (data.localStream) {
				Object.assign(values, {
					local_streamID: data.streamID,
					local_mic: data.muted ? 'Muted' : 'Unmuted',
					local_camera: data.videoMuted ? 'Muted' : 'Unmuted',
					local_speaker: data.speakerMuted ? 'Muted' : 'Unmuted',
					local_highlighted: isHighlighted(data) ? 'Highlighted' : 'Not highlighted',
				})
			}
			if (data.director) {
				label = 'Director'
				Object.assign(values, {
					director_mic: data.muted ? 'Muted' : 'Unmuted',
					director_camera: data.videoMuted ? 'Muted' : 'Unmuted',
					director_speaker: data.speakerMuted ? 'Muted' : 'Unmuted',
				})
			} else if (data.position) {
				Object.assign(values, {
					[`guest_${data.position}_streamID`]: data.streamID,
					[`guest_${data.position}_mic`]: data.muted || data.others?.['mute-guest'] == '1' ? 'Muted' : 'Unmuted',
					[`guest_${data.position}_camera`]:
						data.videoMuted || data.others?.['hide-guest'] == '1' ? 'Muted' : 'Unmuted',
					[`guest_${data.position}_label`]: label,
					[`guest_${data.position}_scenes`]: sceneList.length ? sceneList : 'None',
				})
			}
			Object.assign(values, {
				[`${data.streamID}_mic`]: data.muted || data.others?.['mute-guest'] == '1' ? 'Muted' : 'Unmuted',
				[`${data.streamID}_camera`]: data.videoMuted || data.others?.['hide-guest'] == '1' ? 'Muted' : 'Unmuted',
				[`${data.streamID}_label`]: label,
				[`${data.streamID}_scenes`]: sceneList.length ? sceneList : 'None',
			})

			if (isGuest(data)) {
				for (const [key, value] of Object.entries(guestStateValues(data))) {
					values[`guest_${data.position}_${key}`] = value
					values[`${data.streamID}_${key}`] = value
				}
			}
		}
	}
	return values
}

/** The values that differ from those last sent */
export function ChangedVariableValues(sent: VariablesSchema, values: VariablesSchema): VariablesSchema {
	const changed: VariablesSchema = {}
	for (const [id, value] of Object.entries(values)) {
		if (!isDeepStrictEqual(sent[id], value)) changed[id] = value
	}
	return changed
}
