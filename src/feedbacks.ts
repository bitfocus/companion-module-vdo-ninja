import {
	combineRgb,
	type CompanionFeedbackDefinitions,
	type CompanionInputFieldCheckbox,
	type CompanionInputFieldDropdown,
} from '@companion-module/base'
import type { VdoNinjaClient } from './client.js'
import { isControlOn, isHandRaised, isHighlighted, isInGroup, isQueued, slotOf } from './state.js'

type StreamStateOptions = {
	stream: string
	state: boolean
}

export type FeedbacksSchema = {
	mic: { type: 'boolean'; options: StreamStateOptions }
	camera: { type: 'boolean'; options: StreamStateOptions }
	speaker: { type: 'boolean'; options: StreamStateOptions }
	guestScene: { type: 'boolean'; options: { stream: string; scene: string } }
	handRaised: { type: 'boolean'; options: { stream: string } }
	guestQueued: { type: 'boolean'; options: { stream: string } }
	highlighted: { type: 'boolean'; options: { stream: string } }
	guestGroup: { type: 'boolean'; options: { stream: string; group: number } }
	guestSlot: { type: 'boolean'; options: { stream: string; slot: number } }
	guestDeafened: { type: 'boolean'; options: { stream: string } }
	guestBlind: { type: 'boolean'; options: { stream: string } }
	guestSceneMuted: { type: 'boolean'; options: { stream: string } }
}

// Stored as a boolean, matching the true/false ids of the dropdown this replaced
const stateField: CompanionInputFieldCheckbox<'state'> = {
	type: 'checkbox',
	label: 'Muted',
	id: 'state',
	default: true,
}

export function GetFeedbacks(
	client: Pick<VdoNinjaClient, 'states' | 'streams'>,
): CompanionFeedbackDefinitions<FeedbacksSchema> {
	const ColorWhite = combineRgb(255, 255, 255)
	const ColorGreen = combineRgb(0, 200, 0)

	// Custom values let a preset follow a guest slot with an expression, whoever is in it right now
	const streamField: CompanionInputFieldDropdown<'stream', string> = {
		type: 'dropdown',
		label: 'Stream',
		id: 'stream',
		allowCustom: true,
		default: client.streams[0]?.id ?? '',
		choices: client.streams,
	}

	return {
		mic: {
			type: 'boolean',
			name: 'Mic Status',
			description: 'If mic matches the selected state, change the style of the button',
			options: [streamField, stateField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				if (!stream) return false
				if (stream.position && !stream.director && stream.others?.['mute-guest'] == '1') {
					return feedback.options.state ?? false
				}
				return stream.muted === feedback.options.state
			},
		},
		camera: {
			type: 'boolean',
			name: 'Camera Status',
			description: 'If camera matches the selected state, change the style of the button',
			options: [streamField, stateField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				if (!stream) return false
				if (stream.position && !stream.director && stream.others?.['hide-guest'] == '1') {
					return feedback.options.state ?? false
				}
				return stream.videoMuted === feedback.options.state
			},
		},
		speaker: {
			type: 'boolean',
			name: 'Speaker Status',
			description: 'If speaker matches the selected state, change the style of the button',
			options: [streamField, stateField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				return client.states[feedback.options.stream]?.speakerMuted === feedback.options.state
			},
		},
		guestScene: {
			type: 'boolean',
			name: 'Guest in Scene',
			description: 'If a stream is active the selected scene, change the style of the button',
			options: [
				streamField,
				{
					type: 'textinput',
					label: 'Scene name or ID (0 to 8)',
					id: 'scene',
					default: '1',
				},
			],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				return client.states[feedback.options.stream]?.scenes?.[feedback.options.scene] == true
			},
		},
		handRaised: {
			type: 'boolean',
			name: 'Guest Hand Raised',
			description: 'If the guest has raised their hand, change the style of the button',
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isHandRaised(stream) : false
			},
		},
		guestQueued: {
			type: 'boolean',
			name: 'Guest Queued',
			description: 'If the guest is waiting in the queue to be admitted, change the style of the button',
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isQueued(stream) : false
			},
		},
		highlighted: {
			type: 'boolean',
			name: 'Stream Highlighted',
			description: 'If the stream is highlighted for everyone, change the style of the button',
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isHighlighted(stream) : false
			},
		},
		guestGroup: {
			type: 'boolean',
			name: 'Guest in Group',
			description: 'If the guest is in the selected group, change the style of the button',
			options: [
				streamField,
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'group',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isInGroup(stream, feedback.options.group) : false
			},
		},
		guestSlot: {
			type: 'boolean',
			name: 'Guest in Slot',
			description:
				'If the guest is assigned to the selected mixer slot, change the style of the button. Needs slots in use (&slotmode on the director, or the mixer)',
			options: [
				streamField,
				{
					type: 'number',
					label: 'Slot',
					id: 'slot',
					default: 1,
					min: 1,
					max: 99,
				},
			],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? slotOf(stream) === feedback.options.slot : false
			},
		},
		guestDeafened: {
			type: 'boolean',
			name: 'Guest Deafened',
			description: 'If the director has deafened the guest, change the style of the button',
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isControlOn(stream, 'deafened') : false
			},
		},
		guestBlind: {
			type: 'boolean',
			name: 'Guest Blind',
			description: 'If the director has stopped the guest seeing video, change the style of the button',
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isControlOn(stream, 'blind') : false
			},
		},
		guestSceneMuted: {
			type: 'boolean',
			name: 'Guest Mic Muted in Scenes',
			description: "If the guest's mic is muted in scenes, change the style of the button",
			options: [streamField],
			defaultStyle: {
				color: ColorWhite,
				bgcolor: ColorGreen,
			},
			callback: (feedback) => {
				const stream = client.states[feedback.options.stream]
				return stream ? isControlOn(stream, 'sceneMuted') : false
			},
		},
	}
}
