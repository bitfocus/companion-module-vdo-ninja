import type { CompanionActionDefinitions, DropdownChoice } from '@companion-module/base'
import type { Toggle } from './api.js'
import type { VdoNinjaClient } from './client.js'

type MutableValue = Extract<Toggle, string>

type NoOptions = { options: Record<string, never> }
type ValueOption<T> = { options: { value: T } }
type GuestOption = { options: { target: string } }
type GuestValueOptions<T> = { options: { target: string; value: T } }

export type ActionsSchema = {
	speaker: ValueOption<MutableValue>
	mic: ValueOption<MutableValue>
	camera: ValueOption<MutableValue>
	volume: ValueOption<number>
	sendChat: ValueOption<string>
	record: ValueOption<'true' | 'false'>
	reload: NoOptions
	hangup: NoOptions
	bitrate: { options: { value: 'true' | 'false' | 'custom'; bitrate: number } }
	panning: ValueOption<number>
	togglehand: NoOptions
	togglescreenshare: NoOptions
	forceKeyframe: NoOptions
	nextSlide: NoOptions
	previousSlide: NoOptions
	ptzPan: ValueOption<number>
	ptzTilt: ValueOption<number>
	ptzZoom: ValueOption<number>
	ptzFocus: ValueOption<number>
	ptzExposure: ValueOption<number>
	group: ValueOption<number>
	joinGroup: ValueOption<number>
	leaveGroup: ValueOption<number>
	viewGroup: ValueOption<number>
	joinViewGroup: ValueOption<number>
	leaveViewGroup: ValueOption<number>
	soloVideo: NoOptions
	guestForward: GuestValueOptions<string>
	guestAddScene: GuestValueOptions<string>
	guestMuteScene: GuestValueOptions<string>
	guestGroup: GuestValueOptions<string>
	guestMic: GuestOption
	guestHangup: GuestOption
	guestSoloChat: GuestOption
	guestAltSoloChat: GuestOption
	guestSpeaker: GuestOption
	guestDisplay: GuestOption
	guestOverlay: GuestValueOptions<string>
	guestForceKeyframe: GuestOption
	guestSoloVideo: GuestOption
	guestVolume: GuestValueOptions<number>
}

