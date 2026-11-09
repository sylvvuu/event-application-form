# 이벤트 신청서 (Event Application Form)

같은 **이벤트 신청서**를 세 가지 도구(Google AI Studio · Google Apps Script · Vercel)로 각각 만들어 보고, 만드는 방식·저장소·운영 방법을 비교한 프로젝트입니다.

> AI 프로덕트 매니저 과정 2주차 DAY 5 (2026-11-06)

## 🔗 바로가기

| 버전 | 도구 | 데이터 저장 | 배포 주소 | 코드 |
|---|---|---|---|---|
| AI 스튜디오 신청서 | Google AI Studio | Firestore | [열기](https://formai-automator.ai.studio/) | [`src/`](src/) |
| 앱스스크립트 신청서 | Google Apps Script | 구글 시트 | [열기](https://script.google.com/macros/s/AKfycby5RvMl5sFLrRwj95uHMDf4Xw13fSfIBjQW5t7OO6EN3xUg4TuldoArBkIoY9Dgr8Qt/exec) | [`apps-script/form/`](apps-script/form/) |
| 앱스스크립트 신청자 현황 | Google Apps Script | 구글 시트 (읽기) | 관리자 전용 | [`apps-script/admin/`](apps-script/admin/) |
| Vercel 신청서 | Claude + Vercel | Vercel Blob | [열기](https://application-form-five-omega.vercel.app) | [sylvvuu/application-form](https://github.com/sylvvuu/application-form) |

## 📁 폴더 구조

```
AI-studio/
├── src/                 AI 스튜디오 신청서 (React + TypeScript + Firebase)
│   ├── components/      신청서 화면, 관리자 대시보드
│   ├── pages/           관리자 페이지
│   ├── services/        Firestore 저장·조회
│   └── utils/           입력 검증, 구글 시트 연동, 관리자 인증
├── apps-script/
│   ├── form/            신청서 입력 화면 (Code.gs, form.html)
│   └── admin/           신청자 현황 화면 (Code.gs, index.html)
├── docs/
│   └── 사용자입력_기획안.csv   입력 필드별 규칙·예외·피드백 문구·테스트 현황
├── public/              이미지
└── index.html           AI 스튜디오 앱 진입 파일
```

## ✨ 주요 기능 (AI 스튜디오 버전)

**신청서 (참가자용)**
- 이름 실시간 검증 (한글/영문 2~20자)
- 이메일 오타(`gmail.con`, `naver.con` 등) 자동 교정 제안
- 휴대폰 번호 자동 하이픈 (010-0000-0000)
- 질문/요청 500자 카운터, 개인정보 수집·이용 동의
- 오류 요약 표시 + 클릭 시 해당 칸으로 이동

**데이터 저장**
- 제출 즉시 Firestore에 저장, 관리자 화면에 새로고침 없이 반영 (`onSnapshot`)
- Apps Script 웹 앱 연동 시 구글 시트에 한 줄씩 자동 누적

**관리자 대시보드**
- 비밀번호 보호
- 신청자 검색, 상태 변경 (접수완료 / 확인중 / 참석확정 / 취소됨), 삭제
- CSV 다운로드 (UTF-8 BOM, 엑셀 한글 깨짐 없음)

## ⚖️ 도구별 비교

| 기준 | AI 스튜디오 | 앱스스크립트 | Vercel |
|---|---|---|---|
| 만드는 방법 | 자연어로 요청 | 코드 붙여넣기 | 코드 작성 후 배포 |
| 데이터 저장 | Firestore | 구글 시트 | Vercel Blob |
| 데이터 확인 | Firebase 콘솔 | 시트에서 바로 | 관리자 페이지 |
| 배포 | Publish 버튼 | 배포 → 웹 앱 | Git 연동 자동 배포 |

## 🛠 실행 방법

### AI 스튜디오 버전 (로컬)

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드 (dist/)
```

배포는 Google AI Studio 우측 상단 **Publish** (Cloud Run).

### 앱스스크립트 버전

| 폴더 | 파일 | Apps Script에 넣는 법 |
|---|---|---|
| `apps-script/form/` | `Code.gs`, `form.html` | Code.gs 붙여넣기 + HTML 파일 `form` 추가 |
| `apps-script/admin/` | `Code.gs`, `index.html` | Code.gs 붙여넣기 + HTML 파일 `index` 추가 |

- HTML 파일 이름은 코드 속 `'form'` / `'index'`와 **대소문자까지 같아야** 합니다.
- 코드 수정 후 **배포 → 배포 관리 → ✏️ → 새 버전 → 배포** 해야 주소에 반영됩니다.
- 신청자 현황 화면은 이름·휴대폰·이메일을 마스킹해서 보여 주고, 검색은 서버에서 원본 값으로 합니다 (2글자 이상).

## 📄 기획 문서

- [`docs/사용자입력_기획안.csv`](docs/사용자입력_기획안.csv) — 원본: [사용자입력_기획안 (구글 시트)](https://docs.google.com/spreadsheets/d/1XDapnSBWFQEHEo3dHSQuDWgl76j3nNqmJ8JVpagLODo/edit)
