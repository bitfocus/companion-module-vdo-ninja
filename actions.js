module.exports = {
	getActions() {
		let actions = {}

		let mutableChoices = [
			{ id: 'toggle', label: 'Toggle' },
			{ id: 'true', label: 'Unmute' },
			{ id: 'false', label: 'Mute' },
		]

		actions['mic'] = {
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
		}

		actions['speaker'] = {
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
		}

		actions['volume'] = {
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
		}

		actions['camera'] = {
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
		}

		actions['record'] = {
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
		}

		actions['reload'] = {
			label: 'Reload Current Page',
		}

		actions['hangup'] = {
			label: 'Hang Up Current Connection',
		}

		actions['sendChat'] = {
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
		}

		actions['bitrate'] = {
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
		}

		actions['panning'] = {
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
		}

		actions['togglehand'] = {
			label: 'Raise Hand',
		}

		actions['togglescreenshare'] = {
			label: 'Toggle Screen Share',
		}

		actions['guestMic'] = {
			label: 'Room Guest: Mute/Unmute Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestSpeaker'] = {
			label: 'Room Guest: Deafen/Un-Deafen Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestVolume'] = {
			label: 'Room Guest: Mic Volume',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestHangup'] = {
			label: 'Room Guest: Hang Up',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
					id: 'target',
					default: '1',
					required: true,
				},
			],
		}

		actions['guestForward'] = {
			label: 'Room Guest: Transfer',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestAddScene'] = {
			label: 'Room Guest: Add to Scene',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestMuteScene'] = {
			label: 'Room Guest: Mute Guest in Scene',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
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
		}

		actions['guestDisplay'] = {
			label: 'Room Guest: Blind/Un-Blind Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
					id: 'target',
					default: '1',
					required: true,
				},
			],
		}

		actions['guestSoloVideo'] = {
			label: 'Room Guest: Highlight Guest',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
					id: 'target',
					default: '1',
					required: true,
				},
			],
		}

		actions['guestForceKeyframe'] = {
			label: 'Room Guest: Send Keyframe',
			description: 'Helps resolve rainbow puke',
			options: [
				{
					type: 'textinput',
					label: 'Guest (number or stream ID)',
					id: 'target',
					default: '1',
					required: true,
				},
			],
		}

		return actions
	},
}
