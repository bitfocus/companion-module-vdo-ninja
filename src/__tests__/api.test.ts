import { describe, expect, it } from 'vitest'
import { buildRequest, isValidStreamID, parseDetails, parseMessage } from '../api.js'
import getDetailsPush from './fixtures/getDetails-push.json' with { type: 'json' }

const json = (value: unknown) => JSON.stringify(value)

describe('buildRequest', () => {
	it('sends a local command with "null" placeholders', () => {
		expect(buildRequest('reload', null, {}, 1)).toEqual({
			action: 'reload',
			target: 'null',
			value: 'null',
			cid: 1,
		})
	})

	it('includes the target, value and request ID', () => {
		expect(buildRequest('volume', 3, { value: 150 }, 7)).toEqual({
			action: 'volume',
			target: 3,
			value: 150,
			cid: 7,
		})
	})

	it('only includes value2 when given', () => {
		expect(buildRequest('zoom', null, { value: 0.5 }, 1)).not.toHaveProperty('value2')
		expect(buildRequest('zoom', null, { value: 0.5, value2: 'abs' }, 1)).toHaveProperty('value2', 'abs')
	})
})

describe('parseMessage', () => {
	it('parses boolean state updates', () => {
		expect(parseMessage(json({ update: { streamID: 'abc', action: 'muted', value: true } }))).toEqual({
			type: 'update',
			update: { streamID: 'abc', action: 'muted', value: true },
		})
	})

	it('rejects a boolean update with a non-boolean value', () => {
		expect(parseMessage(json({ update: { streamID: 'abc', action: 'muted', value: 'yes' } }))).toEqual({
			type: 'ignored',
			reason: 'non-boolean value for muted',
		})
	})

	it('parses endViewConnection with the stream ID as its value', () => {
		expect(parseMessage(json({ update: { streamID: 'dir', action: 'endViewConnection', value: 'guest' } }))).toEqual({
			type: 'update',
			update: { streamID: 'dir', action: 'endViewConnection', value: 'guest' },
		})
	})

	it('keeps any value on refresh updates', () => {
		const message = parseMessage(json({ update: { streamID: 'abc', action: 'details', value: { abc: {} } } }))
		expect(message).toEqual({ type: 'update', update: { streamID: 'abc', action: 'details', value: { abc: {} } } })
	})

	it('treats a missing stream ID as null', () => {
		expect(parseMessage(json({ update: { action: 'hangup', value: true } }))).toEqual({
			type: 'update',
			update: { streamID: null, action: 'hangup', value: true },
		})
	})

	it('accepts a hangup whatever its value, as nothing reads it', () => {
		expect(parseMessage(json({ update: { streamID: 'abc', action: 'hangup' } }))).toEqual({
			type: 'update',
			update: { streamID: 'abc', action: 'hangup', value: null },
		})
	})

	it('ignores updates with an invalid stream ID', () => {
		expect(parseMessage(json({ update: { streamID: '__proto__', action: 'muted', value: true } }))).toEqual({
			type: 'ignored',
			reason: 'invalid stream ID',
		})
		expect(parseMessage(json({ update: { streamID: 'dir', action: 'endViewConnection', value: 'a b' } }))).toEqual({
			type: 'ignored',
			reason: 'invalid stream ID for endViewConnection',
		})
	})

	it('ignores updates it does not handle', () => {
		expect(parseMessage(json({ update: { streamID: 'abc', action: 'tip', value: {} } }))).toEqual({
			type: 'ignored',
			reason: 'unhandled update tip',
		})
	})

	it('parses callbacks with their request ID', () => {
		expect(
			parseMessage(json({ callback: { action: 'mic', target: 'null', value: false, cid: 4, result: true } })),
		).toEqual({
			type: 'callback',
			callback: { action: 'mic', cid: 4, result: true },
		})
	})

	it('parses callbacks without a request ID', () => {
		expect(parseMessage(json({ callback: { action: 'getDetails', result: {} } }))).toEqual({
			type: 'callback',
			callback: { action: 'getDetails', cid: undefined, result: {} },
		})
	})

	it.each([
		['invalid JSON', '{nope'],
		['not an object', '[1, 2]'],
		['unknown message', json({ hello: 'world' })],
		['malformed update', json({ update: 'muted' })],
		['malformed callback', json({ callback: { result: true } })],
	])('ignores %s', (reason, text) => {
		expect(parseMessage(text)).toEqual({ type: 'ignored', reason })
	})
})

describe('parseDetails', () => {
	it('reads the streams from a real getDetails reply', () => {
		const streams = parseDetails(getDetailsPush.callback.result)
		expect(streams).toHaveLength(1)
		expect(streams[0]).toMatchObject({ streamID: 'fixturestream', label: 'Fixture', localStream: true, muted: false })
	})

	it('drops entries without a stream ID', () => {
		expect(parseDetails({ a: { streamID: 'one' }, b: { label: 'x' }, c: 3 })).toEqual([{ streamID: 'one' }])
	})

	it('drops entries with an invalid stream ID', () => {
		expect(
			parseDetails({
				a: { streamID: '__proto__' },
				b: { streamID: 'has space' },
				c: { streamID: '' },
				d: { streamID: 'ok_1-2' },
			}),
		).toEqual([{ streamID: 'ok_1-2' }])
	})

	it('keeps only the fields the module reads', () => {
		const [stream] = parseDetails({
			a: { streamID: 'one', muted: true, miscellaneous: { CPU: '14 threads' }, chunkedBufferDefault: 3000 },
		})
		expect(stream).toEqual({ streamID: 'one', muted: true })
	})

	it.each([
		['label', 3],
		['director', 'yes'],
		['position', '$(bad)'],
		['position', 1.5],
		['localStream', 1],
		['muted', 'true'],
		['others', 'x'],
		['scenes', ['1']],
		['featured', 1],
		['slot', 'one'],
		['group', '2'],
		['group', [{}]],
	])('drops a %s field holding %j, keeping the stream', (field, value) => {
		expect(parseDetails({ a: { streamID: 'one', [field]: value } })).toEqual([{ streamID: 'one' }])
	})

	it('keeps fields with every shape VDO.Ninja reports', () => {
		const details = {
			streamID: 'one',
			label: false,
			director: null,
			position: null,
			others: { volume: '50', 'hand-raised': false },
			scenes: { '1': true },
			slot: false,
			group: ['2', 3],
		}
		expect(parseDetails({ a: details })).toEqual([details])
	})

	it('returns nothing for non-object results', () => {
		expect(parseDetails('timeout')).toEqual([])
		expect(parseDetails(null)).toEqual([])
	})
})

describe('isValidStreamID', () => {
	it.each(['abc', 'ABC_123', 'with-dash', 'a'.repeat(128)])('accepts %s', (id) => {
		expect(isValidStreamID(id)).toBe(true)
	})

	it.each(['', 'has space', 'semi;colon', '$(var)', '__proto__', 'a'.repeat(129), 3, null])('rejects %j', (id) => {
		expect(isValidStreamID(id)).toBe(false)
	})
})
