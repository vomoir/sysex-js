# sysex-js

A browser-based MIDI controller and SysEx utility for Roland SC-88 Pro hardware.

`sysex-js` provides a visual 16-part mixer/editor, drum controls, Roland GS/SC-88 Pro SysEx parameter editing, MIDI file playback, and hardware snapshots. It uses the Web MIDI API through [WebMidi.js](https://github.com/djipco/webmidi), and is built with React, TypeScript, and Vite.

![Project status](https://img.shields.io/badge/status-experimental-orange)

## Features

- Connect to MIDI outputs from a Chromium-based browser
- Edit all 16 MIDI parts independently
- Quick-select instruments and drum kits
- Set program changes, bank variation (CC 0), and bank map (CC 32)
- Adjust volume, pan, reverb, chorus, delay, EFX send, filter, envelope, and vibrato parameters
- Trigger a test note or send All Notes Off / All Sound Off
- Mute or solo MIDI parts; mute or solo playback from MIDI files
- Configure EFX type, source routing, and 20 EFX parameters
- Edit SC-88 Pro drum kits and individual drum note parameters
- Send the SC-88 Pro LCD display text
- Load and play Standard MIDI Files (`.mid` and `.midi`)
- Track outgoing messages in the on-screen MIDI/SysEx log
- Save and restore named hardware snapshots in browser `localStorage`

## Requirements

- Roland SC-88 Pro or compatible GS/SC-88 Pro device
- A MIDI interface or other connection between your computer and the device
- A Web MIDI-capable browser, preferably Chrome or Edge
- A local development server

MIDI output must be enabled in the browser, and the browser may ask for permission to access MIDI devices and SysEx. The application can only control devices exposed by the operating system and browser.

The SC-88 Pro device ID defaults to `17` in the interface, which is converted to MIDI device ID `16` (`0x10`) in outgoing SysEx messages.

## Getting started

### Prerequisites

- Node.js
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Click **Connect MIDI Devices**, select your MIDI output, set the device ID if necessary, and begin editing.

For a production build:

```bash
npm run build
npm run preview
```

The build output is written to `dist/`.

## Usage

### Parts

Choose a part from `Part 1` through `Part 16`. Each part maintains its own instrument, bank, program, mix, mute, solo, and parameter settings in the editor.

Use **Test Note** to play a short C4 on the selected part. **Panic** sends All Notes Off and All Sound Off to every MIDI channel.

### MIDI file playback

Choose a `.mid` or `.midi` file, then use **Play**, **Pause**, or **Stop**. Playback supports notes, control changes, program changes, and pitch bend, while the part mute/solo controls filter outgoing channels.

Stopping playback sends All Notes Off to all 16 channels.

### Snapshots

Enter a snapshot name and save the current 16-part state, EFX settings, and LCD text. Snapshots are stored locally in the browser and remain available after a refresh.

## Browser and hardware notes

- SysEx support depends on browser and operating-system MIDI access.
- Keep the SC-88 Pro device ID and MIDI channel settings aligned with the hardware configuration.
- Some addresses and values are SC-88 Pro-specific and may not behave identically on other Roland or GS-compatible devices.
- The outgoing SysEx monitor records the last 50 generated MIDI/SysEx entries.
- MIDI file playback depends on an available MIDI output; the app does not contain an internal audio synthesizer.

## Project structure

```text
src/
├── App.tsx                 # Application shell
├── PartEditor.tsx          # Main 16-part editor and hardware controls
├── MidiFilePlayer.tsx      # Standard MIDI File loading and playback
└── utils/
    ├── instruments.ts      # SC-88 Pro instrument, drum kit, and GM name tables
    ├── midiManager.ts      # Web MIDI/WebMidi.js lifecycle management
    └── rolandSysex.ts      # Roland message builder, checksums, and addresses
```

## Development

Available npm scripts:

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run lint     # Run ESLint on the project
npm run preview  # Preview the production build locally
```
