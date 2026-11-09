// =====================================================================
// [프로젝트 2] 신청서 입력 화면 → TEST 시트에 저장
//  - doGet   : 신청서 입력 화면(form)을 보여줌
//  - saveData: [제출]을 누르면 TEST 시트에 한 줄 추가 (CRUD의 C)
// =====================================================================

// 저장할 시트: TEST 시트 ID (주소창 /d/ 와 /edit 사이 값)
// → 프로젝트 1(관리 화면)과 같은 시트라서, 제출하면 관리 화면에 바로 보임
var SHEET_ID = '1Y_5jYJRDrrYti2ok8GGXZhQUQJpjYx-1ZIOkzW3DGG4';
var FORM_FILE = 'form'; // 왼쪽 파일 목록의 HTML 파일 이름 (대소문자 정확히, .html 제외)

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile(FORM_FILE)
    .setTitle('이벤트 신청서')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 화면에서 검사했더라도 서버에서 한 번 더 검사함 (화면 검사는 우회 가능)
function saveData(form) {
  form = form || {};
  if (form.website) return { ok: true, id: '-', submittedAt: '' }; // 봇이 채우는 숨은 칸

  var name = String(form.name || '').trim().replace(/ {2,}/g, ' ');
  var org = String(form.org || '').trim();
  var email = String(form.email || '').trim();
  var phone = String(form.phone || '').trim();
  var message = String(form.message || '').trim();

  var errors = [];
  if (!/^[가-힣a-zA-Z]+( [가-힣a-zA-Z]+)*$/.test(name) || name.length < 2 || name.length > 20) errors.push('이름');
  if (org.length > 50) errors.push('소속');
  if (email.length > 100 || !/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(email)) errors.push('이메일');
  if (!/^01[016789]-\d{3,4}-\d{4}$/.test(phone)) errors.push('휴대폰');
  if (message.length > 500) errors.push('질문');
  if (form.agree !== true) errors.push('개인정보 동의');
  if (errors.length) return { ok: false, error: errors.join(', ') + ' 항목을 확인해 주세요.' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // 여러 명이 동시에 제출해도 줄이 겹치지 않게
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    if (sheet.getLastRow() === 0) {
      var headers = ["접수일시", "접수번호", "이름", "소속", "이메일", "휴대폰 번호", "진행상태", "질문 및 요청사항"];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#3b7ddd").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
    }
    var now = new Date();
    var submittedAt = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    var id = 'app-' + now.getTime();
    // 숫자처럼 보이는 값이 수식/숫자로 바뀌지 않게 앞에 ' 를 붙여 글자로 저장
    sheet.appendRow([submittedAt, id, name, org || '(미입력)', email, "'" + phone, '접수완료', message]);
    return { ok: true, id: id, submittedAt: submittedAt };
  } finally {
    lock.releaseLock();
  }
}
