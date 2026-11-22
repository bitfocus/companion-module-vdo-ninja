import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	wsCustom: boolean
	wsServer: string
}

export type ModuleSecrets = {
	/** Anyone with the API ID can control the VDO.Ninja page, so it is kept in the secrets store */
	apiID: string
}

const DefaultServer = 'api.vdo.ninja'

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'secret-text',
			id: 'apiID',
			label: 'API ID',
			width: 6,
			minLength: 1,
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
			default: DefaultServer,
			tooltip:
				'Only use this if you are self-hosting your own websockets server. Only include the domain, not "wss://" or port',
			width: 6,
			regex: Regex.HOSTNAME,
			isVisibleExpression: '$(options:wsCustom)',
		},
	]
}

/** The websocket URL to connect to, or an error describing what is wrong with the config */
export function GetServerUrl(config: ModuleConfig): { url: string } | { error: string } {
	const server = config.wsCustom ? config.wsServer?.trim() : ''
	// An empty custom server has always meant the default one
	if (!server) return { url: `wss://${DefaultServer}:443` }

	// Regex.HOSTNAME is a /pattern/ string for the UI
	if (!new RegExp(Regex.HOSTNAME.slice(1, -1)).test(server)) {
		return { error: `Invalid custom websockets server "${server}": enter only the domain, without wss:// or a port` }
	}
	return { url: `wss://${server}:443` }
}
