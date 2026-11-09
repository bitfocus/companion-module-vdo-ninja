import type {
	CompanionButtonStepActions,
	CompanionPresetDefinitions,
	CompanionPresetFeedback,
	CompanionPresetSection,
	CompanionSimplePresetLocalVariable,
} from '@companion-module/base'
import { Colors } from './graphics.js'
import type { ModuleSchema } from './main.js'

/** How many guest slots the slot-templated presets offer; a preset can be pointed at any other by its `slot` variable */
const GuestSlots = 12
const SceneCount = 8
const GroupCount = 8

/** A destructive action only runs once the button has been held this long */
const HoldMs = 1000

type Step = CompanionButtonStepActions<ModuleSchema>
type LocalVariable = CompanionSimplePresetLocalVariable

type FeedbackOn =
	CompanionPresetFeedback<ModuleSchema['feedbacks']> extends infer T
		? T extends { feedbackId: infer Id; options: infer Options }
			? { feedbackId: Id; options: Options }
			: never
		: never

/**
 * The colour the tile's status strip takes while a feedback is active; later states win. The status text
 * comes from a variable instead, as Companion doesn't apply feedback overrides to a composite's text options.
 */
type TileState = {
	when: FeedbackOn
	accent: number
}

type TileBase = {
	id: string
	name: string
	notes?: string
	keywords?: string[]
	/** Expression for the name along the top of the tile */
	label: string
	/** The same name as plain text with variables, for hosts without expressions */
	labelText: string
	steps: Step[]
	localVariables?: LocalVariable[]
	/** Expression that is true when the tile has something to control, otherwise it is drawn faded */
	present?: string
}

type StatusTile = TileBase & {
	title: string
	/** Expression for the status strip */
	status: string
	statusText: string
	accent: number
	states: TileState[]
}

type LevelTile = TileBase & {
	title: string
	value: string
	valueText: string
	max: number
	accent: number
}

const expr = (value: string) => ({ isExpression: true as const, value })
const quoted = (text: string) => `'${text}'`

/** For text and text inputs, where a variable name can contain another variable */
const guestVar = (name: string) => `$(VDO.Ninja:guest_$(local:slot)_${name})`
/** For expressions, which don't support that nesting directly */
const guestExpr = (name: string) => `parseVariables('${guestVar(name)}', '')`
const guestNumber = (name: string) => `round(${guestExpr(name)})`
const localVar = (name: string) => `$(VDO.Ninja:local_${name})`
const orDash = (variable: string) => `${variable} || '-'`

const guestStream = expr(guestExpr('streamID'))
const localStream = expr(localVar('streamID'))
const guestTarget = '$(local:slot)'

const slotVariable: LocalVariable = { variableType: 'simple', variableName: 'slot', startupValue: 1 }

const guestLabel = {
	label: `${guestExpr('label')} || \`Guest \${$(local:slot)}\``,
	labelText: guestVar('label'),
	present: guestExpr('streamID'),
	localVariables: [slotVariable],
}
const localLabel = { label: quoted('This page'), labelText: 'This page' }
const directorLabel = { label: quoted('Director'), labelText: 'Director' }

const press = (down: Step['down'], extra: Partial<Step> = {}): Step[] => [{ down, up: [], ...extra }]
const hold = (actions: Step['down']): Step[] => [
	{ down: [], up: [], [HoldMs]: { options: { runWhileHeld: true }, actions } },
]

const opacity = (present: string | undefined) => (present ? { opacity: expr(`${present} ? 100 : 40`) } : {})

