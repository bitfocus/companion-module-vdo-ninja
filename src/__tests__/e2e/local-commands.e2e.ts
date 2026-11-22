/**
 * Drives a real VDO.Ninja page in headless Chromium through a local relay, and checks that the
 * module's actions change the page and that the module's state follows.
 *
 * Needs internet access (the page loads from vdo.ninja) and Chromium (`yarn test:e2e:install`).
 * Set VDO_NINJA_URL to test another VDO.Ninja release.
 */
import type { Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ActionsSchema } from '../../actions.js'
import { GetVariableValues } from '../../variables.js'
import { checkFeedback, runAction } from '../helpers/definitions.js'
import { eventually, randomId, sessionState, until, VdoNinjaHarness } from './vdoninja.js'

describe('local commands against VDO.Ninja', () => {
	const streamID = randomId('e2e')

	let harness: VdoNinjaHarness
	let page: Page

	async function run<K extends keyof ActionsSchema>(id: K, options: ActionsSchema[K]['options']): Promise<void> {
		await runAction(harness.client, id, options)
	}

	async function pageState() {
		return sessionState(page, ['muted', 'videoMuted', 'speakerMuted'])
	}

	beforeAll(async () => {
		harness = await VdoNinjaHarness.start('direct')
		page = await harness.open({ push: streamID, autostart: '', webcam: '' }, true)
		harness.client.connect()
		await until(() => harness.client.states[streamID] !== undefined)
	})

	afterAll(async () => {
		await harness?.stop()
	})

	it('loads the local stream from the page', () => {
		expect(harness.client.streams).toEqual([{ id: streamID, label: `${streamID} (Local)` }])
		expect(GetVariableValues(harness.client.states)).toMatchObject({
			[`${streamID}_mic`]: 'Unmuted',
			[`${streamID}_camera`]: 'Unmuted',
		})
	})

	it.each([
		['mic', 'muted', 'false', true],
		['mic', 'muted', 'true', false],
		['camera', 'videoMuted', 'false', true],
		['camera', 'videoMuted', 'true', false],
		['speaker', 'speakerMuted', 'false', true],
		['speaker', 'speakerMuted', 'true', false],
	] as const)('%s sets %s from value %s on the page and in the module', async (id, field, value, muted) => {
		await run(id, { value })

		await eventually(async () => expect((await pageState())[field]).toBe(muted))
		await eventually(() => expect(harness.client.states[streamID][field]).toBe(muted))
		expect(checkFeedback(harness.client, id, { stream: streamID, state: true })).toBe(muted)
	})

	it.each([
		['mic', 'muted'],
		['camera', 'videoMuted'],
		['speaker', 'speakerMuted'],
	] as const)('%s toggle flips %s and the module follows', async (id, field) => {
		const before = (await pageState())[field]

		await run(id, { value: 'toggle' })

		await eventually(async () => expect((await pageState())[field]).toBe(!before))
		await eventually(() => expect(harness.client.states[streamID][field]).toBe(!before))
	})

	it('reports the mic in the variables', async () => {
		await run('mic', { value: 'false' })
		await eventually(() => expect(GetVariableValues(harness.client.states)[`${streamID}_mic`]).toBe('Muted'))
		await run('mic', { value: 'true' })
		await eventually(() => expect(GetVariableValues(harness.client.states)[`${streamID}_mic`]).toBe('Unmuted'))
	})
})
