exports.getPresets = function () {
	let presets = []

	const ColorWhite = this.rgb(255, 255, 255)
	const ColorBlack = this.rgb(0, 0, 0)
	const ColorRed = this.rgb(200, 0, 0)
	const ColorGreen = this.rgb(0, 200, 0)
	const ColorYellow = this.rgb(212, 174, 0)

	for (let s in this.states) {
		let stream = this.states[s]

		if (stream.position) {
			presets.push({
				category: 'Guest Actions',
				label: stream.streamID,
				bank: {
					style: 'text',
					text: `Guest ${stream.position}\\nMic\\n$(VDO.Ninja:guest_${stream.position}_mic)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: 0,
				},
				feedbacks: [
					{
						type: 'mic',
						options: {
							stream: stream.streamID,
							state: false,
						},
						style: {
							bgcolor: ColorGreen,
							color: ColorWhite,
						},
					},
				],
				actions: [
					{
						action: 'guestMic',
						options: {
							target: stream.position,
							value: 'toggle',
						},
					},
				],
			})
			presets.push({
				category: 'Guest Actions',
				label: stream.streamID,
				bank: {
					style: 'text',
					text: `Guest ${stream.position}\\nCamera\\n$(VDO.Ninja:guest_${stream.position}_camera)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: 0,
				},
				feedbacks: [
					{
						type: 'camera',
						options: {
							stream: stream.streamID,
							state: false,
						},
						style: {
							bgcolor: ColorGreen,
							color: ColorWhite,
						},
					},
				],
			})
		} else if (stream.director) {
			presets.push({
				category: 'Director Actions',
				label: stream.streamID,
				bank: {
					style: 'text',
					text: `Director\\nMic\\n$(VDO.Ninja:director_mic)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: 0,
				},
				feedbacks: [
					{
						type: 'mic',
						options: {
							stream: stream.streamID,
							state: false,
						},
						style: {
							bgcolor: ColorGreen,
							color: ColorWhite,
						},
					},
				],
				actions: [
					{
						action: 'mic',
						options: {
							value: 'toggle',
						},
					},
				],
			})
			presets.push({
				category: 'Director Actions',
				label: stream.streamID,
				bank: {
					style: 'text',
					text: `Director\\nCamera\\n$(VDO.Ninja:director_camera)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: 0,
				},
				feedbacks: [
					{
						type: 'camera',
						options: {
							stream: stream.streamID,
							state: false,
						},
						style: {
							bgcolor: ColorGreen,
							color: ColorWhite,
						},
					},
				],
				actions: [
					{
						action: 'camera',
						options: {
							value: 'toggle',
						},
					},
				],
			})
			presets.push({
				category: 'Director Actions',
				label: stream.streamID,
				bank: {
					style: 'text',
					text: `Director\\nSpeaker\\n$(VDO.Ninja:director_speaker)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: 0,
				},
				feedbacks: [
					{
						type: 'speaker',
						options: {
							stream: stream.streamID,
							state: false,
						},
						style: {
							bgcolor: ColorGreen,
							color: ColorWhite,
						},
					},
				],
				actions: [
					{
						action: 'speaker',
						options: {
							value: 'toggle',
						},
					},
				],
			})
		}
	}

	return presets
}