function statusPreset(tile: StatusTile): CompanionPresetDefinitions<ModuleSchema>[string] {
	const shared = {
		name: tile.name,
		notes: tile.notes,
		keywords: tile.keywords,
		steps: tile.steps,
		localVariables: tile.localVariables,
	}
	return {
		type: 'alternatives',
		variants: [
			{
				type: 'layered',
				...shared,
				elements: [
					{
						type: 'composite',
						id: 'tile',
						elementId: 'statusTile',
						...opacity(tile.present),
						options: {
							label: expr(tile.label),
							title: tile.title,
							status: expr(tile.status),
							accent: tile.accent,
						},
					},
				],
				feedbacks: tile.states.map(({ when, accent }) => ({
					...when,
					styleOverrides: [{ elementId: 'tile', elementProperty: 'opt:accent', override: accent }],
				})),
			},
			{
				type: 'simple',
				...shared,
				style: {
					text: `${tile.labelText}\\n${tile.title}\\n${tile.statusText}`,
					size: 'auto',
					color: Colors.white,
					bgcolor: tile.accent === Colors.idle ? Colors.tile : tile.accent,
				},
				feedbacks: tile.states.map(({ when, accent }) => ({
					...when,
					style: { bgcolor: accent, color: Colors.white },
				})),
			},
		],
	}
}

function levelPreset(tile: LevelTile): CompanionPresetDefinitions<ModuleSchema>[string] {
	const shared = {
		name: tile.name,
		notes: tile.notes,
		keywords: tile.keywords,
		steps: tile.steps,
		localVariables: tile.localVariables,
		feedbacks: [],
	}
	return {
		type: 'alternatives',
		variants: [
			{
				type: 'layered',
				...shared,
				elements: [
					{
						type: 'composite',
						id: 'tile',
						elementId: 'levelTile',
						...opacity(tile.present),
						options: {
							label: expr(tile.label),
							title: tile.title,
							value: expr(tile.value),
							max: tile.max,
							accent: tile.accent,
						},
					},
				],
			},
			{
				type: 'simple',
				...shared,
				style: {
					text: `${tile.labelText}\\n${tile.title}\\n${tile.valueText}`,
					size: 'auto',
					color: Colors.white,
					bgcolor: Colors.tile,
				},
			},
		],
	}
}

const templated = (
	id: string,
	name: string,
	presetId: string,
	variable: string,
	values: { name: string; value: number | string }[],
	common: Record<string, number> | undefined = undefined,
) => ({
	id,
	type: 'template' as const,
	name,
	presetId,
	templateVariableName: variable,
	templateValues: values,
	...(common ? { commonVariableValues: common } : {}),
})

const numbered = (count: number, name: string) =>
	Array.from({ length: count }, (_, index) => ({ name: `${name} ${index + 1}`, value: index + 1 }))

const perSlot = (presetId: string, name: string) =>
	templated(presetId, name, presetId, 'slot', numbered(GuestSlots, 'Guest'))

