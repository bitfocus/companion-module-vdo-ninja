import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, resolve, sep } from 'node:path'

const ContentTypes: Record<string, string> = {
	'.css': 'text/css',
	'.gif': 'image/gif',
	'.html': 'text/html',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.mjs': 'text/javascript',
	'.mp3': 'audio/mpeg',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.wasm': 'application/wasm',
	'.webp': 'image/webp',
}

function serve(root: string): Server {
	return createServer((request, response) => {
		void (async () => {
			const { pathname } = new URL(request.url ?? '/', 'http://localhost')
			const path = resolve(root, `.${decodeURIComponent(pathname)}`, pathname.endsWith('/') ? 'index.html' : '')
			if (!path.startsWith(root + sep)) throw new Error('Outside the root')

			const body = await readFile(path)
			response.writeHead(200, { 'content-type': ContentTypes[extname(path)] ?? 'application/octet-stream' }).end(body)
		})().catch(() => response.writeHead(404).end())
	})
}

/**
 * With VDO_NINJA_DIR set, serves that checkout of VDO.Ninja and points the tests at it, so that they
 * don't load the public site, which rate limits repeated loads.
 */
export default async function setup(): Promise<(() => void) | void> {
	const dir = process.env.VDO_NINJA_DIR
	if (!dir) return

	const server = serve(resolve(dir))
	await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
	process.env.VDO_NINJA_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
	return () => server.close()
}
