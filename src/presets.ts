import {
	ButtonGraphicsDecorationType,
	type CompanionButtonStepActions,
	type CompanionPresetDefinitions,
	type CompanionPresetFeedback,
	type CompanionPresetSection,
	type CompanionSimplePresetLocalVariable,
	type WithInternalFeedbacks,
} from '@companion-module/base'
import { Colors } from './graphics.js'
import type { ModuleSchema } from './main.js'

/** How many guests the guest presets are offered for; a button can be pointed at any other by its `guest` variable */
const GuestCount = 12
const SceneCount = 8
const GroupCount = 8

/** A destructive action only runs once the button has been held this long */
const HoldMs = 1000

type Step = CompanionButtonStepActions<ModuleSchema>
type LocalVariable = CompanionSimplePresetLocalVariable

type FeedbackOn =
	CompanionPresetFeedback<WithInternalFeedbacks<ModuleSchema['feedbacks']>> extends infer T
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

type Ptz = keyof typeof ptzDirections
const ptzDirections = {
	ptzPan: ['Pan', 'Left', 'Right'],
	ptzTilt: ['Tilt', 'Up', 'Down'],
	ptzZoom: ['Zoom', 'In', 'Out'],
	ptzFocus: ['Focus', 'Near', 'Far'],
} as const

const expr = (value: string) => ({ isExpression: true as const, value })
const quoted = (text: string) => `'${text}'`

/** For text and text inputs, where a variable name can contain another variable */
const guestVar = (name: string) => `$(VDO.Ninja:guest_$(local:guest)_${name})`
/** For expressions, which don't support that nesting directly */
const guestExpr = (name: string) => `parseVariables('${guestVar(name)}', '')`
const guestNumber = (name: string) => `round(${guestExpr(name)})`
const localVar = (name: string) => `$(VDO.Ninja:local_${name})`
const orDash = (variable: string) => `${variable} || '-'`

const guestStream = expr(guestExpr('streamID'))
const localStream = expr(localVar('streamID'))
const guestTarget = '$(local:guest)'

/** The guest's position in the room, which VDO.Ninja also calls their slot; not their mixer slot */
const guestVariable: LocalVariable = { variableType: 'simple', variableName: 'guest', startupValue: 1 }

const guestLabel = {
	label: `${guestExpr('label')} || \`Guest \${$(local:guest)}\``,
	labelText: guestVar('label'),
	present: guestExpr('streamID'),
	localVariables: [guestVariable],
}
const localLabel = { label: quoted('Local'), labelText: 'Local' }
const directorLabel = { label: quoted('Director'), labelText: 'Director' }

const press = (down: Step['down']): Step[] => [{ down, up: [] }]
/** For a rotary encoder: pressing runs `down`, turning runs `left` or `right` */
const dial = (down: Step['down'], left: Step['down'], right: Step['down']): Step[] => [
	{ down, up: [], rotate_left: left, rotate_right: right },
]
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
				canvas: { decoration: ButtonGraphicsDecorationType.None },
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
					show_topbar: false,
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
				canvas: { decoration: ButtonGraphicsDecorationType.None },
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
					show_topbar: false,
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
) => ({
	id,
	type: 'template' as const,
	name,
	presetId,
	templateVariableName: variable,
	templateValues: values,
})

const numbered = (count: number, name: string) =>
	Array.from({ length: count }, (_, index) => ({ name: `${name} ${index + 1}`, value: index + 1 }))

