import { describe, expect, it } from 'vitest'
import { ChangedVariableValues, GetVariableDefinitions, GetVariableValues } from '../variables.js'
import { director, guest, local, statesOf } from './helpers/streams.js'

describe('variables', () => {
	it('defines director, guest and per-stream variables', () => {
		expect(Object.keys(GetVariableDefinitions(statesOf(director, guest)))).toEqual([
			'director_mic',
			'director_camera',
			'director_speaker',
			'directorStream_mic',
			'directorStream_camera',
			'directorStream_label',
			'directorStream_scenes',
			'guest_2_streamID',
			'guest_2_mic',
			'guest_2_camera',
			'guest_2_label',
			'guest_2_scenes',
			'guestStream_mic',
			'guestStream_camera',
			'guestStream_label',
			'guestStream_scenes',
			'guest_2_hand',
			'guestStream_hand',
			'guest_2_queued',
			'guestStream_queued',
			'guest_2_highlighted',
			'guestStream_highlighted',
			'guest_2_slot',
			'guestStream_slot',
			'guest_2_groups',
			'guestStream_groups',
			'guest_2_volume',
			'guestStream_volume',
			'guest_2_deafened',
			'guestStream_deafened',
			'guest_2_blind',
			'guestStream_blind',
			'guest_2_scene_mic',
			'guestStream_scene_mic',
		])
	})

	it('reports the state of each stream', () => {
		expect(GetVariableValues(statesOf(director, guest))).toEqual({
			director_mic: 'Unmuted',
			director_camera: 'Unmuted',
			director_speaker: 'Unmuted',
			directorStream_mic: 'Unmuted',
			directorStream_camera: 'Unmuted',
			directorStream_label: 'Director',
			directorStream_scenes: 'None',
			guest_2_streamID: 'guestStream',
			guest_2_mic: 'Unmuted',
			guest_2_camera: 'Muted',
			guest_2_label: 'Alice',
			guest_2_scenes: ['1', '3'],
			guestStream_mic: 'Unmuted',
			guestStream_camera: 'Muted',
			guestStream_label: 'Alice',
			guestStream_scenes: ['1', '3'],
			guest_2_hand: 'Lowered',
			guestStream_hand: 'Lowered',
			guest_2_queued: 'Admitted',
			guestStream_queued: 'Admitted',
			guest_2_highlighted: 'Not highlighted',
			guestStream_highlighted: 'Not highlighted',
			guest_2_slot: 'None',
			guestStream_slot: 'None',
			guest_2_groups: 'None',
			guestStream_groups: 'None',
			guest_2_volume: 100,
			guestStream_volume: 100,
			guest_2_deafened: 'Off',
			guestStream_deafened: 'Off',
			guest_2_blind: 'Off',
			guestStream_blind: 'Off',
			guest_2_scene_mic: 'Live',
			guestStream_scene_mic: 'Live',
		})
	})

	it('reports the director view of a guest', () => {
		const values = GetVariableValues(
			statesOf({
				...guest,
				featured: true,
				slot: 3,
				group: ['2', '5'],
				others: { 'hand-raised': true, 'remove-queue': true },
			}),
		)
		expect(values).toMatchObject({
			guest_2_hand: 'Raised',
			guest_2_queued: 'Queued',
			guest_2_highlighted: 'Highlighted',
			guest_2_slot: 3,
			guest_2_groups: ['2', '5'],
			guestStream_hand: 'Raised',
			guestStream_slot: 3,
		})
	})

	it('reports the director controls of a guest', () => {
		const others = { 'toggle-remote-speaker': '1', 'toggle-remote-display': '1', 'mute-scene': '1' }
		expect(GetVariableValues(statesOf({ ...guest, others }))).toMatchObject({
			guest_2_deafened: 'Deafened',
			guest_2_blind: 'Blind',
			guest_2_scene_mic: 'Muted',
		})
	})

	it('reports the volume the director set, as a number', () => {
		const values = GetVariableValues(statesOf({ ...guest, others: { volume: '50' } }))
		expect(values.guest_2_volume).toBe(50)
	})

	it('reports the local page, whatever its stream ID', () => {
		expect(GetVariableValues(statesOf({ ...local, muted: true, speakerMuted: true }))).toMatchObject({
			local_streamID: 'localStream',
			local_mic: 'Muted',
			local_camera: 'Unmuted',
			local_speaker: 'Muted',
		})
	})

	it('reports no slot when slots are not in use', () => {
		expect(GetVariableValues(statesOf({ ...guest, slot: false })).guest_2_slot).toBe('None')
	})

	it('shows a guest muted by the director as muted', () => {
		const values = GetVariableValues(statesOf({ ...guest, others: { 'mute-guest': '1' } }))
		expect(values.guest_2_mic).toBe('Muted')
	})

	it('only defines the page and per-stream variables for a plain local stream', () => {
		expect(Object.keys(GetVariableDefinitions(statesOf(local)))).toEqual([
			'local_streamID',
			'local_mic',
			'local_camera',
			'local_speaker',
			'local_highlighted',
			'localStream_mic',
			'localStream_camera',
			'localStream_label',
			'localStream_scenes',
		])
	})
})

describe('ChangedVariableValues', () => {
	it('returns only the values that differ from those sent', () => {
		expect(
			ChangedVariableValues({ a: 'Muted', b: ['1', '3'], c: 3 }, { a: 'Muted', b: ['1', '3'], c: 4, d: 'new' }),
		).toEqual({ c: 4, d: 'new' })
	})

	it('compares lists by their contents', () => {
		expect(ChangedVariableValues({ b: ['1', '3'] }, { b: ['1'] })).toEqual({ b: ['1'] })
	})

	it('returns nothing when nothing changed', () => {
		const values = GetVariableValues(statesOf(director, guest))
		expect(ChangedVariableValues(values, GetVariableValues(statesOf(director, guest)))).toEqual({})
	})
})
