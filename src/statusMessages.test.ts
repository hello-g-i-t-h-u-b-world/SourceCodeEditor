import { describe, expect, it } from 'vitest'
import { autoSavedStatus, syntaxStatus } from './statusMessages'
import type { SyntaxReport } from './types'

const report = (issues: SyntaxReport['issues']): SyntaxReport => ({ tokens: [], brackets: [], issues })

describe('상태 표시줄 문구', () => {
  it('C 파일이 아니면 "문법 검사 안 함", 열린 파일이 없으면 빈 문자열', () => {
    expect(syntaxStatus(null, true)).toBe('문법 검사 안 함')
    expect(syntaxStatus(null, false)).toBe('')
  })

  it('오류가 없으면 "문법 검사: 오류 없음"', () => {
    expect(syntaxStatus(report([]), true)).toBe('문법 검사: 오류 없음')
  })

  it('첫 오류를 "N번째 줄 M열: 메시지"로 보여 주고, 2개 이상이면 개수를 덧붙인다', () => {
    const first = { offset: 3, line: 3, column: 4, message: "'('의 짝이 되는 ')'가 없습니다." }
    expect(syntaxStatus(report([first]), true)).toBe("3번째 줄 4열: '('의 짝이 되는 ')'가 없습니다.")
    const second = { offset: 9, line: 9, column: 1, message: '주석(/*)이 닫히지 않았습니다.' }
    expect(syntaxStatus(report([first, second]), true)).toBe(
      "3번째 줄 4열: '('의 짝이 되는 ')'가 없습니다. (오류 2개)",
    )
  })

  it('자동 저장 시각은 "자동 저장됨 오후 3:15:30" 형식', () => {
    expect(autoSavedStatus(new Date(2026, 10, 26, 15, 15, 30))).toBe('자동 저장됨 오후 3:15:30')
  })
})
