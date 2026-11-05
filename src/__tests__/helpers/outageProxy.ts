import { createConnection, createServer, type AddressInfo, type Server, type Socket } from 'node:net'

/**
 * A TCP proxy between the module and the relay. Cutting it gives the module a real network outage,
 * refused reconnects included, while the VDO.Ninja pages stay connected to the relay.
 */
export class OutageProxy {
	readonly #targetPort: number
	readonly #sockets = new Set<Socket>()
	#server: Server | undefined
	#port = 0

	private constructor(targetPort: number) {
		this.#targetPort = targetPort
	}

	static async start(targetUrl: string): Promise<OutageProxy> {
		const proxy = new OutageProxy(Number(new URL(targetUrl).port))
		await proxy.restore()
		return proxy
	}

	get url(): string {
		return `ws://127.0.0.1:${this.#port}`
	}

	/** Starts accepting connections, on the same port as before */
	async restore(): Promise<void> {
		const server = createServer((client) => {
			const upstream = createConnection(this.#targetPort, '127.0.0.1')
			for (const socket of [client, upstream]) {
				this.#sockets.add(socket)
				socket.on('close', () => this.#sockets.delete(socket))
				socket.on('error', () => socket.destroy())
			}
			client.pipe(upstream).pipe(client)
			client.on('close', () => upstream.destroy())
			upstream.on('close', () => client.destroy())
		})
		await new Promise<void>((resolve) => server.listen(this.#port, '127.0.0.1', resolve))
		this.#port = (server.address() as AddressInfo).port
		this.#server = server
	}

	/** Drops every connection and refuses new ones */
	async cut(): Promise<void> {
		const server = this.#server
		this.#server = undefined
		for (const socket of this.#sockets) socket.destroy()
		if (server) await new Promise((resolve) => server.close(resolve))
	}
}
