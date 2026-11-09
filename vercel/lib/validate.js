// 서버 측 입력 검증 (화면 검증과 같은 규칙)
export function validateApplication(b) {
  const s = v => (typeof v === 'string' ? v.trim() : '');
  const data = {
    name: s(b.name).replace(/ {2,}/g, ' '),
    org: s(b.org),
    email: s(b.email),
    phone: s(b.phone),
    message: s(b.message)
  };
  const errors = {};
  if (data.name.length < 2 || data.name.length > 20 || !/^[가-힣a-zA-Z]+( [가-힣a-zA-Z]+)*$/.test(data.name)) errors.name = 'invalid';
  if (data.org.length > 50) errors.org = 'too_long';
  if (data.email.length > 100 || !/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(data.email)) errors.email = 'invalid';
  if (!/^01[016789]-\d{3,4}-\d{4}$/.test(data.phone)) errors.phone = 'invalid';
  if (data.message.length > 500) errors.message = 'too_long';
  if (b.agree !== true) errors.agree = 'required';
  return { data, errors, ok: Object.keys(errors).length === 0 };
}
