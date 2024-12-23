import { combineRgb } from '@companion-module/base'

export function getFeedbacks() {
	const feedbacks = {}

	const ColorWhite = combineRgb(255, 255, 255)
	const ColorBlack = combineRgb(0, 0, 0)
	const ColorRed = combineRgb(200, 0, 0)
	const ColorGreen = combineRgb(0, 200, 0)
	const ColorOrange = combineRgb(255, 102, 0)

	feedbacks['mic'] = {
		type: 'boolean',
		name: 'Mic Status',
		description: 'If mic matches the selected state, change the style of the button',
		options: [
			{
				type: 'dropdown',
				label: 'Stream',
				id: 'stream',
				allowCustom: true,
				default: this.streams[0]?.id,
				choices: this.streams,
			},
			{
				type: 'dropdown',
				label: 'Mic State',
				id: 'state',
				default: true,
				choices: [
					{ id: true, label: 'Muted' },
					{ id: false, label: 'Unmuted' },
				],
			},
		],
		defaultStyle: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			let stream = this.states[feedback.options.stream]
			if (stream) {
				if (stream.position && !stream.director) {
					if (stream?.others?.['mute-guest'] == 1) {
						return feedback.options.state ?? false
					} else {
						return stream?.muted === feedback.options.state
					}
				} else {
					return stream?.muted === feedback.options.state
				}
			}
		},
	}
	feedbacks['camera'] = {
		type: 'boolean',
		name: 'Camera Status',
		description: 'If camera matches the selected state, change the style of the button',
		options: [
			{
				type: 'dropdown',
				label: 'Stream',
				id: 'stream',
				default: this.streams[0]?.id,
				choices: this.streams,
			},
			{
				type: 'dropdown',
				label: 'Camera Status',
				id: 'state',
				default: true,
				choices: [
					{ id: true, label: 'Muted' },
					{ id: false, label: 'Unmuted' },
				],
			},
		],
		defaultStyle: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			let stream = this.states[feedback.options.stream]
			if (stream) {
				if (stream.position && !stream.director) {
					if (stream?.others?.['hide-guest'] == 1) {
						return feedback.options.state ?? false
					} else {
						return stream?.videoMuted === feedback.options.state
					}
				} else {
					return stream?.videoMuted === feedback.options.state
				}
			}
		},
	}
	feedbacks['speaker'] = {
		type: 'boolean',
		name: 'Speaker Status',
		description: 'If speaker matches the selected state, change the style of the button',
		options: [
			{
				type: 'dropdown',
				label: 'Stream',
				id: 'stream',
				default: this.streams[0]?.id,
				choices: this.streams,
			},
			{
				type: 'dropdown',
				label: 'Speaker Status',
				id: 'state',
				default: true,
				choices: [
					{ id: true, label: 'Muted' },
					{ id: false, label: 'Unmuted' },
				],
			},
		],
		defaultStyle: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			return this.states[feedback.options.stream]?.speakerMuted === feedback.options.state
		},
	}
	feedbacks['guestScene'] = {
		type: 'boolean',
		name: 'Guest in Scene',
		description: 'If a stream is active the selected scene, change the style of the button',
		options: [
			{
				type: 'dropdown',
				label: 'Stream',
				id: 'stream',
				allowCustom: true,
				default: this.streams[0]?.id,
				choices: this.streams,
			},
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
			let stream = this.states[feedback.options.stream]
			let scene = feedback.options.scene
			if (stream) {
				return stream?.scenes?.[scene] == true
			} else {
				return false
			}
		},
	}

	return feedbacks
}
