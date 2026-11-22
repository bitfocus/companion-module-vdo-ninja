import { randomUUID } from 'node:crypto'
import { chromium, type Browser, type Page, type Response } from 'playwright'
import { vi } from 'vitest'
import { VdoNinjaClient } from '../../client.js'
import { OutageProxy } from '../helpers/outageProxy.js'
import { TestRelay } from '../helpers/relay.js'

const VdoNinjaUrl = process.env.VDO_NINJA_URL ?? 'https://vdo.ninja/v30/'

/** A short random ID, valid as a VDO.Ninja stream ID or room name */
export function randomId(prefix: string): string {
	return `${prefix}${randomUUID().replaceAll('-', '').slice(0, 12)}`
}

/** Waits for VDO.Ninja, which can take a few seconds to pass state between pages */
export async function eventually(assertion: () => unknown): Promise<void> {
	await vi.waitFor(assertion, { timeout: 15_000, interval: 100 })
}

/** Like `eventually`, for what VDO.Ninja itself is slow to notice */
export async function eventuallyWithin(timeout: number, assertion: () => unknown): Promise<void> {
	await vi.waitFor(assertion, { timeout, interval: 250 })
}

/** Waits for a condition during setup, where assertions are not allowed */
export async function until(condition: () => boolean): Promise<void> {
	await vi.waitUntil(condition, { timeout: 15_000, interval: 100 })
}

export async function launchBrowser(): Promise<Browser> {
	return chromium.launch({
		args: [
			'--use-fake-device-for-media-stream',
			'--use-fake-ui-for-media-stream',
			// Lets the public vdo.ninja page open a websocket to the relay on localhost
			'--disable-features=LocalNetworkAccessChecks',
		],
	})
}

/**
 * Loads a VDO.Ninja page. The public site rate limits repeated loads, leaving a page without its scripts,
 * so this says so at once rather than leaving a test to time out waiting for a page that can't work.
 */
export async function loadVdoNinja(page: Page, params: Record<string, string>): Promise<void> {
	const url = new URL(VdoNinjaUrl)
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

	let rateLimited = false
	const onResponse = (response: Response) => {
		if (response.status() === 429) rateLimited = true
	}
	page.on('response', onResponse)
	await page.goto(url.toString())
	page.off('response', onResponse)

	if (rateLimited) {
		throw new Error(
			`${url.origin} is rate limiting this machine (HTTP 429). Wait before running these again, or set VDO_NINJA_URL to your own copy.`,
		)
	}
}

/**
 * A relay, a headless Chromium and the module's client, joined to one API ID.
 * Pages opened with `api: true` control and report to the client through the relay.
 * With 'outage-proxy' the client reaches the relay through `proxy`, so its connection can be cut alone.
 */
export class VdoNinjaHarness {
	readonly apiID = randomId('e2e')
	readonly client: VdoNinjaClient

	private constructor(
		readonly relay: TestRelay,
		readonly browser: Browser,
		readonly proxy: OutageProxy | null,
	) {
		this.client = this.newClient()
	}

	static async start(route: 'direct' | 'outage-proxy'): Promise<VdoNinjaHarness> {
		const relay = await TestRelay.start()
		const proxy = route === 'outage-proxy' ? await OutageProxy.start(relay.url) : null
		return new VdoNinjaHarness(relay, await launchBrowser(), proxy)
	}

	/** Another controller joined to the same API ID; the caller destroys it */
	newClient(): VdoNinjaClient {
		return new VdoNinjaClient({
			url: this.proxy?.url ?? this.relay.url,
			apiID: this.apiID,
			minReconnectDelay: 100,
			maxReconnectDelay: 1000,
			heartbeatInterval: 5000,
			detailsDelay: 50,
		})
	}

	/** Opens a VDO.Ninja page; with `api` it joins the relay and waits until it has connected */
	async open(params: Record<string, string>, api: boolean): Promise<Page> {
		const page = await this.browser.newPage()
		const members = this.relay.members(this.apiID)
		await loadVdoNinja(page, api ? { ...params, api: this.apiID, apiserver: this.relay.url } : params)
		if (api) await vi.waitUntil(() => this.relay.members(this.apiID) > members, { timeout: 30_000 })
		return page
	}

	/** VDO.Ninja's replies to a command, oldest first, from everything that crossed the relay */
	results(action: string): unknown[] {
		return this.relay.messages.flatMap(({ data }) => {
			const callback = (data as { callback?: { action: string; result: unknown } }).callback
			return callback?.action === action ? [callback.result] : []
		})
	}

	async stop(): Promise<void> {
		this.client.destroy()
		await this.browser.close()
		await this.relay.stop()
		await this.proxy?.cut()
	}
}

/**
 * Records calls to functions on a page, for commands whose effect can't be seen without the hardware
 * or room behind them. Names are globals (`playbackMIDI`) or `session.` methods; calls still go through.
 */
export async function spyOnPage(page: Page, names: string[]): Promise<void> {
	await page.evaluate((names) => {
		type Fn = (...args: unknown[]) => unknown
		const page = globalThis as unknown as Record<string, Record<string, Fn>> & { __calls?: Record<string, unknown[][]> }
		const calls = (page.__calls ??= {})
		for (const name of names) {
			const isSession = name.startsWith('session.')
			const owner = isSession ? page.session : (page as unknown as Record<string, Fn>)
			const key = isSession ? name.slice('session.'.length) : name
			const original = owner[key]
			calls[name] = []
			owner[key] = function (this: unknown, ...args: unknown[]) {
				// Page objects such as DOM elements can't be sent back to the test
				calls[name].push(args.map((arg) => (typeof arg === 'object' && arg && 'nodeType' in arg ? '[node]' : arg)))
				return original.apply(this, args)
			}
		}
	}, names)
}

export async function pageCalls(page: Page, name: string): Promise<unknown[][]> {
	return page.evaluate((name) => {
		return (globalThis as unknown as { __calls: Record<string, unknown[][]> }).__calls[name]
	}, name)
}

/** Reads fields of VDO.Ninja's global `session` object on a page */
export async function sessionState<K extends string>(page: Page, keys: K[]): Promise<Record<K, unknown>> {
	return page.evaluate((keys) => {
		const session = (globalThis as unknown as { session: Record<string, unknown> }).session
		return Object.fromEntries(keys.map((key) => [key, session[key]]))
	}, keys) as Promise<Record<K, unknown>>
}
