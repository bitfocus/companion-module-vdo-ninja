import { describe, expect, it, vi } from 'vitest'
import { GetActions, type ActionsSchema } from '../actions.js'
import { runAction } from './helpers/definitions.js'

function setup() {
	const sender = { sendLocal: vi.fn(), sendGuest: vi.fn() }
	const actions = GetActions(sender)

	async function run<K extends keyof ActionsSchema>(id: K, options: ActionsSchema[K]['options']): Promise<void> {
		await runAction(sender, id, options)
	}

	return { sender, actions, run }
}

describe('actions', () => {
	it.each([
		['speaker', { value: 'false' }, 'speaker', { value: 'false' }],
		['mic', { value: 'toggle' }, 'mic', { value: 'toggle' }],
		['camera', { value: 'true' }, 'camera', { value: 'true' }],
		['volume', { value: 40 }, 'volume', { value: 40 }],
		['sendChat', { value: 'hello' }, 'sendChat', { value: 'hello' }],
		['record', { value: 'false' }, 'record', { value: 'false' }],
		['reload', {}, 'reload', {}],
		['hangup', {}, 'hangup', {}],
		['bitrate', { value: 'true', bitrate: 900 }, 'bitrate', { value: 'true' }],
		['bitrate', { value: 'custom', bitrate: 900 }, 'bitrate', { value: 900 }],
		['panning', { value: 45 }, 'panning', { value: 45 }],
		['togglehand', {}, 'togglehand', {}],
		['togglescreenshare', {}, 'togglescreenshare', {}],
		['forceKeyframe', {}, 'forceKeyframe', {}],
		['nextSlide', {}, 'nextSlide', {}],
		['previousSlide', {}, 'prevSlide', {}],
		['ptzPan', { value: -50 }, 'pan', { value: -0.5 }],
		['ptzTilt', { value: 25 }, 'tilt', { value: 0.25 }],
		['ptzZoom', { value: 10 }, 'zoom', { value: 0.1 }],
		['ptzFocus', { value: -10 }, 'focus', { value: -0.1 }],
		['ptzExposure', { value: 75 }, 'exposure', { value: 0.75, value2: 'abs' }],
		['group', { value: 3 }, 'group', { value: 3 }],
		['joinGroup', { value: 3 }, 'joinGroup', { value: 3 }],
		['leaveGroup', { value: 3 }, 'leaveGroup', { value: 3 }],
		['viewGroup', { value: 3 }, 'viewGroup', { value: 3 }],
		['joinViewGroup', { value: 3 }, 'joinViewGroup', { value: 3 }],
		['leaveViewGroup', { value: 3 }, 'leaveViewGroup', { value: 3 }],
		['soloVideo', {}, 'soloVideo', {}],
	] as const)('%s sends the local %s command', async (id, options, command, args) => {
		const { sender, run } = setup()
		await run(id, options as never)
		expect(sender.sendLocal).toHaveBeenCalledExactlyOnceWith(command, args)
		expect(sender.sendGuest).not.toHaveBeenCalled()
	})

	it.each([
		['guestForward', { target: '2', value: 'room2' }, 'forward', { value: 'room2' }],
		['guestAddScene', { target: '2', value: '3' }, 'addScene', { value: '3' }],
		['guestMuteScene', { target: '2', value: '3' }, 'muteScene', { value: '3' }],
		['guestGroup', { target: '2', value: '4' }, 'group', { value: '4' }],
		['guestMic', { target: '2' }, 'mic', {}],
		['guestCamera', { target: '2' }, 'camera', {}],
		['guestHangup', { target: '2' }, 'hangup', {}],
		['guestSoloChat', { target: '2' }, 'soloChat', {}],
		['guestAltSoloChat', { target: '2' }, 'soloChatBidirectional', {}],
		['guestSpeaker', { target: '2' }, 'speaker', {}],
		['guestDisplay', { target: '2' }, 'display', {}],
		['guestOverlay', { target: '2', value: 'hi' }, 'sendDirectorChat', { value: 'hi' }],
		['guestForceKeyframe', { target: '2' }, 'forceKeyframe', {}],
		['guestSoloVideo', { target: '2' }, 'soloVideo', {}],
		['guestVolume', { target: '2', value: 150 }, 'volume', { value: 150 }],
	] as const)('%s sends the guest %s command', async (id, options, command, args) => {
		const { sender, run } = setup()
		await run(id, options as never)
		expect(sender.sendGuest).toHaveBeenCalledExactlyOnceWith(command, '2', args)
		expect(sender.sendLocal).not.toHaveBeenCalled()
	})

	it('covers every action', () => {
		const { actions } = setup()
		expect(Object.keys(actions)).toHaveLength(42)
	})
})
