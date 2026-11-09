// 서버 설정 불러오기
// - Vercel 환경변수가 있으면 그 값을 우선 사용
// - 없으면 비공개 저장소의 system/keys.json 을 사용 (처음 한 번 서버가 자동 생성)
// - 관리자 비밀번호 해시는 system/admin.json (관리자가 최초 설정 화면에서 직접 등록)
import crypto from 'node:crypto';
import { getJson, putJson } from './store.js';

let loaded = false;

export async function loadConfig() {
  if (loaded && process.env.ADMIN_PASSWORD_HASH) return;
  const fromEnv = ['SESSION_SECRET', 'DATA_ENC_KEY'].every(k => process.env[k]);
  if (!fromEnv) {
    let keys = await getJson('system/keys.json');
    if (!keys) {
      const fresh = {
        SESSION_SECRET: crypto.randomBytes(32).toString('base64url'),
        DATA_ENC_KEY: crypto.randomBytes(32).toString('base64'),
        createdAt: new Date().toISOString()
      };
      try { await putJson('system/keys.json', fresh, { once: true }); } catch {}
      keys = await getJson('system/keys.json'); // 동시에 만들어졌을 수 있으니 저장된 값을 다시 읽음
    }
    if (!keys) throw new Error('keys unavailable');
    process.env.SESSION_SECRET ||= keys.SESSION_SECRET;
    process.env.DATA_ENC_KEY ||= keys.DATA_ENC_KEY;
  }
  if (!process.env.ADMIN_PASSWORD_HASH) {
    const admin = await getJson('system/admin.json');
    if (admin?.hash) process.env.ADMIN_PASSWORD_HASH = admin.hash;
  }
  loaded = true;
}

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD_HASH;
}
