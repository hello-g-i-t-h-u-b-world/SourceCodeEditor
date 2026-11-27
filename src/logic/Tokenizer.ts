import type { Token, TokenType } from '../types'

// 설계서 3.4 1) 토큰화. 본문을 앞에서부터 한 번 읽어 토큰으로 나눈다. O(n)
//
// 1단계(지금): 주석, 문자열, 문자, 괄호, 공백 규칙만 있고 나머지 글자는 한 글자씩 symbol이다.
// 2단계(12/1): keyword, identifier, number, preprocessor 규칙을 더한다. Token 형식은 그대로다.
//
// 지키는 약속: 토큰을 순서대로 이어 붙이면 원문과 같다(빈틈·겹침 없음).
// 색 표시 층은 이 약속 덕분에 토큰만 따라가며 본문 전체를 그릴 수 있다.

const BRACKETS = new Set(['(', ')', '{', '}', '[', ']'])

const isSpace = (c: string) =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v'

export class Tokenizer {
  tokenize(code: string): Token[] {
    const tokens: Token[] = []
    const n = code.length
    let i = 0

    const push = (type: TokenType, start: number, end: number, unclosed = false) => {
      tokens.push({ type, start, end, unclosed })
    }

    while (i < n) {
      const c = code[i]
      const next = code[i + 1] // 본문 끝이면 undefined

      if (c === '/' && next === '/') {
        // 한 줄 주석: 줄 끝까지. 줄바꿈은 주석에 넣지 않는다.
        const nl = code.indexOf('\n', i + 2)
        const end = nl === -1 ? n : nl
        push('comment', i, end)
        i = end
      } else if (c === '/' && next === '*') {
        // 여러 줄 주석: */ 까지. 없으면 본문 끝에서 끝내고 unclosed로 표시한다.
        const close = code.indexOf('*/', i + 2)
        const end = close === -1 ? n : close + 2
        push('comment', i, end, close === -1)
        i = end
      } else if (c === '"' || c === "'") {
        const quoted = this.readQuoted(code, i, c)
        push(c === '"' ? 'string' : 'char', i, quoted.end, quoted.unclosed)
        i = quoted.end
      } else if (BRACKETS.has(c)) {
        push('bracket', i, i + 1)
        i += 1
      } else if (isSpace(c)) {
        // 이어진 공백류(공백, 탭, 줄바꿈)는 토큰 하나로 묶는다.
        let j = i + 1
        while (j < n && isSpace(code[j])) j++
        push('space', i, j)
        i = j
      } else {
        // 그 밖의 글자는 한 글자씩 symbol. 이모지처럼 두 칸(서로게이트 쌍)인 글자는 쪼개지 않는다.
        const width = this.isSurrogatePair(code, i) ? 2 : 1
        push('symbol', i, i + width)
        i += width
      }
    }

    return tokens
  }

  // 따옴표(" 또는 ')로 시작하는 문자열·문자의 끝 위치를 찾는다.
  // - 역슬래시(\) 다음 한 글자는 건너뛴다. 그래서 \" 에서는 끝나지 않는다.
  //   줄 끝의 역슬래시는 C처럼 다음 줄로 이어지는 것으로 본다.
  // - 닫는 따옴표가 줄 끝까지 없으면 줄 끝(줄바꿈 앞)에서 끝내고 unclosed로 표시한다.
  private readQuoted(code: string, start: number, quote: string) {
    const n = code.length
    let j = start + 1
    while (j < n) {
      const c = code[j]
      if (c === '\\') {
        j += 2 // 본문 끝을 넘어가면 아래에서 n으로 자른다
        continue
      }
      if (c === quote) return { end: j + 1, unclosed: false }
      if (c === '\n') return { end: j, unclosed: true }
      j++
    }
    return { end: n, unclosed: true }
  }

  private isSurrogatePair(code: string, i: number) {
    const hi = code.charCodeAt(i)
    const lo = code.charCodeAt(i + 1)
    return hi >= 0xd800 && hi <= 0xdbff && lo >= 0xdc00 && lo <= 0xdfff
  }
}
