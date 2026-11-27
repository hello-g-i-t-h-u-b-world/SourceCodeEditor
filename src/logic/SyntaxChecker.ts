import type { BracketChar, BracketInfo, SyntaxIssue, SyntaxReport, Token } from '../types'
import { Tokenizer } from './Tokenizer'

// 설계서 3.4 2) 괄호 짝 맞추기. 토큰화 → 스택으로 괄호 짝 맞추기 → 오류 목록. 모두 O(n)
//
// 토큰화를 먼저 하기 때문에 주석·문자열·문자 안의 괄호는 bracket 토큰이 아니어서 검사하지 않는다.
// 예: f(a[0]) { s = "}"; } ) 에서 문자열 안의 }는 건너뛰고 마지막 )만 짝 없음이 된다(설계 검증, U-09).

const OPEN_OF: Record<string, BracketChar> = { ')': '(', '}': '{', ']': '[' }
const CLOSE_OF: Record<string, BracketChar> = { '(': ')', '{': '}', '[': ']' }

// 오류 문구. 상태바는 앞에 "N번째 줄 M열: "을 붙여 보여 준다(설계서 2.4 문법 오류 메시지).
export const MESSAGES = {
  noClose: (open: string) => `'${open}'의 짝이 되는 '${CLOSE_OF[open]}'가 없습니다.`,
  noOpen: (close: string) => `여는 괄호 없이 '${close}'가 나왔습니다.`,
  mismatch: (close: string, open: string) => `'${close}'가 앞의 '${open}'와 짝이 맞지 않습니다.`,
  unclosedComment: '주석(/*)이 닫히지 않았습니다.',
  unclosedString: '문자열(")이 닫히지 않았습니다.',
  unclosedChar: "문자(')가 닫히지 않았습니다.",
}

// 줄·열 계산 전의 오류
interface RawIssue {
  offset: number
  message: string
}

export class SyntaxChecker {
  private readonly tokenizer: Tokenizer
  private pairs = new Map<number, number>() // 괄호 위치 → 짝 괄호 위치 (마지막 check() 결과)

  constructor(tokenizer: Tokenizer = new Tokenizer()) {
    this.tokenizer = tokenizer
  }

  check(code: string): SyntaxReport {
    const tokens = this.tokenizer.tokenize(code)
    const stack: BracketInfo[] = [] // 아직 닫히지 않은 여는 괄호
    const openCount: Record<string, number> = { '(': 0, '{': 0, '[': 0 } // 스택에 있는 종류별 개수
    const brackets: BracketInfo[] = []
    const raw: RawIssue[] = []
    const pairs = new Map<number, number>()

    const pair = (open: BracketInfo, close: BracketInfo) => {
      open.partner = close.offset
      close.partner = open.offset
      close.depth = open.depth // 짝끼리 같은 색이 되도록 깊이를 맞춘다
      pairs.set(open.offset, close.offset)
      pairs.set(close.offset, open.offset)
    }
    const pop = () => {
      const top = stack.pop()!
      openCount[top.char]--
      return top
    }

    for (const token of tokens) {
      if (token.unclosed) raw.push({ offset: token.start, message: unclosedMessage(token) })
      if (token.type !== 'bracket') continue

      const char = code[token.start] as BracketChar
      const info: BracketInfo = { offset: token.start, char, depth: stack.length, partner: null }
      brackets.push(info)

      if (char in CLOSE_OF) {
        // 여는 괄호: 깊이는 지금 스택에 쌓인 개수
        stack.push(info)
        openCount[char]++
        continue
      }

      // 닫는 괄호
      const open = OPEN_OF[char]
      const top = stack.at(-1)
      if (!top) {
        raw.push({ offset: info.offset, message: MESSAGES.noOpen(char) })
      } else if (top.char === open) {
        pair(pop(), info)
      } else if (openCount[open] > 0) {
        // 스택 안쪽에 같은 종류의 여는 괄호가 있으면, 그 위에 쌓인 여는 괄호들은 닫는 괄호가
        // 빠진 것으로 보고 짝 없음으로 꺼낸 뒤 이 괄호와 짝을 맞춘다(설계서 의사코드와 다른 점).
        // 예: { if (a { } } 에서 )가 빠지면 ( 하나만 오류이고, 바깥 { }는 짝이 맞는다(대체 시나리오 3).
        // 꺼낸 괄호는 다시 쌓이지 않으므로 전체로 보면 여전히 O(n)이다.
        while (stack.at(-1)!.char !== open) {
          const skipped = pop()
          raw.push({ offset: skipped.offset, message: MESSAGES.noClose(skipped.char) })
        }
        pair(pop(), info)
      } else {
        // 스택 어디에도 같은 종류가 없으면 이 닫는 괄호만 오류로 두고 스택은 그대로 둔다.
        // 그래서 ( ] 에서 (는 뒤에 )가 오지 않으면 끝까지 짝 없음으로 남는다(U-08).
        raw.push({ offset: info.offset, message: MESSAGES.mismatch(char, top.char) })
      }
    }

    // 끝까지 스택에 남은 여는 괄호는 짝이 없다.
    for (const open of stack) raw.push({ offset: open.offset, message: MESSAGES.noClose(open.char) })

    this.pairs = pairs
    return { tokens, brackets, issues: toIssues(code, raw) }
  }

  // 마지막 check() 결과에서 offset 위치 괄호의 짝 위치. 괄호가 아니거나 짝이 없으면 null
  partnerOf(offset: number): number | null {
    return this.pairs.get(offset) ?? null
  }
}

// offset → 줄·열(1부터). 열은 줄 첫 글자부터 센 글자 수로, 탭도 한 글자다.
export function positionOf(code: string, offset: number): { line: number; column: number } {
  let line = 1
  let lineStart = 0
  for (let i = 0; i < offset && i < code.length; i++) {
    if (code[i] === '\n') {
      line++
      lineStart = i + 1
    }
  }
  return { line, column: offset - lineStart + 1 }
}

function unclosedMessage(token: Token) {
  if (token.type === 'comment') return MESSAGES.unclosedComment
  if (token.type === 'char') return MESSAGES.unclosedChar
  return MESSAGES.unclosedString
}

// 위치 순으로 정렬한 뒤 본문을 한 번만 훑으며 줄·열을 붙인다. O(n + k log k), k = 오류 수
function toIssues(code: string, raw: RawIssue[]): SyntaxIssue[] {
  const sorted = [...raw].sort((a, b) => a.offset - b.offset)
  const issues: SyntaxIssue[] = []
  let line = 1
  let lineStart = 0
  let i = 0
  for (const { offset, message } of sorted) {
    for (; i < offset; i++) {
      if (code[i] === '\n') {
        line++
        lineStart = i + 1
      }
    }
    issues.push({ offset, line, column: offset - lineStart + 1, message })
  }
  return issues
}
