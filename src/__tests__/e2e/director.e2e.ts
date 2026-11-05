/**
 * A director page controlled by the module, with a guest joined to its room, checking that the
 * director's guest commands reach VDO.Ninja and that the module tracks the guest's state.
 *
 * The director and guest connect over WebRTC through VDO.Ninja's public signalling server, so
 * this is slower than the local tests and needs internet access.
 */
import type { Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ActionsSchema } from '../../actions.js'
import { GetVariableValues } from '../../variables.js'
import { checkFeedback, runAction } from '../helpers/definitions.js'
import { eventually, randomId, until, VdoNinjaHarness } from './vdoninja.js'

describe('director commands against VDO.Ninja', () => {
	const room = randomId('room')
	const guestID = randomId('guest')

	let harness: VdoNinjaHarness
	let guestPage: Page

	async function run<K extends keyof ActionsSchema>(id: K, options: ActionsSchema[K]['options']): Promise<void> {
		await runAction(harness.client, id, options)
	}

	const guest = () => harness.client.states[guestID]

	beforeAll(async () => {
		harness = await VdoNinjaHarness.start('direct')
		await harness.open({ director: room }, true)
		harness.client.connect()
		guestPage = await harness.open({ room, push: guestID, label: 'Alice', autostart: '', webcam: '' }, false)
		await until(() => guest()?.position === 1)
	}, 90_000)

	afterAll(async () => {
		await harness?.stop()
	})

	it('loads the director and the guest', () => {
		expect(harness.client.streams).toContainEqual({ id: guestID, label: 'Guest 1 (Alice)' })
		expect(harness.client.streams.find((s) => s.label === 'Director (Local)')).toBeDefined()
		expect(GetVariableValues(harness.client.states)).toMatchObject({
			guest_1_streamID: guestID,
			guest_1_label: 'Alice',
			guest_1_mic: 'Unmuted',
		})
	})

	it('mutes and unmutes the guest by slot', async () => {
		await run('guestMic', { target: '1' })
		await eventually(() => expect(guest().others?.['mute-guest']).toBe('1'))
		expect(checkFeedback(harness.client, 'mic', { stream: guestID, state: true })).toBe(true)
		expect(GetVariableValues(harness.client.states).guest_1_mic).toBe('Muted')

		await run('guestMic', { target: '1' })
		await eventually(() => expect(guest().others?.['mute-guest']).toBe('0'))
		expect(checkFeedback(harness.client, 'mic', { stream: guestID, state: true })).toBe(false)
	})

	it('targets the guest by stream ID too', async () => {
		await run('guestMic', { target: guestID })
		await eventually(() => expect(guest().others?.['mute-guest']).toBe('1'))
		await run('guestMic', { target: guestID })
		await eventually(() => expect(guest().others?.['mute-guest']).toBe('0'))
	})

	it('adds the guest to a scene and removes them again', async () => {
		await run('guestAddScene', { target: '1', value: '2' })
		await eventually(() => expect(guest().scenes?.['2']).toBe(true))
		expect(checkFeedback(harness.client, 'guestScene', { stream: guestID, scene: '2' })).toBe(true)
		expect(GetVariableValues(harness.client.states).guest_1_scenes).toEqual(['2'])

		await run('guestAddScene', { target: '1', value: '2' })
		await eventually(() => expect(guest().scenes?.['2']).toBe(false))
		expect(checkFeedback(harness.client, 'guestScene', { stream: guestID, scene: '2' })).toBe(false)
	})

	it('sets the guest volume', async () => {
		await run('guestVolume', { target: '1', value: 50 })
		await eventually(() => expect(guest().others?.volume).toBe('50'))
		await run('guestVolume', { target: '1', value: 100 })
		await eventually(() => expect(guest().others?.volume).toBe('100'))
	})

	it('sends the guest an overlay message', async () => {
		const message = `hello ${randomId('')}`
		await run('guestOverlay', { target: '1', value: message })
		await eventually(async () => expect(await guestPage.getByText(message).count()).toBeGreaterThan(0))
	})

	it('hangs up the guest and forgets them', async () => {
		await run('guestHangup', { target: '1' })
		await eventually(() => expect(guest()).toBeUndefined())
		expect(harness.client.streams.map((s) => s.id)).not.toContain(guestID)
	})
})
