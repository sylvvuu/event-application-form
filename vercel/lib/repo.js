// 신청서 저장소 (CRUD). 레코드 1건 = applications/<생성시각>-<id>.json (본문은 AES 암호화)
import { putJson, getJson, listPaths, delPaths, stamp } from './store.js';
import { encrypt, decrypt, randomId } from './security.js';

const ID_RE = /^[A-Za-z0-9_-]{12}$/;

async function pathOf(id) {
  if (!ID_RE.test(String(id || ''))) return null;
  return (await listPaths('applications/')).find(p => p.endsWith(`-${id}.json`)) || null;
}

// C: 생성
export async function createApplication(data, by = 'applicant') {
  const now = Date.now();
  const id = randomId(9);
  const record = { ...data, agree: true, agreedAt: new Date(now).toISOString() };
  const doc = { id, createdAt: new Date(now).toISOString(), updatedAt: null, createdBy: by, enc: encrypt(record) };
  await putJson(`applications/${stamp(now)}-${id}.json`, doc);
  return { id, createdAt: doc.createdAt };
}

// R: 목록 (최신순, 복호화된 원본 반환 → 호출하는 쪽에서 마스킹)
export async function listApplications(limit = 500) {
  const paths = (await listPaths('applications/')).reverse().slice(0, limit);
  const docs = (await Promise.all(paths.map(getJson))).filter(Boolean);
  let unreadable = 0;
  const rows = docs.map(doc => {
    try { return { ...meta(doc), ...decrypt(doc.enc) }; } catch { unreadable++; return null; }
  }).filter(Boolean);
  return { rows, unreadable };
}

// R: 1건
export async function getApplication(id) {
  const p = await pathOf(id);
  if (!p) return null;
  const doc = await getJson(p);
  return doc ? { ...meta(doc), ...decrypt(doc.enc) } : null;
}

// U: 수정 (생성 시각·동의 기록 유지)
export async function updateApplication(id, data) {
  const p = await pathOf(id);
  if (!p) return null;
  const doc = await getJson(p);
  if (!doc) return null;
  const old = decrypt(doc.enc);
  const record = { ...old, ...data };
  doc.updatedAt = new Date().toISOString();
  doc.enc = encrypt(record);
  await putJson(p, doc);
  return meta(doc);
}

// D: 삭제 (즉시 파기)
export async function deleteApplication(id) {
  const p = await pathOf(id);
  if (!p) return false;
  await delPaths([p]);
  return true;
}

function meta(doc) {
  return { id: doc.id, createdAt: doc.createdAt, updatedAt: doc.updatedAt || null, createdBy: doc.createdBy || 'applicant' };
}
