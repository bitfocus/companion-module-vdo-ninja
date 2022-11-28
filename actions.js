export function getActions() {
	let mutableChoices = [
		{ id: 'toggle', label: 'Toggle' },
		{ id: 'true', label: 'Unmute' },
		{ id: 'false', label: 'Mute' },
	]

	let actions = {
		mic: {
			name: 'Mic Control',
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
				this.sendRequest('mic', null, action.options.value)
			},
		},

		speaker: {
			name: 'Speaker Control',
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

		volume: {
			name: 'Speaker Volume',
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

		camera: {
			name: 'Camera Control',
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
				this.sendRequest('camera', null, action.options.value)
			},
		},

		record: {
			name: 'Record Local Video',
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
			name: 'Reload',
			options: [],
			callback: (action) => {
				this.sendRequest('reload')
			},
		},

		hangup: {
			name: 'Hang Up',
			options: [],
			callback: (action) => {
				this.sendRequest('hangup')
			},
		},

		sendChat: {
			name: 'Send Chat Message',
			options: [
				{
					type: 'textinput',
					label: 'Message',
					id: 'value',
					default: '',
				},
			],
			callback: (action) => {
				this.sendRequest('sendChat', null, action.options.value)
			},
		},

		bitrate: {
			name: 'Set Bitrate',
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
					action.options.value === 'custom' ? action.options.bitrate : action.options.value
				)
			},
		},

		panning: {
			name: 'Set Panning',
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
			name: 'Raise Hand',
			options: [],
			callback: (action) => {
				this.sendRequest('togglehand')
			},
		},

		togglescreenshare: {
			name: 'Toggle Screen Share',
			options: [],
			callback: (action) => {
				this.sendRequest('togglescreenshare')
			},
		},

		guestMic: {
			name: 'Room Guest: Mute/Unmute Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: mutableChoices,
				},
			],
			callback: (action) => {
				this.sendRequest('mic', action.options.target, action.options.value)
			},
		},

		guestSpeaker: {
			name: 'Room Guest: Deafen/Un-Deafen Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'value',
					default: 'toggle',
					choices: mutableChoices,
				},
			],
			callback: (action) => {
				this.sendRequest('speaker', action.options.target, action.options.value)
			},
		},

		guestVolume: {
			name: 'Room Guest: Mic Volume',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
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
				this.sendRequest('volume', action.options.target, action.options.value)
			},
		},

		guestHangup: {
			name: 'Room Guest: Hang Up',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('hangup', action.options.target)
			},
		},

		guestForward: {
			name: 'Room Guest: Transfer',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'textinput',
					label: 'Destination Room (room ID)',
					id: 'value',
					default: '',
				},
			],
			callback: (action) => {
				this.sendRequest('forward', action.options.target, action.options.value)
			},
		},

		guestGroup: {
			name: 'Room Guest: Add/Remove Group',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'textinput',
					label: 'Group Number (1 to 8)',
					id: 'value',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('group', action.options.target, action.options.value)
			},
		},

		guestAddScene: {
			name: 'Room Guest: Add/Remove Scene',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'textinput',
					label: 'Scene (1-8, or custom scene name)',
					id: 'value',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('addScene', action.options.target, action.options.value)
			},
		},

		guestMuteScene: {
			name: 'Room Guest: Mute Guest in Scene',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
				{
					type: 'textinput',
					label: 'Scene (1-8, or custom scene name)',
					id: 'value',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('muteScene', action.options.target, action.options.value)
			},
		},

		guestDisplay: {
			name: 'Room Guest: Blind/Un-Blind Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('display', action.options.target)
			},
		},

		guestSoloVideo: {
			name: 'Room Guest: Toggle Highlight Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('soloVideo', action.options.target)
			},
		},

		guestForceKeyframe: {
			name: 'Room Guest: Send Keyframe',
			description: 'Helps resolve rainbow puke',
			options: [
				{
					type: 'textinput',
					label: 'Guest (position or stream ID)',
					id: 'target',
					default: '1',
				},
			],
			callback: (action) => {
				this.sendRequest('forceKeyframe', action.options.target)
			},
		},
	}
	return actions
}
