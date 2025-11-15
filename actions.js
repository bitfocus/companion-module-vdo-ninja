export function getActions() {
	let mutableChoices = [
		{ id: 'toggle', label: 'Toggle' },
		{ id: 'true', label: 'Unmute' },
		{ id: 'false', label: 'Mute' },
	]

	let actions = {
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
				this.sendRequest('speaker', null, action.options.value)
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
				this.sendRequest('mic', null, action.options.value, true)
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
				this.sendRequest('camera', null, action.options.value, true)
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
				this.sendRequest('volume', null, action.options.value)
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
			callback: async (action, context) => {
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('sendChat', null, value)
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
				this.sendRequest('record', null, action.options.value)
			},
		},

		reload: {
			name: 'Local: Reload',
			description: 'Reload the current page',
			options: [],
			callback: () => {
				this.sendRequest('reload')
			},
		},

		hangup: {
			name: 'Local: Hang Up',
			description: 'Hang up the current connection.',
			options: [],
			callback: () => {
				this.sendRequest('hangup')
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
					range: false,
				},
			],
			callback: (action) => {
				this.sendRequest(
					'bitrate',
					null,
					action.options.value === 'custom' ? action.options.bitrate : action.options.value,
				)
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
				this.sendRequest('panning', null, action.options.value)
			},
		},

		togglehand: {
			name: 'Local: Raise Hand',
			description: 'Toggles whether your hand is raised or not',
			options: [],
			callback: () => {
				this.sendRequest('togglehand')
			},
		},

		togglescreenshare: {
			name: 'Local: Screen Share',
			description: 'Toggles screen sharing on or off - will prompt you to select the screen',
			options: [],
			callback: () => {
				this.sendRequest('togglescreenshare')
			},
		},

		forceKeyframe: {
			name: 'Local: Force Keyframe',
			description: 'Forces the publisher of a stream to issue keyframes to all viewers',
			options: [],
			callback: () => {
				this.sendRequest('forceKeyframe')
			},
		},

		nextSlide: {
			name: 'Local: Next Slide',
			description: 'For PowerPoint usage',
			options: [],
			callback: () => {
				this.sendRequest('nextSlide')
			},
		},

		previousSlide: {
			name: 'Local: Previous Slide',
			description: 'For PowerPoint usage',
			options: [],
			callback: () => {
				this.sendRequest('previousSlide')
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
				this.sendRequest('pan', null, decimalValue, true)
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
				this.sendRequest('tilt', null, decimalValue)
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
				this.sendRequest('zoom', null, decimalValue)
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
				this.sendRequest('focus', null, decimalValue)
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
				this.sendRequest('exposure', null, decimalValue)
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
				this.sendRequest('group', null, action.options.value)
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
				this.sendRequest('joinGroup', null, action.options.value)
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
				this.sendRequest('leaveGroup', null, action.options.value)
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
				this.sendRequest('viewGroup', null, action.options.value)
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
				this.sendRequest('joinViewGroup', null, action.options.value)
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
				this.sendRequest('leaveViewGroup', null, action.options.value)
			},
		},

		soloVideo: {
			name: 'Director: Toggle Highlight Video',
			description: 'Toggles highlighting your video for all guests',
			options: [],
			callback: (action) => {
				this.sendRequest('soloVideo', action.options.value)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('forward', target, value)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('addScene', target, value)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('muteScene', target, value)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('group', target, value)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('mic', target)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('hangup', target)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('soloChat', target, null)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('soloChatBidirectional', target, null)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('speaker', target)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('display', target)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				const value = await context.parseVariablesInString(action.options.value)
				this.sendRequest('sendDirectorChat', target, value)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('forceKeyframe', target)
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
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('soloVideo', target)
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
			callback: async (action, context) => {
				const target = await context.parseVariablesInString(action.options.target)
				this.sendRequest('volume', target, action.options.value)
			},
		},
	}
	return actions
}
