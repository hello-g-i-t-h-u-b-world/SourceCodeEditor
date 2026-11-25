import { describe, expect, it } from 'vitest'
import { MESSAGES, SyntaxChecker, positionOf } from './SyntaxChecker'

// 괄호를 [글자, 깊이, 짝 위치] 형태로 바꿔 비교하기 쉽게 한다.
const bracketsOf = (code: string) =>
  new SyntaxChecker().check(code).brackets.map((b) => [b.char, b.depth, b.partner] as const)

const issuesOf = (code: string) => new SyntaxChecker().check(code).issues

describe('SyntaxChecker 단위 테스트 (설계서 3.5)', () => {
  it('U-07: { ( [ ] ) } 는 3쌍, 깊이 0·1·2, 오류 없음', () => {
    const report = new SyntaxChecker().check('{ ( [ ] ) }')
    expect(bracketsOf('{ ( [ ] ) }')).toEqual([
      ['{', 0, 10],
      ['(', 1, 8],
      ['[', 2, 6],
      [']', 2, 4],
      [')', 1, 2],
      ['}', 0, 0],
    ])
    expect(report.issues).toEqual([])
  })

  it('U-08: ( ] 는 둘 다 짝 없음, 오류 2개(짝이 맞지 않음, 짝 없음)', () => {
    const report = new SyntaxChecker().check('( ]')
    expect(report.brackets.map((b) => b.partner)).toEqual([null, null])
    expect(report.issues).toEqual([
      { offset: 0, line: 1, column: 1, message: "'('의 짝이 되는 ')'가 없습니다." },
      { offset: 2, line: 1, column: 3, message: "']'가 앞의 '('와 짝이 맞지 않습니다." },
    ])
  })

  it('U-09: f(a[0]) { s = "}"; } ) 는 3쌍, 1번째 줄 22열 ) 오류 1개 (3.4 설계 검증과 같은 결과)', () => {
    const code = 'f(a[0]) { s = "}"; } )'
    const report = new SyntaxChecker().check(code)

    // 설계 검증 표의 순서 1~8 가운데 6번(문자열 안의 })은 bracket이 아니라 빠진다.
    expect(report.brackets.map((b) => [b.char, b.depth, b.partner])).toEqual([
      ['(', 0, 6], // 1
      ['[', 1, 5], // 2
      [']', 1, 3], // 3
      [')', 0, 1], // 4
      ['{', 0, 19], // 5
      ['}', 0, 8], // 7
      [')', 0, null], // 8: 스택이 비어 있음 → 짝 없음
    ])
    expect(report.brackets.filter((b) => b.partner !== null)).toHaveLength(6) // 3쌍
    expect(report.issues).toEqual([
      { offset: 21, line: 1, column: 22, message: "여는 괄호 없이 ')'가 나왔습니다." },
    ])
  })

  it('U-10: 빈 문자열은 괄호 없음, 오류 없음', () => {
    const report = new SyntaxChecker().check('')
    expect(report).toEqual({ tokens: [], brackets: [], issues: [] })
  })

  it('U-11: int a; /* c 는 "주석(/*)이 닫히지 않았습니다." 오류 1개', () => {
    expect(issuesOf('int a; /* c')).toEqual([
      { offset: 7, line: 1, column: 8, message: '주석(/*)이 닫히지 않았습니다.' },
    ])
  })

  it('U-12: s = "abc 는 "문자열(")이 닫히지 않았습니다." 오류 1개', () => {
    expect(issuesOf('s = "abc')).toEqual([
      { offset: 4, line: 1, column: 5, message: '문자열(")이 닫히지 않았습니다.' },
    ])
  })
})

