// 마스킹은 서버에서만 처리 (원본은 브라우저로 보내지 않음)
export function maskName(name) {
  const chars = [...String(name || '')];
  if (chars.length <= 1) return chars.join('') + '*';
  return chars[0] + '*'.repeat(chars.length - 1);
}

export function maskPhone(phone) {
  const m = String(phone || '').match(/^(\d{3})-?\d{3,4}-?(\d{4})$/);
  return m ? `${m[1]}-****-${m[2]}` : '***-****-****';
}

export function maskEmail(email) {
  const [id, domain] = String(email || '').split('@');
  if (!domain) return '***';
  return id.slice(0, 2) + '***@' + domain;
}
