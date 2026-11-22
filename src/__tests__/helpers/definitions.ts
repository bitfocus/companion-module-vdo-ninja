import { GetActions, type ActionsSchema } from '../../actions.js'
import type { VdoNinjaClient } from '../../client.js'
import { GetFeedbacks, type FeedbacksSchema } from '../../feedbacks.js'

type Callback = (event: unknown, context: unknown) => unknown
type Definition = { callback: unknown; options: unknown[] }

/** A definitions map entry may also be false or undefined; tests only want real definitions */
export function definition<T extends Definition>(value: T | false | undefined, id: string): T {
	if (!value) throw new Error(`No definition for ${id}`)
	return value
}

/** Runs an action's callback the way Companion would for a button press */
export async function runAction<K extends keyof ActionsSchema>(
	sender: Pick<VdoNinjaClient, 'sendLocal' | 'sendGuest'>,
	id: K,
	options: ActionsSchema[K]['options'],
): Promise<void> {
	// Indexing the full definitions map by a generic key is too complex a union for TypeScript
	const actions: Record<string, Definition | false | undefined> = GetActions(sender)
	const callback = definition(actions[id], id).callback as Callback
	await callback({ id: 'test', actionId: id, controlId: 'bank', options }, {})
}

/** Runs a feedback's callback and returns its result */
export function checkFeedback<K extends keyof FeedbacksSchema>(
	source: Pick<VdoNinjaClient, 'states' | 'streams'>,
	id: K,
	options: FeedbacksSchema[K]['options'],
): unknown {
	const callback = definition(GetFeedbacks(source)[id], id).callback as Callback
	return callback({ id: 'test', feedbackId: id, controlId: 'bank', options }, {})
}
