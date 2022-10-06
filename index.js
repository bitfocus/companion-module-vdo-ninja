const instance_skel = require('../../instance_skel')
const actions = require('./actions')
const presets = require('./presets')
const { updateVariableDefinitions, updateVariables } = require('./variables')
const { initFeedbacks } = require('./feedbacks')
const WebSocket = require('ws')

let debug
let log

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)

		Object.assign(this, {
			...actions,
			...presets,
		})

		this.updateVariableDefinitions = updateVariableDefinitions
		this.updateVariables = updateVariables

		return this
	}

	init() {
		debug = this.debug
		log = this.log

		this.status(this.STATUS_WARNING, 'Connecting')

		if (!this.config) {
			return this
		}
		this.states = {}
		this.streams = []
		this.initWebSocket()
		this.actions()
		this.initFeedbacks()
		this.initVariables()
	}

	destroy() {
		this.states = {}
		this.streams = []
		if (this.ws !== undefined) {
			this.ws.close(1000)
			delete this.ws
		}
		if (this.reconnect) {
			clearInterval(this.reconnect)
		}
	}

	updateConfig(config) {
		this.config = config
		this.initWebSocket()
	}

	initWebSocket() {
		if (this.reconnect) {
			clearInterval(this.reconnect)
		}

		if (this.ws !== undefined) {
			this.ws.close(1000)
			delete this.ws
		}

		this.ws = new WebSocket(`wss://api.vdo.ninja:443`)

		this.ws.on('open', () => {
			if (this.currentStatus != 0) {
				this.log('info', `Connection opened to VDO.Ninja`)
			}
			this.status(this.STATUS_OK)
			if (this.config.apiID) {
				this.ws.send(`{"join": "${this.config.apiID}" }`)
				this.ws.send(`{"action": "getDetails"}`)
			} else {
				this.log('warn', `API ID required to connect to VDO.Ninja, please add one in the module settings`)
				this.status(this.STATUS_WARNING, 'Missing API ID')
			}
		})

		this.ws.on('close', (code) => {
			if (code !== 1000 && code !== 1006) {
				this.debug('error', `Websocket closed:  ${code}`)
			}
			this.reconnect = setInterval(() => {
				this.initWebSocket()
			}, 1000)
		})

		this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

		this.ws.on('error', (data) => {
			if (this.currentStatus != 2) {
				this.status(this.STATUS_ERROR)
				if (data?.code == 'ENOTFOUND') {
					this.log('error', `Unable to reach api.vdo.ninja`)
				} else {
					this.log('error', `WebSocket ${data}`)
				}
			}
			this.ws.close()
		})
	}

	messageReceivedFromWebSocket(data) {
		this.debug(`Message received: ${data}`)
		let message = JSON.parse(data)
		if (message?.callback) {
			let callback = message.callback
			let result = callback.result
			if (callback.action == 'getDetails') {
				for (let x in result) {
					let data = result[x]
					this.processGetDetails(data)
				}
			}
		} else if (message?.update) {
			let data = message.update
			this.processUpdate(data)
		}
	}

	processGetDetails(data) {
		this.states[data.streamID] = data
		let label = data.streamID
		let name = data.label ? `(${data.label})` : ''
		if (data.director) {
			label = 'Director'
		} else if (data.position) {
			label = `Guest ${data.position} ${name}`
		} else if (data.label) {
			label = data.label
		}

		let streamObject = { id: data.streamID, label: label }

		if (this.streams.find((o) => o.id === data.streamID)) {
			let index = this.streams.findIndex((o) => {
				return o.id === data.streamID
			})
			this.streams.splice(index, 1, streamObject)
			this.initFeedbacks()
			this.initVariables()
			this.initPresets()
		} else {
			this.streams.push(streamObject)
			this.initFeedbacks()
			this.initVariables()
			this.updateVariables()
			this.initPresets()
		}
	}

	processUpdate(data) {
		if (this.states[data.streamID]) {
			if (data.action === 'hangup' && data.value) {
				delete this.states[data.streamID]
				let index = this.streams.findIndex((o) => {
					return o.id === data.streamID
				})
				this.streams.splice(index, 1)
				this.actions()
				this.initVariables()
				this.initFeedbacks()
			} else if (data.action === 'newViewConnection') {
				//this.ws.send(`{"action": "getDetails"}`)
			} else if (data.action === 'director') {
				this.states[data.streamID][data.action] = data.value
				this.actions()
				this.initVariables()
				this.initFeedbacks()
			} else if (data.action === 'endViewConnection' && data.value) {
				delete this.states[data.value]
				let index = this.streams.findIndex((o) => {
					return o.id === data.value
				})
				this.streams.splice(index, 1)
				this.actions()
				this.initVariables()
				this.initFeedbacks()
			} else if (data.action === 'positionChange') {
				this.ws.send(`{"action": "getDetails"}`)
			} else if (data.action === 'directorMuted') {
				this.states[data.streamID].others['mute-guest'] = data.value ? 1 : 0
			} else if (data.action === 'directorVideoMuted') {
				this.states[data.streamID].others['hide-guest'] = data.value ? 1 : 0
			} else if (data.action === 'remoteMuted') {
				this.states[data.streamID].muted = data.value
			} else if (data.action === 'remoteVideoMuted') {
				this.states[data.streamID].videoMuted = data.value
			} else {
				this.states[data.streamID][data.action] = data.value
			}
			this.updateVariables()
			this.checkFeedbacks()
			this.debug(this.states)
		}
		if (data.action === 'seeding' || (data.action === 'tracksAdded' && data.value)) {
			this.ws.send(`{"action": "getDetails"}`)
		}
	}

	config_fields() {
		return [
			{
				type: 'textinput',
				id: 'apiID',
				label: 'API ID',
				width: 6,
			},
		]
	}

	actions(system) {
		this.setActions(this.getActions())
	}

	initFeedbacks() {
		const feedbacks = initFeedbacks.bind(this)()
		this.setFeedbackDefinitions(feedbacks)
	}

	initVariables() {
		this.updateVariableDefinitions()
	}

	initPresets() {
		this.setPresetDefinitions(this.getPresets())
	}

	sendRequest(action, target, value) {
		let object = {
			action: action ? action : 'null',
			target: target ? target : 'null',
			value: value ? value : 'null',
		}
		this.ws.send(JSON.stringify(object))
		this.debug('Sending:', JSON.stringify(object))
	}
}

exports = module.exports = instance
