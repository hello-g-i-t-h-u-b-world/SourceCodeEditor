import { describe, expect, it } from 'vitest'
import type { Token, TokenType } from '../types'
import { Tokenizer } from './Tokenizer'

const tokenizer = new Tokenizer()

// 토큰을 [종류, 글자, unclosed] 형태로 바꿔 비교하기 쉽게 한다. 공백 토큰은 뺀다.
const view = (code: string) =>
  tokenizer
    .tokenize(code)
    .filter((t) => t.type !== 'space')
    .map((t) => [t.type, code.slice(t.start, t.end), t.unclosed] as const)

const ofType = (code: string, type: TokenType) =>
  tokenizer.tokenize(code).filter((t) => t.type === type)

// 토큰을 순서대로 이어 붙이면 원문과 같아야 한다(빈틈·겹침 없음).
const expectCoversAll = (code: string, tokens: Token[]) => {
  let pos = 0
  for (const t of tokens) {
    expect(t.start).toBe(pos)
    expect(t.end).toBeGreaterThan(t.start)
    pos = t.end
  }
  expect(pos).toBe(code.length)
  expect(tokens.map((t) => code.slice(t.start, t.end)).join('')).toBe(code)
}

describe('Tokenizer 단위 테스트 (설계서 3.5)', () => {
  it('U-01: 한 줄 주석 안의 괄호는 bracket 토큰이 되지 않는다', () => {
    const code = 'int a; // (x'
    const comments = ofType(code, 'comment')
    expect(comments).toHaveLength(1)
    expect(code.slice(comments[0].start, comments[0].end)).toBe('// (x')
    expect(ofType(code, 'bracket')).toHaveLength(0)
  })

  it('U-02: 닫히지 않은 /* 주석은 파일 끝까지이고 unclosed이다', () => {
    const code = '/* a */ b /* c'
    const comments = ofType(code, 'comment')
    expect(comments).toHaveLength(2)
    expect(comments[0]).toMatchObject({ start: 0, end: 7, unclosed: false })
    expect(comments[1]).toMatchObject({ start: 10, end: code.length, unclosed: true })
  })

  it('U-03: 역슬래시 뒤의 따옴표에서는 문자열이 끝나지 않는다', () => {
    const code = 's = "a\\"b(";'
    const strings = ofType(code, 'string')
    expect(strings).toHaveLength(1)
    expect(code.slice(strings[0].start, strings[0].end)).toBe('"a\\"b("')
    expect(strings[0].unclosed).toBe(false)
    expect(ofType(code, 'bracket')).toHaveLength(0)
  })

  it("U-04: 문자 '(' 안의 괄호는 bracket 토큰이 되지 않는다", () => {
    const code = "c = '(';"
    const chars = ofType(code, 'char')
    expect(chars).toHaveLength(1)
    expect(code.slice(chars[0].start, chars[0].end)).toBe("'('")
    expect(ofType(code, 'bracket')).toHaveLength(0)
  })

  it('U-05: 줄 끝까지 닫히지 않은 문자열은 줄 끝에서 끝나고, 다음 줄은 따로 토큰이 된다', () => {
    const code = '"abc\nx'
    expect(view(code)).toEqual([
      ['string', '"abc', true],
      ['symbol', 'x', false],
    ])
  })
})