export function GetActions(
	client: Pick<VdoNinjaClient, 'sendLocal' | 'sendGuest'>,
): CompanionActionDefinitions<ActionsSchema> {
	const mutableChoices: DropdownChoice<MutableValue>[] = [
		{ id: 'toggle', label: 'Toggle' },
		{ id: 'true', label: 'Unmute' },
		{ id: 'false', label: 'Mute' },
	]

	return {
		speaker: {
			name: 'Local: Speaker Control',
			description: 'Mute, unmute or toggle the local speaker',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: mutableChoices,
				},
			],
			callback: (action) => {
				client.sendLocal('speaker', { value: action.options.value })
			},
		},

		mic: {
			name: 'Local: Mic Control',
			description: 'Mute, unmute or toggle the local microphone',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: mutableChoices,
				},
			],
			callback: (action) => {
				client.sendLocal('mic', { value: action.options.value })
			},
		},

		camera: {
			name: 'Local: Camera Control',
			description: 'Mute, unmute or toggle the local camera',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: mutableChoices,
				},
			],
			callback: (action) => {
				client.sendLocal('camera', { value: action.options.value })
			},
		},

		volume: {
			name: 'Local: Playback Volume',
			description: 'Sets the playback volume of all local playback audio',
			options: [
				{
					type: 'number',
					label: 'Volume (0 to 100)',
					id: 'value',
					default: 100,
					min: 0,
					max: 100,
					range: false,
				},
			],
			callback: (action) => {
				client.sendLocal('volume', { value: action.options.value })
			},
		},

		sendChat: {
			name: 'Local: Send Chat Message',
			description: 'Sends a chat message to everyone connected',
			options: [
				{
					type: 'textinput',
					label: 'Message',
					id: 'value',
					default: '',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendLocal('sendChat', { value: action.options.value })
			},
		},

		record: {
			name: 'Local: Record Video',
			description: 'Start/stop recording the local video stream to disk',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'true',
					choices: [
						{ id: 'true', label: 'Start Recording' },
						{ id: 'false', label: 'Stop Recording' },
					],
				},
			],
			callback: (action) => {
				client.sendLocal('record', { value: action.options.value })
			},
		},

		reload: {
			name: 'Local: Reload',
			description: 'Reload the current page',
			options: [],
			callback: () => {
				client.sendLocal('reload', {})
			},
		},

		hangup: {
			name: 'Local: Hang Up',
			description: 'Hang up the current connection.',
			options: [],
			callback: () => {
				client.sendLocal('hangup', {})
			},
		},

		bitrate: {
			name: 'Local: Set Video Bitrate',
			description: 'Set, reset or pause the bitrate of all incoming video streams',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'true',
					choices: [
						{ id: 'true', label: 'Reset bitrate' },
						{ id: 'false', label: 'Pause all currently incoming video' },
						{ id: 'custom', label: 'Custom Bitrate' },
					],
				},
				{
					type: 'number',
					label: 'Bitrate in kbps (Must select "Custom" above)',
					id: 'bitrate',
					default: 1500,
					min: 0,
					max: 100000,
					range: false,
				},
			],
			callback: (action) => {
				client.sendLocal('bitrate', {
					value: action.options.value === 'custom' ? action.options.bitrate : action.options.value,
				})
			},
		},

		panning: {
			name: 'Local: Set Audio Pan',
			description: 'Sets the stereo panning of all incoming audio streams',
			options: [
				{
					type: 'number',
					label: 'Pan (0 [Left] to 180 [Right], 90 [Center])',
					id: 'value',
					default: 90,
					min: 0,
					max: 180,
					range: false,
				},
			],
			callback: (action) => {
				client.sendLocal('panning', { value: action.options.value })
			},
		},

		togglehand: {
			name: 'Local: Raise Hand',
			description: 'Toggles whether your hand is raised or not',
			options: [],
			callback: () => {
				client.sendLocal('togglehand', {})
			},
		},

		togglescreenshare: {
			name: 'Local: Screen Share',
			description: 'Toggles screen sharing on or off - will prompt you to select the screen',
			options: [],
			callback: () => {
				client.sendLocal('togglescreenshare', {})
			},
		},

		forceKeyframe: {
			name: 'Local: Force Keyframe',
			description: 'Forces the publisher of a stream to issue keyframes to all viewers',
			options: [],
			callback: () => {
				client.sendLocal('forceKeyframe', {})
			},
		},

		nextSlide: {
			name: 'Local: Next Slide',
			description: 'For PowerPoint usage',
			options: [],
			callback: () => {
				client.sendLocal('nextSlide', {})
			},
		},

		previousSlide: {
			name: 'Local: Previous Slide',
			description: 'For PowerPoint usage',
			options: [],
			callback: () => {
				client.sendLocal('prevSlide', {})
			},
		},

		ptzPan: {
			name: 'Local: Pan Camera',
			description: 'Pan camera left (-) or right (+)',
			options: [
				{
					type: 'number',
					label: 'Adjustment Amount',
					id: 'value',
					default: 10,
					min: -100,
					max: 100,
					range: true,
				},
			],
			callback: (action) => {
				const decimalValue = action.options.value / 100
				client.sendLocal('pan', { value: decimalValue })
			},
		},

		ptzTilt: {
			name: 'Local: Tilt Camera',
			description: 'Tilt camera up (-) or down (+)',
			options: [
				{
					type: 'number',
					label: 'Adjustment Amount',
					id: 'value',
					default: 10,
					min: -100,
					max: 100,
					range: true,
				},
			],
			callback: (action) => {
				const decimalValue = action.options.value / 100
				client.sendLocal('tilt', { value: decimalValue })
			},
		},

		ptzZoom: {
			name: 'Local: Zoom Camera',
			description: 'Zoom camera in (-) or out (+)',
			options: [
				{
					type: 'number',
					label: 'Adjustment Amount',
					id: 'value',
					default: 10,
					min: -100,
					max: 100,
					range: true,
				},
			],
			callback: (action) => {
				const decimalValue = action.options.value / 100
				client.sendLocal('zoom', { value: decimalValue })
			},
		},

		ptzFocus: {
			name: 'Local: Focus Camera',
			description: 'Focus camera near (-) or far (+)',
			options: [
				{
					type: 'number',
					label: 'Adjustment Amount',
					id: 'value',
					default: 10,
					min: -100,
					max: 100,
					range: true,
				},
			],
			callback: (action) => {
				const decimalValue = action.options.value / 100
				client.sendLocal('focus', { value: decimalValue })
			},
		},

		ptzExposure: {
			name: 'Local: Camera Exposure',
			description: 'Set camera exposure',
			options: [
				{
					type: 'number',
					label: 'Expsoure (0 to 100)',
					id: 'value',
					default: 50,
					min: 0,
					max: 100,
					range: true,
				},
			],
			callback: (action) => {
				const decimalValue = action.options.value / 100
				client.sendLocal('exposure', { value: decimalValue, value2: 'abs' })
			},
		},

		group: {
			name: 'Director: Self in Group',
			description: 'Toggle the director of a room in/out of a specified group room',
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('group', { value: action.options.value })
			},
		},

		joinGroup: {
			name: 'Director: Join Group',
			description: 'Have the director of a room join a specified group room',
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('joinGroup', { value: action.options.value })
			},
		},

		leaveGroup: {
			name: 'Director: Leave Group',
			description: 'Have the director of a room leave a specified group room',
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('leaveGroup', { value: action.options.value })
			},
		},

		viewGroup: {
			name: 'Director: View Group',
			description: "Toggle the director of a room's preview of a specific group",
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('viewGroup', { value: action.options.value })
			},
		},

		joinViewGroup: {
			name: 'Director: Join View Group',
			description: 'Have the director of a room preview a specific group',
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('joinViewGroup', { value: action.options.value })
			},
		},

		leaveViewGroup: {
			name: 'Director: Leave View Group',
			description: 'Have the director of a room un-preview a specific group',
			options: [
				{
					type: 'number',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: 1,
					min: 1,
					max: 8,
				},
			],
			callback: (action) => {
				client.sendLocal('leaveViewGroup', { value: action.options.value })
			},
		},

		soloVideo: {
			name: 'Director: Toggle Highlight Video',
			description: 'Toggles highlighting your video for all guests',
			options: [],
			callback: () => {
				client.sendLocal('soloVideo', {})
			},
		},

		guestForward: {
			name: 'Director: Transfer Guest',
			description: 'Transfer guest to specified room',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Destination room',
					id: 'value',
					default: '',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('forward', action.options.target, { value: action.options.value })
			},
		},

		guestAddScene: {
			name: 'Director: Guest in Scene',
			description: 'Toggle guest in/out of specified scene',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Scene name or ID (0 to 8)',
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('addScene', action.options.target, { value: action.options.value })
			},
		},

		guestMuteScene: {
			name: 'Director: Guest Mic in Scene',
			description: "Toggle guest's mic audio in scenes",
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Scene name or ID (0 to 8)',
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('muteScene', action.options.target, { value: action.options.value })
			},
		},

		guestGroup: {
			name: 'Director: Guest in Group',
			description: 'Toggle guest in/out of specified group; default group 1',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Group ID (1 to 8)',
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('group', action.options.target, { value: action.options.value })
			},
		},

		guestMic: {
			name: 'Director: Guest Mic',
			description: 'Toggle the mic of a specific guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('mic', action.options.target, {})
			},
		},

		guestHangup: {
			name: 'Director: Hang Up Guest',
			description: 'Hangup a specific guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('hangup', action.options.target, {})
			},
		},

		guestSoloChat: {
			name: 'Director: Solo Talk',
			description: 'Toggle solo chat with a specific guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('soloChat', action.options.target, {})
			},
		},

		guestAltSoloChat: {
			name: 'Director: Two-way Solo Talk',
			description: 'Toggle two-way solo chat with a specific guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('soloChatBidirectional', action.options.target, {})
			},
		},

		guestSpeaker: {
			name: 'Director: Guest Speaker',
			description: 'Toggle speaker with a specific guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('speaker', action.options.target, {})
			},
		},

		guestDisplay: {
			name: 'Director: Guest Blind',
			description: 'Toggle whether a specific guest can see any video or not',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('display', action.options.target, {})
			},
		},

		guestOverlay: {
			name: 'Director: Overlay Message to Guest',
			description: 'Sends a chat message to a guest and displays it on screen',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Message',
					id: 'value',
					default: '',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('sendDirectorChat', action.options.target, { value: action.options.value })
			},
		},

		guestForceKeyframe: {
			name: 'Director: Force Keyframe',
			description: 'Helps resolve rainbow puke',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('forceKeyframe', action.options.target, {})
			},
		},

		guestSoloVideo: {
			name: 'Director: Toggle Guest Highlight',
			description: 'Toggle whether a video is highlighted everywhere',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendGuest('soloVideo', action.options.target, {})
			},
		},

		guestVolume: {
			name: 'Director: Set Guest Mic Volume',
			description: 'Set the microphone volume of a specific remote guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest',
					description: 'Position number or stream ID',
					id: 'target',
					minLength: 1,
					default: '1',
					useVariables: true,
				},
				{
					type: 'number',
					label: 'Volume (0 to 200)',
					id: 'value',
					default: 100,
					min: 0,
					max: 200,
					range: false,
				},
			],
			callback: (action) => {
				client.sendGuest('volume', action.options.target, { value: action.options.value })
			},
		},
	}
}
