// 보관기간이 지난 데이터 파기 (매일 크론 + 관리자 목록 조회 시 하루 1번 자동 실행)
import { listPaths, delPaths, stampOf, putJson, getJson, stamp } from './store.js';
import { randomId } from './security.js';

const DAY = 24 * 60 * 60 * 1000;

export async function purgeOld() {
  const now = Date.now();
  const retentionDays = Number(process.env.RETENTION_DAYS || 90);
  const old = async (prefix, ms) => (await listPaths(prefix)).filter(p => now - stampOf(p) > ms);

  const apps = await old('applications/', retentionDays * DAY);
  const logs = await old('logs/', 730 * DAY); // 접속기록 2년 보관
  const fails = await old('auth/fail/', DAY);
  const rl = await old('rl/', DAY);
  const revoked = await old('auth/revoked/', DAY);
  await delPaths([...apps, ...logs, ...fails, ...rl, ...revoked]);

  await putJson('system/last-purge.json', { at: now });
  await putJson(`logs/${stamp(now)}-${randomId(6)}.json`, {
    at: new Date(now).toISOString(), actor: 'system', action: 'PURGE',
    ip: '-', ua: 'auto', detail: { applications: apps.length, retentionDays }
  });
  return apps.length;
}

export async function maybePurge() {
  try {
    const last = await getJson('system/last-purge.json');
    if (!last || Date.now() - last.at > DAY) await purgeOld();
  } catch (e) {
    console.error('purge failed', e?.message);
  }
}