describe('Tokenizer 1단계 규칙', () => {
  it('괄호 6종은 한 글자씩 bracket 토큰이 된다', () => {
    expect(view('({[]})').map(([type, text]) => `${type}:${text}`)).toEqual([
      'bracket:(',
      'bracket:{',
      'bracket:[',
      'bracket:]',
      'bracket:}',
      'bracket:)',
    ])
  })

  it('이어진 공백, 탭, 줄바꿈은 space 토큰 하나로 묶는다', () => {
    const tokens = tokenizer.tokenize('a \t\n  b')
    expect(tokens.map((t) => t.type)).toEqual(['symbol', 'space', 'symbol'])
    expect(tokens[1]).toMatchObject({ start: 1, end: 6 })
  })

  it('1단계에서는 영문자, 숫자, 기호, 한글을 한 글자씩 symbol로 둔다', () => {
    expect(view('x=10;합').map(([type, text]) => `${type}:${text}`)).toEqual([
      'symbol:x',
      'symbol:=',
      'symbol:1',
      'symbol:0',
      'symbol:;',
      'symbol:합',
    ])
  })

  it('한 줄 주석은 줄바꿈을 포함하지 않는다', () => {
    const code = '// a\nb'
    expect(view(code)).toEqual([
      ['comment', '// a', false],
      ['symbol', 'b', false],
    ])
  })

  it('여러 줄 주석은 줄이 바뀌어도 */ 까지 하나의 토큰이다', () => {
    const code = '/* a\n ( b */)'
    expect(view(code)).toEqual([
      ['comment', '/* a\n ( b */', false],
      ['bracket', ')', false],
    ])
  })

  it('/*/ 는 주석이 닫힌 것이 아니다', () => {
    expect(view('/*/ x')).toEqual([['comment', '/*/ x', true]])
  })

  it('문자열 안의 주석 기호는 주석이 아니다', () => {
    expect(view('"// /* x"')).toEqual([['string', '"// /* x"', false]])
  })

  it('주석 안의 따옴표는 문자열을 시작하지 않는다', () => {
    expect(view('/* " */ "a"')).toEqual([
      ['comment', '/* " */', false],
      ['string', '"a"', false],
    ])
  })

  it("문자 '\\'' 처럼 역슬래시로 감싼 따옴표도 처리한다", () => {
    expect(view("'\\''")).toEqual([['char', "'\\''", false]])
  })

  it('역슬래시 두 개 뒤의 따옴표에서는 문자열이 끝난다', () => {
    expect(view('"a\\\\" x')).toEqual([
      ['string', '"a\\\\"', false],
      ['symbol', 'x', false],
    ])
  })

  it('줄 끝의 역슬래시는 문자열을 다음 줄로 잇는다', () => {
    expect(view('"a\\\nb"')).toEqual([['string', '"a\\\nb"', false]])
  })

  it('본문 끝이 역슬래시여도 범위 밖을 읽지 않는다', () => {
    const code = '"abc\\'
    const tokens = tokenizer.tokenize(code)
    expect(tokens).toEqual([{ type: 'string', start: 0, end: code.length, unclosed: true }])
  })

  it('따옴표 하나만 있으면 본문 끝까지 unclosed 문자열이다', () => {
    expect(view('"')).toEqual([['string', '"', true]])
  })

  it('이모지처럼 두 칸짜리 글자는 쪼개지 않는다', () => {
    expect(view('😀')).toEqual([['symbol', '😀', false]])
  })

  it('빈 본문은 토큰이 없다', () => {
    expect(tokenizer.tokenize('')).toEqual([])
  })
})

describe('토큰을 이어 붙이면 원문과 같다', () => {
  const samples = [
    '',
    'int a; // (x',
    '/* a */ b /* c',
    's = "a\\"b(";',
    "c = '(';",
    '"abc\nx',
    '#include <stdio.h>\n\n/* 프로그램 시작 */\nint main(void) {\n\tprintf("Hello, World!\\n");\n\treturn 0;\n}\n',
    'f(a[0]) { s = "}"; } )',
    '\t합계 += i;\t\t/* 탭 */\r\n',
    '"abc\\',
    '😀 "😀" // 😀',
  ]

  it.each(samples)('%j', (code) => {
    expectCoversAll(code, tokenizer.tokenize(code))
  })

  it('1,000줄 본문도 빈틈없이 나눈다', () => {
    const line = '\tfor (int i = 0; i < n; i++) { s += "a(b"; } // 주석 (\n'
    const code = line.repeat(1000)
    const tokens = tokenizer.tokenize(code)
    expectCoversAll(code, tokens)
    expect(tokens.filter((t) => t.type === 'comment')).toHaveLength(1000)
  })
})
