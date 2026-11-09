import { loadConfig } from '../../lib/config.js';
// /api/admin/application?id=...
//   GET    : 1건 원본 조회 (수정 화면용, 원본 열람은 접속기록에 남김)
//   PUT    : 수정 (U)
//   DELETE : 삭제 (D)
import { send, readJson, sameOrigin } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';
import { getApplication, updateApplication, deleteApplication } from '../../lib/repo.js';
import { validateApplication } from '../../lib/validate.js';
import { audit } from '../../lib/audit.js';

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, PUT, DELETE'); return send(res, 405, { error: 'method_not_allowed' }); }
  if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'bad_origin' });
  await loadConfig();
  const s = await requireAdmin(req, res);
  if (!s) return;
  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  try {
    if (req.method === 'GET') {
      const r = await getApplication(id);
      if (!r) return send(res, 404, { error: 'not_found' });
      await audit(req, 'VIEW_DETAIL', { id, fields: 'original' });
      return send(res, 200, {
        id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt,
        name: r.name, org: r.org || '', email: r.email, phone: r.phone, message: r.message || ''
      });
    }

    if (req.method === 'PUT') {
      const { data, errors, ok } = validateApplication({ ...(await readJson(req)), agree: true });
      if (!ok) return send(res, 400, { error: 'invalid', fields: Object.keys(errors) });
      const r = await updateApplication(id, data);
      if (!r) return send(res, 404, { error: 'not_found' });
      await audit(req, 'UPDATE', { id });
      return send(res, 200, { ok: true, ...r });
    }

    const done = await deleteApplication(id);
    if (!done) return send(res, 404, { error: 'not_found' });
    await audit(req, 'DELETE', { id });
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('application failed', e?.message);
    return send(res, e?.status || 500, { error: 'server_error' });
  }
}
