import { readToken, makeToken, IDLE_MS, ABSOLUTE_MS } from './security.js';
import { cookies, send } from './http.js';
import { listPaths } from './store.js';

export const COOKIE = '__Host-admin_session';

export function setSessionCookie(res, sess) {
  const tok = makeToken(sess);
  const secure = process.env.LOCAL_STORE_DIR && !process.env.VERCEL ? '' : '; Secure';
  const name = secure ? COOKIE : 'admin_session';
  res.setHeader('Set-Cookie',
    `${name}=${tok}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${Math.floor(IDLE_MS / 1000)}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`,
    `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  ]);
}

export function readSession(req) {
  const c = cookies(req);
  const s = readToken(c[COOKIE] || c.admin_session);
  if (!s) return null;
  const now = Date.now();
  if (now - s.iat > ABSOLUTE_MS) return null;
  if (now - s.seen > IDLE_MS) return null;
  return s;
}

// 매 요청마다 서버에서 세션·권한을 확인 (OWASP A01)
export async function requireAdmin(req, res) {
  const s = readSession(req);
  if (!s || s.role !== 'admin') { send(res, 401, { error: 'unauthorized' }); return null; }
  const revoked = await listPaths(`auth/revoked/${s.sid}`);
  if (revoked.length) { clearSessionCookie(res); send(res, 401, { error: 'unauthorized' }); return null; }
  s.seen = Date.now();
  setSessionCookie(res, s); // 사용 중이면 만료 시간 연장
  return s;
}
