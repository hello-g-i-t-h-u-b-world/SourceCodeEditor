export interface EditorFile {
  id: string
  name: string // 파일명 (확장자 제외)
  extension: string // 확장자 (점 제외, 예: "c", "ts")
  content: string
  isDirty: boolean // 저장되지 않은 변경사항 여부
}

export const fullName = (file: EditorFile) => `${file.name}.${file.extension}`

// 확장자로 언어 이름 표시 (문법 검사 기능에서 재사용 예정)
export const languageOf = (extension: string) => {
  const map: Record<string, string> = {
    c: 'C',
    h: 'C',
    cpp: 'C++',
    java: 'Java',
    js: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    py: 'Python',
    html: 'HTML',
    css: 'CSS',
    txt: 'Plain Text',
  }
  return map[extension.toLowerCase()] ?? 'Plain Text'
}

// ─────────────────────────────────────────────
// 문법 검사 · 검색 · Undo 타입 (설계서 3.3 핵심 자료구조)
// ─────────────────────────────────────────────

// 토큰 종류. Tokenizer 1단계에서는 keyword, identifier, number, preprocessor를 만들지 않고 symbol로 둔다.
export type TokenType =
  | 'keyword'
  | 'identifier'
  | 'number'
  | 'string'
  | 'char'
  | 'comment'
  | 'preprocessor'
  | 'bracket'
  | 'symbol'
  | 'space'

// 코드 조각 하나. end 위치의 글자는 포함하지 않는다(code.slice(start, end)).
export interface Token {
  type: TokenType
  start: number
  end: number
  unclosed: boolean // 닫히지 않은 주석·문자열·문자이면 true
}

export type BracketChar = '(' | ')' | '{' | '}' | '[' | ']'

// 괄호 하나의 검사 결과. 색은 depth % 3으로 정한다.
export interface BracketInfo {
  offset: number
  char: BracketChar
  depth: number
  partner: number | null // 짝 괄호 위치, 짝이 없으면 null
}

// 오류 하나. line, column은 1부터 센다.
export interface SyntaxIssue {
  line: number
  column: number
  message: string
}

// 검사 결과 묶음. 색 표시 층과 상태 표시줄은 이 결과만 보고 화면을 그린다.
export interface SyntaxReport {
  tokens: Token[]
  brackets: BracketInfo[]
  issues: SyntaxIssue[] // 위치 순으로 정렬
}

// 검색 결과 하나. end 위치의 글자는 포함하지 않는다.
export interface Match {
  start: number
  end: number
}

// Undo/Redo에 저장하는 편집 상태
export interface Snapshot {
  content: string
  selectionStart: number
  selectionEnd: number
}
