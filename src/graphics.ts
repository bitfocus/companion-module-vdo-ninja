import type { CompanionGraphicsCompositeElementDefinitions } from '@companion-module/base'

export const Colors = {
	tile: 0x15181e,
	muted: 0xb7bcc6,
	white: 0xffffff,
	idle: 0x3a3f4b,
	live: 0x1f9d4d,
	stop: 0xc62828,
	hold: 0xb7791f,
	info: 0x2563eb,
	/** Bitfocus's convention for presets that need configuring after they are dragged onto a button */
	configure: 0x9333ea,
} as const

export type CompositeElementsSchema = {
	statusTile: {
		options: {
			label: string
			title: string
			status: string
			accent: number
		}
	}
	levelTile: {
		options: {
			label: string
			title: string
			value: number
			max: number
			accent: number
		}
	}
}

export function GetCompositeElements(): CompanionGraphicsCompositeElementDefinitions<CompositeElementsSchema> {
	const label = {
		type: 'text',
		id: 'label',
		x: 3,
		y: 2,
		width: 94,
		height: 24,
		text: { isExpression: true, value: '$(options:label)' },
		color: Colors.muted,
	} as const

	return {
		statusTile: {
			type: 'composite',
			name: 'Status Tile',
			description: 'A name, what the button does, and a coloured strip with its current state',
			options: [
				{ type: 'textinput', id: 'label', label: 'Name', default: '', useVariables: true },
				{ type: 'textinput', id: 'title', label: 'Title', default: '', useVariables: true },
				{ type: 'textinput', id: 'status', label: 'Status', default: '', useVariables: true },
				{ type: 'colorpicker', id: 'accent', label: 'Status colour', default: Colors.idle },
			],
			elements: [
				{ type: 'box', x: 0, y: 0, width: 100, height: 100, color: Colors.tile },
				label,
				{
					type: 'text',
					x: 3,
					y: 27,
					width: 94,
					height: 40,
					text: { isExpression: true, value: '$(options:title)' },
					weight: 'bold',
					color: Colors.white,
				},
				{
					type: 'box',
					x: 0,
					y: 70,
					width: 100,
					height: 30,
					color: { isExpression: true, value: '$(options:accent)' },
				},
				{
					type: 'text',
					x: 3,
					y: 70,
					width: 94,
					height: 30,
					text: { isExpression: true, value: '$(options:status)' },
					weight: 'bold',
					color: Colors.white,
				},
			],
		},
		levelTile: {
			type: 'composite',
			name: 'Level Tile',
			description: 'A name, and a ring showing a level with its value in the middle',
			options: [
				{ type: 'textinput', id: 'label', label: 'Name', default: '', useVariables: true },
				{ type: 'textinput', id: 'title', label: 'Title', default: '', useVariables: true },
				{ type: 'number', id: 'value', label: 'Value', default: 0, min: 0, max: 1000 },
				{ type: 'number', id: 'max', label: 'Maximum', default: 100, min: 1, max: 1000 },
				{ type: 'colorpicker', id: 'accent', label: 'Ring colour', default: Colors.live },
			],
			elements: [
				{ type: 'box', x: 0, y: 0, width: 100, height: 100, color: Colors.tile },
				label,
				{
					type: 'gauge',
					x: 18,
					y: 27,
					width: 64,
					height: 71,
					orientation: 'ring',
					min: 0,
					max: { isExpression: true, value: '$(options:max)' },
					value: { isExpression: true, value: '$(options:value)' },
					startAngle: 225,
					endAngle: 135,
					ringWidth: 16,
					multiColour: false,
					stops: [{ value: 0, color: { isExpression: true, value: '$(options:accent)' }, gradient: false }],
					trackStyle: 'dimmed',
					trackAmount: 25,
				},
				{
					type: 'text',
					x: 25,
					y: 44,
					width: 50,
					height: 26,
					text: { isExpression: true, value: '$(options:value)' },
					weight: 'bold',
					color: Colors.white,
				},
				{
					type: 'text',
					x: 25,
					y: 70,
					width: 50,
					height: 18,
					text: { isExpression: true, value: '$(options:title)' },
					color: Colors.muted,
				},
			],
		},
	}
}
