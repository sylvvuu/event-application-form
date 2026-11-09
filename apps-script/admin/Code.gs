// =====================================================================
// [프로젝트 1] 신청서 관리 화면 (TEST 시트를 보고 검색·필터)
//  - doPost : 신청서 웹훅 (기존 코드 그대로)
//  - doGet  : 신청자 현황 화면(index)을 보여줌
//  - getData: 웹 페이지가 불러가는 데이터
//             · 화면에는 이름·연락처를 마스킹해서 보냄
//             · 검색은 서버에서 "원본" 이름·연락처로 해서, 이름으로도 찾을 수 있음
// =====================================================================

var SHEET_NAME = ''; // 비워두면 첫 번째 시트 사용. 특정 탭을 쓰려면 탭 이름 입력 (예: 'Sheet1')
var HTML_FILE = 'index'; // 신청자 현황(관리자) 화면 HTML 파일 이름 (대소문자 정확히, .html 제외)

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
}

// ---------------------------------------------------------------------
// 1) 신청서 웹훅 (기존 코드)
// ---------------------------------------------------------------------
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = getSheet_();
    var data;

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }

    if (sheet.getLastRow() === 0) {
      var headers = ["접수일시", "접수번호", "이름", "소속", "이메일", "휴대폰 번호", "진행상태", "질문 및 요청사항"];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#3b7ddd");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
    }

    sheet.appendRow([
      data.submittedAt || new Date().toLocaleString("ko-KR"),
      data.id || "",
      data.name || "",
      data.org || "(미입력)",
      data.email || "",
      data.phone || "",
      data.status || "접수완료",
      data.message || ""
    ]);

    for (var col = 1; col <= 8; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------
// 2) 웹 페이지 열기 (배포 URL로 접속하면 신청자 현황이 보임)
// ---------------------------------------------------------------------
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile(HTML_FILE)
    .setTitle('신청자 현황')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------------------------------------------------------------------
// 3) 웹 페이지가 호출하는 데이터 함수
//    query(검색어)가 있으면 서버에서 원본 값으로 찾은 뒤, 결과만 마스킹해서 보냄
//    → 화면에는 김** 로 보여도 "김민수"로 검색 가능
//    · 이름·이메일·휴대폰 원본 검색은 2글자 이상일 때만 (한 글자로 전체 명단을 추측하는 것 방지)
//    · 휴대폰은 하이픈 없이 숫자만 입력해도 찾아짐 (예: 56781017)
// ---------------------------------------------------------------------
function getData(query) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], total: 0, query: query || '', updatedAt: now_() };

  var values = sheet.getRange(2, 1, lastRow - 1, 8).getDisplayValues(); // 화면에 보이는 그대로(문자열)
  values = values.filter(function (r) { return r.join('').trim() !== ''; });
  var total = values.length;

  var q = String(query || '').trim().toLowerCase();
  if (q) {
    var qDigits = q.replace(/\D/g, '');
    var allowPrivate = q.length >= 2;
    values = values.filter(function (r) {
      // 원래부터 화면에 보이는 값: 접수번호·소속·진행상태·질문
      var open = [r[1], r[3], r[6], r[7]].join(' ').toLowerCase();
      if (open.indexOf(q) !== -1) return true;
      if (!allowPrivate) return false;
      // 화면에서는 가려지는 원본 값: 이름·이메일·휴대폰
      if (String(r[2]).toLowerCase().indexOf(q) !== -1) return true;
      if (String(r[4]).toLowerCase().indexOf(q) !== -1) return true;
      if (qDigits.length >= 4 && String(r[5]).replace(/\D/g, '').indexOf(qDigits) !== -1) return true;
      return false;
    });
  }

  var rows = values.map(function (r) {
    return {
      date: r[0],
      id: r[1],
      name: maskName_(r[2]),
      org: r[3] || '(미입력)',
      email: maskEmail_(r[4]),
      phone: maskPhone_(r[5]),
      status: r[6] || '접수완료',
      message: r[7] || ''
    };
  });
  return { rows: rows, total: total, query: query || '', updatedAt: now_() };
}

function maskName_(name) {
  var s = String(name || '').trim();
  if (!s) return '';
  return s.charAt(0) + new Array(Math.max(s.length, 2)).join('*');
}
function maskPhone_(phone) {
  var m = String(phone || '').match(/^(\d{3})-?\d{3,4}-?(\d{4})$/);
  return m ? m[1] + '-****-' + m[2] : '';
}
function maskEmail_(email) {
  var p = String(email || '').split('@');
  if (p.length !== 2) return '';
  return p[0].slice(0, 2) + '***@' + p[1];
}
function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}
