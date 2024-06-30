export function getVariables() {
	const variables = []

	for (let x in this.states) {
		let data = this.states[x]
		let name = data.label ? `(${data.label})` : ''

		if (data.streamID) {
			if (data.director) {
				variables.push({ variableId: `director_mic`, name: `Director - Mic` })
				variables.push({ variableId: `director_camera`, name: `Director - Camera` })
				variables.push({ variableId: `director_speaker`, name: `Director - Speaker` })
			} else if (data.position) {
				variables.push({ variableId: `guest_${data.position}_mic`, name: `Guest ${data.position} ${name} - Mic` })
				variables.push({ variableId: `guest_${data.position}_camera`, name: `Guest ${data.position} ${name} - Camera` })
				variables.push({ variableId: `guest_${data.position}_label`, name: `Guest ${data.position} - Label` })
			}
			variables.push({ variableId: `${data.streamID}_mic`, name: `Stream ID: ${data.streamID} - Mic` })
			variables.push({ variableId: `${data.streamID}_camera`, name: `Stream ID: ${data.streamID} - Camera` })
			variables.push({ variableId: `${data.streamID}_label`, name: `Stream ID: ${data.streamID} - Label` })
		}
	}
	return variables
}

export function updateVariables() {
	for (let x in this.states) {
		let data = this.states[x]
		let label = data.label ? data.label : `Guest ${data.position}`

		if (data.streamID) {
			if (data.director) {
				label = 'Director'
				this.setVariableValues({
					director_mic: data.muted ? 'Muted' : 'Unmuted',
					director_camera: data.videoMuted ? 'Muted' : 'Unmuted',
					director_speaker: data.speakerMuted ? 'Muted' : 'Unmuted',
				})
			} else if (data.position) {
				this.setVariableValues({
					[`guest_${data.position}_mic`]: data.muted || data.others?.['mute-guest'] == 1 ? 'Muted' : 'Unmuted',
					[`guest_${data.position}_camera`]: data.videoMuted || data.others?.['hide-guest'] == 1 ? 'Muted' : 'Unmuted',
					[`guest_${data.position}_label`]: label,
				})
			}
			this.setVariableValues({
				[`${data.streamID}_mic`]: data.muted || data.others?.['mute-guest'] == 1 ? 'Muted' : 'Unmuted',
				[`${data.streamID}_camera`]: data.videoMuted || data.others?.['hide-guest'] == 1 ? 'Muted' : 'Unmuted',
				[`${data.streamID}_label`]: label,
			})
		}
	}
}
