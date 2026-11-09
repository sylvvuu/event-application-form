import crypto from 'node:crypto';

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error('missing env ' + name);
  return v;
}

// ---------- 저장 데이터 암호화 (AES-256-GCM) ----------
function dataKey() {
  const k = Buffer.from(need('DATA_ENC_KEY'), 'base64');
  if (k.length !== 32) throw new Error('DATA_ENC_KEY must be 32 bytes (base64)');
  return k;
}
export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', dataKey(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') };
}
export function decrypt(enc) {
  const d = crypto.createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(enc.iv, 'base64'));
  d.setAuthTag(Buffer.from(enc.tag, 'base64'));
  const pt = Buffer.concat([d.update(Buffer.from(enc.ct, 'base64')), d.final()]);
  return JSON.parse(pt.toString('utf8'));
}

// ---------- 비밀번호 (scrypt 해시: "scrypt$salt$hash") ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('base64') + '$' + h.toString('base64');
}
export function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !s || !h) return false;
  const want = Buffer.from(h, 'base64');
  const got = crypto.scryptSync(String(pw), Buffer.from(s, 'base64'), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}

// ---------- TOTP (RFC 6238, SHA-1, 6자리, 30초) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Decode(s) {
  const clean = s.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, val = 0; const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export function base32Encode(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function totpAt(secretB32, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secretB32)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1000000);
  return String(code).padStart(6, '0');
}
// 맞으면 사용된 counter 반환, 틀리면 -1 (앞뒤 30초 허용)
export function verifyTotp(code, secretB32, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return -1;
  const c = Math.floor(now / 30000);
  for (const d of [0, -1, 1]) {
    const exp = totpAt(secretB32, c + d);
    if (crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(String(code)))) return c + d;
  }
  return -1;
}

// ---------- 세션 토큰 (HMAC 서명) ----------
export const IDLE_MS = 30 * 60 * 1000;      // 30분 미사용 시 만료
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000; // 로그인 후 최대 8시간

function b64u(buf) { return Buffer.from(buf).toString('base64url'); }
function sign(payload) {
  return crypto.createHmac('sha256', need('SESSION_SECRET')).update(payload).digest('base64url');
}
export function makeToken(sess) {
  const p = b64u(JSON.stringify(sess));
  return p + '.' + sign(p);
}
export function readToken(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [p, s] = tok.split('.');
  const want = sign(p);
  if (s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch { return null; }
}

export function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}
export function randomId(n = 9) {
  return crypto.randomBytes(n).toString('base64url');
}
