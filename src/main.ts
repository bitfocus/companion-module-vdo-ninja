import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetActions, type ActionsSchema } from './actions.js'
import type { GuestCommands, GuestTarget, LocalCommands } from './api.js'
import { VdoNinjaClient, type ClientStatus } from './client.js'
import { GetConfigFields, GetServerUrl, type ModuleConfig, type ModuleSecrets } from './config.js'
import { GetFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { GetCompositeElements, type CompositeElementsSchema } from './graphics.js'
import { GetPresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { ChangedVariableValues, GetVariableDefinitions, GetVariableValues, type VariablesSchema } from './variables.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
	compositeElements: CompositeElementsSchema
}

export { UpgradeScripts }

const StatusMap: Record<ClientStatus, InstanceStatus> = {
	connecting: InstanceStatus.Connecting,
	ok: InstanceStatus.Ok,
	disconnected: InstanceStatus.Disconnected,
	connection_failure: InstanceStatus.ConnectionFailure,
}

export default class VDONinjaInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	secrets!: ModuleSecrets
	client: VdoNinjaClient | undefined
	/** Variable values last sent to Companion, so only changes are sent */
	#sentValues: VariablesSchema = {}

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.setActionDefinitions(GetActions(this))
		this.setCompositeElementDefinitions(GetCompositeElements())
		// Presets must follow the feedbacks they use, and follow guests through variables, so they're set once
		this.updateDefinitions()
		const { structure, presets } = GetPresets()
		this.setPresetDefinitions(structure, presets)
		this.connect()
	}

	async destroy(): Promise<void> {
		this.client?.destroy()
		this.client = undefined
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.connect()
	}

	connect(): void {
		this.client?.destroy()
		this.client = undefined

		const apiID = this.secrets?.apiID?.trim()
		if (!apiID) {
			this.log('warn', `API ID required to connect to VDO.Ninja, please add one in the module settings`)
			this.updateStatus(InstanceStatus.BadConfig, 'Missing API ID')
			this.updateDefinitions()
			return
		}

		const server = GetServerUrl(this.config)
		if ('error' in server) {
			this.log('error', server.error)
			this.updateStatus(InstanceStatus.BadConfig, server.error)
			this.updateDefinitions()
			return
		}

		const client = new VdoNinjaClient({
			url: server.url,
			apiID,
			minReconnectDelay: 1000,
			maxReconnectDelay: 30_000,
			// api.vdo.ninja closes sockets idle for about two minutes; pings also keep it open
			heartbeatInterval: 30_000,
			detailsDelay: 100,
		})
		this.client = client

		client.on('status', (status, message) => this.updateStatus(StatusMap[status], message))
		client.on('log', (level, message) => this.log(level, message))
		client.on('streamsChanged', () => this.updateDefinitions())
		client.on('stateChanged', () => {
			this.updateVariableValues()
			this.checkAllFeedbacks()
		})

		this.updateStatus(InstanceStatus.Connecting)
		this.updateDefinitions()
		client.connect()
	}

	/** Rebuild everything that is defined per stream */
	updateDefinitions(): void {
		const source = this.client ?? { states: {}, streams: [] }
		this.setFeedbackDefinitions(GetFeedbacks(source))
		this.setVariableDefinitions(GetVariableDefinitions(source.states))
		// The definitions were replaced, so send every value again
		this.#sentValues = {}
		this.updateVariableValues()
		// A replaced client won't report a state change for the streams that went with it
		this.checkAllFeedbacks()
	}

	updateVariableValues(): void {
		const values = GetVariableValues(this.client?.states ?? {})
		const changed = ChangedVariableValues(this.#sentValues, values)
		if (Object.keys(changed).length === 0) return

		this.#sentValues = values
		this.setVariableValues(changed)
	}

	sendLocal<K extends keyof LocalCommands>(action: K, args: LocalCommands[K]): void {
		if (this.client) this.client.sendLocal(action, args)
		else this.log('warn', `Not connected to VDO.Ninja, "${action}" was not sent; check the module settings`)
	}

	sendGuest<K extends keyof GuestCommands>(action: K, target: GuestTarget, args: GuestCommands[K]): void {
		if (this.client) this.client.sendGuest(action, target, args)
		else this.log('warn', `Not connected to VDO.Ninja, "${action}" was not sent; check the module settings`)
	}
}
