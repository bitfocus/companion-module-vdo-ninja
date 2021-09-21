var instance_skel = require('../../instance_skel')
const actions = require('./actions')

const WebSocket = require('ws')

let debug
let log

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)

		Object.assign(this, {
			...actions,
		})

		return this
	}
	init() {
		debug = this.debug
		log = this.log

		this.status(this.STATUS_WARNING, 'Connecting')

		if (!this.config) {
			return this
		}

		this.initWebSocket()
		this.actions()
	}

	destroy() {
		if (this.ws !== undefined) {
			this.ws.close(1000)
			delete this.ws
		}
		if (this.pollAPI) {
			clearInterval(this.pollAPI)
			delete this.pollAPI
		}
	}

	updateConfig(config) {
		this.config = config
		this.initWebSocket()
	}

	retrySocket = () => {
		try {
			// readyState 2 = CLOSING, readyState 3 = CLOSED
			if (!this.ws || this.ws.readyState == 2 || this.ws.readyState == 3) {
				initWebSocket()
			}
			// readyState 1 = OPEN
			else if (this.ws.readyState == 1) {
				this.ws.send(`{"join": "${this.config.apiID}" }`)
			}
		} catch (err) {
			this.debug('Error with handling socket' + JSON.stringify(err))
		}
	}

	initWebSocket() {
		this.status(this.STATUS_UNKNOWN)

		if (this.ws !== undefined) {
			this.ws.close(1000)
			delete this.ws
		}

		this.ws = new WebSocket(`wss://api.vdo.ninja:443`)

		this.ws.on('open', () => {
			this.log('info', `Connection opened to VDO.Ninja`)
			this.status(this.STATUS_OK)
			if (this.config.apiID) {
				this.ws.send(`{"join": "${this.config.apiID}" }`)
			} else {
				this.log('warn', `API ID required to connect to VDO.Ninja, please add one in the module settings`)
			}
			this.pollAPI = setInterval(this.retrySocket, 15000)
			this.retrySocket()
		})

		this.ws.on('close', (code) => {
			if (code !== 1000) {
				this.log('error', `Connection closed with code ${code}`)
				this.status(this.STATUS_ERROR)
			}
		})

		this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

		this.ws.on('error', (data) => {
			this.log('error', `WebSocket error: ${data}`)
		})
	}

	messageReceivedFromWebSocket(data) {
		this.log('debug', `Message received: ${data}`)
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

	action(command) {
		let id = command.action
		let opt = command.options
		let action = 'null'
		let target = 'null'
		let value = 'null'

		switch (id) {
			case 'mic':
				action = 'mic'
				value = opt.value
				break
			case 'speaker':
				action = 'speaker'
				value = opt.value
				break
			case 'volume':
				action = 'volume'
				value = opt.value
				break
			case 'camera':
				action = 'camera'
				value = opt.value
				break
			case 'record':
				action = 'record'
				value = opt.value
				break
			case 'reload':
				action = 'reload'
				break
			case 'hangup':
				action = 'hangup'
				break
			case 'sendChat':
				action = 'sendChat'
				value = opt.value
				break
			case 'bitrate':
				action = 'bitrate'
				if (opt.value === 'custom') {
					value = opt.bitrate
				} else {
					value = opt.value
				}
				break
			case 'panning':
				action = 'panning'
				value = opt.value
				break
			case 'togglehand':
				action = 'togglehand'
				break
			case 'togglescreenshare':
				action = 'togglescreenshare'
				break
			case 'guestMic':
				action = 'mic'
				target = opt.target
				value = opt.value
				break
			case 'guestSpeaker':
				action = 'speaker'
				target = opt.target
				value = opt.value
				break
			case 'guestVolume':
				action = 'volume'
				target = opt.target
				value = opt.value
				break
			case 'guestHangup':
				action = 'hangup'
				target = opt.target
				break
			case 'guestForward':
				action = 'forward'
				target = opt.target
				value = opt.value
				break
			case 'guestAddScene':
				action = 'addScene'
				target = opt.target
				value = opt.value
				break
			case 'guestMuteScene':
				action = 'muteScene'
				target = opt.target
				value = opt.value
				break
			case 'guestDisplay':
				action = 'display'
				target = opt.target
				break
			case 'guestSoloVideo':
				action = 'soloVideo'
				target = opt.target
				break
			case 'guestForceKeyframe':
				action = 'forceKeyframe'
				target = opt.target
				break
		}

		let object = {
			action: action,
			target: target,
			value: value,
		}
		this.ws.send(JSON.stringify(object))
		this.debug('Sending:', JSON.stringify(object))
	}
}

exports = module.exports = instance
