exports.initFeedbacks = function () {
	const feedbacks = {}

	const ColorWhite = this.rgb(255, 255, 255)
	const ColorBlack = this.rgb(0, 0, 0)
	const ColorRed = this.rgb(200, 0, 0)
	const ColorGreen = this.rgb(0, 200, 0)
	const ColorOrange = this.rgb(255, 102, 0)

	feedbacks['mic'] = {
		type: 'boolean',
		label: 'Mic Status',
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
		style: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			if (this.states[feedback.options.stream]?.position) {
				if (feedback.options.state) {
					if (
						this.states[feedback.options.stream]?.others['mute-guest'] ||
						this.states[feedback.options.stream]?.muted
					) {
						return true
					}
				} else {
					if (
						this.states[feedback.options.stream]?.others['mute-guest'] === 0 &&
						this.states[feedback.options.stream]?.muted === false
					) {
						return true
					}
				}
			} else {
				return this.states[feedback.options.stream]?.muted === feedback.options.state
			}
		},
	}
	feedbacks['camera'] = {
		type: 'boolean',
		label: 'Camera Status',
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
		style: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			if (this.states[feedback.options.stream]?.position) {
				if (feedback.options.state) {
					if (
						this.states[feedback.options.stream]?.others['hide-guest'] ||
						this.states[feedback.options.stream]?.videoMuted
					) {
						return true
					}
				} else {
					if (
						this.states[feedback.options.stream]?.others['hide-guest'] === 0 &&
						this.states[feedback.options.stream]?.videoMuted === false
					) {
						return true
					}
				}
			} else {
				return this.states[feedback.options.stream]?.videoMuted === feedback.options.state
			}
		},
	}
	feedbacks['speaker'] = {
		type: 'boolean',
		label: 'Speaker Status',
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
		style: {
			color: ColorWhite,
			bgcolor: ColorGreen,
		},
		callback: (feedback) => {
			return this.states[feedback.options.stream]?.speakerMuted === feedback.options.state
		},
	}

	return feedbacks
}
