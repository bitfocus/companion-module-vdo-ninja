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
})
