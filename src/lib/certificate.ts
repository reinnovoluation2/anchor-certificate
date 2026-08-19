// 수료증 서식. **이 파일 하나를 화면 미리보기와 PDF가 함께 쓴다.**
//
// Design Ref: DESIGN.md 3-3 — 서식을 두 벌 만들면 시간이 지나며 반드시 어긋난다.
// Plan SC: 성공 기준 6번 (직인 자리를 뺀 내용·배치가 같아야 함)

import { 수료증_글꼴_CSS } from '@/lib/fonts';
import { 그림_데이터URI, 사업단장_직인 } from '@/lib/assets';
import { 발급_관리번호, type 명단줄 } from '@/lib/roster';

export type 언어 = 'ko' | 'en';

/** 직인을 넣을지. 미리보기에는 넣지 않고 PDF에만 넣는다. */
export type 직인표시 = '자리만' | '실제';

/** 발급일자를 정한다 — PDF를 만드는 날 (서버 기준 한국시간) */
export function 오늘_발급일자(): { 년: number; 월: number; 일: number } {
  const 한국 = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  );
  return { 년: 한국.getFullYear(), 월: 한국.getMonth() + 1, 일: 한국.getDate() };
}

const 영문달 = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function 날짜글자(언어: 언어): string {
  const { 년, 월, 일 } = 오늘_발급일자();
  return 언어 === 'ko' ? `${년}년 ${월}월 ${일}일` : `${영문달[월 - 1]} ${일}, ${년}`;
}

