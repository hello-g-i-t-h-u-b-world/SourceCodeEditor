import type { SyntaxReport } from './types'

// 상태 표시줄의 문법 검사 문구(설계서 2.4 출력 "상태 표시줄")
// - C 파일이 아니면 "문법 검사 안 함"
// - 오류가 없으면 "문법 검사: 오류 없음"
// - 있으면 첫 오류를 "N번째 줄 M열: 메시지"로, 2개 이상이면 "(오류 k개)"를 덧붙인다
export function syntaxStatus(report: SyntaxReport | null, hasFile: boolean): string {
  if (!hasFile) return ''
  if (report === null) return '문법 검사 안 함'
  const [first] = report.issues
  if (!first) return '문법 검사: 오류 없음'
  const count = report.issues.length
  return `${first.line}번째 줄 ${first.column}열: ${first.message}${count >= 2 ? ` (오류 ${count}개)` : ''}`
}

// "오후 3:15:30". 브라우저·Node마다 toLocaleTimeString 결과가 달라 직접 만든다.
export function koreanTime(at: Date): string {
  const h = at.getHours()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}

// "자동 저장됨 오후 3:15:30"
export function autoSavedStatus(at: Date): string {
  return `자동 저장됨 ${koreanTime(at)}`
}
