exports.updateVariableDefinitions = function () {
	const variables = []

	for (let x in this.states) {
		let data = this.states[x]
		let name = data.label ? `(${data.label})` : ''

		if (data.streamID) {
			if (data.director) {
				variables.push({ name: `director_mic`, label: `Director - Mic` })
				variables.push({ name: `director_camera`, label: `Director - Camera` })
				variables.push({ name: `director_speaker`, label: `Director - Speaker` })
			} else if (data.position) {
				variables.push({ name: `guest_${data.position}_mic`, label: `Guest ${data.position} ${name} - Mic` })
				variables.push({ name: `guest_${data.position}_camera`, label: `Guest ${data.position} ${name} - Camera` })
			} else {
				variables.push({ name: `${data.streamID}_mic`, label: `${data.streamID} ${name} - Mic` })
				variables.push({ name: `${data.streamID}_camera`, label: `${data.streamID} ${name} - Camera` })
			}
		}
	}
	this.setVariableDefinitions(variables)
}

exports.updateVariables = function () {
	for (let x in this.states) {
		let data = this.states[x]

		if (data.streamID) {
			if (data.director) {
				this.setVariables({
					director_mic: data.muted ? 'Muted' : 'Unmuted',
					director_camera: data.videoMuted ? 'Muted' : 'Unmuted',
					director_speaker: data.speakerMuted ? 'Muted' : 'Unmuted',
				})
			} else if (data.position) {
				this.setVariables({
					[`guest_${data.position}_mic`]: data.muted || data.others['mute-guest'] ? 'Muted' : 'Unmuted',
					[`guest_${data.position}_camera`]: data.videoMuted || data.others['hide-guest'] ? 'Muted' : 'Unmuted',
				})
			} else {
				this.setVariables({
					[`${data.streamID}_mic`]: data.muted ? 'Muted' : 'Unmuted',
					[`${data.streamID}_camera`]: data.videoMuted ? 'Muted' : 'Unmuted',
				})
			}
		}
	}
}
