module.exports = {
	getActions() {
		let mutableChoices = [
			{ id: 'toggle', label: 'Toggle' },
			{ id: 'true', label: 'Unmute' },
			{ id: 'false', label: 'Mute' },
		]
		let action = 'null'
		let target = 'null'
		let value = 'null'
		let object = {
			action: action,
			target: target,
			value: value,
		}

		let actions = {
			mic: {
				label: 'Mic Control',
				options: [
					{
						type: 'dropdown',
						label: 'Action',
						id: 'value',
						default: 'toggle',
						choices: mutableChoices,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('mic', null, action.options.value)
				},
			},

			speaker: {
				label: 'Speaker Control',
				options: [
					{
						type: 'dropdown',
						label: 'Action',
						id: 'value',
						default: 'toggle',
						choices: mutableChoices,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('speaker', null, action.options.value)
				},
			},

			volume: {
				label: 'Speaker Volume',
				options: [
					{
						type: 'number',
						label: 'Volume (0 to 100)',
						id: 'value',
						default: 100,
						min: 0,
						max: 100,
						range: false,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('volume', null, action.options.value)
				},
			},

			camera: {
				label: 'Camera Control',
				options: [
					{
						type: 'dropdown',
						label: 'Action',
						id: 'value',
						default: 'toggle',
						choices: mutableChoices,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('camera', null, action.options.value)
				},
			},

			record: {
				label: 'Record Local Video',
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
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('record', null, action.options.value)
				},
			},

			reload: {
				label: 'Reload',
				callback: (action) => {
					this.sendRequest('reload')
				},
			},

			hangup: {
				label: 'Hang Up',
				callback: (action) => {
					this.sendRequest('hangup')
				},
			},

			sendChat: {
				label: 'Send Chat Message',
				options: [
					{
						type: 'textinput',
						label: 'Message',
						id: 'value',
						default: '',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('sendChat', null, action.options.value)
				},
			},

			bitrate: {
				label: 'Set Bitrate',
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
						required: true,
					},
					{
						type: 'number',
						label: 'Bitrate in kbps (Must select "Custom" above)',
						id: 'bitrate',
						default: 1500,
						min: 0,
						range: false,
						required: true,
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
				label: 'Set Panning',
				options: [
					{
						type: 'number',
						label: 'Pan (0 [Left] to 180 [Right], 90 [Center])',
						id: 'value',
						default: 90,
						min: 0,
						max: 180,
						range: false,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('panning', null, action.options.value)
				},
			},

			togglehand: {
				label: 'Raise Hand',
				callback: (action) => {
					this.sendRequest('togglehand')
				},
			},

			togglescreenshare: {
				label: 'Toggle Screen Share',
				callback: (action) => {
					this.sendRequest('togglescreenshare')
				},
			},

			guestMic: {
				label: 'Room Guest: Mute/Unmute Guest',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'dropdown',
						label: 'Action',
						id: 'value',
						default: 'toggle',
						choices: mutableChoices,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('mic', action.options.target, action.options.value)
				},
			},

			guestSpeaker: {
				label: 'Room Guest: Deafen/Un-Deafen Guest',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'dropdown',
						label: 'Action',
						id: 'value',
						default: 'toggle',
						choices: mutableChoices,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('speaker', action.options.target, action.options.value)
				},
			},

			guestVolume: {
				label: 'Room Guest: Mic Volume',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'number',
						label: 'Volume (0 to 200)',
						id: 'value',
						default: 100,
						min: 0,
						max: 200,
						range: false,
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('volume', action.options.target, action.options.value)
				},
			},

			guestHangup: {
				label: 'Room Guest: Hang Up',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('hangup', action.options.target)
				},
			},

			guestForward: {
				label: 'Room Guest: Transfer',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'textinput',
						label: 'Destination Room (room ID)',
						id: 'value',
						default: '',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('forward', action.options.target, action.options.value)
				},
			},

			guestGroup: {
				label: 'Room Guest: Add/Remove Group',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'textinput',
						label: 'Group Number (1 to 8)',
						id: 'value',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('group', action.options.target, action.options.value)
				},
			},

			guestAddScene: {
				label: 'Room Guest: Add/Remove Scene',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'textinput',
						label: 'Scene (1-8, or custom scene name)',
						id: 'value',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('addScene', action.options.target, action.options.value)
				},
			},

			guestMuteScene: {
				label: 'Room Guest: Mute Guest in Scene',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
					{
						type: 'textinput',
						label: 'Scene (1-8, or custom scene name)',
						id: 'value',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('muteScene', action.options.target, action.options.value)
				},
			},

			guestDisplay: {
				label: 'Room Guest: Blind/Un-Blind Guest',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('display', action.options.target)
				},
			},

			guestSoloVideo: {
				label: 'Room Guest: Toggle Highlight Guest',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('soloVideo', action.options.target)
				},
			},

			guestForceKeyframe: {
				label: 'Room Guest: Send Keyframe',
				description: 'Helps resolve rainbow puke',
				options: [
					{
						type: 'textinput',
						label: 'Guest (position or stream ID)',
						id: 'target',
						default: '1',
						required: true,
					},
				],
				callback: (action) => {
					this.sendRequest('forceKeyframe', action.options.target)
				},
			},
		}
		return actions
	},
}
