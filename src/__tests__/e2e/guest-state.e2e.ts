/**
 * The director's view of a guest: hand raised, queued, highlighted, group and slot, checked
 * through the module's feedbacks and variables against a real VDO.Ninja room.
 */
import type { Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FeedbacksSchema } from '../../feedbacks.js'
import { GetVariableValues } from '../../variables.js'
import { checkFeedback, runAction } from '../helpers/definitions.js'
import { eventually, randomId, until, VdoNinjaHarness } from './vdoninja.js'

describe('guest state against VDO.Ninja', () => {
	const room = randomId('room')
	const guestID = randomId('guest')

	let harness: VdoNinjaHarness
	let guestPage: Page

	function feedback<K extends keyof FeedbacksSchema>(id: K, options: Omit<FeedbacksSchema[K]['options'], 'stream'>) {
		return checkFeedback(harness.client, id, { stream: guestID, ...options })
	}

	const variables = () => GetVariableValues(harness.client.states)

	beforeAll(async () => {
		harness = await VdoNinjaHarness.start('direct')
		// Slot mode makes the director report each guest's mixer slot
		await harness.open({ director: room, slotmode: '1' }, true)
		harness.client.connect()
		guestPage = await harness.open({ room, push: guestID, label: 'Alice', autostart: '', webcam: '' }, false)
		await until(() => harness.client.states[guestID]?.position === 1)
	}, 90_000)

	afterAll(async () => {
		await harness?.stop()
	})

	it('starts with nothing set', () => {
		expect(feedback('handRaised', {})).toBe(false)
		expect(feedback('guestQueued', {})).toBe(false)
		expect(feedback('highlighted', {})).toBe(false)
		expect(variables()).toMatchObject({
			guest_1_hand: 'Lowered',
			guest_1_queued: 'Admitted',
			guest_1_highlighted: 'Not highlighted',
			guest_1_groups: 'None',
		})
	})

	it('follows the guest raising and lowering their hand', async () => {
		await guestPage.evaluate(() => (globalThis as unknown as { raisehand: () => void }).raisehand())
		await eventually(() => expect(feedback('handRaised', {})).toBe(true))
		expect(variables().guest_1_hand).toBe('Raised')

		await guestPage.evaluate(() => (globalThis as unknown as { raisehand: () => void }).raisehand())
		await eventually(() => expect(feedback('handRaised', {})).toBe(false))
	})

	it('follows the guest being highlighted', async () => {
		await runAction(harness.client, 'guestSoloVideo', { target: '1' })
		await eventually(() => expect(feedback('highlighted', {})).toBe(true))
		expect(variables().guest_1_highlighted).toBe('Highlighted')

		await runAction(harness.client, 'guestSoloVideo', { target: '1' })
		await eventually(() => expect(feedback('highlighted', {})).toBe(false))
	})

	it('follows the guest joining and leaving a group', async () => {
		await runAction(harness.client, 'guestGroup', { target: '1', value: '2' })
		await eventually(() => expect(feedback('guestGroup', { group: 2 })).toBe(true))
		expect(feedback('guestGroup', { group: 3 })).toBe(false)
		expect(variables().guest_1_groups).toEqual(['2'])

		await runAction(harness.client, 'guestGroup', { target: '1', value: '2' })
		await eventually(() => expect(feedback('guestGroup', { group: 2 })).toBe(false))
	})

	it('follows the guest being moved to another slot', async () => {
		await eventually(() => expect(feedback('guestSlot', { slot: 1 })).toBe(true))

		harness.client.sendGuest('setslot', '1', { value: 3 })
		await eventually(() => expect(feedback('guestSlot', { slot: 3 })).toBe(true))
		expect(variables().guest_1_slot).toBe(3)
	})

	it('reports a guest waiting in the queue', async () => {
		const queuedID = randomId('queued')
		await harness.open({ room, push: queuedID, label: 'Bob', autostart: '', webcam: '', queue: '' }, false)

		await eventually(() => expect(checkFeedback(harness.client, 'guestQueued', { stream: queuedID })).toBe(true))
		expect(variables()[`${queuedID}_queued`]).toBe('Queued')
	})
})