export function GetPresets(): {
	structure: CompanionPresetSection<ModuleSchema>[]
	presets: CompanionPresetDefinitions<ModuleSchema>
} {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const addStatus = (tile: StatusTile) => {
		presets[tile.id] = statusPreset(tile)
		return tile.id
	}
	const addLevel = (tile: LevelTile) => {
		presets[tile.id] = levelPreset(tile)
		return tile.id
	}

	/** A guest toggle whose state VDO.Ninja reports, shown red once it is on */
	const guestToggle = (
		id: string,
		name: string,
		title: string,
		actionId: 'guestSpeaker' | 'guestDisplay' | 'guestMuteScene',
		feedbackId: 'guestDeafened' | 'guestBlind' | 'guestSceneMuted',
		variable: 'deafened' | 'blind' | 'scene_mic',
	) =>
		addStatus({
			id,
			name,
			title,
			...guestLabel,
			status: orDash(guestExpr(variable)),
			statusText: guestVar(variable),
			accent: Colors.idle,
			steps: press([
				actionId === 'guestMuteScene'
					? { actionId, options: { target: guestTarget, value: '1' } }
					: { actionId, options: { target: guestTarget } },
			]),
			states: [{ when: { feedbackId, options: { stream: guestStream } }, accent: Colors.stop }],
		})

	const guestAudioVideo = [
		perSlot(
			addStatus({
				id: 'guest_mic',
				name: 'Guest Mic',
				keywords: ['mute', 'audio'],
				title: 'MIC',
				...guestLabel,
				status: orDash(guestExpr('mic')),
				statusText: guestVar('mic'),
				accent: Colors.idle,
				steps: press([{ actionId: 'guestMic', options: { target: guestTarget } }]),
				states: [
					{ when: { feedbackId: 'mic', options: { stream: guestStream, state: false } }, accent: Colors.live },
					{ when: { feedbackId: 'mic', options: { stream: guestStream, state: true } }, accent: Colors.stop },
				],
			}),
			'Mic',
		),
		perSlot(
			addStatus({
				id: 'guest_camera',
				name: 'Guest Camera',
				keywords: ['mute', 'video', 'hide'],
				title: 'CAM',
				...guestLabel,
				status: orDash(guestExpr('camera')),
				statusText: guestVar('camera'),
				accent: Colors.idle,
				steps: press([{ actionId: 'guestCamera', options: { target: guestTarget } }]),
				states: [
					{ when: { feedbackId: 'camera', options: { stream: guestStream, state: false } }, accent: Colors.live },
					{ when: { feedbackId: 'camera', options: { stream: guestStream, state: true } }, accent: Colors.stop },
				],
			}),
			'Camera',
		),
		perSlot(
			addLevel({
				id: 'guest_volume',
				name: 'Guest Volume',
				notes: 'Press to reset to 100. On a rotary encoder, turn to adjust.',
				keywords: ['level', 'gain', 'rotary', 'encoder', 'dial'],
				title: 'VOL',
				...guestLabel,
				value: guestNumber('volume'),
				valueText: guestVar('volume'),
				max: 200,
				accent: Colors.live,
				steps: press([{ actionId: 'guestVolume', options: { target: guestTarget, value: 100 } }], {
					rotate_left: [
						{
							actionId: 'guestVolume',
							options: {
								target: guestTarget,
								value: expr(`max(0, ${guestNumber('volume')} - 5)`),
							},
						},
					],
					rotate_right: [
						{
							actionId: 'guestVolume',
							options: {
								target: guestTarget,
								value: expr(`min(200, ${guestNumber('volume')} + 5)`),
							},
						},
					],
				}),
			}),
			'Volume',
		),
		perSlot(
			guestToggle('guest_speaker', 'Guest Speaker', 'DEAF', 'guestSpeaker', 'guestDeafened', 'deafened'),
			'Deafen',
		),
		perSlot(guestToggle('guest_display', 'Guest Blind', 'BLIND', 'guestDisplay', 'guestBlind', 'blind'), 'Blind'),
	]

	const guestHighlight = perSlot(
		addStatus({
			id: 'guest_highlight',
			name: 'Guest Highlight',
			keywords: ['solo', 'feature', 'spotlight'],
			title: 'HIGHLIGHT',
			...guestLabel,
			status: orDash(guestExpr('highlighted')),
			statusText: guestVar('highlighted'),
			accent: Colors.idle,
			steps: press([{ actionId: 'guestSoloVideo', options: { target: guestTarget } }]),
			states: [
				{
					when: { feedbackId: 'highlighted', options: { stream: guestStream } },
					accent: Colors.info,
				},
			],
		}),
		'Highlight',
	)

	// VDO.Ninja doesn't report whether solo talk is on, so these show only what they do
	const soloTalk = (
		id: string,
		name: string,
		title: string,
		status: string,
		actionId: 'guestSoloChat' | 'guestAltSoloChat',
	) =>
		perSlot(
			addStatus({
				id,
				name,
				notes: 'Toggles solo talk. VDO.Ninja does not report whether it is on, so this button cannot show it.',
				keywords: ['talkback', 'private', 'chat'],
				title,
				...guestLabel,
				status: quoted(status),
				statusText: status,
				accent: Colors.idle,
				steps: press([{ actionId, options: { target: guestTarget } }]),
				states: [],
			}),
			name,
		)

	const guestState = [
		perSlot(
			addStatus({
				id: 'guest_hand',
				name: 'Guest Hand',
				notes: 'Shows whether the guest has raised their hand.',
				title: 'HAND',
				...guestLabel,
				status: orDash(guestExpr('hand')),
				statusText: guestVar('hand'),
				accent: Colors.idle,
				steps: press([]),
				states: [{ when: { feedbackId: 'handRaised', options: { stream: guestStream } }, accent: Colors.hold }],
			}),
			'Hand raised',
		),
		perSlot(
			addStatus({
				id: 'guest_queued',
				name: 'Guest Queued',
				notes: 'Shows whether the guest is waiting in the queue to be admitted.',
				keywords: ['waiting', 'admit'],
				title: 'QUEUE',
				...guestLabel,
				status: orDash(guestExpr('queued')),
				statusText: guestVar('queued'),
				accent: Colors.idle,
				steps: press([]),
				states: [{ when: { feedbackId: 'guestQueued', options: { stream: guestStream } }, accent: Colors.hold }],
			}),
			'In queue',
		),
		perSlot(
			addStatus({
				id: 'guest_mixer_slot',
				name: 'Guest Mixer Slot',
				notes:
					'Shows the mixer slot the guest is assigned to, highlighting when it is the `mixer_slot` local variable. Needs slots in use (&slotmode on the director, or the mixer).',
				title: 'SLOT',
				...guestLabel,
				localVariables: [slotVariable, { variableType: 'simple', variableName: 'mixer_slot', startupValue: 1 }],
				status: orDash(guestExpr('slot')),
				statusText: guestVar('slot'),
				accent: Colors.idle,
				steps: press([]),
				states: [
					{
						when: { feedbackId: 'guestSlot', options: { stream: guestStream, slot: expr('$(local:mixer_slot)') } },
						accent: Colors.info,
					},
				],
			}),
			'Mixer slot',
		),
	]

	const changeSlotNote = 'Set the `slot` local variable on the button to choose the guest.'
	const guestScenes = [
		templated(
			'guest_scene',
			'Guest in Scene',
			addStatus({
				id: 'guest_scene',
				name: 'Guest in Scene',
				notes: changeSlotNote,
				keywords: ['add', 'program'],
				title: 'SCENE',
				...guestLabel,
				localVariables: [slotVariable, { variableType: 'simple', variableName: 'scene', startupValue: 1 }],
				status: '`Scene ${$(local:scene)}`',
				statusText: 'Scene $(local:scene)',
				accent: Colors.idle,
				steps: press([{ actionId: 'guestAddScene', options: { target: guestTarget, value: '$(local:scene)' } }]),
				states: [
					{
						when: { feedbackId: 'guestScene', options: { stream: guestStream, scene: expr('$(local:scene)') } },
						accent: Colors.live,
					},
				],
			}),
			'scene',
			numbered(SceneCount, 'Scene'),
		),
		perSlot(
			guestToggle(
				'guest_scene_mic',
				'Guest Mic in Scenes',
				'SCENE MIC',
				'guestMuteScene',
				'guestSceneMuted',
				'scene_mic',
			),
			'Mic in scenes',
		),
		templated(
			'guest_group',
			'Guest in Group',
			addStatus({
				id: 'guest_group',
				name: 'Guest in Group',
				notes: changeSlotNote,
				title: 'GROUP',
				...guestLabel,
				localVariables: [slotVariable, { variableType: 'simple', variableName: 'group', startupValue: 1 }],
				status: '`Group ${$(local:group)}`',
				statusText: 'Group $(local:group)',
				accent: Colors.idle,
				steps: press([{ actionId: 'guestGroup', options: { target: guestTarget, value: '$(local:group)' } }]),
				states: [
					{
						when: { feedbackId: 'guestGroup', options: { stream: guestStream, group: expr('$(local:group)') } },
						accent: Colors.live,
					},
				],
			}),
			'group',
			numbered(GroupCount, 'Group'),
		),
	]

	const guestManage = [
		perSlot(
			addStatus({
				id: 'guest_keyframe',
				name: 'Guest Force Keyframe',
				notes: "Helps clear up a guest's corrupted video.",
				keywords: ['rainbow', 'glitch'],
				title: 'KEYFRAME',
				...guestLabel,
				status: quoted('Refresh'),
				statusText: 'Refresh',
				accent: Colors.idle,
				steps: press([{ actionId: 'guestForceKeyframe', options: { target: guestTarget } }]),
				states: [],
			}),
			'Keyframe',
		),
		perSlot(
			addStatus({
				id: 'guest_hangup',
				name: 'Guest Hang Up',
				notes: 'Hold for a second to hang up the guest.',
				keywords: ['kick', 'remove', 'disconnect'],
				title: 'HANG UP',
				...guestLabel,
				status: quoted('Hold'),
				statusText: 'Hold',
				accent: Colors.stop,
				steps: hold([{ actionId: 'guestHangup', options: { target: guestTarget } }]),
				states: [],
			}),
			'Hang up',
		),
		perSlot(
			addStatus({
				id: 'guest_overlay',
				name: 'Guest Overlay Message',
				notes: 'Edit the action to set the message.',
				keywords: ['chat', 'text', 'director'],
				title: 'MESSAGE',
				...guestLabel,
				status: quoted('Configure'),
				statusText: 'Configure',
				accent: Colors.configure,
				steps: press([{ actionId: 'guestOverlay', options: { target: guestTarget, value: '' } }]),
				states: [],
			}),
			'Overlay message',
		),
		perSlot(
			addStatus({
				id: 'guest_forward',
				name: 'Guest Transfer',
				notes: 'Edit the action to set the destination room, then hold for a second to transfer the guest.',
				keywords: ['forward', 'move', 'room'],
				title: 'TRANSFER',
				...guestLabel,
				status: quoted('Configure'),
				statusText: 'Configure',
				accent: Colors.configure,
				steps: hold([{ actionId: 'guestForward', options: { target: guestTarget, value: '' } }]),
				states: [],
			}),
			'Transfer',
		),
	]

	/** A mute control on this page: a toggle that follows the state, or one fixed direction */
	const localMute = (
		id: 'mic' | 'camera' | 'speaker',
		title: string,
		value: 'toggle' | 'true' | 'false',
		name: string,
		presetId: string,
	) =>
		addStatus({
			id: presetId,
			name,
			keywords: ['mute', 'local'],
			title,
			...localLabel,
			status: orDash(localVar(id)),
			statusText: localVar(id),
			accent: Colors.idle,
			steps: press([{ actionId: id, options: { value } }]),
			states: [
				{ when: { feedbackId: id, options: { stream: localStream, state: false } }, accent: Colors.live },
				{ when: { feedbackId: id, options: { stream: localStream, state: true } }, accent: Colors.stop },
			],
		})

	const localMutes = (['mic', 'camera', 'speaker'] as const).flatMap((id) => {
		const title = { mic: 'MIC', camera: 'CAM', speaker: 'SPKR' }[id]
		const noun = { mic: 'Mic', camera: 'Camera', speaker: 'Speaker' }[id]
		return [
			localMute(id, title, 'toggle', noun, `local_${id}`),
			localMute(id, `${title} OFF`, 'false', `Mute ${noun}`, `local_${id}_mute`),
			localMute(id, `${title} ON`, 'true', `Unmute ${noun}`, `local_${id}_unmute`),
		]
	})

	const actionTile = (
		id: string,
		name: string,
		title: string,
		status: string,
		steps: Step[],
		extra: Partial<StatusTile> = {},
	) =>
		addStatus({
			id,
			name,
			title,
			...localLabel,
			status: quoted(status),
			statusText: status,
			accent: Colors.idle,
			steps,
			states: [],
			...extra,
		})

	const localSetVolume = (value: string): Step['down'] => [
		{ actionId: 'internal:localVariableSet', options: { name: 'volume', value: expr(value) } },
		{ actionId: 'volume', options: { value: expr(value) } },
	]

	const localPage = [
		actionTile(
			'local_record',
			'Record',
			'RECORD',
			'Stopped',
			[
				{ name: 'Start', down: [{ actionId: 'record', options: { value: 'true' } }], up: [] },
				{ name: 'Stop', down: [{ actionId: 'record', options: { value: 'false' } }], up: [] },
			],
			{
				notes: 'Starts and stops recording to disk. Pressing it again moves between the two.',
				status: `$(this:step) == 2 ? 'Recording' : 'Stopped'`,
				statusText: 'Record',
				states: [
					{
						when: { feedbackId: 'internal:buttonCurrentStep', options: { step: 2 } } as unknown as FeedbackOn,
						accent: Colors.stop,
					},
				],
			},
		),
		actionTile('local_hand', 'Raise Hand', 'HAND', 'Toggle', press([{ actionId: 'togglehand', options: {} }])),
		actionTile(
			'local_screenshare',
			'Screen Share',
			'SCREEN',
			'Toggle',
			press([{ actionId: 'togglescreenshare', options: {} }]),
			{
				notes: 'VDO.Ninja asks which screen to share on its page.',
			},
		),
		actionTile(
			'local_keyframe',
			'Force Keyframe',
			'KEYFRAME',
			'Refresh',
			press([{ actionId: 'forceKeyframe', options: {} }]),
		),
		actionTile('local_reload', 'Reload', 'RELOAD', 'Hold', hold([{ actionId: 'reload', options: {} }]), {
			notes: 'Hold for a second to reload the page.',
			accent: Colors.hold,
		}),
		actionTile('local_hangup', 'Hang Up', 'HANG UP', 'Hold', hold([{ actionId: 'hangup', options: {} }]), {
			notes: 'Hold for a second to hang up.',
			accent: Colors.stop,
		}),
		actionTile(
			'local_chat',
			'Send Chat Message',
			'CHAT',
			'Configure',
			press([{ actionId: 'sendChat', options: { value: '' } }]),
			{
				notes: 'Edit the action to set the message.',
				accent: Colors.configure,
			},
		),
	]

	const slides = [
		actionTile(
			'slide_previous',
			'Previous Slide',
			'PREV',
			'Slide',
			press([{ actionId: 'previousSlide', options: {} }]),
			{
				keywords: ['powerpoint'],
			},
		),
		actionTile('slide_next', 'Next Slide', 'NEXT', 'Slide', press([{ actionId: 'nextSlide', options: {} }]), {
			keywords: ['powerpoint'],
		}),
	]

	const levels = [
		addLevel({
			id: 'local_volume',
			name: 'Playback Volume',
			notes:
				'Press to return to 100. On a rotary encoder, turn to adjust. VDO.Ninja does not report the volume, so this shows the last value set here.',
			keywords: ['level', 'rotary', 'encoder', 'dial'],
			title: 'VOL',
			...localLabel,
			localVariables: [{ variableType: 'simple', variableName: 'volume', startupValue: 100 }],
			value: '$(local:volume)',
			valueText: '$(local:volume)',
			max: 100,
			accent: Colors.live,
			steps: press(localSetVolume('100'), {
				rotate_left: localSetVolume('max(0, $(local:volume) - 5)'),
				rotate_right: localSetVolume('min(100, $(local:volume) + 5)'),
			}),
		}),
	]

	const volumeStep = actionTile(
		'local_volume_step',
		'Playback Volume',
		'VOLUME',
		'100',
		press([{ actionId: 'volume', options: { value: expr('$(local:level)') } }]),
		{
			localVariables: [{ variableType: 'simple', variableName: 'level', startupValue: 100 }],
			status: '`${$(local:level)}%`',
			statusText: '$(local:level)%',
		},
	)

	const bitrate = [
		actionTile(
			'bitrate_reset',
			'Reset Bitrate',
			'BITRATE',
			'Reset',
			press([{ actionId: 'bitrate', options: { value: 'true', bitrate: 1500 } }]),
		),
		actionTile(
			'bitrate_pause',
			'Pause Incoming Video',
			'BITRATE',
			'Pause',
			press([{ actionId: 'bitrate', options: { value: 'false', bitrate: 1500 } }]),
			{
				accent: Colors.hold,
			},
		),
		actionTile(
			'bitrate_custom',
			'Custom Bitrate',
			'BITRATE',
			'Configure',
			press([{ actionId: 'bitrate', options: { value: 'custom', bitrate: 1500 } }]),
			{
				notes: 'Edit the action to set the bitrate.',
				accent: Colors.configure,
			},
		),
	]

	const panStep = actionTile(
		'local_pan_step',
		'Audio Pan',
		'PAN',
		'',
		press([{ actionId: 'panning', options: { value: expr('$(local:pan)') } }]),
		{
			localVariables: [{ variableType: 'simple', variableName: 'pan', startupValue: 90 }],
			status: '$(local:pan)',
			statusText: '$(local:pan)',
		},
	)

	type Ptz = 'ptzPan' | 'ptzTilt' | 'ptzZoom' | 'ptzFocus'
	const ptzTile = (actionId: Ptz, title: string) => {
		const stepPreset = actionTile(
			`${actionId}_step`,
			title,
			title.toUpperCase(),
			'',
			press([{ actionId, options: { value: expr('$(local:amount)') } }]),
			{
				keywords: ['camera', 'ptz'],
				notes: "Needs &ptz on the camera's VDO.Ninja page.",
				localVariables: [{ variableType: 'simple', variableName: 'amount', startupValue: 10 }],
				status: '$(local:amount)',
				statusText: '$(local:amount)',
			},
		)
		const dialPreset = actionTile(
			`${actionId}_dial`,
			`${title} Dial`,
			title.toUpperCase(),
			'Turn',
			[
				{
					down: [],
					up: [],
					rotate_left: [{ actionId, options: { value: -5 } }],
					rotate_right: [{ actionId, options: { value: 5 } }],
				},
			],
			{
				keywords: ['camera', 'ptz', 'rotary', 'encoder'],
				notes: "For a rotary encoder. Needs &ptz on the camera's VDO.Ninja page.",
			},
		)
		return { stepPreset, dialPreset }
	}

	const ptzDirections = {
		ptzPan: ['Pan', 'Left', 'Right'],
		ptzTilt: ['Tilt', 'Up', 'Down'],
		ptzZoom: ['Zoom', 'In', 'Out'],
		ptzFocus: ['Focus', 'Near', 'Far'],
	} as const

	const ptz = (Object.keys(ptzDirections) as Ptz[]).flatMap((actionId) => {
		const [title, minus, plus] = ptzDirections[actionId]
		const { stepPreset, dialPreset } = ptzTile(actionId, title)
		return [
			templated(stepPreset, title, stepPreset, 'amount', [
				{ name: `${title} ${minus}`, value: -10 },
				{ name: `${title} ${plus}`, value: 10 },
			]),
			{ id: `${actionId}_dial_group`, type: 'simple' as const, name: `${title} dial`, presets: [dialPreset] },
		]
	})

	const exposureStep = actionTile(
		'ptz_exposure',
		'Camera Exposure',
		'EXPOSURE',
		'',
		press([{ actionId: 'ptzExposure', options: { value: expr('$(local:exposure)') } }]),
		{
			keywords: ['camera', 'ptz'],
			notes: "Needs &ptz on the camera's VDO.Ninja page.",
			localVariables: [{ variableType: 'simple', variableName: 'exposure', startupValue: 50 }],
			status: '`${$(local:exposure)}%`',
			statusText: '$(local:exposure)%',
		},
	)

	const percents = [0, 25, 50, 75, 100].map((value) => ({ name: `${value}%`, value }))

	/** A director group command; only membership is reported, not what the director is previewing */
	const directorGroup = (
		id: string,
		name: string,
		title: string,
		actionId: 'group' | 'joinGroup' | 'leaveGroup' | 'viewGroup' | 'joinViewGroup' | 'leaveViewGroup',
		tracksMembership: boolean,
	) =>
		templated(
			id,
			name,
			addStatus({
				id,
				name,
				title,
				...directorLabel,
				localVariables: [{ variableType: 'simple', variableName: 'group', startupValue: 1 }],
				status: '`Group ${$(local:group)}`',
				statusText: 'Group $(local:group)',
				accent: Colors.idle,
				steps: press([{ actionId, options: { value: expr('$(local:group)') } }]),
				states: tracksMembership
					? [
							{
								when: { feedbackId: 'guestGroup', options: { stream: localStream, group: expr('$(local:group)') } },
								accent: Colors.live,
							},
						]
					: [],
			}),
			'group',
			numbered(GroupCount, 'Group'),
		)

	const directorHighlight = addStatus({
		id: 'director_highlight',
		name: 'Highlight Director',
		keywords: ['solo', 'feature', 'spotlight'],
		title: 'HIGHLIGHT',
		...directorLabel,
		status: orDash(localVar('highlighted')),
		statusText: localVar('highlighted'),
		accent: Colors.idle,
		steps: press([{ actionId: 'soloVideo', options: {} }]),
		states: [{ when: { feedbackId: 'highlighted', options: { stream: localStream } }, accent: Colors.info }],
	})

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'guests',
			name: 'Guests',
			description:
				"For a director. Each button follows a guest slot, whoever is in it. Drag one on, then change the button's `slot` local variable to use it for another guest.",
			definitions: [
				...guestAudioVideo,
				guestHighlight,
				soloTalk('guest_solo_chat', 'Solo Talk', 'SOLO', 'Talk', 'guestSoloChat'),
				soloTalk('guest_solo_chat_both', 'Two-way Solo Talk', 'SOLO', 'Two-way', 'guestAltSoloChat'),
			],
		},
		{ id: 'guest_state', name: 'Guest State', definitions: guestState },
		{ id: 'guest_scenes', name: 'Guest Scenes and Groups', definitions: guestScenes },
		{ id: 'guest_manage', name: 'Guest Management', definitions: guestManage },
		{
			id: 'local',
			name: 'This Page',
			description: 'Control the VDO.Ninja page the API ID is attached to, whether it is a director or a guest.',
			definitions: [
				{ id: 'local_mutes', type: 'simple', name: 'Mic, camera and speaker', presets: localMutes },
				{ id: 'local_actions', type: 'simple', name: 'Page', presets: localPage },
				{ id: 'local_slides', type: 'simple', name: 'Slides', presets: slides },
			],
		},
		{
			id: 'playback',
			name: 'Playback',
			definitions: [
				{ id: 'playback_dial', type: 'simple', name: 'Volume dial', presets: levels },
				templated('playback_volume', 'Volume', volumeStep, 'level', percents),
				templated('playback_pan', 'Audio pan', panStep, 'pan', [
					{ name: 'Left', value: 0 },
					{ name: 'Centre', value: 90 },
					{ name: 'Right', value: 180 },
				]),
				{ id: 'playback_bitrate', type: 'simple', name: 'Bitrate', presets: bitrate },
			],
		},
		{
			id: 'camera',
			name: 'Camera',
			description: "These need &ptz on the camera's VDO.Ninja page, and a camera that supports them.",
			definitions: [...ptz, templated('camera_exposure', 'Exposure', exposureStep, 'exposure', percents)],
		},
		{
			id: 'director',
			name: 'Director',
			definitions: [
				directorGroup('director_group', 'In group', 'GROUP', 'group', true),
				directorGroup('director_join_group', 'Join group', 'JOIN', 'joinGroup', true),
				directorGroup('director_leave_group', 'Leave group', 'LEAVE', 'leaveGroup', true),
				directorGroup('director_view_group', 'View group', 'VIEW', 'viewGroup', false),
				directorGroup('director_join_view', 'Start viewing group', 'VIEW +', 'joinViewGroup', false),
				directorGroup('director_leave_view', 'Stop viewing group', 'VIEW -', 'leaveViewGroup', false),
				{ id: 'director_self', type: 'simple', name: 'Highlight', presets: [directorHighlight] },
			],
		},
	]

	return { structure, presets }
}