describe('SyntaxChecker 오류와 위치', () => {
  it('대체 시나리오 3: 함수 안 3번째 줄 if (a[0] > 0 { … } 는 3번째 줄 4열 ( 오류 하나뿐이다', () => {
    const code = 'int main(void) {\n\tint a[1] = {0};\nif (a[0] > 0 { a[0] = 1; }\n}'
    const report = new SyntaxChecker().check(code)
    expect(report.issues).toEqual([
      { offset: 37, line: 3, column: 4, message: "'('의 짝이 되는 ')'가 없습니다." },
    ])
    // 바깥 함수의 { }는 짝이 맞는다
    const outer = report.brackets.find((b) => b.offset === 15)!
    expect(outer.partner).toBe(code.length - 1)
  })

  it('같은 종류의 여는 괄호가 스택 안쪽에 있으면 그 위의 여는 괄호만 짝 없음이다', () => {
    const report = new SyntaxChecker().check('{ ( [ }')
    expect(report.issues.map((i) => [i.offset, i.message])).toEqual([
      [2, "'('의 짝이 되는 ')'가 없습니다."],
      [4, "'['의 짝이 되는 ']'가 없습니다."],
    ])
    expect(report.brackets.map((b) => b.partner)).toEqual([6, null, null, 0])
  })

  it('스택 어디에도 같은 종류가 없으면 닫는 괄호만 짝이 맞지 않음이고 스택은 그대로다', () => {
    const report = new SyntaxChecker().check('( } )')
    expect(report.issues.map((i) => i.message)).toEqual(["'}'가 앞의 '('와 짝이 맞지 않습니다."])
    expect(report.brackets.map((b) => b.partner)).toEqual([4, null, 0])
  })

  it('닫히지 않은 문자는 문자 문구를 쓴다', () => {
    expect(issuesOf("c = 'a")[0].message).toBe(MESSAGES.unclosedChar)
  })

  it('줄 끝에서 끝난 문자열 뒤의 다음 줄은 다시 검사한다', () => {
    const report = new SyntaxChecker().check('s = "a(\n(x)')
    expect(report.issues.map((i) => i.message)).toEqual(['문자열(")이 닫히지 않았습니다.'])
    expect(report.brackets.map((b) => [b.char, b.partner])).toEqual([
      ['(', 10],
      [')', 8],
    ])
  })

  it('닫히지 않은 주석 안의 괄호는 검사하지 않는다', () => {
    expect(issuesOf('f( /* ) ')).toEqual([
      { offset: 0 + 1, line: 1, column: 2, message: "'('의 짝이 되는 ')'가 없습니다." },
      { offset: 3, line: 1, column: 4, message: '주석(/*)이 닫히지 않았습니다.' },
    ])
  })

  it('오류는 위치 순으로 정렬한다', () => {
    const offsets = issuesOf('} "x\n( ]\n/*').map((i) => i.offset)
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    expect(offsets).toHaveLength(5)
  })

  it('여러 줄에 걸친 오류도 줄·열을 맞게 센다', () => {
    const code = 'a\n\tb)\n\n  ]'
    expect(issuesOf(code).map((i) => [i.line, i.column])).toEqual([
      [2, 3],
      [4, 3],
    ])
  })

  it('짝이 맞은 닫는 괄호는 여는 괄호와 같은 깊이다', () => {
    expect(bracketsOf('(()())')).toEqual([
      ['(', 0, 5],
      ['(', 1, 2],
      [')', 1, 1],
      ['(', 1, 4],
      [')', 1, 3],
      [')', 0, 0],
    ])
  })
})

describe('partnerOf', () => {
  it('마지막 check() 결과에서 짝 위치를 돌려준다', () => {
    const checker = new SyntaxChecker()
    checker.check('f(a[0])')
    expect(checker.partnerOf(1)).toBe(6)
    expect(checker.partnerOf(6)).toBe(1)
    expect(checker.partnerOf(3)).toBe(5)
  })

  it('괄호가 아니거나 짝이 없으면 null', () => {
    const checker = new SyntaxChecker()
    checker.check('a ( ]')
    expect(checker.partnerOf(0)).toBeNull() // 괄호 아님
    expect(checker.partnerOf(2)).toBeNull() // 짝 없음
    expect(checker.partnerOf(4)).toBeNull()
  })

  it('다시 check()하면 이전 결과는 지운다', () => {
    const checker = new SyntaxChecker()
    checker.check('()')
    checker.check('x')
    expect(checker.partnerOf(0)).toBeNull()
  })
})

describe('positionOf', () => {
  it('offset을 1부터 센 줄·열로 바꾼다', () => {
    const code = 'ab\n\tc\n'
    expect(positionOf(code, 0)).toEqual({ line: 1, column: 1 })
    expect(positionOf(code, 2)).toEqual({ line: 1, column: 3 }) // 줄바꿈 자리
    expect(positionOf(code, 3)).toEqual({ line: 2, column: 1 })
    expect(positionOf(code, 4)).toEqual({ line: 2, column: 2 }) // 탭도 한 글자
    expect(positionOf(code, 6)).toEqual({ line: 3, column: 1 }) // 본문 끝
  })
})

describe('성능', () => {
  it('1,000줄 본문도 오류 없이 검사한다', () => {
    const line = '\tfor (int i = 0; i < n; i++) { s += "a(b"; a[i] = \'}\'; } // 주석 (\n'
    const report = new SyntaxChecker().check(line.repeat(1000))
    expect(report.issues).toEqual([])
    expect(report.brackets).toHaveLength(6000)
  })

  it('짝이 안 맞는 괄호가 많아도 스택을 반복해서 훑지 않는다', () => {
    const n = 50_000
    const start = performance.now()
    const report = new SyntaxChecker().check(`{${'('.repeat(n)}}${']'.repeat(n)}`)
    expect(performance.now() - start).toBeLessThan(500)
    expect(report.issues).toHaveLength(2 * n) // ( n개 짝 없음 + ] n개 여는 괄호 없음
  })
})
