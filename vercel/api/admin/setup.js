// 최초 설정: 관리자가 정한 비밀번호의 해시만 비공개 저장소에 저장 (최초 1회만 가능)
// 한 번 등록되면 이 API는 더 이상 동작하지 않음.
import { send, readJson, method } from '../../lib/http.js';
import { hashPassword, randomId } from '../../lib/security.js';
import { putJson } from '../../lib/store.js';
import { loadConfig, adminConfigured } from '../../lib/config.js';
import { setSessionCookie } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';

export default async function handler(req, res) {
  if (!method(req, res, 'POST')) return;
  try {
    await loadConfig();
    if (adminConfigured()) return send(res, 403, { error: 'already_configured' });
    const body = await readJson(req);
    const pw = String(body.password || '');
    if (pw.length < 12 || pw.length > 128 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
      return send(res, 400, { error: 'weak_password' });
    }
    const hash = hashPassword(pw);
    try {
      await putJson('system/admin.json', { hash, createdAt: new Date().toISOString() }, { once: true });
    } catch {
      return send(res, 403, { error: 'already_configured' }); // 누군가 먼저 등록함
    }
    process.env.ADMIN_PASSWORD_HASH = hash;
    const now = Date.now();
    const sess = { sid: randomId(12), role: 'admin', iat: now, seen: now };
    setSessionCookie(res, sess);
    await audit(req, 'ADMIN_SETUP', {});
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('setup failed', e?.message);
    return send(res, 500, { error: 'server_error' });
  }
}
