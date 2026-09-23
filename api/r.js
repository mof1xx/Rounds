// Rounds accounts API: sign up, sign in, recovery key, sync.
// Needs Vercel Storage → Upstash for Redis connected to this project.
const crypto = require('crypto');
const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SESSION_TTL = 60 * 60 * 24 * 180; // 180 days

async function R(...cmd) {
  const r = await fetch(DB_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const hash = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? no(e) : ok(k.toString('hex'))));
const same = (a, b) => { const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex'); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const rnd = n => crypto.randomBytes(n).toString('hex');
const recoveryKey = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.randomBytes(12);
  let s = 'RND-';
  for (let i = 0; i < 12; i++) { s += A[b[i] % A.length]; if (i % 4 === 3 && i < 11) s += '-'; }
  return s;
};
const normEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
async function newSession(uid) { const t = rnd(32); await R('SET', 'sess:' + t, uid, 'EX', SESSION_TTL); await R('SADD', 'sessions:' + uid, t); return t; }
async function tooMany(key, max, windowSec) { const n = await R('INCR', 'rl:' + key); if (n === 1) await R('EXPIRE', 'rl:' + key, windowSec); return n > max; }
async function dropSessions(uid) { const all = (await R('SMEMBERS', 'sessions:' + uid)) || []; for (const t of all) await R('DEL', 'sess:' + t); await R('DEL', 'sessions:' + uid); }

module.exports = async (req, res) => {
  const send = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'method' });
  if (!DB_URL || !DB_TOKEN) return send(503, { error: 'nodb' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  b = b || {};
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  try {
    switch (b.action) {
      case 'ping': return send(200, { ok: true });
      case 'signup': {
        const e = normEmail(b.email), p = String(b.password || '');
        if (!validEmail(e)) return send(400, { error: 'email' });
        if (p.length < 8 || p.length > 200) return send(400, { error: 'short' });
        if (await tooMany('su:' + ip, 20, 3600)) return send(429, { error: 'many' });
        const uid = rnd(12), salt = rnd(16), rsalt = rnd(16), rec = recoveryKey();
        const user = { uid, email: e, name: String(b.name || '').slice(0, 60), salt, hash: await hash(p, salt), rsalt, rhash: await hash(rec, rsalt), created: Date.now() };
        const ok = await R('SET', 'user:' + e, JSON.stringify(user), 'NX');
        if (ok !== 'OK') return send(409, { error: 'used' });
        return send(200, { token: await newSession(uid), uid, email: e, name: user.name, recovery: rec });
      }
      case 'login': {
        const e = normEmail(b.email), p = String(b.password || '');
        if (await tooMany('li:' + e, 10, 900) || await tooMany('lip:' + ip, 60, 900)) return send(429, { error: 'many' });
        const raw = await R('GET', 'user:' + e);
        if (!raw) { await hash(p, 'x'); return send(401, { error: 'wrong' }); }
        const u = JSON.parse(raw);
        if (!same(await hash(p, u.salt), u.hash)) return send(401, { error: 'wrong' });
        await R('DEL', 'rl:li:' + e);
        return send(200, { token: await newSession(u.uid), uid: u.uid, email: e, name: u.name || '' });
      }
      case 'recover': {
        const e = normEmail(b.email), k = String(b.recovery || '').trim().toUpperCase(), p = String(b.password || '');
        if (p.length < 8 || p.length > 200) return send(400, { error: 'short' });
        if (await tooMany('rc:' + e, 8, 3600) || await tooMany('rcip:' + ip, 40, 3600)) return send(429, { error: 'many' });
        const raw = await R('GET', 'user:' + e);
        if (!raw) { await hash(k, 'x'); return send(401, { error: 'wrongkey' }); }
        const u = JSON.parse(raw);
        if (!same(await hash(k, u.rsalt), u.rhash)) return send(401, { error: 'wrongkey' });
        u.salt = rnd(16); u.hash = await hash(p, u.salt);
        await R('SET', 'user:' + e, JSON.stringify(u));
        await dropSessions(u.uid);
        return send(200, { token: await newSession(u.uid), uid: u.uid, email: e, name: u.name || '' });
      }
    }
    // everything below needs a valid session
    const tok = String(b.token || '');
    const uid = /^[a-f0-9]{64}$/.test(tok) ? await R('GET', 'sess:' + tok) : null;
    if (!uid) return send(401, { error: 'auth' });
    switch (b.action) {
      case 'get': { const raw = await R('GET', 'data:' + uid); return send(200, { doc: raw ? JSON.parse(raw) : null }); }
      case 'put': {
        const d = b.doc || {};
        const s = JSON.stringify({ v: d.v, updated: +d.updated || Date.now(), device: String(d.device || '').slice(0, 40), json: String(d.json || '') });
        if (s.length > 900000) return send(413, { error: 'big' });
        await R('SET', 'data:' + uid, s);
        return send(200, { ok: true });
      }
      case 'logout': await R('DEL', 'sess:' + tok); await R('SREM', 'sessions:' + uid, tok); return send(200, { ok: true });
      case 'delete': {
        const e = normEmail(b.email), raw = await R('GET', 'user:' + e);
        if (!raw) return send(401, { error: 'wrong' });
        const u = JSON.parse(raw);
        if (u.uid !== uid || !same(await hash(String(b.password || ''), u.salt), u.hash)) return send(401, { error: 'wrong' });
        await dropSessions(uid); await R('DEL', 'data:' + uid, 'user:' + e);
        return send(200, { ok: true });
      }
    }
    return send(400, { error: 'action' });
  } catch (err) {
    console.error('rounds api', err);
    return send(500, { error: 'server' });
  }
};
