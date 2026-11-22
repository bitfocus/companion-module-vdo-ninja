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
		['showChatOverlay', { value: 'hi' }, 'showChatOverlay', { value: 'hi' }],
		['roomTimer', { value: 'start', seconds: 90 }, 'startRoomTimer', { value: 90 }],
		['roomTimer', { value: 'pause', seconds: 90 }, 'pauseRoomTimer', {}],
		['roomTimer', { value: 'stop', seconds: 90 }, 'stopRoomTimer', {}],
		['tallyLight', { value: 'standby' }, 'tallylight', { value: 'standby' }],
		['activeSpeaker', { value: 'toggle' }, 'activeSpeaker', { value: 'toggle' }],
		['activeSpeaker', { value: '2' }, 'activeSpeaker', { value: 2 }],
		['bufferDelay', { value: 500, stream: ' * ' }, 'setBufferDelay', { value: 500, value2: '*' }],
		['bufferDelay', { value: 500, stream: '' }, 'setBufferDelay', { value: 500, value2: undefined }],
		['layout', { value: 2 }, 'layout', { value: 2 }],
		['aspectRatio', { value: '4:3' }, 'aspectRatio', { value: '4:3' }],
		['videoConstraint', { name: 'brightness', value: '60' }, 'videoConstraint', { value: 'brightness', value2: '60' }],
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
		['guestSetSlot', { target: '2', value: 0 }, 'setslot', { value: 0 }],
		['guestMixOrder', { target: '2', value: -1 }, 'mixorder', { value: -1 }],
		['guestChannel', { target: '2', value: 1 }, 'channel', { value: 1 }],
		['guestPinnedOverlay', { target: '2', value: 'hi' }, 'sendPinnedDirectorChat', { value: 'hi' }],
		['guestRoomTimer', { target: '2', value: 'start', seconds: 60 }, 'startRoomTimer', { value: 60 }],
		['guestRoomTimer', { target: '2', value: 'pause', seconds: 60 }, 'pauseRoomTimer', {}],
		['guestRoomTimer', { target: '2', value: 'stop', seconds: 60 }, 'stopRoomTimer', {}],
		['guestPtz', { target: '2', axis: 'ptzZoom', value: 20 }, 'ptzZoom', { value: 0.2 }],
		['guestAutofocus', { target: '2', value: 'false' }, 'ptzAutofocus', { value: 'false' }],
		['guestMirror', { target: '2', value: 'toggle' }, 'mirror', { value: 'toggle' }],
		['guestRotate', { target: '2', value: '180' }, 'rotate', { value: 180 }],
		['guestRotate', { target: '2', value: 'false' }, 'rotate', { value: 'false' }],
		['guestRequestResolution', { target: '2', value: ' 640x360 ' }, 'requestResolution', { value: '640x360' }],
		[
			'guestRequestAspectRatio',
			{ target: '2', value: '9:16', size: 1280 },
			'requestAspectRatio',
			{ value: '9:16', value2: 1280 },
		],
		['guestCaptureSize', { target: '2', setting: 'setHeight', value: '720' }, 'setHeight', { value: '720' }],
		['guestRefresh', { target: '2', value: 'recoverStream' }, 'recoverStream', {}],
	] as const)('%s sends the guest %s command', async (id, options, command, args) => {
		const { sender, run } = setup()
		await run(id, options as never)
		expect(sender.sendGuest).toHaveBeenCalledExactlyOnceWith(command, '2', args)
		expect(sender.sendLocal).not.toHaveBeenCalled()
	})

	it.each([
		['videoConstraint', { name: ' ', value: '1' }],
		['guestRequestResolution', { target: '2', value: '1280 by 720' }],
	] as const)('%s sends nothing without a usable value', async (id, options) => {
		const { sender, run } = setup()
		await run(id, options as never)
		expect(sender.sendLocal).not.toHaveBeenCalled()
		expect(sender.sendGuest).not.toHaveBeenCalled()
	})

	it('covers every action', () => {
		const { actions } = setup()
		expect(Object.keys(actions)).toHaveLength(63)
	})
})
