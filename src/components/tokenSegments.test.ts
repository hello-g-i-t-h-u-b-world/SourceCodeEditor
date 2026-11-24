import { describe, expect, it } from 'vitest'
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
