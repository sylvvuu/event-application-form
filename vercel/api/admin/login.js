import { loadConfig } from '../../lib/config.js';
import { send, readJson, method } from '../../lib/http.js';
import { verifyPassword, randomId } from '../../lib/security.js';
import { listPaths, putJson, stamp, stampOf } from '../../lib/store.js';
import { setSessionCookie } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5; // 15분 안에 5회 실패하면 잠금

export default async function handler(req, res) {
  if (!method(req, res, 'POST')) return;
  try {
    await loadConfig();
    if (!process.env.ADMIN_PASSWORD_HASH) return send(res, 409, { error: 'setup_required' });
    const now = Date.now();
    const fails = (await listPaths('auth/fail/')).filter(p => now - stampOf(p) < LOCK_WINDOW_MS);
    if (fails.length >= MAX_FAILS) {
      const unlockAt = stampOf(fails[fails.length - MAX_FAILS]) + LOCK_WINDOW_MS;
      await audit(req, 'LOGIN_BLOCKED', { reason: 'locked' }, 'anonymous');
      return send(res, 423, { error: 'locked', retryAfterSec: Math.ceil((unlockAt - now) / 1000) });
    }

    const body = await readJson(req);
    if (!verifyPassword(body.password || '', process.env.ADMIN_PASSWORD_HASH)) {
      const remaining = Math.max(0, MAX_FAILS - fails.length - 1);
      await putJson(`auth/fail/${stamp(now)}-${randomId(4)}.json`, {});
      await audit(req, 'LOGIN_FAIL', { remaining }, 'anonymous');
      return send(res, 401, { error: 'invalid_credentials', remaining });
    }

    const sess = { sid: randomId(12), role: 'admin', iat: now, seen: now };
    setSessionCookie(res, sess);
    await audit(req, 'LOGIN_SUCCESS', { sid: sess.sid.slice(0, 6) });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('login failed', e?.message);
    return send(res, e?.status || 500, { error: 'server_error' });
  }
}
