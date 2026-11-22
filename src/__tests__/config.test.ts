import { describe, expect, it } from 'vitest'
import { GetConfigFields, GetServerUrl } from '../config.js'

describe('GetServerUrl', () => {
	it('uses api.vdo.ninja by default', () => {
		expect(GetServerUrl({ wsCustom: false, wsServer: 'example.com' })).toEqual({ url: 'wss://api.vdo.ninja:443' })
	})

	it('uses api.vdo.ninja when the custom server is left empty', () => {
		expect(GetServerUrl({ wsCustom: true, wsServer: '  ' })).toEqual({ url: 'wss://api.vdo.ninja:443' })
	})

	it.each(['example.com', 'ws.my-host.example.org', 'localhost'])('accepts the custom server %s', (server) => {
		expect(GetServerUrl({ wsCustom: true, wsServer: ` ${server} ` })).toEqual({ url: `wss://${server}:443` })
	})

	it.each(['wss://example.com', 'example.com:8443', 'example.com/path', 'my host', '-bad.example.com'])(
		'rejects the custom server %s',
		(server) => {
			const result = GetServerUrl({ wsCustom: true, wsServer: server })
			expect(result).toEqual({ error: expect.stringContaining('Invalid custom websockets server') })
		},
	)
})

describe('GetConfigFields', () => {
	it('keeps the API ID in the secrets store', () => {
		expect(GetConfigFields().find((field) => field.id === 'apiID')).toMatchObject({ type: 'secret-text', minLength: 1 })
	})
})
