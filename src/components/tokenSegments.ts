import type { Token, TokenType } from '../types'

// 색 표시 층이 그릴 조각 하나. className이 null이면 색 없이 그린다.
export interface Segment {
  text: string
  className: string | null
}

// 토큰 종류 → CSS 클래스. 여기에 없는 종류는 기본 글자색으로 그린다.
// 12/1 Tokenizer 2단계에서 keyword(파랑), number(청록), preprocessor(보라)를 더한다.
const CLASS_OF: Partial<Record<TokenType, string>> = {
  comment: 'tok-comment',
  string: 'tok-string',
  char: 'tok-string',
}

// 토큰 목록을 색 조각으로 바꾼다. 색이 같은 이웃 토큰은 한 조각으로 합쳐 span 수를 줄인다.
// 토큰이 본문을 빈틈없이 덮지 않으면(본문과 토큰이 어긋난 경우) 색 없이 본문 전체를 한 조각으로 돌려준다.
export function segmentsOf(code: string, tokens: Token[]): Segment[] {
  if (!coversAll(code, tokens)) return code ? [{ text: code, className: null }] : []

  const segments: Segment[] = []
  let start = 0
  let current: string | null = null

  for (const token of tokens) {
    const className = CLASS_OF[token.type] ?? null
    if (className !== current && token.start > start) {
      segments.push({ text: code.slice(start, token.start), className: current })
      start = token.start
    }
    current = className
  }
  if (start < code.length) segments.push({ text: code.slice(start), className: current })

  return segments
}

function coversAll(code: string, tokens: Token[]) {
  let pos = 0
  for (const t of tokens) {
    if (t.start !== pos || t.end <= t.start) return false
    pos = t.end
  }
  return pos === code.length
}
