# Changelog

All notable changes to this module are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-11-22

> [!IMPORTANT]
> Requires Companion v5.0.0 or newer, or Bitfocus Buttons v1.8.0 or newer.

### Added

- Actions covering the rest of the VDO.Ninja API for local pages: overlay message, room timer, tally light, active speaker layout, mixer layout, buffer delay, camera aspect ratio and camera setting
- Guest actions: mixer slot, mix order, isolate audio channel, pinned message, timer, camera moves, autofocus, mirror, rotate, requested resolution and aspect ratio, camera size, refresh, and guest camera
- Feedbacks: guest hand raised, queued, highlighted, in group, in slot, deafened, blind, and mic muted in scenes
- Variables for guest volume, deafened, blind, scene mic, hand, queued, highlighted, slot and groups, plus local stream state for the page the API ID is attached to
- Presets for every action, available as soon as the module is added. Guest buttons follow a room position, show the guest's name, fade while empty, and use layered graphics with a simple fallback
- Rotary encoder dials for volume and camera controls; hang up, reload and transfer need a one-second hold
- API ID stored in module secrets store rather than plain config

### Changed

- Rewritten in TypeScript against Companion module API 2.0 / Node 26
- Connection and stream state moved into a dedicated client; command replies are matched by request ID
- Guest presets target a position via a `guest` local variable (renamed from `slot`)
- Redesigned Presets to be more information dense and readable, using layered elements so users can customize each piece
- Custom websocket server field expects the domain only

### Fixed

- Stream state stays accurate through outages, reloads and hang ups
- Config, connection and message handling hardened
- Stream details refresh after guest commands

## [2.5.0] - 2025-11-15

### Added

- Stream ID variables for guest positions
- Variable support in guest and message action fields

## [2.4.0] - 2025-05-18

### Added

- Local PTZ actions: pan, tilt, zoom, focus and exposure

### Changed

- Runtime upgraded to Node 22

## [2.3.0] - 2024-12-23

### Added

- Guest in scene feedback and variable

## [2.2.2] - 2024-06-30

### Fixed

- Stream variables available for all streams, including rooms

## [2.2.1] - 2024-02-24

### Fixed

- More responsive feedback
- Director presets

## [2.2.0] - 2023-12-17

### Added

- Optional custom websockets server

## [2.1.0] - 2023-10-23

### Added

- Label variable for guests
- New actions, clearer names and descriptions for existing actions

## [2.0.2] - 2023-05-22

### Changed

- Dependency updates

## [2.0.1] - 2023-01-08

### Changed

- Updated `@companion-module/base`

## [2.0.0] - 2022-11-28

### Changed

- Rewritten for Companion 3.0

## [1.1.0] - 2022-10-05

### Added

- State / feedback support

### Fixed

- Clear polling interval on destroy to prevent log flooding

## [1.0.2] - 2022-02-02

### Changed

- Package tidy

## [1.0.1] - 2022-01-09

### Added

- Guest group action

### Fixed

- Reconnection handling

## [1.0.0] - 2021-09-22

### Added

- Initial release

[3.0.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.5.0...v3.0.0
[2.5.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.2.2...v2.3.0
[2.2.2]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/bitfocus/companion-module-vdo-ninja/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/bitfocus/companion-module-vdo-ninja/releases/tag/v1.0.0
