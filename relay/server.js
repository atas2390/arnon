const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const PORT = parseInt(process.argv.find((_, i, a) => a[i-1] === '--port') || '9444');
const rooms = new Map();

const wss = new WebSocketServer({ port: PORT });
console.log(`[arnon-relay] :${PORT}`);

wss.on('connection', ws => {
  let room = null;

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'create') {
      const id = crypto.randomBytes(6).toString('hex');
      const ttl = Math.min(Math.max(parseInt(m.ttl) || 0, 0), 3600);
      const r = { peers: new Set([ws]), created: Date.now(), ttl };
      if (ttl > 0) r.timer = setTimeout(() => destroyRoom(id), ttl * 1000);
      rooms.set(id, r);
      room = id;
      ws.send(JSON.stringify({ type: 'created', room: id, ttl }));
    }
    else if (m.type === 'join') {
      if (!m.room || !rooms.has(m.room)) return ws.send(JSON.stringify({ type: 'error', msg: 'not_found' }));
      const r = rooms.get(m.room);
      if (r.peers.size >= 2) return ws.send(JSON.stringify({ type: 'error', msg: 'full' }));
      r.peers.add(ws);
      room = m.room;
      ws.send(JSON.stringify({ type: 'joined', ttl: r.ttl, elapsed: Math.floor((Date.now() - r.created) / 1000) }));
      for (const p of r.peers) if (p !== ws && p.readyState === 1) p.send(JSON.stringify({ type: 'peer_joined' }));
    }
    else if (['key', 'msg', 'voice'].includes(m.type)) {
      if (!room || !rooms.has(room)) return;
      for (const p of rooms.get(room).peers) if (p !== ws && p.readyState === 1) p.send(raw);
    }
  });

  ws.on('close', () => {
    if (!room || !rooms.has(room)) return;
    const r = rooms.get(room);
    r.peers.delete(ws);
    for (const p of r.peers) if (p.readyState === 1) p.send(JSON.stringify({ type: 'peer_left' }));
    if (r.peers.size === 0) destroyRoom(room);
  });
});

function destroyRoom(id) {
  if (!rooms.has(id)) return;
  const r = rooms.get(id);
  if (r.timer) clearTimeout(r.timer);
  for (const p of r.peers) {
    if (p.readyState === 1) {
      p.send(JSON.stringify({ type: 'destroyed' }));
      p.close();
    }
  }
  rooms.delete(id);
}

setInterval(() => {
  for (const [id, r] of rooms) {
    for (const ws of r.peers) if (ws.readyState !== 1) r.peers.delete(ws);
    if (r.peers.size === 0) destroyRoom(id);
  }
}, 60000);
