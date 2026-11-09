import type {
	CompanionLayeredButtonPresetDefinition,
	CompanionPresetDefinition,
	CompanionPresetGroup,
	CompanionSimplePresetDefinition,
} from '@companion-module/base'
import { describe, expect, it, vi } from 'vitest'
import { GetActions } from '../actions.js'
import { GetFeedbacks } from '../feedbacks.js'
import { GetCompositeElements } from '../graphics.js'
import { GetPresets } from '../presets.js'
import { GetVariableDefinitions } from '../variables.js'
import { director, guest, local, statesOf } from './helpers/streams.js'

const { structure, presets } = GetPresets()

type Variants = { layered: CompanionLayeredButtonPresetDefinition; simple: CompanionSimplePresetDefinition }

function variantsOf(id: string): Variants {
	const preset = presets[id]
	if (preset?.type !== 'alternatives') throw new Error(`${id} has no alternatives`)
	const find = <T extends CompanionPresetDefinition>(type: T['type']) => {
		const variant = preset.variants.find((v) => v.type === type)
		if (!variant) throw new Error(`${id} has no ${type} variant`)
		return variant as unknown as T
	}
	return { layered: find('layered'), simple: find('simple') }
}

const presetIds = Object.keys(presets)
const everything = presetIds.map((id) => [id, variantsOf(id)] as const)
const groups = structure.flatMap((section) => section.definitions as CompanionPresetGroup[])

/** Every value of a key anywhere in a preset, including inside step actions and children */
function valuesOf(value: unknown, key: string): string[] {
	if (Array.isArray(value)) return value.flatMap((entry) => valuesOf(entry, key))
	if (typeof value !== 'object' || value === null) return []
	return Object.entries(value).flatMap(([k, v]) =>
		k === key && typeof v === 'string' ? [v, ...valuesOf(v, key)] : valuesOf(v, key),
	)
}

