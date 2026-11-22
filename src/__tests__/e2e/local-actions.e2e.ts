/**
 * The remaining local actions on a real publishing page. Where an action needs hardware the fake
 * camera doesn't have (PTZ) or software outside the page (PowerPoint, via MIDI), this checks the
 * exact call VDO.Ninja's handler makes; otherwise it checks the page itself.
 */
import type { Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ActionsSchema } from '../../actions.js'
import { runAction } from '../helpers/definitions.js'
import { eventually, pageCalls, randomId, sessionState, spyOnPage, until, VdoNinjaHarness } from './vdoninja.js'

describe('local actions against VDO.Ninja', () => {
	const streamID = randomId('e2e')

	let harness: VdoNinjaHarness
	let page: Page

	async function run<K extends keyof ActionsSchema>(id: K, options: ActionsSchema[K]['options']): Promise<void> {
		await runAction(harness.client, id, options)
	}

	beforeAll(async () => {
		harness = await VdoNinjaHarness.start('direct')
		page = await harness.open({ push: streamID, autostart: '', webcam: '' }, true)
		harness.client.connect()
		await until(() => harness.client.states[streamID] !== undefined)
		await spyOnPage(page, [
			'playbackMIDI',
			'session.remotePan',
			'session.remoteTilt',
			'session.remoteZoom',
			'session.remoteFocus',
			'session.remoteExposure',
			'session.forcePLI',
			'toggleScreenShare',
		])
	})

	afterAll(async () => {
		await harness?.stop()
	})

	it.each([
		['ptzPan', 'session.remotePan', 25, [0.25, false]],
		['ptzPan', 'session.remotePan', -25, [-0.25, false]],
		['ptzTilt', 'session.remoteTilt', 10, [0.1, false]],
		['ptzZoom', 'session.remoteZoom', 10, [0.1, false]],
		['ptzFocus', 'session.remoteFocus', 10, [0.1, false]],
		// The action sets the exposure, where pan, tilt, zoom and focus adjust by an amount
		['ptzExposure', 'session.remoteExposure', 50, [0.5, true]],
	] as const)('%s calls %s with %d as a fraction', async (id, spied, value, expected) => {
		const before = (await pageCalls(page, spied)).length

		await run(id, { value })

		await eventually(async () => expect((await pageCalls(page, spied)).slice(before)).toEqual([expected]))
	})

	it.each([
		['nextSlide', [176, 110, 11]],
		['previousSlide', [176, 110, 10]],
	] as const)('%s sends its MIDI message', async (id, midi) => {
		await run(id, {})
		await eventually(async () => expect(await pageCalls(page, 'playbackMIDI')).toContainEqual([{ d: midi }]))
	})

	it('forces a keyframe', async () => {
		await run('forceKeyframe', {})
		await eventually(async () => expect(await pageCalls(page, 'session.forcePLI')).toContainEqual([]))
	})

	it('toggles screen sharing', async () => {
		await run('togglescreenshare', {})
		await eventually(async () => expect(await pageCalls(page, 'toggleScreenShare')).toHaveLength(1))
		await eventually(() => expect(harness.results('togglescreenshare')).toHaveLength(1))
	})

	it('starts and stops recording', async () => {
		const recording = async () =>
			page.evaluate(() => {
				const session = (globalThis as unknown as { session: { videoElement: object } }).session
				return 'recording' in session.videoElement
			})

		await run('record', { value: 'true' })
		await eventually(async () => expect(await recording()).toBe(true))
		expect(harness.results('record').at(-1)).toBe(true)

		await run('record', { value: 'false' })
		await eventually(() => expect(harness.results('record').at(-1)).toBe(false))
	})

	it('reloads the page, and the module keeps control of it', async () => {
		const reloaded = page.waitForEvent('load')
		await page.evaluate(() => ((globalThis as unknown as { __marker: boolean }).__marker = true))

		await run('reload', {})
		await reloaded

		const marker = await page.evaluate(() => (globalThis as unknown as { __marker?: boolean }).__marker)
		expect(marker).toBeUndefined()

		await eventually(() => expect(harness.relay.members(harness.apiID)).toBe(2))
		await run('mic', { value: 'false' })
		await eventually(async () => expect((await sessionState(page, ['muted'])).muted).toBe(true))
	})

	it('hangs up, and the module forgets the stream', async () => {
		await run('hangup', {})
		await eventually(() => expect(harness.client.states[streamID]).toBeUndefined())
		expect(harness.client.streams).toEqual([])
	})
})
