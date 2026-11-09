import { loadConfig } from '../../lib/config.js';
import { send, method } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';
import { listPaths, getJson } from '../../lib/store.js';
import { audit } from '../../lib/audit.js';

export default async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  await loadConfig();
  const s = await requireAdmin(req, res);
  if (!s) return;
  try {
    const paths = (await listPaths('logs/')).reverse().slice(0, 50);
    const logs = (await Promise.all(paths.map(getJson))).filter(Boolean);
    await audit(req, 'VIEW_LOGS', { count: logs.length });
    return send(res, 200, { logs });
  } catch (e) {
    console.error('logs failed', e?.message);
    return send(res, 500, { error: 'server_error' });
  }
}
