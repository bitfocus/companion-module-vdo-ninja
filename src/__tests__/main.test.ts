import { describe, expect, it, vi } from 'vitest'
import VDONinjaInstance from '../main.js'

vi.mock('@companion-module/base', async (importOriginal) => ({
	...(await importOriginal<typeof import('@companion-module/base')>()),
	InstanceBase: class {
		log = vi.fn()
		updateStatus = vi.fn()
		setFeedbackDefinitions = vi.fn()
		setVariableDefinitions = vi.fn()
		setPresetDefinitions = vi.fn()
		setActionDefinitions = vi.fn()
		setCompositeElementDefinitions = vi.fn()
		setVariableValues = vi.fn()
		checkAllFeedbacks = vi.fn()
	},
}))

describe('VDONinjaInstance', () => {
	it('rechecks feedbacks when the connection is replaced, as the old streams are gone', () => {
		const instance = new VDONinjaInstance({})
		const checkAllFeedbacks = vi.spyOn(instance, 'checkAllFeedbacks')

		instance.connect()

		expect(checkAllFeedbacks).toHaveBeenCalled()
	})

	it('defines the feedbacks before the presets that use them', async () => {
		const instance = new VDONinjaInstance({})
		const order: string[] = []
		vi.spyOn(instance, 'setFeedbackDefinitions').mockImplementation(() => void order.push('feedbacks'))
		vi.spyOn(instance, 'setPresetDefinitions').mockImplementation(() => void order.push('presets'))

		await instance.init({ wsCustom: false, wsServer: '' }, true, { apiID: '' })

		expect(order.slice(0, 2)).toEqual(['feedbacks', 'presets'])
	})
})
