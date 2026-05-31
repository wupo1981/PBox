# pbox Stream Deck Plugin

A Stream Deck plugin for controlling audio levels on PBox devices via REST API.

## Features

- **TxGain** — Control TX output gain levels for a selected audio channel pair.
- **CrosspointGain** — Control crosspoint (mix) gain levels between a TX source and RX destination.

Both actions use the Stream Deck encoder (dial) for intuitive ±dB adjustment and display real-time feedback on the LCD.

## Requirements

- [Elgato Stream Deck](https://www.elgato.com/stream-deck) hardware with firmware ≥ 6.9
- Stream Deck software ≥ 6.9
- Node.js 20
- PBox device reachable on the local network with a valid API bearer token

## Installation

### From release (`.streamDeckPlugin`)

1. Download the latest `.streamDeckPlugin` file from [Releases](../../releases).
2. Double-click the file — Stream Deck software will install it automatically.

### Build from source

```bash
npm install
npm run dist
```

The packaged plugin is emitted at `com.aurawave.pbox.streamDeckPlugin` in the repo root.  
Double-click it to install.

#### Other build commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript with Rollup |
| `npm run watch` | Watch mode — rebuilds and restarts plugin on change |
| `npm run validate` | Validate the plugin manifest |
| `npm run pack` | Package without building |

## Configuration

Each action requires the following settings, configured in the Stream Deck Property Inspector:

| Setting | Description |
|---|---|
| **IP Address** | IP address of the PBox device (e.g. `192.168.1.100`) |
| **Token** | Bearer token for API authentication |
| **TX Pair** | Audio output channel pair to control |
| **RX Pair** | Audio input channel pair *(CrosspointGain only)* |

### Audio Channel Pairs

| Name | tx-no / rx-no |
|---|---|
| Ubalance-1/2 | `0,1` |
| Balance-1/2 | `2,3` |
| USB-L/R | `4,6` |
| Dante1/2 | `8,9` |
| Stream1-1/2 | `16,17` |
| Stream2-1/2 | `20,21` |

## Usage

- **Rotate dial** — Increase or decrease gain by the configured step (default 1 dB).
- **Press dial / key** — Reset gain to 0 dB (long press).
- The encoder LCD shows the current gain value in dB in real time.

## API Endpoints

| Action | Endpoint |
|---|---|
| TxGain | `POST /api/aoip/volume-tx` |
| CrosspointGain | `POST /api/aoip/volume-mix` |

Authentication is via `Authorization: Bearer <token>` header.

## Project Structure

```
src/
  plugin.ts              # Plugin entry point
  types.ts               # Shared types and audio pair constants
  actions/
    baseAction.ts        # Shared encoder/dial logic
    txgain.ts            # TxGain action
    crosspointgain.ts    # CrosspointGain action
com.aurawave.pbox.sdPlugin/
  manifest.json          # Plugin manifest
  ui/                    # Property Inspector HTML pages
  imgs/                  # Action and plugin icons
```

## License

MIT