const perGuest = (presetId: string, name: string) =>
	templated(presetId, name, presetId, 'guest', numbered(GuestCount, 'Guest'))

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
		perGuest(
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
		perGuest(
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
		perGuest(
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
				steps: dial(
					[{ actionId: 'guestVolume', options: { target: guestTarget, value: 100 } }],
					[
						{
							actionId: 'guestVolume',
							options: { target: guestTarget, value: expr(`max(0, ${guestNumber('volume')} - 5)`) },
						},
					],
					[
						{
							actionId: 'guestVolume',
							options: { target: guestTarget, value: expr(`min(200, ${guestNumber('volume')} + 5)`) },
						},
					],
				),
			}),
			'Volume',
		),
		perGuest(
			guestToggle('guest_speaker', 'Guest Speaker', 'DEAF', 'guestSpeaker', 'guestDeafened', 'deafened'),
			'Deafen',
		),
		perGuest(guestToggle('guest_display', 'Guest Blind', 'BLIND', 'guestDisplay', 'guestBlind', 'blind'), 'Blind'),
	]

	const guestHighlight = perGuest(
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
		perGuest(
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
		perGuest(
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
		perGuest(
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
		perGuest(
			addStatus({
				id: 'guest_mixer_slot',
				name: 'Guest Mixer Slot',
				notes:
					'Shows the mixer slot the guest is assigned to, highlighting when it is the `mixer_slot` local variable. Press to assign the guest to that slot. Needs slots in use (&slotmode on the director, or the mixer).',
				title: 'SLOT',
				...guestLabel,
				localVariables: [guestVariable, { variableType: 'simple', variableName: 'mixer_slot', startupValue: 1 }],
				status: orDash(guestExpr('slot')),
				statusText: guestVar('slot'),
				accent: Colors.idle,
				steps: press([
					{ actionId: 'guestSetSlot', options: { target: guestTarget, value: expr('$(local:mixer_slot)') } },
				]),
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

	const changeSlotNote = 'Set the `guest` local variable on the button to choose the guest.'
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
				localVariables: [guestVariable, { variableType: 'simple', variableName: 'scene', startupValue: 1 }],
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
		perGuest(
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
				localVariables: [guestVariable, { variableType: 'simple', variableName: 'group', startupValue: 1 }],
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

	/** A guest command whose result VDO.Ninja doesn't report, so the tile shows only what it does */
	const guestAction = (
		id: string,
		name: string,
		title: string,
		status: string,
		steps: Step[],
		extra: Partial<StatusTile>,
	) =>
		perGuest(
			addStatus({
				id,
				name,
				title,
				...guestLabel,
				status: quoted(status),
				statusText: status,
				accent: extra.accent ?? Colors.idle,
				steps,
				states: [],
				...extra,
			}),
			name,
		)
	const configure = (notes: string): Partial<StatusTile> => ({ notes, accent: Colors.configure })

	const guestManage = [
		guestAction(
			'guest_keyframe',
			'Guest Force Keyframe',
			'KEYFRAME',
			'Refresh',
			press([{ actionId: 'guestForceKeyframe', options: { target: guestTarget } }]),
			{ notes: "Helps clear up a guest's corrupted video.", keywords: ['rainbow', 'glitch'] },
		),
		...(
			[
				['refreshVideo', 'Video', 'Restarts the video of a guest whose picture has frozen.'],
				['refreshConnection', 'Connection', "Restarts a guest's connection without them reloading."],
				['recoverStream', 'Everything', "Restarts a guest's video and connection together."],
			] as const
		).map(([value, status, notes]) =>
			guestAction(
				`guest_${value}`,
				`Guest Refresh ${status}`,
				'REFRESH',
				status,
				press([{ actionId: 'guestRefresh', options: { target: guestTarget, value } }]),
				{ notes, keywords: ['frozen', 'recover', 'restart'] },
			),
		),
		guestAction(
			'guest_hangup',
			'Guest Hang Up',
			'HANG UP',
			'Hold',
			hold([{ actionId: 'guestHangup', options: { target: guestTarget } }]),
			{
				notes: 'Hold for a second to hang up the guest.',
				keywords: ['kick', 'remove', 'disconnect'],
				accent: Colors.stop,
			},
		),
		guestAction(
			'guest_overlay',
			'Guest Overlay Message',
			'MESSAGE',
			'Configure',
			press([{ actionId: 'guestOverlay', options: { target: guestTarget, value: '' } }]),
			{ ...configure('Edit the action to set the message.'), keywords: ['chat', 'text', 'director'] },
		),
		guestAction(
			'guest_pinned_overlay',
			'Guest Pinned Message',
			'PINNED',
			'Configure',
			press([{ actionId: 'guestPinnedOverlay', options: { target: guestTarget, value: '' } }]),
			{
				...configure('Edit the action to set the message. It stays on screen until the guest closes it.'),
				keywords: ['chat', 'text', 'director'],
			},
		),
		guestAction(
			'guest_forward',
			'Guest Transfer',
			'TRANSFER',
			'Configure',
			hold([{ actionId: 'guestForward', options: { target: guestTarget, value: '' } }]),
			{
				...configure('Edit the action to set the destination room, then hold for a second to transfer the guest.'),
				keywords: ['forward', 'move', 'room'],
			},
		),
		...(['start', 'pause', 'stop'] as const).map((value) =>
			guestAction(
				`guest_timer_${value}`,
				`Guest Timer ${{ start: 'Start', pause: 'Pause', stop: 'Stop' }[value]}`,
				'TIMER',
				{ start: '10 min', pause: 'Pause', stop: 'Stop' }[value],
				press([{ actionId: 'guestRoomTimer', options: { target: guestTarget, value, seconds: 600 } }]),
				{ keywords: ['countdown', 'clock'] },
			),
		),
	]

	const guestMix = [
		...(
			[
				[-1, 'earlier', 'Earlier'],
				[1, 'later', 'Later'],
			] as const
		).map(([value, id, status]) =>
			guestAction(
				`guest_mix_${id}`,
				`Guest Mix ${status}`,
				'MIX ORDER',
				status,
				press([{ actionId: 'guestMixOrder', options: { target: guestTarget, value } }]),
				{ notes: 'Moves the guest in the order of the automatic mixer.', keywords: ['order', 'layout'] },
			),
		),
		guestAction(
			'guest_channel',
			'Guest Audio Channel',
			'CHANNEL',
			'Channel 1',
			press([{ actionId: 'guestChannel', options: { target: guestTarget, value: 1 } }]),
			{ notes: "Toggles hearing only the first channel of the guest's audio.", keywords: ['isolate', 'audio'] },
		),
	]

	const guestVideo = [
		guestAction(
			'guest_mirror',
			'Guest Mirror',
			'MIRROR',
			'Toggle',
			press([{ actionId: 'guestMirror', options: { target: guestTarget, value: 'toggle' } }]),
			{ keywords: ['flip'] },
		),
		guestAction(
			'guest_rotate',
			'Guest Rotate',
			'ROTATE',
			'+90°',
			press([{ actionId: 'guestRotate', options: { target: guestTarget, value: 'true' } }]),
			{ keywords: ['portrait'] },
		),
		guestAction(
			'guest_request_resolution',
			'Guest Preview Resolution',
			'RESOLUTION',
			'720p',
			press([{ actionId: 'guestRequestResolution', options: { target: guestTarget, value: '1280x720' } }]),
			{ notes: 'Asks the guest to send 1280x720 to this page. Edit the action for another resolution.' },
		),
		guestAction(
			'guest_request_aspect',
			'Guest Preview Aspect Ratio',
			'ASPECT',
			'16:9',
			press([{ actionId: 'guestRequestAspectRatio', options: { target: guestTarget, value: '16:9', size: 1920 } }]),
			{ notes: 'Asks the guest to send 16:9 video to this page. Edit the action for another ratio.' },
		),
		guestAction(
			'guest_capture_size',
			'Guest Camera Size',
			'CAPTURE',
			'Configure',
			press([{ actionId: 'guestCaptureSize', options: { target: guestTarget, setting: 'setWidth', value: '1280' } }]),
			configure("Edit the action to set the width, height or aspect ratio the guest's camera captures at."),
		),
		...(Object.entries(ptzDirections) as [Ptz, (typeof ptzDirections)[Ptz]][]).map(([axis, [title]]) =>
			guestAction(
				`guest_${axis}_dial`,
				`Guest ${title} Dial`,
				title.toUpperCase(),
				'Turn',
				dial(
					[],
					[{ actionId: 'guestPtz', options: { target: guestTarget, axis, value: -5 } }],
					[{ actionId: 'guestPtz', options: { target: guestTarget, axis, value: 5 } }],
				),
				{
					notes: "For a rotary encoder. Needs &ptz on the guest's VDO.Ninja page, and a camera that supports it.",
					keywords: ['camera', 'ptz', 'rotary', 'encoder'],
				},
			),
		),
		guestAction(
			'guest_autofocus',
			'Guest Autofocus',
			'AUTOFOCUS',
			'On',
			press([{ actionId: 'guestAutofocus', options: { target: guestTarget, value: 'true' } }]),
			{ notes: "Turns the guest camera's autofocus back on.", keywords: ['camera', 'ptz', 'focus'] },
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
		extra: Partial<StatusTile>,
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
				notes:
					'Starts and stops recording to disk, one then the other. VDO.Ninja does not report whether it is recording, so this shows what the next press does.',
				status: `$(this:step) == 2 ? 'Press to stop' : 'Press to start'`,
				statusText: 'Start / Stop',
				states: [
					{
						when: { feedbackId: 'internal:buttonCurrentStep', options: { step: 2 } },
						accent: Colors.stop,
					},
				],
			},
		),
		actionTile('local_hand', 'Raise Hand', 'HAND', 'Toggle', press([{ actionId: 'togglehand', options: {} }]), {}),
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
			{},
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
			steps: dial(
				localSetVolume('100'),
				localSetVolume('max(0, $(local:volume) - 5)'),
				localSetVolume('min(100, $(local:volume) + 5)'),
			),
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
			{},
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

	const localOverlay = actionTile(
		'local_overlay',
		'Overlay Message',
		'OVERLAY',
		'Configure',
		press([{ actionId: 'showChatOverlay', options: { value: '' } }]),
		{ ...configure('Edit the action to set the message. It shows on this page only.'), keywords: ['text'] },
	)
	const activeSpeaker = actionTile(
		'local_active_speaker',
		'Active Speaker',
		'SPEAKER VIEW',
		'Toggle',
		press([{ actionId: 'activeSpeaker', options: { value: 'toggle' } }]),
		{ notes: 'Toggles the layout that follows whoever is speaking.', keywords: ['layout', 'voice'] },
	)
	const tallyStep = actionTile(
		'local_tally',
		'Tally Light',
		'TALLY',
		'',
		press([{ actionId: 'tallyLight', options: { value: expr('$(local:tally)') } }]),
		{
			keywords: ['on air', 'standby'],
			localVariables: [{ variableType: 'simple', variableName: 'tally', startupValue: 'onair' }],
			status: '$(local:tally)',
			statusText: '$(local:tally)',
		},
	)
	const cameraSetting = actionTile(
		'local_camera_setting',
		'Camera Setting',
		'CAMERA',
		'Configure',
		press([{ actionId: 'videoConstraint', options: { name: '', value: '' } }]),
		configure('Edit the action to choose the camera setting, such as brightness, and its value.'),
	)
	const aspectStep = actionTile(
		'local_aspect',
		'Camera Aspect Ratio',
		'ASPECT',
		'',
		press([{ actionId: 'aspectRatio', options: { value: '$(local:ratio)' } }]),
		{
			localVariables: [{ variableType: 'simple', variableName: 'ratio', startupValue: '16:9' }],
			status: '$(local:ratio)',
			statusText: '$(local:ratio)',
		},
	)
	const bufferStep = actionTile(
		'local_buffer',
		'Buffer Delay',
		'BUFFER',
		'',
		press([{ actionId: 'bufferDelay', options: { value: expr('$(local:delay)'), stream: '*' } }]),
		{
			notes: 'Delays every incoming stream, to keep it in sync with other sources.',
			keywords: ['sync', 'latency'],
			localVariables: [{ variableType: 'simple', variableName: 'delay', startupValue: 0 }],
			status: '`${$(local:delay)} ms`',
			statusText: '$(local:delay) ms',
		},
	)
	const layoutStep = actionTile(
		'director_layout',
		'Mixer Layout',
		'LAYOUT',
		'',
		press([{ actionId: 'layout', options: { value: expr('$(local:layout)') } }]),
		{
			notes: 'Layout 1 and up are the layouts given with &layouts.',
			localVariables: [{ variableType: 'simple', variableName: 'layout', startupValue: 0 }],
			status: "$(local:layout) == 0 ? 'Auto' : `Layout ${$(local:layout)}`",
			statusText: 'Layout $(local:layout)',
		},
	)
	const roomTimer = (['start', 'pause', 'stop'] as const).map((value) =>
		actionTile(
			`room_timer_${value}`,
			`Room Timer ${{ start: 'Start', pause: 'Pause', stop: 'Stop' }[value]}`,
			'TIMER',
			{ start: '10 min', pause: 'Pause', stop: 'Stop' }[value],
			press([{ actionId: 'roomTimer', options: { value, seconds: 600 } }]),
			{ keywords: ['countdown', 'clock'] },
		),
	)

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'guests',
			name: 'Guests',
			description:
				"For a director. Each button follows a guest position, whoever is in it. Drag one on, then change the button's `guest` local variable to use it for another guest.",
			definitions: [
				...guestAudioVideo,
				guestHighlight,
				soloTalk('guest_solo_chat', 'Solo Talk', 'SOLO', 'Talk', 'guestSoloChat'),
				soloTalk('guest_solo_chat_both', 'Two-way Solo Talk', 'SOLO', 'Two-way', 'guestAltSoloChat'),
			],
		},
		{ id: 'guest_state', name: 'Guest State', definitions: guestState },
		{ id: 'guest_scenes', name: 'Guest Scenes, Groups and Mix', definitions: [...guestScenes, ...guestMix] },
		{
			id: 'guest_video',
			name: 'Guest Video and Camera',
			description: "Camera moves need &ptz on the guest's VDO.Ninja page, and a camera that supports them.",
			definitions: guestVideo,
		},
		{ id: 'guest_manage', name: 'Guest Management', definitions: guestManage },
		{
			id: 'local',
			name: 'Local',
			description: 'Control the local page the API ID is attached to, whether it is a director or a guest.',
			definitions: [
				{ id: 'local_mutes', type: 'simple', name: 'Mic, camera and speaker', presets: localMutes },
				{ id: 'local_actions', type: 'simple', name: 'Page', presets: localPage },
				{ id: 'local_slides', type: 'simple', name: 'Slides', presets: slides },
				{ id: 'local_screen', type: 'simple', name: 'Overlay and layout', presets: [localOverlay, activeSpeaker] },
				templated('local_tally_group', 'Tally light', tallyStep, 'tally', [
					{ name: 'On air', value: 'onair' },
					{ name: 'Active', value: 'active' },
					{ name: 'Standby', value: 'standby' },
					{ name: 'Off', value: 'off' },
				]),
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
				templated(
					'playback_buffer',
					'Buffer delay',
					bufferStep,
					'delay',
					[0, 250, 500, 1000].map((value) => ({ name: `${value} ms`, value })),
				),
			],
		},
		{
			id: 'camera',
			name: 'Camera',
			description:
				"Pan, tilt, zoom, focus and exposure need &ptz on the camera's VDO.Ninja page, and a camera that supports them.",
			definitions: [
				...ptz,
				templated('camera_exposure', 'Exposure', exposureStep, 'exposure', percents),
				templated(
					'camera_aspect',
					'Aspect ratio',
					aspectStep,
					'ratio',
					['16:9', '4:3', '9:16', '1:1'].map((value) => ({ name: value, value })),
				),
				{ id: 'camera_setting_group', type: 'simple', name: 'Camera setting', presets: [cameraSetting] },
			],
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
				templated('director_layout_group', 'Mixer layout', layoutStep, 'layout', [
					{ name: 'Auto mixer', value: 0 },
					...numbered(4, 'Layout'),
				]),
				{ id: 'director_timer', type: 'simple', name: 'Room timer', presets: roomTimer },
			],
		},
	]

	return { structure, presets }
}
