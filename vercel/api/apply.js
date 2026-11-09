import { loadConfig } from '../lib/config.js';
import { send, readJson, method, clientIp } from '../lib/http.js';
import { validateApplication } from '../lib/validate.js';
import { randomId, sha256 } from '../lib/security.js';
import { createApplication } from '../lib/repo.js';
import { putJson, listPaths, stamp, stampOf } from '../lib/store.js';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5; // 같은 IP에서 10분에 5건까지

export default async function handler(req, res) {
  if (!method(req, res, 'POST')) return;
  try {
    await loadConfig();
    const body = await readJson(req);
    if (body.website) return send(res, 200, { ok: true }); // 봇용 숨은 칸(honeypot)

    const { data, errors, ok } = validateApplication(body);
    if (!ok) return send(res, 400, { error: 'invalid', fields: Object.keys(errors) });

    const now = Date.now();
    const ipKey = sha256(clientIp(req) + (process.env.SESSION_SECRET || '')).slice(0, 24);
    const recent = (await listPaths(`rl/apply/${ipKey}/`)).filter(p => now - stampOf(p) < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) return send(res, 429, { error: 'too_many' });
    await putJson(`rl/apply/${ipKey}/${stamp(now)}-${randomId(4)}.json`, {});

    const created = await createApplication(data, 'applicant');
    return send(res, 200, { ok: true, ...created });
  } catch (e) {
    console.error('apply failed', e?.message);
    return send(res, e?.status || 500, { error: 'server_error' });
  }
}
