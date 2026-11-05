/**
 * The remaining director actions, in a real room with a guest connected over WebRTC.
 */
import type { Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ActionsSchema } from '../../actions.js'
import { runAction } from '../helpers/definitions.js'
import {
	eventually,
	eventuallyWithin,
	pageCalls,
	randomId,
	sessionState,
	spyOnPage,
	until,
	VdoNinjaHarness,
} from './vdoninja.js'

describe('director actions against VDO.Ninja', () => {
	const room = randomId('room')
	const guestID = randomId('guest')

	let harness: VdoNinjaHarness
	let director: Page
	let guestPage: Page

	async function run<K extends keyof ActionsSchema>(id: K, options: ActionsSchema[K]['options']): Promise<void> {
		await runAction(harness.client, id, options)
	}

	const guest = () => harness.client.states[guestID]

	/** Playback volume of the guest's video on the director's page */
	const playbackVolume = async () =>
		director.evaluate(() => {
			const session = (
				globalThis as unknown as { session: { rpcs: Record<string, { videoElement: { volume: number } }> } }
			).session
			return Object.values(session.rpcs)[0].videoElement.volume
		})

	beforeAll(async () => {
		harness = await VdoNinjaHarness.start('direct')
		director = await harness.open({ director: room }, true)
		harness.client.connect()
		guestPage = await harness.open({ room, push: guestID, label: 'Alice', autostart: '', webcam: '' }, false)
		await until(() => guest()?.position === 1)
		await spyOnPage(director, [
			'adjustPan',
			'session.requestRateLimit',
			'session.toggleSoloChat',
			'session.forcePLI',
			'requestKeyframeScene',
			'requestInfocus',
		])
	}, 90_000)

	afterAll(async () => {
		await harness?.stop()
	})

	describe('on the director itself', () => {
		it.each([
			[25, 0.25],
			[100, 1],
		])('sets the playback volume to %d', async (value, volume) => {
			// VDO.Ninja sets the volume itself while it sets up a guest's video
			await eventually(async () => {
				const readyState = await director.evaluate(() => {
					const session = (
						globalThis as unknown as { session: { rpcs: Record<string, { videoElement: { readyState: number } }> } }
					).session
					return Object.values(session.rpcs)[0].videoElement.readyState
				})
				expect(readyState).toBeGreaterThanOrEqual(2)
			})

			await run('volume', { value })
			await eventually(async () => expect(await playbackVolume()).toBe(volume))
		})

		it('sends a chat message that reaches the guest', async () => {
			const message = `chat ${randomId('')}`
			await run('sendChat', { value: message })
			await eventually(async () => expect(await guestPage.getByText(message).count()).toBeGreaterThan(0))
		})

		it.each([
			['true', -1],
			['false', 0],
			['custom', 1500],
		] as const)('sets the bitrate with %s', async (value, kbps) => {
			const before = (await pageCalls(director, 'session.requestRateLimit')).length
			await run('bitrate', { value, bitrate: 1500 })
			await eventually(async () => {
				const calls = (await pageCalls(director, 'session.requestRateLimit')).slice(before)
				expect(calls[0]?.[0]).toBe(kbps)
			})
			expect(harness.results('bitrate').at(-1)).toBe(kbps)
		})

		it('pans the incoming audio', async () => {
			await run('panning', { value: 45 })
			await eventually(async () => expect((await pageCalls(director, 'adjustPan'))[0]?.[1]).toBe(45))
		})

		it('forces a keyframe', async () => {
			await run('forceKeyframe', {})
			// VDO.Ninja also calls this itself, with an argument
			await eventually(async () => expect(await pageCalls(director, 'session.forcePLI')).toContainEqual([]))
		})

		it('toggles and joins and leaves its own group', async () => {
			const groups = async () => (await sessionState(director, ['group'])).group

			await run('group', { value: 3 })
			await eventually(async () => expect(await groups()).toContain('3'))
			await run('group', { value: 3 })
			await eventually(async () => expect(await groups()).not.toContain('3'))

			await run('joinGroup', { value: 4 })
			await eventually(async () => expect(await groups()).toContain('4'))
			await run('leaveGroup', { value: 4 })
			await eventually(async () => expect(await groups()).not.toContain('4'))
		})

		it('toggles and joins and leaves its view of a group', async () => {
			const groups = async () => (await sessionState(director, ['groupView'])).groupView

			await run('viewGroup', { value: 5 })
			await eventually(async () => expect(await groups()).toContain('5'))
			await run('viewGroup', { value: 5 })
			await eventually(async () => expect(await groups()).not.toContain('5'))

			await run('joinViewGroup', { value: 6 })
			await eventually(async () => expect(await groups()).toContain('6'))
			await run('leaveViewGroup', { value: 6 })
			await eventually(async () => expect(await groups()).not.toContain('6'))
		})

		it('toggles the highlight on its own video', async () => {
			const before = (await pageCalls(director, 'requestInfocus')).length
			await run('soloVideo', {})
			await eventually(async () => expect((await pageCalls(director, 'requestInfocus')).length).toBe(before + 1))
			await run('soloVideo', {})
			await eventually(async () => expect((await pageCalls(director, 'requestInfocus')).length).toBe(before + 2))
		})
	})

	describe('on the guest', () => {
		it('toggles the guest mic in scenes', async () => {
			await run('guestMuteScene', { target: '1', value: '1' })
			await eventually(() => expect(guest().others?.['mute-scene']).toBe('1'))
			await run('guestMuteScene', { target: '1', value: '1' })
			await eventually(() => expect(guest().others?.['mute-scene']).toBe('0'))
		})

		it('toggles the guest speaker', async () => {
			await run('guestSpeaker', { target: '1' })
			await eventually(() => expect(guest().others?.['toggle-remote-speaker']).toBe('1'))
			expect(harness.results('speaker').at(-1)).toBe(true)
			await run('guestSpeaker', { target: '1' })
			await eventually(() => expect(guest().others?.['toggle-remote-speaker']).toBe('0'))
		})

		it('toggles whether the guest can see video', async () => {
			await run('guestDisplay', { target: '1' })
			await eventually(() => expect(guest().others?.['toggle-remote-display']).toBe('1'))
			await run('guestDisplay', { target: '1' })
			await eventually(() => expect(guest().others?.['toggle-remote-display']).toBe('0'))
		})

		it.each([
			['guestSoloChat', 1],
			['guestAltSoloChat', 2],
		] as const)('toggles %s with the guest', async (id, argCount) => {
			const before = (await pageCalls(director, 'session.toggleSoloChat')).length
			await run(id, { target: '1' })
			await eventually(async () => {
				const calls = (await pageCalls(director, 'session.toggleSoloChat')).slice(before)
				expect(calls).toHaveLength(1)
				expect(calls[0]).toHaveLength(argCount)
			})
			await run(id, { target: '1' })
			await eventually(async () =>
				expect((await pageCalls(director, 'session.toggleSoloChat')).length).toBe(before + 2),
			)
		})

		it('forces a keyframe from the guest', async () => {
			await run('guestForceKeyframe', { target: '1' })
			await eventually(async () => expect(await pageCalls(director, 'requestKeyframeScene')).toHaveLength(1))
		})

		it('transfers the guest to another room, where its director sees them, and the module forgets them', async () => {
			const destination = randomId('room')
			const otherDirector = await harness.open({ director: destination }, false)

			await run('guestForward', { target: '1', value: destination })

			await eventually(() => expect(guest()).toBeUndefined())
			await eventuallyWithin(30_000, async () => {
				const streams = await otherDirector.evaluate(() => {
					const session = (globalThis as unknown as { session: { rpcs: Record<string, { streamID: string }> } }).session
					return Object.values(session.rpcs).map((rpc) => rpc.streamID)
				})
				expect(streams).toContain(guestID)
			})
		}, 60_000)
	})
})
