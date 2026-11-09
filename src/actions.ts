import type { CompanionActionDefinitions, CompanionInputFieldDropdown, DropdownChoice } from '@companion-module/base'
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
	guestCamera: GuestOption
	guestHangup: GuestOption
	guestSoloChat: GuestOption
	guestAltSoloChat: GuestOption
	guestSpeaker: GuestOption
	guestDisplay: GuestOption
	guestOverlay: GuestValueOptions<string>
	guestForceKeyframe: GuestOption
	guestSoloVideo: GuestOption
	guestVolume: GuestValueOptions<number>
	showChatOverlay: ValueOption<string>
	roomTimer: { options: { value: TimerMode; seconds: number } }
	tallyLight: ValueOption<'onair' | 'active' | 'standby' | 'off'>
	activeSpeaker: ValueOption<'toggle' | 'false' | '1' | '2' | '3'>
	bufferDelay: { options: { value: number; stream: string } }
	layout: ValueOption<number>
	aspectRatio: ValueOption<string>
	videoConstraint: { options: { name: string; value: string } }
	guestSetSlot: GuestValueOptions<number>
	guestMixOrder: GuestValueOptions<-1 | 1>
	guestChannel: GuestValueOptions<0 | 1 | 2>
	guestPinnedOverlay: GuestValueOptions<string>
	guestRoomTimer: { options: { target: string; value: TimerMode; seconds: number } }
	guestPtz: { options: { target: string; axis: GuestPtzAxis; value: number } }
	guestAutofocus: GuestValueOptions<'true' | 'false'>
	guestMirror: GuestValueOptions<MutableValue>
	guestRotate: GuestValueOptions<'true' | '90' | '180' | '270' | 'false'>
	guestRequestResolution: GuestValueOptions<string>
	guestRequestAspectRatio: { options: { target: string; value: string; size: number } }
	guestCaptureSize: { options: { target: string; setting: 'setWidth' | 'setHeight' | 'setAspectRatio'; value: string } }
	guestRefresh: GuestValueOptions<'refreshVideo' | 'refreshConnection' | 'recoverStream'>
}

type TimerMode = 'start' | 'pause' | 'stop'
type GuestPtzAxis = 'ptzPan' | 'ptzTilt' | 'ptzZoom' | 'ptzFocus'

const ResolutionPattern = /^\d+x\d+$/

