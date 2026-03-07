# Arnon

Encrypted conversations that leave no trace. No download. No account. No history.

## Structure

```
arnon/
├── index.html          # Landing page (GitHub Pages)
├── pwa/
│   └── app.html        # The entire app — single file
└── relay/
    ├── server.js        # Blind relay server (Node.js + ws)
    └── package.json
```

## How it works

1. One person opens arnon.app and taps "New conversation" — gets a link
2. They send the link to someone
3. The other person opens the link — encrypted chat starts instantly
4. Close the tab — everything is destroyed

## Features

- End-to-end encrypted (ECDH P-256 + AES-256-GCM, Web Crypto API)
- Text messages + voice notes (30s max)
- Self-destruct timer (5min / 15min / 30min / 1hr) — destroys the entire room
- Padding: text padded to 4 KB, voice to 128 KB — all messages of the same type look identical on the wire
- No account, no phone number, no email
- No download — works in any browser
- Close tab = everything destroyed (keys, messages, identity)
- Blind relay — sees only encrypted blobs, no logs, nothing to hand over
- Accessible — aria labels, keyboard navigation, screen reader support
- Responsive — works on phone, tablet, desktop
- Tor Browser compatible

## Architecture

- **Crypto**: ECDH P-256 key exchange → AES-256-GCM (Web Crypto API, no WASM)
- **Padding**: Text → 4 KB, Voice → 128 KB (resistant to traffic analysis)
- **Relay**: Forwards encrypted blobs. Sees nothing. No accounts, no logs.
- **Storage**: None. Everything in memory. Close tab = destroyed.
- **Voice**: MediaRecorder → padded → encrypted → relay → decrypted → unpadded → audio element
- **Self-destruct**: Timer runs on relay + both clients. Room destroyed when time is up.

## Privacy

| What the relay sees       | What the relay does NOT see |
|---------------------------|-----------------------------|
| An IP connected           | Who you are                 |
| A blob was stored         | What's in the blob          |
| A blob was picked up      | Who sent it or who it's for |
| All blobs are same size   | Whether it's text or voice  |

For full IP anonymity, use Tor Browser.

## Deploy

```bash
# Relay (on VPS)
cd relay && npm install && node server.js --port 9444

# Landing page + PWA — host on GitHub Pages
# Update RELAY and BASE constants in pwa/app.html to match your domain
```

## License

AGPL-3.0 — see LICENSE.

Built by Particular Ltd.
