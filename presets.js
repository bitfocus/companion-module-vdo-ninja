import { combineRgb } from '@companion-module/base'

export function getPresets() {
	let presets = {}

	const ColorWhite = combineRgb(255, 255, 255)
	const ColorBlack = combineRgb(0, 0, 0)
	const ColorRed = combineRgb(200, 0, 0)
	const ColorGreen = combineRgb(0, 200, 0)
	const ColorYellow = combineRgb(212, 174, 0)

	for (let s in this.states) {
		let stream = this.states[s]

		if (stream.position && !stream.director) {
			presets[`guest_${stream.position}_mic`] = {
				type: 'button',
				category: 'Guest Actions',
				name: `guest_${stream.position}_mic`,
				options: {},
				style: {
					text: `$(VDO.Ninja:guest_${stream.position}_label)\\nMic\\n$(VDO.Ninja:guest_${stream.position}_mic)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: ColorBlack,
				},
				feedbacks: [
					{
						feedbackId: 'mic',
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
				steps: [
					{
						down: [
							{
								actionId: 'guestMic',
								options: {
									target: stream.position,
									value: 'toggle',
								},
							},
						],
						up: [],
					},
				],
			}
			presets[`guest_${stream.position}_camera`] = {
				type: 'button',
				category: 'Guest Actions',
				name: `guest_${stream.position}_camera`,
				options: {},
				style: {
					text: `$(VDO.Ninja:guest_${stream.position}_label)\\nCamera\\n$(VDO.Ninja:guest_${stream.position}_camera)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: ColorBlack,
				},
				feedbacks: [
					{
						feedbackId: 'camera',
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
				steps: [
					{
						down: [],
						up: [],
					},
				],
			}
		} else if (stream.director) {
			presets[`director_mic`] = {
				type: 'button',
				category: 'Director Actions',
				name: stream.streamID,
				options: {},
				style: {
					text: `Director\\nMic\\n$(VDO.Ninja:director_mic)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: ColorBlack,
				},
				feedbacks: [
					{
						feedbackId: 'mic',
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
				steps: [
					{
						down: [
							{
								actionId: 'mic',
								options: {
									value: 'toggle',
								},
							},
						],
						up: [],
					},
				],
			}
			presets[`director_camera`] = {
				type: 'button',
				category: 'Director Actions',
				name: stream.streamID,
				options: {},
				style: {
					text: `Director\\nCamera\\n$(VDO.Ninja:director_camera)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: ColorBlack,
				},
				feedbacks: [
					{
						feedbackId: 'camera',
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
				steps: [
					{
						down: [
							{
								actionId: 'camera',
								options: {
									value: 'toggle',
								},
							},
						],
						up: [],
					},
				],
			}
			presets[`director_speaker`] = {
				type: 'button',
				category: 'Director Actions',
				name: stream.streamID,
				options: {},
				style: {
					text: `Director\\nSpeaker\\n$(VDO.Ninja:director_speaker)`,
					size: 'auto',
					color: ColorWhite,
					bgcolor: ColorBlack,
				},
				feedbacks: [
					{
						feedbackId: 'speaker',
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
				steps: [
					{
						down: [
							{
								actionId: 'speaker',
								options: {
									value: 'toggle',
								},
							},
						],
						up: [],
					},
				],
			}
		}
	}

	return presets
}
