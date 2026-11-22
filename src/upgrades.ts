import type { CompanionStaticUpgradeResult, CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig, ModuleSecrets } from './config.js'

type UpgradeScript = CompanionStaticUpgradeScript<ModuleConfig, ModuleSecrets>
type UpgradeResult = CompanionStaticUpgradeResult<ModuleConfig, ModuleSecrets>

const customWebsocketsConfig: UpgradeScript = (_context, props) => {
	const changed: UpgradeResult = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}
	if (props.config !== null) {
		const config = props.config
		if (config.wsCustom == undefined || config.wsCustom == null) {
			config.wsCustom = false
			config.wsServer = 'api.vdo.ninja'
			changed.updatedConfig = config
		}
	}
	return changed
}

/** The API ID used to be plain config; it now lives in the secrets store */
const apiIDToSecrets: UpgradeScript = (_context, props) => {
	const changed: UpgradeResult = {
		updatedConfig: null,
		updatedSecrets: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}
	if (props.config === null) return changed

	const { apiID, ...config } = props.config as ModuleConfig & { apiID?: unknown }
	if (apiID === undefined) return changed

	changed.updatedConfig = config
	if (typeof apiID === 'string' && apiID !== '' && !props.secrets?.apiID) {
		changed.updatedSecrets = { ...props.secrets, apiID }
	}
	return changed
}

export const UpgradeScripts: UpgradeScript[] = [customWebsocketsConfig, apiIDToSecrets]