describe('presets', () => {
	it('uses every action', () => {
		const used = new Set(everything.flatMap(([, { layered }]) => valuesOf(layered.steps, 'actionId')))
		const actions = Object.keys(GetActions({ sendLocal: vi.fn(), sendGuest: vi.fn() }))
		expect(actions.filter((id) => !used.has(id))).toEqual([])
	})

	it('uses every feedback', () => {
		const used = new Set(everything.flatMap(([, { layered }]) => valuesOf(layered.feedbacks, 'feedbackId')))
		const feedbacks = Object.keys(GetFeedbacks({ states: {}, streams: [] }))
		expect(feedbacks.filter((id) => !used.has(id))).toEqual([])
	})

	it('exist before anything has connected, as they follow guest positions rather than streams', () => {
		expect(presetIds.length).toBeGreaterThan(30)
		expect(JSON.stringify(presets)).not.toContain(guest.streamID)
	})

	it('references every preset from the structure, and only presets that exist', () => {
		const referenced = groups.flatMap((group) => (group.type === 'template' ? [group.presetId] : group.presets))
		expect(new Set(referenced)).toEqual(new Set(presetIds))
	})

	it('gives every group an ID of its own', () => {
		const ids = groups.map((group) => group.id)
		expect(new Set(ids).size).toBe(ids.length)
	})

	it('offers a simple fallback that does the same as the layered preset', () => {
		for (const [, { layered, simple }] of everything) {
			expect(simple.steps).toEqual(layered.steps)
			expect(simple.localVariables).toEqual(layered.localVariables)
			expect(simple.name).toBe(layered.name)
			expect(valuesOf(simple.feedbacks, 'feedbackId')).toEqual(valuesOf(layered.feedbacks, 'feedbackId'))
		}
	})

	it.each(everything)('%s declares every local variable it uses', (_id, variants) => {
		const declared = valuesOf(variants.layered.localVariables, 'variableName')
		const used = [...JSON.stringify(variants).matchAll(/\$\(local:(\w+)\)/g)].map((match) => match[1])
		expect(declared).toEqual(expect.arrayContaining(used))
	})

	it('templates only variables the preset declares', () => {
		for (const group of groups) {
			if (group.type !== 'template') continue
			const declared = valuesOf(variantsOf(group.presetId).layered.localVariables, 'variableName')
			expect(declared).toContain(group.templateVariableName)
		}
	})

	it('offers a button for each of the first twelve guests', () => {
		const mic = groups.find((group) => group.id === 'guest_mic')
		expect(mic).toMatchObject({ type: 'template', templateVariableName: 'guest' })
		expect(mic?.type === 'template' && mic.templateValues.map((v) => v.value)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
		])
	})

	it('only reads variables the module defines', () => {
		const defined = Object.keys(GetVariableDefinitions(statesOf(director, guest, local)))
		const known = new Set(defined.map((id) => id.replace(/^guest_2_/, 'guest_$(local:guest)_')))
		for (const [, variants] of everything) {
			const text = JSON.stringify(variants)
			for (const match of text.matchAll(/\$\(VDO\.Ninja:((?:[^()]|\$\(local:guest\))+)\)/g)) {
				expect(known).toContain(match[1])
			}
		}
	})

	it.each(['guest_hangup', 'guest_forward', 'local_hangup', 'local_reload'])('%s only acts when held', (id) => {
		const [step] = variantsOf(id).layered.steps
		expect(step.down).toEqual([])
		expect(step.up).toEqual([])
		expect(step[1000]).toMatchObject({ options: { runWhileHeld: true } })
	})

	it('overrides only the options its composite element has', () => {
		const composites = GetCompositeElements()
		for (const [id, { layered }] of everything) {
			const [element] = layered.elements
			if (element.type !== 'composite') throw new Error(`${id} is not a composite`)
			const definition = composites[element.elementId as keyof typeof composites]
			if (!definition) throw new Error(`${id} uses an unknown composite`)
			const options = definition.options.map((option) => `opt:${option.id}`)

			for (const feedback of layered.feedbacks) {
				for (const override of feedback.styleOverrides) {
					expect(override.elementId).toBe(element.id)
					expect(options).toContain(override.elementProperty)
					// Companion ignores feedback overrides of a composite's text options, so only its colour can change
					expect(override.elementProperty).toBe('opt:accent')
				}
			}
			expect(Object.keys(element.options).map((key) => `opt:${key}`)).toEqual(options)
		}
	})

	it('never nests variables directly inside an expression, which Companion cannot parse', () => {
		const expressions = (value: unknown): string[] => {
			if (Array.isArray(value)) return value.flatMap(expressions)
			if (typeof value !== 'object' || value === null) return []
			const object = value as { isExpression?: unknown; value?: unknown }
			if (object.isExpression === true && typeof object.value === 'string') return [object.value]
			return Object.values(value).flatMap(expressions)
		}
		for (const [, variants] of everything) {
			for (const expression of expressions(variants)) {
				expect(expression.replaceAll(/parseVariables\('[^']*'(, '[^']*')?\)/g, '')).not.toMatch(/\$\([^)]*\$\(/)
			}
		}
	})

	it('addresses the guest in a position, not a fixed stream', () => {
		expect(variantsOf('guest_mic').layered).toMatchObject({
			steps: [{ down: [{ actionId: 'guestMic', options: { target: '$(local:guest)' } }] }],
			feedbacks: [
				{
					feedbackId: 'mic',
					options: {
						stream: { isExpression: true, value: "parseVariables('$(VDO.Ninja:guest_$(local:guest)_streamID)', '')" },
					},
				},
				{ feedbackId: 'mic' },
			],
		})
	})

	it('says what the record button will do next, as VDO.Ninja does not report whether it is recording', () => {
		const { layered } = variantsOf('local_record')
		expect(JSON.stringify(layered.elements)).toContain('Press to stop')
		expect(JSON.stringify(layered.elements)).not.toContain('Recording')
	})

	it('assigns the guest to the mixer slot it shows', () => {
		expect(variantsOf('guest_mixer_slot').layered.steps).toMatchObject([
			{ down: [{ actionId: 'guestSetSlot', options: { target: '$(local:guest)' } }] },
		])
	})

	it('sets the volume ring from the rotary, stopping at the ends of the range', () => {
		const [step] = variantsOf('guest_volume').layered.steps
		expect(step.rotate_left).toMatchObject([{ actionId: 'guestVolume' }])
		expect(step.rotate_right).toMatchObject([{ actionId: 'guestVolume' }])
		expect(JSON.stringify(step.rotate_right)).toContain('min(200, ')
		expect(JSON.stringify(step.rotate_left)).toContain('max(0, ')
	})
})
