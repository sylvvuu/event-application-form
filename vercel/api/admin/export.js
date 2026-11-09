// /api/admin/export : 신청서 전체 CSV 다운로드 (원본 데이터, 다운로드 기록 남김)
// 화면(목록)과 달리 업무 처리에 필요한 원본 연락처·동의 일시·ID까지 포함
import { loadConfig } from '../../lib/config.js';
import { send, method } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';
import { listApplications } from '../../lib/repo.js';
import { audit } from '../../lib/audit.js';

const COLUMNS = [
  ['id', '신청번호'], ['createdAt', '접수일시'], ['name', '이름'], ['phone', '휴대폰'], ['email', '이메일'],
  ['org', '소속'], ['message', '질문·요청'], ['agreedAt', '개인정보 동의일시'], ['createdBy', '등록경로'], ['updatedAt', '최종수정일시']
];

const kst = iso => iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }) : '';
function cell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 엑셀 수식 실행(CSV 인젝션) 방지
  return '"' + s.replace(/"/g, '""') + '"';
}

export default async function handler(req, res) {
  if (!method(req, res, 'GET')) return;
  await loadConfig();
  const s = await requireAdmin(req, res);
  if (!s) return;
  try {
    const { rows } = await listApplications(10000);
    const lines = [COLUMNS.map(c => cell(c[1])).join(',')];
    rows.forEach(r => {
      const v = { ...r, createdAt: kst(r.createdAt), agreedAt: kst(r.agreedAt), updatedAt: kst(r.updatedAt),
        createdBy: r.createdBy === 'admin' ? '관리자 등록' : '신청서 제출' };
      lines.push(COLUMNS.map(c => cell(v[c[0]])).join(','));
    });
    await audit(req, 'EXPORT_CSV', { count: rows.length });
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${day}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end('﻿' + lines.join('\r\n')); // BOM: 엑셀에서 한글 깨짐 방지
  } catch (e) {
    console.error('export failed', e?.message);
    return send(res, 500, { error: 'server_error' });
  }
}
