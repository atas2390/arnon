const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const PORT = parseInt(process.argv.find((_, i, a) => a[i-1] === '--port') || '9444');
const rooms = new Map();
const ipCount = new Map();

const MAX_MSG_SIZE = 1024 * 1024; // 1MB max message
const MAX_ROOMS_PER_IP = 5;
const ROOM_ID_BYTES = 12;

const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_MSG_SIZE });
console.log('[arnon-relay] :' + PORT);

wss.on('connection', function(ws, req) {
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  var room = null;

  ws.on('message', function(raw) {
    if (raw.length > MAX_MSG_SIZE) return;
    var m;
    try { m = JSON.parse(raw); } catch(e) { return; }

    if (m.type === 'create') {
      // rate limit rooms per IP
      var count = ipCount.get(ip) || 0;
      if (count >= MAX_ROOMS_PER_IP) {
        ws.send(JSON.stringify({ type: 'error', msg: 'rate_limited' }));
        return;
      }
      var id = crypto.randomBytes(ROOM_ID_BYTES).toString('hex');
      var ttl = Math.min(Math.max(parseInt(m.ttl) || 0, 0), 3600);
      var r = { peers: new Set([ws]), created: Date.now(), ttl: ttl, ip: ip };
      if (ttl > 0) r.timer = setTimeout(function() { destroyRoom(id); }, ttl * 1000);
      rooms.set(id, r);
      room = id;
      ipCount.set(ip, count + 1);
      ws.send(JSON.stringify({ type: 'created', room: id, ttl: ttl }));
    }
    else if (m.type === 'join') {
      if (!m.room || !rooms.has(m.room)) return ws.send(JSON.stringify({ type: 'error', msg: 'not_found' }));
      var r = rooms.get(m.room);
      if (r.peers.size >= 2) return ws.send(JSON.stringify({ type: 'error', msg: 'full' }));
      r.peers.add(ws);
      room = m.room;
      ws.send(JSON.stringify({ type: 'joined', ttl: r.ttl, elapsed: Math.floor((Date.now() - r.created) / 1000) }));
      r.peers.forEach(function(p) { if (p !== ws && p.readyState === 1) p.send(JSON.stringify({ type: 'peer_joined' })); });
    }
    else if (m.type === 'key' || m.type === 'msg' || m.type === 'voice') {
      if (!room || !rooms.has(room)) return;
      rooms.get(room).peers.forEach(function(p) { if (p !== ws && p.readyState === 1) p.send(raw); });
    }
  });

  ws.on('close', function() {
    if (!room || !rooms.has(room)) return;
    var r = rooms.get(room);
    r.peers.delete(ws);
    r.peers.forEach(function(p) { if (p.readyState === 1) p.send(JSON.stringify({ type: 'peer_left' })); });
    if (r.peers.size === 0) destroyRoom(room);
  });
});

function destroyRoom(id) {
  if (!rooms.has(id)) return;
  var r = rooms.get(id);
  if (r.timer) clearTimeout(r.timer);
  // decrement IP counter
  var count = ipCount.get(r.ip) || 1;
  if (count <= 1) ipCount.delete(r.ip); else ipCount.set(r.ip, count - 1);
  r.peers.forEach(function(p) {
    if (p.readyState === 1) {
      p.send(JSON.stringify({ type: 'destroyed' }));
      p.close();
    }
  });
  rooms.delete(id);
}

// cleanup every minute
setInterval(function() {
  rooms.forEach(function(r, id) {
    r.peers.forEach(function(ws) { if (ws.readyState !== 1) r.peers.delete(ws); });
    if (r.peers.size === 0) destroyRoom(id);
  });
}, 60000);
