import { describe, expect, it } from 'vitest'
import { parseDetails } from '../api.js'
import { GetFeedbacks, type FeedbacksSchema } from '../feedbacks.js'
import type { StreamChoice, StreamState } from '../types.js'
import getDetailsDirector from './fixtures/getDetails-director.json' with { type: 'json' }
import { checkFeedback, definition } from './helpers/definitions.js'
import { director, guest, local, statesOf } from './helpers/streams.js'

function setup(states: Record<string, StreamState>, streams: StreamChoice[] = []) {
	const feedbacks = GetFeedbacks({ states, streams })

	function check<K extends keyof FeedbacksSchema>(id: K, options: FeedbacksSchema[K]['options']): unknown {
		return checkFeedback({ states, streams }, id, options)
	}

	return { feedbacks, check }
}

describe('feedbacks', () => {
	it('offers the known streams, defaulting to the first', () => {
		const streams = [
			{ id: 'a', label: 'A' },
			{ id: 'b', label: 'B' },
		]
		const { feedbacks } = setup({}, streams)
		expect(definition(feedbacks.mic, 'mic').options[0]).toMatchObject({ id: 'stream', default: 'a', choices: streams })
	})

	it('defaults to an empty stream when there are none', () => {
		const { feedbacks } = setup({})
		expect(definition(feedbacks.mic, 'mic').options[0]).toMatchObject({ id: 'stream', default: '', choices: [] })
	})

	it.each([
		['mic', { ...local, muted: true }, true, true],
		['mic', { ...local, muted: true }, false, false],
		['camera', { ...local, videoMuted: true }, true, true],
		['speaker', { ...local, speakerMuted: true }, true, true],
		['speaker', { ...local, speakerMuted: false }, true, false],
	] as const)('%s compares the stream state', (id, stream, state, expected) => {
		const { check } = setup(statesOf(stream))
		expect(check(id, { stream: stream.streamID, state })).toBe(expected)
	})

	it('treats a guest muted by the director as muted', () => {
		const { check } = setup(statesOf({ ...guest, muted: false, others: { 'mute-guest': '1' } }))
		expect(check('mic', { stream: 'guestStream', state: true })).toBe(true)
	})

	it('treats a guest hidden by the director as camera off', () => {
		const { check } = setup(statesOf({ ...guest, videoMuted: false, others: { 'hide-guest': '1' } }))
		expect(check('camera', { stream: 'guestStream', state: true })).toBe(true)
	})

	it('ignores the director controls for the director stream', () => {
		const { check } = setup(statesOf({ ...director, muted: false, others: { 'mute-guest': '1' } }))
		expect(check('mic', { stream: 'directorStream', state: true })).toBe(false)
	})

	it('is false for an unknown stream', () => {
		const { check } = setup(statesOf(local))
		expect(check('mic', { stream: 'nobody', state: false })).toBe(false)
		expect(check('guestScene', { stream: 'nobody', scene: '1' })).toBe(false)
	})

	it.each([
		['1', true],
		['2', false],
		['8', false],
	])('guestScene checks scene %s', (scene, expected) => {
		const { check } = setup(statesOf(guest))
		expect(check('guestScene', { stream: 'guestStream', scene })).toBe(expected)
	})

	describe('director view of a guest', () => {
		const viewed = {
			...guest,
			featured: true,
			slot: 3,
			group: ['2'],
			others: { 'hand-raised': true, 'remove-queue': true },
		}

		it.each([
			['handRaised', {}],
			['guestQueued', {}],
			['highlighted', {}],
			['guestGroup', { group: 2 }],
			['guestSlot', { slot: 3 }],
		] as const)('%s is true when the guest state matches', (id, options) => {
			const { check } = setup(statesOf(viewed))
			expect(check(id, { stream: 'guestStream', ...options })).toBe(true)
		})

		it.each([
			['handRaised', {}],
			['guestQueued', {}],
			['highlighted', {}],
			['guestGroup', { group: 2 }],
			['guestSlot', { slot: 3 }],
		] as const)('%s is false for a guest without that state', (id, options) => {
			const { check } = setup(statesOf(guest))
			expect(check(id, { stream: 'guestStream', ...options })).toBe(false)
		})

		it.each([
			['handRaised', {}],
			['guestGroup', { group: 2 }],
			['guestSlot', { slot: 3 }],
		] as const)('%s is false for an unknown stream', (id, options) => {
			const { check } = setup(statesOf(viewed))
			expect(check(id, { stream: 'nobody', ...options })).toBe(false)
		})

		it('checks the selected group and slot', () => {
			const { check } = setup(statesOf(viewed))
			expect(check('guestGroup', { stream: 'guestStream', group: 5 })).toBe(false)
			expect(check('guestSlot', { stream: 'guestStream', slot: 1 })).toBe(false)
		})

		it('reads the real director reply', () => {
			const { check } = setup(statesOf(...parseDetails(getDetailsDirector.callback.result)))
			expect(check('handRaised', { stream: 'guestone' })).toBe(false)
			expect(check('guestQueued', { stream: 'guestone' })).toBe(false)
			expect(check('highlighted', { stream: 'guestone' })).toBe(false)
		})
	})

	it.each([
		['guestDeafened', 'toggle-remote-speaker'],
		['guestBlind', 'toggle-remote-display'],
		['guestSceneMuted', 'mute-scene'],
	] as const)('%s follows the %s control', (id, control) => {
		const check = (value: string | undefined) => {
			const others = value === undefined ? {} : { [control]: value }
			const states = statesOf({ ...guest, others })
			return checkFeedback({ states, streams: [] }, id, { stream: guest.streamID })
		}
		expect(check('1')).toBe(true)
		expect(check('0')).toBe(false)
		expect(check(undefined)).toBe(false)
	})

	it('follows a stream given by a custom value, as the slot presets do', () => {
		const stream = definition(GetFeedbacks({ states: {}, streams: [] }).camera, 'camera').options[0]
		expect(stream).toMatchObject({ id: 'stream', allowCustom: true })
	})
})
