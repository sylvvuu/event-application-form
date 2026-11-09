// 접속기록: 누가, 언제, 어디서, 무엇을 했는지 (고시 제8조)
import { putJson, stamp } from './store.js';
import { randomId } from './security.js';
import { clientIp } from './http.js';

export async function audit(req, action, detail = {}, actor = 'admin') {
  const at = Date.now();
  const entry = {
    at: new Date(at).toISOString(),
    actor,
    action,
    ip: clientIp(req),
    ua: String(req.headers['user-agent'] || '').slice(0, 200),
    detail
  };
  try {
    await putJson(`logs/${stamp(at)}-${randomId(6)}.json`, entry);
  } catch (e) {
    console.error('audit write failed', action, e?.message);
  }
}
