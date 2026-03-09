# Arnon

Encrypted conversations that leave no trace. No download. No account. No history.

A complete encrypted messenger — app + relay — in 472 lines of code.

## Structure

```
arnon/
├── index.html          # Landing page (GitHub Pages)
├── accessibility.html  # Accessibility statement
├── pwa/
│   └── app.html        # The entire app — single file
└── relay/
    ├── server.js              # Blind relay server (Node.js + ws)
    ├── package.json
    └── arnon-relay.service    # systemd service file
```

## How it works

1. One person opens arnon.app and taps "New conversation" — gets a link
2. They send the link to someone
3. The other person opens the link — encrypted chat starts instantly
4. Close the tab — everything is destroyed

## Features

- End-to-end encrypted (ECDH P-256 + AES-256-GCM, Web Crypto API)
- Text messages + voice notes (30s max) — no photos, videos, or file sharing, by design
- Self-destruct timer (5min / 15min / 30min / 1hr) — destroys the entire room
- No account, no phone number, no email
- No download — works in any browser
- Close tab = everything destroyed (keys, messages, identity)
- Blind relay — sees only encrypted blobs in memory, nothing written to disk, nothing to hand over
- Relay hardened — runs as dedicated non-root user, rate limiting (5 rooms/IP), 1MB message size limit, 24-char room IDs
- Accessible — aria labels, keyboard navigation, screen reader support
- Responsive — works on phone, tablet, desktop
- Tor Browser compatible (voice notes may not work)
- Free forever — no company, no investors, no monetization plan

## Architecture

- **Crypto**: ECDH P-256 key exchange → AES-256-GCM (Web Crypto API, no WASM)
- **Relay**: Forwards encrypted blobs in memory only — nothing written to disk. No accounts, no logs. Runs as dedicated user. Hosted in Helsinki, EU (GDPR).
- **Storage**: None. Everything in memory. Close tab = destroyed.
- **Voice**: MediaRecorder → encrypted → relay → decrypted → audio element
- **Self-destruct**: Timer synced from relay on key exchange. Room destroyed server-side when time is up.

## Privacy

| What the relay sees       | What the relay does NOT see |
|---------------------------|-----------------------------|
| An IP connected           | Who you are                 |
| A blob was stored         | What's in the blob          |
| A blob was picked up      | Who sent it or who it's for |

For full IP anonymity, use Tor Browser. Voice notes may not work in Tor Browser.

## Deploy

```bash
# Relay (on VPS)
useradd -r -s /usr/sbin/nologin arnon
mkdir -p /opt/arnon/relay
cp relay/server.js relay/package.json /opt/arnon/relay/
cd /opt/arnon/relay && npm install
chown -R arnon:arnon /opt/arnon
cp relay/arnon-relay.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable arnon-relay
systemctl start arnon-relay

# Landing page + PWA — host on GitHub Pages
# Update RELAY and BASE constants in pwa/app.html to match your domain
```

## License

AGPL-3.0 — see LICENSE.

Built by Particular Ltd.
