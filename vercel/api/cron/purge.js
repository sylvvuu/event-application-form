// 매일 실행 (CRON_SECRET 환경변수가 있을 때). 없으면 관리자 목록 조회 시 하루 1번 자동 실행됨.
import crypto from 'node:crypto';
import { send } from '../../lib/http.js';
import { loadConfig } from '../../lib/config.js';
import { purgeOld } from '../../lib/purge.js';

export default async function handler(req, res) {
  const want = `Bearer ${process.env.CRON_SECRET || ''}`;
  const got = String(req.headers.authorization || '');
  if (!process.env.CRON_SECRET || got.length !== want.length ||
      !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return send(res, 401, { error: 'unauthorized' });
  }
  await loadConfig();
  const n = await purgeOld();
  return send(res, 200, { ok: true, purgedApplications: n });
}
