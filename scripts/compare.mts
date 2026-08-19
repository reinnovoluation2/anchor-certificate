// PLAN 17번 — 미리보기와 PDF가 직인 자리 말고 정말 같은지 글자 단위로 비교한다.
import * as Cert from '@/lib/certificate';
/* eslint-disable @typescript-eslint/no-explicit-any */
const C: any = (Cert as any).default ?? Cert;

const 줄 = {
  해당연도: '2026', 단위과제번호: '01', 프로그램번호: '01',
  프로그램명: '글로벌 산학협력 인턴십',
  프로그램_영문명: 'Global Industry-Academia Cooperation Internship',
  학번: '2021320014', 국문_이름: '김서준', 영문_이름: 'KIM SEOJUN',
  이메일: 'seojun.kim@korea.ac.kr',
};

let 실패 = 0;
const 확인 = (t: string, c: boolean, d = '') => { if (!c) 실패++; console.log(`${c ? 'O' : 'X'}  ${t}${d ? ' — ' + d : ''}`); };

for (const 언어 of ['ko', 'en'] as const) {
  const 미리보기 = await C.수료증_HTML(줄, 언어, '자리만');
  const PDF = await C.수료증_HTML(줄, 언어, '실제');

  // 직인 부분만 빼고 비교한다
  const 벗기기 = (s: string) =>
    s.replace(/<img class="직인"[^>]*>/g, '§직인§')
     .replace(/<span class="직인자리"><\/span>/g, '§직인§')
     .replace(/<div class="직인안내">[\s\S]*?<\/div>/g, '');

  const a = 벗기기(미리보기);
  const b = 벗기기(PDF);

  확인(`${언어} — 직인 자리 말고 완전히 같다`, a === b,
    a === b ? '' : `길이 ${a.length} vs ${b.length}`);

  // 직인 자리와 실제 직인의 크기가 같은지 (배치가 밀리지 않게)
  const 크기 = 미리보기.match(/\.직인자리, \.직인 \{[\s\S]*?width: (\d+mm);[\s\S]*?height: (\d+mm);/);
  확인(`${언어} — 직인 자리와 실제 직인의 크기가 같게 정의됨`, Boolean(크기),
    크기 ? `${크기[1]} × ${크기[2]}` : '못 찾음');

  확인(`${언어} — 미리보기에는 실제 직인이 없다`, !미리보기.includes('class="직인"'));
}

console.log('');
console.log(실패 === 0 ? '미리보기와 PDF가 같다' : `${실패}건 실패`);
process.exit(실패 === 0 ? 0 : 1);
