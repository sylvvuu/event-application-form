// 저장소: Vercel Blob(비공개). 로컬 개발 시 LOCAL_STORE_DIR 폴더 사용.
import fs from 'node:fs/promises';
import path from 'node:path';

const LOCAL = process.env.LOCAL_STORE_DIR && !process.env.VERCEL ? process.env.LOCAL_STORE_DIR : null;
let blob = null;
async function sdk() {
  if (!blob) blob = await import('@vercel/blob');
  return blob;
}

// once=true 이면 이미 있는 파일은 덮어쓰지 않고 실패 (최초 1회만 쓰기)
export async function putJson(pathname, obj, { once = false } = {}) {
  const body = JSON.stringify(obj);
  if (LOCAL) {
    const p = path.join(LOCAL, pathname);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body, once ? { flag: 'wx' } : undefined);
    return;
  }
  const { put } = await sdk();
  await put(pathname, body, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: !once,
    contentType: 'application/json'
  });
}

export async function getJson(pathname) {
  if (LOCAL) {
    try { return JSON.parse(await fs.readFile(path.join(LOCAL, pathname), 'utf8')); }
    catch { return null; }
  }
  const { get } = await sdk();
  const r = await get(pathname, { access: 'private' });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

// prefix 아래의 pathname 목록 (전체 페이지 순회)
export async function listPaths(prefix) {
  if (LOCAL) {
    const out = [];
    async function walk(dir) {
      let ents = [];
      try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else out.push(path.relative(LOCAL, full).split(path.sep).join('/'));
      }
    }
    await walk(LOCAL);
    return out.filter(p => p.startsWith(prefix)).sort();
  }
  const { list } = await sdk();
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    r.blobs.forEach(b => out.push(b.pathname));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out.sort();
}

export async function delPaths(paths) {
  if (!paths.length) return;
  if (LOCAL) {
    await Promise.all(paths.map(p => fs.rm(path.join(LOCAL, p), { force: true })));
    return;
  }
  const { del } = await sdk();
  for (let i = 0; i < paths.length; i += 500) await del(paths.slice(i, i + 500));
}

// 경로에 넣는 시각 표기 (정렬 가능, 파일명 안전)
export function stamp(ms = Date.now()) {
  return String(ms).padStart(14, '0');
}
export function stampOf(pathname) {
  const m = pathname.match(/(\d{14})/);
  return m ? Number(m[1]) : 0;
}