/** HTML에 넣으면 안 되는 글자를 안전하게 바꾼다. 이름이나 프로그램명에 &, < 가 있어도 깨지지 않게. */
function 안전하게(값: string): string {
  return 값
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function 수료증_HTML(
  줄: 명단줄,
  언어: 언어,
  직인모드: 직인표시,
): Promise<string> {
  const [글꼴, 로고] = await Promise.all([
    수료증_글꼴_CSS(),
    그림_데이터URI('logo/logo-vertical.png'),
  ]);

  const 직인 = 직인모드 === '실제' ? await 사업단장_직인() : null;

  const 관리번호 = 발급_관리번호(줄);
  const 이름 = 안전하게(언어 === 'ko' ? 줄.국문_이름 : 줄.영문_이름);
  const 프로그램 = 안전하게(언어 === 'ko' ? 줄.프로그램명 : 줄.프로그램_영문명);

  const 글 =
    언어 === 'ko'
      ? {
          번호: `제 ${관리번호} 호`,
          제목: '수 료 증',
          학번라벨: '학 번',
          성명라벨: '성 명',
          본문: `위 사람은 고려대학교 ANCHOR사업단이 주최한 「${프로그램}」 과정을 성실히 이수하였으므로 이 증서를 수여합니다.`,
          명의: '고려대학교 ANCHOR사업단장',
          안내: 'PDF에 직인이 찍혀 나옵니다.',
        }
      : {
          번호: `No. ${관리번호}`,
          제목: 'CERTIFICATE OF COMPLETION',
          학번라벨: 'Student ID',
          성명라벨: 'Name',
          본문: `This is to certify that the above-named student has successfully completed the 「${프로그램}」 program organized by the ANCHOR Project Group, Korea University.`,
          명의: 'Director, ANCHOR Project Group, Korea University',
          안내: 'The official seal appears on the PDF.',
        };

  // 직인 자리 — 미리보기는 점선 상자, PDF는 실제 직인
  const 직인칸 = 직인
    ? `<img class="직인" src="${직인}" alt="">`
    : `<span class="직인자리"></span>`;

  const 직인안내 =
    직인모드 === '자리만' ? `<div class="직인안내">${글.안내}</div>` : '';

  // 제목 자간 — 국문은 넓게, 영문은 좁게 (글자 수가 달라 같은 값을 쓰면 넘친다)
  const 제목자간 = 언어 === 'ko' ? '0.4em' : '0.08em';
  const 제목크기 = 언어 === 'ko' ? '32pt' : '22pt';

  return `<!DOCTYPE html>
<html lang="${언어}">
<head>
<meta charset="UTF-8">
<title>${글.제목}</title>
<style>
${글꼴}

@page { size: A4 portrait; margin: 0; }

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Noto Serif KR', serif;
  color: #1A1A1A;
  background: #FFFFFF;
  word-break: keep-all;
}

.종이 {
  width: 210mm;
  height: 297mm;
  padding: 25mm 25mm 30mm;
  box-sizing: border-box;
  border: 1px solid #862633;
  display: flex;
  flex-direction: column;
}

.관리번호 { font-size: 10pt; color: #555; }

/* 세로형 로고를 상단 가운데에 둔다. A4 세로 문서라 좌우 대칭이 유지된다. */
.로고 { display: block; margin: 8mm auto 0; width: 30mm; height: auto; }

h1 {
  margin: 12mm 0 6mm;
  text-align: center;
  font-size: ${제목크기};
  font-weight: 700;
  letter-spacing: ${제목자간};
  /* 자간이 마지막 글자 뒤에도 붙어 왼쪽으로 치우치는 것을 되돌린다 */
  text-indent: ${제목자간};
  color: #862633;
  line-height: 1.3;
}

.구분선 { width: 20mm; margin: 0 auto 14mm; border: 0; border-top: 1px solid #862633; }

.인적사항 { font-size: 13pt; line-height: 2.2; }
.인적사항 .라벨 {
  display: inline-block;
  width: ${언어 === 'ko' ? '20mm' : '30mm'};
  color: #555;
}

.본문 { margin-top: 12mm; font-size: 13pt; line-height: 2.1; }

.날짜 { margin-top: auto; text-align: center; font-size: 13pt; }

.명의 {
  margin-top: 10mm;
  text-align: center;
  font-size: ${언어 === 'ko' ? '15pt' : '12pt'};
  font-weight: 700;
  line-height: 1.6;
}

/* 직인 자리와 실제 직인은 **크기와 위치가 같다.**
   그래야 미리보기와 PDF의 배치가 어긋나지 않는다. (성공 기준 6번)

   왼쪽 여백을 음수로 두어 명의 글자 끝에 약 40% 겹치게 한다.
   실제 직인을 찍을 때의 관례를 따른 것이다. (기획서 기능 2) */
.직인자리, .직인 {
  display: inline-block;
  width: 18mm;
  height: 18mm;
  margin-left: -5mm;
  vertical-align: middle;
  position: relative;
  top: 1mm;
}
.직인자리 { border: 1px dashed #999; }
.직인 { object-fit: contain; }

.직인안내 { margin-top: 3mm; text-align: center; font-size: 9pt; color: #888; }
</style>
</head>
<body>
  <div class="종이">
    <div class="관리번호">${글.번호}</div>

    <img class="로고" src="${로고}" alt="고려대학교 ANCHOR사업단">

    <h1>${글.제목}</h1>
    <hr class="구분선">

    <div class="인적사항">
      <div><span class="라벨">${글.학번라벨}</span>${안전하게(줄.학번)}</div>
      <div><span class="라벨">${글.성명라벨}</span>${이름}</div>
    </div>

    <p class="본문">${글.본문}</p>

    <div class="날짜">${날짜글자(언어)}</div>

    <div class="명의">${글.명의}${직인칸}</div>
    ${직인안내}
  </div>
</body>
</html>`;
}

/** 내려받을 때 붙일 파일 이름 */
export function 수료증_파일이름(줄: 명단줄, 언어: 언어): string {
  const 공백없이 = (s: string) => s.replace(/\s+/g, '');
  return 언어 === 'ko'
    ? `수료증_${공백없이(줄.프로그램명)}_${공백없이(줄.국문_이름)}_국문.pdf`
    : `Certificate_${공백없이(줄.프로그램_영문명)}_${줄.영문_이름.replace(/\s+/g, '_')}_EN.pdf`;
}
