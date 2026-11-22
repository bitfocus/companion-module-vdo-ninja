import type { CompanionStaticUpgradeProps, CompanionUpgradeContext } from '@companion-module/base'
import { describe, expect, it } from 'vitest'
import type { ModuleConfig, ModuleSecrets } from '../config.js'
import { UpgradeScripts } from '../upgrades.js'

const [customWebsocketsConfig, apiIDToSecrets] = UpgradeScripts

function run(
	script: (typeof UpgradeScripts)[number],
	config: Record<string, unknown> | null,
	secrets: ModuleSecrets | null = null,
) {
	const props = {
		config: config as ModuleConfig | null,
		secrets,
		actions: [],
		feedbacks: [],
	} as CompanionStaticUpgradeProps<ModuleConfig, ModuleSecrets>
	return script({} as CompanionUpgradeContext<ModuleConfig>, props)
}

describe('upgrade scripts', () => {
	it('adds the custom websockets defaults', () => {
		expect(run(customWebsocketsConfig, { apiID: 'abc' }).updatedConfig).toEqual({
			apiID: 'abc',
			wsCustom: false,
			wsServer: 'api.vdo.ninja',
		})
	})

	it('moves the API ID from the config to the secrets', () => {
		const result = run(apiIDToSecrets, { apiID: 'abc', wsCustom: false, wsServer: 'api.vdo.ninja' })
		expect(result.updatedConfig).toEqual({ wsCustom: false, wsServer: 'api.vdo.ninja' })
		expect(result.updatedSecrets).toEqual({ apiID: 'abc' })
	})

	it('keeps an API ID already in the secrets', () => {
		const result = run(apiIDToSecrets, { apiID: 'old', wsCustom: false, wsServer: '' }, { apiID: 'current' })
		expect(result.updatedConfig).toEqual({ wsCustom: false, wsServer: '' })
		expect(result.updatedSecrets).toBeNull()
	})

	it('drops an empty API ID without creating a secret', () => {
		const result = run(apiIDToSecrets, { apiID: '', wsCustom: false, wsServer: '' })
		expect(result.updatedConfig).toEqual({ wsCustom: false, wsServer: '' })
		expect(result.updatedSecrets).toBeNull()
	})

	it('leaves a config without an API ID alone', () => {
		const result = run(apiIDToSecrets, { wsCustom: false, wsServer: '' })
		expect(result.updatedConfig).toBeNull()
		expect(result.updatedSecrets).toBeNull()
	})

	it('does nothing without a config', () => {
		expect(run(apiIDToSecrets, null).updatedConfig).toBeNull()
	})
})
