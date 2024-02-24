import { InstanceBase, InstanceStatus, runEntrypoint } from '@companion-module/base'
import { getActions } from './actions.js'
import { getPresets } from './presets.js'
import { getVariables, updateVariables } from './variables.js'
import { getFeedbacks } from './feedbacks.js'
import { upgradeScripts } from './upgrades.js'

import WebSocket from 'ws'

class VDONinjaInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.updateVariables = updateVariables
	}

	async init(config) {
		this.updateStatus(InstanceStatus.Connecting)

		this.config = config

		this.connected = null
		this.states = {}
		this.streams = []
		this.initWebSocket()
		this.initActions()
		this.initFeedbacks()
		this.initVariables()
	}

	async destroy() {
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

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'apiID',
				label: 'API ID',
				width: 6,
			},
			{
				type: 'checkbox',
				id: 'wsCustom',
				label: 'Custom Websockets Server (Advanced)',
				default: false,
				width: 6,
			},
			{
				type: 'textinput',
				id: 'wsServer',
				label: 'Custom Websockets Server Domain',
				default: 'api.vdo.ninja',
				tooltip:
					'Only use this if you are self-hosting your own websockets server. Only include the domain, not "wss://" or port',
				width: 6,
				isVisible: (options) => options.wsCustom,
			},
		]
	}

	async configUpdated(config) {
		this.config = config
		if (this.reconnect) {
			clearInterval(this.reconnect)
		}
		this.initWebSocket()
	}

	initVariables() {
		const variables = getVariables.bind(this)()
		this.setVariableDefinitions(variables)
	}

	initFeedbacks() {
		const feedbacks = getFeedbacks.bind(this)()
		this.setFeedbackDefinitions(feedbacks)
	}

	initPresets() {
		const presets = getPresets.bind(this)()
		this.setPresetDefinitions(presets)
	}

	initActions() {
		const actions = getActions.bind(this)()
		this.setActionDefinitions(actions)
	}

	initWebSocket() {
		if (this.reconnect) {
			clearInterval(this.reconnect)
		}
		if (this.config.apiID) {
			if (this.ws !== undefined) {
				this.ws.close(1000)
				delete this.ws
			}

			let serverUrl = 'api.vdo.ninja'
			if (this.config.wsCustom && this.config.wsServer) {
				serverUrl = this.config.wsServer
			}

			this.ws = new WebSocket(`wss://${serverUrl}:443`)

			this.ws.on('open', () => {
				if (!this.connected) {
					this.log('info', `Connection opened to VDO.Ninja`)
					this.connected = true
				}
				this.updateStatus(InstanceStatus.Ok)

				this.ws.send(`{"join": "${this.config.apiID}" }`)
				this.ws.send(`{"action": "getDetails"}`)
			})

			this.ws.on('close', (code) => {
				if (code !== 1000 && code !== 1006) {
					this.connected = false
					this.log('debug', `Websocket closed:  ${code}`)
				}
				this.reconnect = setInterval(() => {
					this.initWebSocket()
				}, 1000)
			})

			this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

			this.ws.on('error', (data) => {
				if (this.connected !== false) {
					this.connected = false
					this.updateStatus(InstanceStatus.ConnectionFailure)
					if (data?.code == 'ENOTFOUND') {
						this.log('error', `Unable to reach ${serverUrl}`)
					} else {
						this.log('error', `WebSocket ${data}`)
					}
				}
				if (this.ws !== undefined) {
					this.ws.close()
				}
			})
		} else {
			this.log('warn', `API ID required to connect to VDO.Ninja, please add one in the module settings`)
			this.updateStatus(InstanceStatus.BadConfig, 'Missing API ID')
		}
	}

	messageReceivedFromWebSocket(data) {
		let message = JSON.parse(data)
		if (message?.callback) {
			let callback = message.callback
			let result = callback.result
			if (callback.action == 'getDetails') {
				for (let x in result) {
					let data = result[x]
					this.processGetDetails(data)
				}
			} else if (callback.local) {
				for (let x in this.states) {
					if (this.states[x].localStream) {
						let result = callback.result
						if (callback.value !== 'toggle') {
							this.processUpdate({ streamID: this.states[x].streamID, action: callback.action, value: result })
						}
					}
				}
			} else {
				//console.log(callback)
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

		if (data.localStream) {
			label = `${label} (Local)`
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
		this.checkFeedbacks()
		this.updateVariables()
	}

	processUpdate(data) {
		if (this.states[data.streamID]) {
			let action = data.action
			switch (action) {
				case 'hangup':
					delete this.states[data.streamID]
					let hangup = this.streams.findIndex((o) => {
						return o.id === data.streamID
					})
					this.streams.splice(hangup, 1)
					this.initActions()
					this.initVariables()
					this.initFeedbacks()
					break
				case 'newViewConnection':
					this.ws.send(`{"action": "getDetails"}`)
					break
				case 'director':
					this.states[data.streamID][data.action] = data.value
					this.initActions()
					this.initVariables()
					this.initFeedbacks()
					break
				case 'endViewConnection':
					delete this.states[data.value]
					let endView = this.streams.findIndex((o) => {
						return o.id === data.value
					})
					this.streams.splice(endView, 1)
					this.initActions()
					this.initVariables()
					this.initFeedbacks()
					break
				case 'positionChange':
					this.ws.send(`{"action": "getDetails"}`)
					break
				case 'directorMuted':
					this.states[data.streamID].others['mute-guest'] = data.value ? '1' : '0'
					break
				case 'directorVideoHide':
					this.states[data.streamID].others['hide-guest'] = data.value ? '1' : '0'
					break
				case 'remoteMuted':
				case 'mic':
					this.states[data.streamID].muted = data.value
					break
				case 'remoteVideoMuted':
				case 'camera':
					this.states[data.streamID].videoMuted = data.value
					break

				default:
					this.states[data.streamID][data.action] = data.value
					break
			}
			this.updateVariables()
			this.checkFeedbacks()
		}
		if (data.action === 'seeding' || (data.action === 'tracksAdded' && data.value)) {
			this.ws.send(`{"action": "getDetails"}`)
		}
	}

	sendRequest(action, target, value, local) {
		let object = {
			action: action ?? 'null',
			target: target ?? 'null',
			value: value ?? 'null',
			local: local ?? false,
		}
		this.ws.send(JSON.stringify(object))
	}
}

runEntrypoint(VDONinjaInstance, upgradeScripts)
