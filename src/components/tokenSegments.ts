import type { BracketInfo, Token, TokenType } from '../types'

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

// 괄호 하나의 클래스. 짝이 있으면 깊이에 따라 3가지 색을 번갈아 쓰고(br-0~br-2),
// 짝이 없으면 빨간 글자와 물결 밑줄(br-error)이다(FR-15, FR-17).
// 커서 옆 괄호와 그 짝(active)에는 테두리(br-active)를 더한다.
function bracketClass(info: BracketInfo, active: readonly number[]) {
  if (info.partner === null) return 'br-error'
  const color = `br-${info.depth % 3}`
  return active.includes(info.offset) ? `${color} br-active` : color
}

// 토큰 목록을 색 조각으로 바꾼다. 색이 같은 이웃 토큰은 한 조각으로 합쳐 span 수를 줄인다.
// 괄호는 이웃과 색이 같아도 하나씩 따로 둔다. 테두리가 괄호 한 글자에만 그려지게 하기 위해서다.
// brackets는 SyntaxReport.brackets(토큰 순서와 같다), active는 테두리를 그릴 괄호 위치이다.
// 토큰이 본문을 빈틈없이 덮지 않으면(본문과 토큰이 어긋난 경우) 색 없이 본문 전체를 한 조각으로 돌려준다.
export function segmentsOf(
  code: string,
  tokens: Token[],
  brackets: BracketInfo[] = [],
  active: readonly number[] = [],
): Segment[] {
  if (!coversAll(code, tokens)) return code ? [{ text: code, className: null }] : []

  const segments: Segment[] = []
  let start = 0
  let current: string | null = null
  let lastWasBracket = false
  let b = 0 // brackets에서 다음에 볼 위치. 토큰과 같은 순서라 앞으로만 간다

  for (const token of tokens) {
    let className = CLASS_OF[token.type] ?? null
    let isBracket = false // 검사 결과가 있는 괄호인지. 없으면 기호처럼 이웃과 합친다
    if (token.type === 'bracket') {
      while (b < brackets.length && brackets[b].offset < token.start) b++
      if (brackets[b]?.offset === token.start) {
        className = bracketClass(brackets[b], active)
        isBracket = true
      }
    }

    if (token.start > start && (isBracket || lastWasBracket || className !== current)) {
      segments.push({ text: code.slice(start, token.start), className: current })
      start = token.start
    }
    current = className
    lastWasBracket = isBracket
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