export function GetActions(
	client: Pick<VdoNinjaClient, 'sendLocal' | 'sendGuest'>,
): CompanionActionDefinitions<ActionsSchema> {
	const mutableChoices: DropdownChoice<MutableValue>[] = [
		{ id: 'toggle', label: 'Toggle' },
		{ id: 'true', label: 'Unmute' },
		{ id: 'false', label: 'Mute' },
	]

	const guestField = {
		type: 'textinput',
		label: 'Guest',
		description: 'Position number or stream ID',
		id: 'target',
		minLength: 1,
		default: '1',
		useVariables: true,
	} as const

	const timerModeField: CompanionInputFieldDropdown<'value', TimerMode> = {
		type: 'dropdown',
		label: 'Action',
		id: 'value',
		default: 'start',
		choices: [
			{ id: 'start', label: 'Start' },
			{ id: 'pause', label: 'Pause or resume' },
			{ id: 'stop', label: 'Stop' },
		],
	}
	const timerSecondsField = {
		type: 'number',
		label: 'Countdown (seconds)',
		id: 'seconds',
		default: 600,
		min: 1,
		max: 86400,
		range: false,
		isVisibleExpression: `$(options:value) == 'start'`,
	} as const

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
				guestField,
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
				guestField,
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
				guestField,
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
				guestField,
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
			options: [guestField],
			callback: (action) => {
				client.sendGuest('mic', action.options.target, {})
			},
		},

		guestCamera: {
			name: 'Director: Guest Camera',
			description: 'Toggle the camera of a specific guest',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('camera', action.options.target, {})
			},
		},

		guestHangup: {
			name: 'Director: Hang Up Guest',
			description: 'Hangup a specific guest',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('hangup', action.options.target, {})
			},
		},

		guestSoloChat: {
			name: 'Director: Solo Talk',
			description: 'Toggle solo chat with a specific guest',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('soloChat', action.options.target, {})
			},
		},

		guestAltSoloChat: {
			name: 'Director: Two-way Solo Talk',
			description: 'Toggle two-way solo chat with a specific guest',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('soloChatBidirectional', action.options.target, {})
			},
		},

		guestSpeaker: {
			name: 'Director: Guest Speaker',
			description: 'Toggle speaker with a specific guest',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('speaker', action.options.target, {})
			},
		},

		guestDisplay: {
			name: 'Director: Guest Blind',
			description: 'Toggle whether a specific guest can see any video or not',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('display', action.options.target, {})
			},
		},

		guestOverlay: {
			name: 'Director: Overlay Message to Guest',
			description: 'Sends a chat message to a guest and displays it on screen',
			options: [
				guestField,
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
			options: [guestField],
			callback: (action) => {
				client.sendGuest('forceKeyframe', action.options.target, {})
			},
		},

		guestSoloVideo: {
			name: 'Director: Toggle Guest Highlight',
			description: 'Toggle whether a video is highlighted everywhere',
			options: [guestField],
			callback: (action) => {
				client.sendGuest('soloVideo', action.options.target, {})
			},
		},

		guestVolume: {
			name: 'Director: Set Guest Mic Volume',
			description: 'Set the microphone volume of a specific remote guest',
			options: [
				guestField,
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

		showChatOverlay: {
			name: 'Local: Show Overlay Message',
			description: 'Shows a message on screen on this page only, without sending it to anyone',
			options: [{ type: 'textinput', label: 'Message', id: 'value', default: '', useVariables: true }],
			callback: (action) => {
				client.sendLocal('showChatOverlay', { value: action.options.value })
			},
		},

		roomTimer: {
			name: 'Director: Room Timer',
			description: 'Start, pause or stop the countdown timer shown to everyone in the room',
			options: [timerModeField, timerSecondsField],
			callback: (action) => {
				const { value, seconds } = action.options
				if (value === 'start') client.sendLocal('startRoomTimer', { value: seconds })
				else if (value === 'pause') client.sendLocal('pauseRoomTimer', {})
				else client.sendLocal('stopRoomTimer', {})
			},
		},

		tallyLight: {
			name: 'Local: Tally Light',
			description: 'Set the tally light shown on this page',
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'value',
					default: 'onair',
					choices: [
						{ id: 'onair', label: 'On air' },
						{ id: 'active', label: 'Active' },
						{ id: 'standby', label: 'Standby' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: (action) => {
				client.sendLocal('tallylight', { value: action.options.value })
			},
		},

		activeSpeaker: {
			name: 'Local: Active Speaker Layout',
			description: 'Switch the layout that follows whoever is speaking, as &activespeaker does',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'value',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'false', label: 'Off' },
						{ id: '1', label: 'Mode 1' },
						{ id: '2', label: 'Mode 2' },
						{ id: '3', label: 'Mode 3' },
					],
				},
			],
			callback: (action) => {
				const { value } = action.options
				client.sendLocal('activeSpeaker', {
					value: value === 'toggle' || value === 'false' ? value : (Number(value) as 1 | 2 | 3),
				})
			},
		},

		bufferDelay: {
			name: 'Local: Buffer Delay',
			description: 'Delay incoming audio and video to keep it in sync with other sources',
			options: [
				{ type: 'number', label: 'Delay (ms)', id: 'value', default: 0, min: 0, max: 20000, range: false },
				{
					type: 'textinput',
					label: 'Stream',
					description: 'Stream ID, * for every stream, or empty for streams that connect from now on',
					id: 'stream',
					default: '*',
					useVariables: true,
				},
			],
			callback: (action) => {
				const stream = action.options.stream.trim()
				client.sendLocal('setBufferDelay', { value: action.options.value, value2: stream || undefined })
			},
		},

		layout: {
			name: 'Local: Mixer Layout',
			description: 'Switch to one of the layouts given with &layouts, or back to the automatic mixer',
			options: [
				{
					type: 'number',
					label: 'Layout',
					description: '0 for the automatic mixer, or 1 and up for each layout in &layouts',
					id: 'value',
					default: 0,
					min: 0,
					max: 100,
					range: false,
				},
			],
			callback: (action) => {
				client.sendLocal('layout', { value: action.options.value })
			},
		},

		aspectRatio: {
			name: 'Local: Camera Aspect Ratio',
			description: "Change this page's camera aspect ratio",
			options: [
				{
					type: 'textinput',
					label: 'Aspect ratio',
					description: 'Such as 16:9 or 1.777',
					id: 'value',
					default: '16:9',
					useVariables: true,
				},
			],
			callback: (action) => {
				client.sendLocal('aspectRatio', { value: action.options.value })
			},
		},

		videoConstraint: {
			name: 'Local: Camera Setting',
			description: "Change a setting of this page's camera, such as brightness or white balance",
			options: [
				{
					type: 'textinput',
					label: 'Setting',
					description: 'The camera constraint name, such as brightness, whiteBalanceMode or frameRate',
					id: 'name',
					default: '',
					useVariables: true,
				},
				{ type: 'textinput', label: 'Value', id: 'value', default: '', useVariables: true },
			],
			callback: (action) => {
				const name = action.options.name.trim()
				if (name) client.sendLocal('videoConstraint', { value: name, value2: action.options.value })
			},
		},

		guestSetSlot: {
			name: 'Director: Set Guest Mixer Slot',
			description: 'Assign a guest to a mixer slot. Needs slots in use (&slotmode on the director, or the mixer)',
			options: [
				guestField,
				{
					type: 'number',
					label: 'Slot',
					description: '0 to take the guest out of their slot',
					id: 'value',
					default: 1,
					min: 0,
					max: 99,
					range: false,
				},
			],
			callback: (action) => {
				client.sendGuest('setslot', action.options.target, { value: action.options.value })
			},
		},

		guestMixOrder: {
			name: 'Director: Move Guest in Mix',
			description: 'Move a guest earlier or later in the order of the automatic mixer',
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Direction',
					id: 'value',
					default: -1,
					choices: [
						{ id: -1, label: 'Earlier' },
						{ id: 1, label: 'Later' },
					],
				},
			],
			callback: (action) => {
				client.sendGuest('mixorder', action.options.target, { value: action.options.value })
			},
		},

		guestChannel: {
			name: 'Director: Isolate Guest Audio Channel',
			description: "Toggle hearing only one channel of a guest's audio",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Channel',
					id: 'value',
					default: 1,
					choices: [
						{ id: 1, label: 'Channel 1' },
						{ id: 2, label: 'Channel 2' },
						{ id: 0, label: 'All channels' },
					],
				},
			],
			callback: (action) => {
				client.sendGuest('channel', action.options.target, { value: action.options.value })
			},
		},

		guestPinnedOverlay: {
			name: 'Director: Pinned Overlay Message to Guest',
			description: 'Sends a message to a guest that stays on their screen until they close it',
			options: [guestField, { type: 'textinput', label: 'Message', id: 'value', default: '', useVariables: true }],
			callback: (action) => {
				client.sendGuest('sendPinnedDirectorChat', action.options.target, { value: action.options.value })
			},
		},

		guestRoomTimer: {
			name: 'Director: Guest Timer',
			description: 'Start, pause or stop the countdown timer shown to one guest',
			options: [guestField, timerModeField, timerSecondsField],
			callback: (action) => {
				const { target, value, seconds } = action.options
				if (value === 'start') client.sendGuest('startRoomTimer', target, { value: seconds })
				else if (value === 'pause') client.sendGuest('pauseRoomTimer', target, {})
				else client.sendGuest('stopRoomTimer', target, {})
			},
		},

		guestPtz: {
			name: 'Director: Move Guest Camera',
			description: "Pan, tilt, zoom or focus a guest's camera. Needs a camera that supports it, and &ptz on the guest",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Control',
					id: 'axis',
					default: 'ptzPan',
					choices: [
						{ id: 'ptzPan', label: 'Pan left (-) or right (+)' },
						{ id: 'ptzTilt', label: 'Tilt up (-) or down (+)' },
						{ id: 'ptzZoom', label: 'Zoom in (-) or out (+)' },
						{ id: 'ptzFocus', label: 'Focus near (-) or far (+)' },
					],
				},
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
				const { target, axis, value } = action.options
				client.sendGuest(axis, target, { value: value / 100 })
			},
		},

		guestAutofocus: {
			name: 'Director: Guest Camera Autofocus',
			description: "Turn a guest camera's autofocus on or off",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Autofocus',
					id: 'value',
					default: 'true',
					choices: [
						{ id: 'true', label: 'On' },
						{ id: 'false', label: 'Off (manual focus)' },
					],
				},
			],
			callback: (action) => {
				client.sendGuest('ptzAutofocus', action.options.target, { value: action.options.value })
			},
		},

		guestMirror: {
			name: 'Director: Mirror Guest Video',
			description: "Mirror a guest's video for everyone who sees it",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'true', label: 'Mirror' },
						{ id: 'false', label: 'Unmirror' },
					],
				},
			],
			callback: (action) => {
				client.sendGuest('mirror', action.options.target, { value: action.options.value })
			},
		},

		guestRotate: {
			name: 'Director: Rotate Guest Video',
			description: "Rotate a guest's video",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Rotation',
					id: 'value',
					default: 'true',
					choices: [
						{ id: 'true', label: 'Turn 90° more' },
						{ id: '90', label: '90°' },
						{ id: '180', label: '180°' },
						{ id: '270', label: '270°' },
						{ id: 'false', label: 'Reset' },
					],
				},
			],
			callback: (action) => {
				const { target, value } = action.options
				client.sendGuest('rotate', target, {
					value: value === 'true' || value === 'false' ? value : (Number(value) as 90 | 180 | 270),
				})
			},
		},

		guestRequestResolution: {
			name: 'Director: Request Guest Resolution',
			description: "Ask a guest to send video at a resolution, for the director's view of them",
			options: [
				guestField,
				{
					type: 'textinput',
					label: 'Resolution',
					description: 'WIDTHxHEIGHT, such as 1280x720',
					id: 'value',
					default: '1280x720',
					regex: `/${ResolutionPattern.source}/`,
					useVariables: true,
				},
			],
			callback: (action) => {
				const resolution = action.options.value.trim()
				if (!ResolutionPattern.test(resolution)) return
				client.sendGuest('requestResolution', action.options.target, {
					value: resolution as `${number}x${number}`,
				})
			},
		},

		guestRequestAspectRatio: {
			name: 'Director: Request Guest Aspect Ratio',
			description: "Ask a guest to send video at an aspect ratio, for the director's view of them",
			options: [
				guestField,
				{
					type: 'textinput',
					label: 'Aspect ratio',
					description: 'Such as 16:9 or 1.777',
					id: 'value',
					default: '16:9',
					useVariables: true,
				},
				{
					type: 'number',
					label: 'Longest side (px)',
					id: 'size',
					default: 1920,
					min: 1,
					max: 7680,
					range: false,
				},
			],
			callback: (action) => {
				const { target, value, size } = action.options
				client.sendGuest('requestAspectRatio', target, { value, value2: size })
			},
		},

		guestCaptureSize: {
			name: 'Director: Set Guest Camera Size',
			description: "Change the width, height or aspect ratio a guest's camera captures at",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Setting',
					id: 'setting',
					default: 'setWidth',
					choices: [
						{ id: 'setWidth', label: 'Width (px)' },
						{ id: 'setHeight', label: 'Height (px)' },
						{ id: 'setAspectRatio', label: 'Aspect ratio (such as 1.777)' },
					],
				},
				{ type: 'textinput', label: 'Value', id: 'value', default: '1280', useVariables: true },
			],
			callback: (action) => {
				const { target, setting, value } = action.options
				client.sendGuest(setting, target, { value })
			},
		},

		guestRefresh: {
			name: 'Director: Refresh Guest',
			description: "Recover a guest's frozen video or failing connection",
			options: [
				guestField,
				{
					type: 'dropdown',
					label: 'Refresh',
					id: 'value',
					default: 'refreshVideo',
					choices: [
						{ id: 'refreshVideo', label: 'Video' },
						{ id: 'refreshConnection', label: 'Connection' },
						{ id: 'recoverStream', label: 'Everything' },
					],
				},
			],
			callback: (action) => {
				client.sendGuest(action.options.value, action.options.target, {})
			},
		},
	}
}
