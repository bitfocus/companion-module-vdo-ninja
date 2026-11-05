/**
 * Things that happen in a real production: guests leaving in different ways, pages reloading, the
 * module starting first, a second controller, and the module's network dropping mid-show.
 */
import type { Page } from 'playwright'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VdoNinjaClient } from '../../client.js'
import { GetVariableValues } from '../../variables.js'
import { runAction } from '../helpers/definitions.js'
import { eventually, eventuallyWithin, randomId, sessionState, until, VdoNinjaHarness } from './vdoninja.js'

const guestParams = (room: string, push: string, label: string) => ({
	room,
	push,
	label,
	autostart: '',
	webcam: '',
})

describe('production scenarios against VDO.Ninja', () => {
	let harness: VdoNinjaHarness | undefined
	const extraClients: VdoNinjaClient[] = []

	async function start(route: 'direct' | 'outage-proxy') {
		harness = await VdoNinjaHarness.start(route)
		return harness
	}

	afterEach(async () => {
		for (const client of extraClients.splice(0)) client.destroy()
		await harness?.stop()
		harness = undefined
	})

	/** A director watched by the module, with guests joined in order */
	async function room(route: 'direct' | 'outage-proxy', labels: string[]) {
		const h = await start(route)
		const roomName = randomId('room')
		const director = await h.open({ director: roomName }, true)
		h.client.connect()
		const guests: { id: string; page: Page }[] = []
		for (const [index, label] of labels.entries()) {
			const id = randomId(label.toLowerCase())
			const page = await h.open(guestParams(roomName, id, label), false)
			await until(() => h.client.states[id]?.position === index + 1)
			guests.push({ id, page })
		}
		return { h, director, guests }
	}

	it('forgets a guest who leaves with the hang up button', async () => {
		const { h, guests } = await room('direct', ['Alice', 'Bob'])
		const [alice, bob] = guests

		await alice.page.evaluate(() => (globalThis as unknown as { hangup: () => void }).hangup())

		await eventually(() => expect(h.client.states[alice.id]).toBeUndefined())
		expect(h.client.streams.map((s) => s.id)).not.toContain(alice.id)
		expect(h.client.states[bob.id]).toBeDefined()
	}, 90_000)

	it('forgets a guest who closes their tab', async () => {
		const { h, guests } = await room('direct', ['Alice'])
		const [alice] = guests
		alice.page.on('dialog', (dialog) => void dialog.accept())

		await alice.page.close({ runBeforeUnload: true })

		await eventuallyWithin(30_000, () => expect(h.client.states[alice.id]).toBeUndefined())
	}, 120_000)

	it('forgets a guest whose browser dies without saying goodbye', async () => {
		const { h, guests } = await room('direct', ['Alice'])
		const [alice] = guests

		await alice.page.close()

		await eventuallyWithin(75_000, () => expect(h.client.states[alice.id]).toBeUndefined())
	}, 180_000)

	it('moves the slot variables up when an earlier guest leaves', async () => {
		const { h, guests } = await room('direct', ['Alice', 'Bob'])
		const [alice, bob] = guests

		await alice.page.evaluate(() => (globalThis as unknown as { hangup: () => void }).hangup())

		await eventually(() => {
			expect(h.client.states[bob.id].position).toBe(1)
			expect(GetVariableValues(h.client.states)).toMatchObject({ guest_1_streamID: bob.id, guest_1_label: 'Bob' })
		})
		expect(GetVariableValues(h.client.states)).not.toHaveProperty('guest_2_streamID')
	}, 90_000)

	it('keeps a guest who reloads their page', async () => {
		const { h, guests } = await room('direct', ['Alice'])
		const [alice] = guests
		alice.page.on('dialog', (dialog) => void dialog.accept())

		await alice.page.reload()

		await eventuallyWithin(30_000, () => expect(h.client.states[alice.id]?.position).toBe(1))
	}, 120_000)

	it('follows a guest who changes their mic themselves', async () => {
		const { h, guests } = await room('direct', ['Alice'])
		const [alice] = guests

		await alice.page.evaluate(() => (globalThis as unknown as { toggleMute: () => void }).toggleMute())

		await eventually(() => expect(h.client.states[alice.id].muted).toBe(true))
		expect(GetVariableValues(h.client.states).guest_1_mic).toBe('Muted')
	}, 90_000)

	it('keeps a hung up page gone, even when another controller asks for details, until it reloads', async () => {
		const h = await start('direct')
		const streamID = randomId('e2e')
		const page = await h.open({ push: streamID, autostart: '', webcam: '' }, true)
		h.client.connect()
		await until(() => h.client.states[streamID] !== undefined)
		const second = h.newClient()
		extraClients.push(second)
		second.connect()
		await eventually(() => expect(second.states[streamID]).toBeDefined())

		h.client.sendLocal('hangup', {})
		await eventually(() => {
			expect(h.client.states[streamID]).toBeUndefined()
			expect(second.states[streamID]).toBeUndefined()
		})

		h.client.requestDetails()
		await eventually(() => expect(h.results('getDetails').length).toBeGreaterThan(2))
		await new Promise((resolve) => setTimeout(resolve, 500))
		expect(h.client.states[streamID]).toBeUndefined()
		expect(second.states[streamID]).toBeUndefined()

		await page.reload()
		await eventually(() => {
			expect(h.client.states[streamID]).toBeDefined()
			expect(second.states[streamID]).toBeDefined()
		})
	}, 90_000)

	it('finds the page when the module connected first', async () => {
		const h = await start('direct')
		const streamID = randomId('late')
		h.client.connect()
		await eventually(() => expect(h.relay.members(h.apiID)).toBe(1))

		await h.open({ push: streamID, autostart: '', webcam: '' }, true)

		await eventually(() => expect(h.client.states[streamID]).toBeDefined())
	}, 90_000)

	it('keeps control when the director reloads, and finds its guests again', async () => {
		const { h, director, guests } = await room('direct', ['Alice'])
		const [alice] = guests
		director.on('dialog', (dialog) => void dialog.accept())

		await director.reload()

		await eventuallyWithin(30_000, () => expect(h.relay.members(h.apiID)).toBe(2))
		await eventuallyWithin(45_000, () => expect(h.client.states[alice.id]?.position).toBe(1))
		h.client.sendGuest('mic', '1', {})
		await eventuallyWithin(30_000, () => expect(h.client.states[alice.id].others?.['mute-guest']).toBe('1'))
	}, 180_000)

	it('keeps two controllers in step without either losing streams', async () => {
		const { h, guests } = await room('direct', ['Alice'])
		const [alice] = guests
		const second = h.newClient()
		extraClients.push(second)

		second.connect()
		await eventually(() => expect(second.states[alice.id]?.position).toBe(1))

		h.client.sendGuest('mic', '1', {})
		await eventually(() => {
			expect(h.client.states[alice.id].others?.['mute-guest']).toBe('1')
			expect(second.states[alice.id].others?.['mute-guest']).toBe('1')
		})
	}, 90_000)

	it('rides out a network outage in which a guest leaves', async () => {
		const { h, guests } = await room('outage-proxy', ['Alice', 'Bob'])
		const [alice, bob] = guests
		const status = vi.fn()
		const log = vi.fn()
		h.client.on('status', status)
		h.client.on('log', log)
		const proxy = h.proxy
		if (!proxy) throw new Error('No proxy')

		await proxy.cut()
		await eventually(() => expect(status).toHaveBeenLastCalledWith('disconnected', 'Reconnecting'))

		h.client.sendLocal('reload', {})
		expect(log).toHaveBeenCalledWith('warn', 'Not connected to VDO.Ninja, "reload" was not sent')

		// The page, still connected to the relay, sees her go; the module can't
		await alice.page.evaluate(() => (globalThis as unknown as { hangup: () => void }).hangup())
		await eventually(() => expect(h.relay.messages.at(-1)?.data).toMatchObject({ update: { value: alice.id } }))
		expect(h.client.states[alice.id]).toBeDefined()

		await eventually(() => expect(log).toHaveBeenCalledWith('error', expect.stringContaining('WebSocket')))
		expect(status).toHaveBeenLastCalledWith('disconnected', 'Reconnecting')
		expect(status).not.toHaveBeenCalledWith('connection_failure', null)

		await proxy.restore()

		await eventually(() => expect(status).toHaveBeenLastCalledWith('ok', null))
		await eventually(() => expect(h.client.states[alice.id]).toBeUndefined())
		expect(h.client.streams.map((s) => s.id)).not.toContain(alice.id)
		await eventually(() =>
			expect(GetVariableValues(h.client.states)).toMatchObject({ guest_1_streamID: bob.id, guest_1_label: 'Bob' }),
		)
	}, 120_000)

	it('reaches a guest controlled directly, raising their hand', async () => {
		const h = await start('direct')
		const roomName = randomId('room')
		const guestID = randomId('guest')
		await h.open({ director: roomName }, false)
		const page = await h.open(guestParams(roomName, guestID, 'Alice'), true)
		h.client.connect()
		await until(() => h.client.states[guestID] !== undefined)
		// Hands need a director in the room
		await vi.waitUntil(async () => (await sessionState(page, ['directorUUID'])).directorUUID !== false, {
			timeout: 30_000,
			interval: 250,
		})

		await runAction(h.client, 'togglehand', {})

		await eventually(async () => expect(await page.locator('#raisehandbutton').getAttribute('data-raised')).toBe('1'))
	}, 120_000)
})
