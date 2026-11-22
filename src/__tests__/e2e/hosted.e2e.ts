/**
 * The whole module through the real hosted relay (api.vdo.ninja), configured the way a user does it.
 * Only Companion's side of the instance is stood in for, recording what the module tells it.
 */
import type { Browser, Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { InstanceStatus } from '@companion-module/base'
import VDONinjaInstance from '../../main.js'
import { eventually, eventuallyWithin, launchBrowser, loadVdoNinja, randomId, sessionState } from './vdoninja.js'

type Callback = (event: { options: Record<string, unknown> }, context: object) => unknown

type Recorded = {
	statuses: [InstanceStatus, string | null | undefined][]
	logs: [string, string][]
	values: Record<string, unknown>
	actions: Record<string, { callback: Callback }>
	feedbacks: Record<string, { callback: Callback }>
	checks: number
}

vi.mock('@companion-module/base', async (importOriginal) => ({
	...(await importOriginal<typeof import('@companion-module/base')>()),
	InstanceBase: class {
		statuses: unknown[] = []
		logs: unknown[] = []
		values: Record<string, unknown> = {}
		actions = {}
		feedbacks = {}
		checks = 0
		log(level: string, message: string) {
			this.logs.push([level, message])
		}
		updateStatus(status: string, message: string | null | undefined) {
			this.statuses.push([status, message])
		}
		setActionDefinitions(definitions: object) {
			this.actions = definitions
		}
		setFeedbackDefinitions(definitions: object) {
			this.feedbacks = definitions
		}
		setVariableDefinitions() {}
		setPresetDefinitions() {}
		setVariableValues(values: Record<string, unknown>) {
			Object.assign(this.values, values)
		}
		checkAllFeedbacks() {
			this.checks++
		}
	},
}))

const config = { wsCustom: false, wsServer: '' }

describe('the module through api.vdo.ninja', () => {
	const apiID = randomId('e2e')
	const streamID = randomId('hosted')

	let browser: Browser
	let page: Page
	let instance: VDONinjaInstance
	let recorded: Recorded

	const lastStatus = () => recorded.statuses.at(-1)?.[0]
	const micFeedback = (state: boolean) => recorded.feedbacks.mic.callback({ options: { stream: streamID, state } }, {})

	beforeAll(async () => {
		browser = await launchBrowser()
		page = await browser.newPage()
		await loadVdoNinja(page, { push: streamID, autostart: '', webcam: '', api: apiID })
		instance = new VDONinjaInstance({})
		recorded = instance as unknown as Recorded
	}, 60_000)

	afterAll(async () => {
		await instance?.destroy()
		await browser?.close()
	})

	it('connects with the default settings and loads the page', async () => {
		await instance.init(config, false, { apiID })

		await eventuallyWithin(30_000, () => expect(lastStatus()).toBe(InstanceStatus.Ok))
		await eventuallyWithin(30_000, () => expect(recorded.values[`${streamID}_mic`]).toBe('Unmuted'))
		expect(micFeedback(false)).toBe(true)
	}, 60_000)

	it('runs a button press through to the page and back to the feedback and variable', async () => {
		await recorded.actions.mic.callback({ options: { value: 'false' } }, {})

		await eventually(async () => expect((await sessionState(page, ['muted'])).muted).toBe(true))
		await eventually(() => expect(recorded.values[`${streamID}_mic`]).toBe('Muted'))
		expect(micFeedback(true)).toBe(true)

		await recorded.actions.mic.callback({ options: { value: 'toggle' } }, {})

		await eventually(async () => expect((await sessionState(page, ['muted'])).muted).toBe(false))
		await eventually(() => expect(recorded.values[`${streamID}_mic`]).toBe('Unmuted'))
	}, 60_000)

	it('reports no failure when reconfigured while still connecting', async () => {
		recorded.statuses.length = 0
		recorded.logs.length = 0

		await instance.configUpdated(config, { apiID: randomId('other') })
		await instance.configUpdated(config, { apiID: randomId('other') })

		await eventuallyWithin(30_000, () => expect(lastStatus()).toBe(InstanceStatus.Ok))
		expect(recorded.statuses.map(([status]) => status)).not.toContain(InstanceStatus.ConnectionFailure)
		expect(recorded.logs.filter(([level]) => level === 'error')).toEqual([])
	}, 60_000)

	it('turns feedbacks off when switched to an API ID with no page', () => {
		expect(recorded.checks).toBeGreaterThan(0)
		expect(micFeedback(false)).toBe(false)
		expect(micFeedback(true)).toBe(false)
	})

	it('asks for an API ID when it is cleared', async () => {
		await instance.configUpdated(config, { apiID: '  ' })
		expect(lastStatus()).toBe(InstanceStatus.BadConfig)
	})

	it('finds the page again when the API ID comes back', async () => {
		await instance.configUpdated(config, { apiID })
		await eventuallyWithin(30_000, () => expect(lastStatus()).toBe(InstanceStatus.Ok))
		await eventuallyWithin(30_000, () => expect(micFeedback(false)).toBe(true))
	}, 60_000)

	it('stays quiet after being destroyed', async () => {
		await instance.destroy()
		const statuses = recorded.statuses.length
		await new Promise((resolve) => setTimeout(resolve, 500))
		expect(recorded.statuses).toHaveLength(statuses)
	})
})
