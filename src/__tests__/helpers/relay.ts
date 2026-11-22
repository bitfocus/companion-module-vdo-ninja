import type { AddressInfo } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'

/**
 * A local stand-in for the api.vdo.ninja relay: a socket joins a room by sending `{ join: apiID }`,
 * after which every message it sends is forwarded to the other sockets in that room.
 *
 * This mirrors how the module and VDO.Ninja use the hosted relay, not its actual implementation.
 */
export class TestRelay {
	readonly #server: WebSocketServer
	readonly #rooms = new Map<WebSocket, string>()
	/** Every message forwarded through the relay, oldest first */
	readonly messages: { room: string; data: unknown }[] = []

	private constructor(server: WebSocketServer) {
		this.#server = server
		server.on('connection', (socket) => {
			socket.on('message', (raw: Buffer) => this.#onMessage(socket, raw.toString()))
			socket.on('close', () => this.#rooms.delete(socket))
		})
	}

	/** With `autoPong` false the relay ignores pings, like a connection that has silently died */
	static async start(autoPong = true): Promise<TestRelay> {
		const server = new WebSocketServer({ host: '127.0.0.1', port: 0, autoPong })
		await new Promise<void>((resolve) => server.once('listening', resolve))
		return new TestRelay(server)
	}

	get url(): string {
		return `ws://127.0.0.1:${(this.#server.address() as AddressInfo).port}`
	}

	/** Number of sockets joined to a room */
	members(room: string): number {
		return [...this.#rooms.values()].filter((r) => r === room).length
	}

	/** Drop every connection, as the hosted relay does when it times a socket out */
	disconnectAll(): void {
		for (const socket of this.#server.clients) socket.terminate()
	}

	async stop(): Promise<void> {
		this.disconnectAll()
		await new Promise<void>((resolve, reject) => this.#server.close((err) => (err ? reject(err) : resolve())))
	}

	#onMessage(socket: WebSocket, text: string): void {
		let data: unknown
		try {
			data = JSON.parse(text)
		} catch {
			return
		}

		if (typeof data === 'object' && data !== null && 'join' in data) {
			this.#rooms.set(socket, String(data.join))
			return
		}

		const room = this.#rooms.get(socket)
		if (room === undefined) return
		this.messages.push({ room, data })
		for (const [other, otherRoom] of this.#rooms) {
			if (other !== socket && otherRoom === room) other.send(text)
		}
	}
}
