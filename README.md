# companion-module-vdo-ninja

[HELP.md](./companion/HELP.md) - Getting started information
[CHANGELOG.md](./companion/CHANGELOG.md) - Version update history
[LICENSE](./LICENSE)

## Development

```bash
yarn install
yarn build      # compile to dist/
yarn dev        # compile in watch mode
yarn lint
yarn test       # unit tests
```

### End-to-end tests

`yarn test:e2e` opens real VDO.Ninja pages in headless Chromium and drives them through the module. Most use a local relay in place of `api.vdo.ninja` (VDO.Ninja's `&apiserver=` parameter points the pages at it), so that everything crossing it can be inspected. They cover:

- every action, on a single page or in a room with a guest. PTZ and slide commands check the call VDO.Ninja's handler makes, as they need hardware or software the test browser doesn't have
- the module's feedbacks and variables for guest state
- guests leaving in different ways, pages reloading, a second controller, and the module's own network dropping (`helpers/outageProxy.ts` cuts it while the pages stay connected)
- the whole module through the real `api.vdo.ninja` (`hosted.e2e.ts`). Only Companion's side of the instance is stood in for, so loading the module in Companion itself is still a manual check

Notes:

- They need internet access: the pages load from vdo.ninja, and the director and guest connect through VDO.Ninja's public signalling server.
- A guest whose browser dies is only noticed when WebRTC times out, so that test can take over a minute.
- vdo.ninja rate limits repeated page loads (HTTP 429, then a bot check), and a full run opens a lot of pages. Don't run them in a loop against the public site. A run that gets limited fails with a message saying so.
- Install Chromium once with `yarn test:e2e:install`.
- They run against `https://vdo.ninja/v30/` by default; set `VDO_NINJA_URL` to test another release.
- They are not run in CI.

To run them as often as you like, serve the pages from a local copy instead. Fetch it once with `yarn test:e2e:fetch`, then use `yarn test:e2e:local`. Signalling and `hosted.e2e.ts` still use VDO.Ninja's public servers. The copy is the `v30.2` release, which is close to but not identical to what `/v30/` serves, so run `yarn test:e2e` occasionally too. Set `VDO_NINJA_DIR` to test against another checkout.
