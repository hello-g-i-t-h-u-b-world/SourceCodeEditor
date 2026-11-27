import { describe, expect, it } from 'vitest'
import { SyntaxChecker } from '../logic/SyntaxChecker'
import { Tokenizer } from '../logic/Tokenizer'
import type { Token } from '../types'
import { segmentsOf } from './tokenSegments'

const tokenizer = new Tokenizer()
const segments = (code: string) => segmentsOf(code, tokenizer.tokenize(code))

describe('segmentsOf', () => {
  it('색이 없는 이웃 토큰은 한 조각으로 합친다', () => {
    expect(segments('int a = (b);')).toEqual([{ text: 'int a = (b);', className: null }])
  })

  it('색이 바뀌는 곳에서만 조각을 나눈다', () => {
    expect(segments('a = "s"; // c')).toEqual([
      { text: 'a = ', className: null },
      { text: '"s"', className: 'tok-string' },
      { text: '; ', className: null },
      { text: '// c', className: 'tok-comment' },
    ])
  })

  it('문자열과 문자가 이어지면 같은 색이라 한 조각이 된다', () => {
    expect(segments('"a"\'b\'')).toEqual([{ text: '"a"\'b\'', className: 'tok-string' }])
  })

  it('조각을 이어 붙이면 원문과 같다', () => {
    const code = '#include <stdio.h>\n/* 시작 */\nint main(void) {\n\tprintf("%d\\n", \'a\'); // 출력\n}\n'
    expect(
      segments(code)
        .map((s) => s.text)
        .join(''),
    ).toBe(code)
  })

  it('빈 본문은 조각이 없다', () => {
    expect(segments('')).toEqual([])
  })

  it('토큰이 본문과 어긋나면 색 없이 본문 전체를 한 조각으로 돌려준다', () => {
    const stale: Token[] = [{ type: 'comment', start: 0, end: 4, unclosed: false }]
    expect(segmentsOf('// abc', stale)).toEqual([{ text: '// abc', className: null }])
  })
})

describe('segmentsOf 괄호 (FR-15, FR-17)', () => {
  // 검사 결과까지 넣어 조각을 만든다.
  const checked = (code: string, active: number[] = []) => {
    const report = new SyntaxChecker().check(code)
    return segmentsOf(code, report.tokens, report.brackets, active)
  }

  it('짝이 있는 괄호는 깊이 % 3번째 색이고, 짝끼리 같은 색이다', () => {
    expect(checked('{([{x}])}').map((s) => [s.text, s.className])).toEqual([
      ['{', 'br-0'],
      ['(', 'br-1'],
      ['[', 'br-2'],
      ['{', 'br-0'], // 깊이 3 → 다시 첫 색
      ['x', null],
      ['}', 'br-0'],
      [']', 'br-2'],
      [')', 'br-1'],
      ['}', 'br-0'],
    ])
  })

  it('짝 없는 괄호는 br-error이다', () => {
    expect(checked('f(a]').map((s) => [s.text, s.className])).toEqual([
      ['f', null],
      ['(', 'br-error'],
      ['a', null],
      [']', 'br-error'],
    ])
  })

  it('색이 같아도 괄호는 하나씩 따로 둔다', () => {
    expect(checked(')(').map((s) => s.text)).toEqual([')', '('])
    expect(checked('()()').map((s) => s.text)).toEqual(['(', ')', '(', ')'])
  })

  it('active 위치의 짝 있는 괄호에 br-active를 더한다', () => {
    expect(checked('f(a[0])', [1, 6]).map((s) => s.className)).toEqual([
      null,
      'br-0 br-active',
      null,
      'br-1',
      null,
      'br-1',
      'br-0 br-active',
    ])
  })

  it('주석·문자열 안의 괄호는 토큰 색 그대로다', () => {
    expect(checked('s = "(" /* ) */').map((s) => [s.text, s.className])).toEqual([
      ['s = ', null],
      ['"("', 'tok-string'],
      [' ', null],
      ['/* ) */', 'tok-comment'],
    ])
  })

  it('괄호를 나눠도 조각을 이어 붙이면 원문과 같다', () => {
    const code = 'int main(void) {\n\tif (a[0] > 0 { s = "}"; }\n}\n'
    expect(
      checked(code, [15, code.length - 2])
        .map((s) => s.text)
        .join(''),
    ).toBe(code)
  })
})
