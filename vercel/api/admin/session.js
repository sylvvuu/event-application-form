import { send, method } from '../../lib/http.js';
import { readSession } from '../../lib/auth.js';
import { IDLE_MS } from '../../lib/security.js';
import { loadConfig, adminConfigured } from '../../lib/config.js';

export default async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  try {
    await loadConfig();
    if (!adminConfigured()) return send(res, 200, { authenticated: false, setupRequired: true });
    const s = readSession(req);
    return send(res, 200, { authenticated: !!s, idleTimeoutSec: IDLE_MS / 1000 });
  } catch (e) {
    console.error('session failed', e?.message);
    return send(res, 500, { error: 'server_error' });
  }
}
