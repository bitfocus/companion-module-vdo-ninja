## VDO.Ninja

Control [VDO.Ninja](https://vdo.ninja) settings remotely.

### Getting Started

- Think of an API ID to use for your production. It should be unique and difficult to guess
- Add your API ID as a URL parameter (ex. `&api=your-unique-api-key`) to your VDO.Ninja URL
- Add the same API ID in the Companion module settings. Anyone with the API ID can control your VDO.Ninja page, so the module keeps it in Companion's secrets store rather than the regular settings
- If you host your own API websocket server, enable **Custom Websockets Server** and enter its domain only (no `wss://`, port or path)

This module needs Companion 5.0 or newer.

If the connection drops, the module reconnects on its own and shows **Disconnected** until it is back. Commands pressed while disconnected are not sent and are noted in the module's log.

### Available Actions

#### Local

- Mic Control
- Camera Control
- Speaker Control
- Playback Volume
- Send Chat Message
- Record Video
- Reload
- Hang Up
- Set Video Bitrate
- Set Audio Pan
- Raise Hand
- Screen Share
- Force Keyframe
- Next Slide
- Previous Slide
- Pan, Tilt, Zoom and Focus Camera, and Camera Exposure (these need `&ptz` on the camera's VDO.Ninja page)

#### Director

##### Targets self

- Self in Group
- Join Group
- Leave Group
- View Group
- Join View Group
- Leave View Group
- Toggle Highlight Video

##### Targets a room guest

The **Guest** field takes the guest's slot number (1, 2, …) or stream ID, and can use variables. It is required: a command with an empty guest is not sent, as VDO.Ninja would run it on the director's own page instead.

- Guest Mic
- Guest Camera
- Guest Speaker
- Set Guest Mic Volume
- Overlay Message to Guest
- Transfer Guest
- Guest in Scene
- Guest Mic in Scene
- Guest in Group
- Guest Blind
- Toggle Guest Highlight
- Solo Talk
- Two-way Solo Talk
- Force Keyframe
- Hang Up Guest

### Available Feedbacks

- Mic Status
- Camera Status
- Speaker Status
- Guest in Scene
- Guest Hand Raised
- Guest Queued (waiting for the director to admit them)
- Stream Highlighted
- Guest in Group
- Guest in Slot (needs slots in use: `&slotmode=1` on the director, or the mixer)
- Guest Deafened
- Guest Blind
- Guest Mic Muted in Scenes

The status feedbacks are active when the stream's state matches the **Muted** checkbox. A guest muted or hidden by the director counts as muted.

### Available Variables

- streamID (Current stream ID for the guest in a given position )
- mic (Current mute status, either by stream ID or guest position)
- camera (Current camera status, either by stream ID or guest position)
- speaker (Available for the "Director" role only)
- label (If specified, otherwise it will be the guest position number)
- scenes (List of scenes a guest is currently active in)

For guests, as seen from the director:

- hand (Raised or Lowered)
- queued (Queued or Admitted)
- highlighted (Highlighted or Not highlighted)
- slot (Mixer slot number, or None)
- groups (List of groups the guest is in)
- volume (The volume the director has set, 0 to 200)
- deafened (Deafened or Off)
- blind (Blind or Off)
- scene_mic (Muted or Live)

Each variable is available by guest position (`guest_1_hand`) and by stream ID (`yourStreamID_hand`).

For the page the API ID is attached to, whether it is a director or a guest:

- local_streamID, local_mic, local_camera, local_speaker, local_highlighted

### Presets

There are presets for every action, available as soon as the module is added, before anything has connected.

- **Guest buttons follow a slot, not a person.** Guest 1's button controls whoever is in slot 1, shows their name, and fades while the slot is empty. To point a button at another guest, change its `slot` local variable.
- **Colours show real state.** The strip along the bottom turns green or red, for example, as the guest's mic changes. Solo Talk is the exception: VDO.Ninja doesn't report whether it is on, so those buttons can't show it.
- **Hang up, reload and transfer need holding for a second**, so they can't be pressed by accident.
- **Purple buttons need configuring** after you drag them on: a message to send, a room to transfer to, or a bitrate.
- **Volume and camera dials** are for rotary encoders. Pressing a volume dial returns it to its default.

These presets draw their graphics with the button elements in Companion 5, and include a simpler version for software that can't draw those. The **Status Tile** and **Level Tile** elements they use are also available to add to your own buttons.

Buttons made from the module's earlier presets keep working and aren't changed.
