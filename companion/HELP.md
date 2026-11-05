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

Each variable is available by guest position (`guest_1_hand`) and by stream ID (`yourStreamID_hand`).
