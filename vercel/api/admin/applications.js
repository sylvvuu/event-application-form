import { loadConfig } from '../../lib/config.js';
import { maybePurge } from '../../lib/purge.js';
// /api/admin/applications
//   GET  : 목록 조회 (R) — 이름·휴대폰·이메일은 서버에서 마스킹
//   POST : 관리자가 신청서 직접 등록 (C)
import { send, readJson, sameOrigin } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';
import { listApplications, createApplication } from '../../lib/repo.js';
import { validateApplication } from '../../lib/validate.js';
import { maskName, maskPhone, maskEmail } from '../../lib/mask.js';
import { audit } from '../../lib/audit.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method_not_allowed' }); }
  if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'bad_origin' });
  await loadConfig();
  const s = await requireAdmin(req, res);
  if (!s) return;
  try {
    if (req.method === 'POST') {
      const { data, errors, ok } = validateApplication(await readJson(req));
      if (!ok) return send(res, 400, { error: 'invalid', fields: Object.keys(errors) });
      const created = await createApplication(data, 'admin');
      await audit(req, 'CREATE', { id: created.id });
      return send(res, 201, { ok: true, ...created });
    }

    await maybePurge(); // 보관기간 지난 신청서 자동 파기 (하루 1번)
    const { rows, unreadable } = await listApplications();
    const masked = rows.map(r => ({
      id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, createdBy: r.createdBy,
      name: maskName(r.name), phone: maskPhone(r.phone), email: maskEmail(r.email),
      org: r.org || '', message: r.message || ''
    }));
    await audit(req, 'VIEW_LIST', { count: masked.length, fields: 'masked' });
    return send(res, 200, { rows: masked, unreadable });
  } catch (e) {
    console.error('applications failed', e?.message);
    return send(res, e?.status || 500, { error: 'server_error' });
  }
}
