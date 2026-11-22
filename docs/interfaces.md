# 문법 검사 · 검색 · Undo · 단축키 메서드 목록 (이재성)

설계서 3.3~3.4를 코드 이름으로 옮긴 초안이다. 11/15 주간 점검에서 확정하고, 바뀐 점은 `docs/decisions.md`에 남긴다.
타입(`Token`, `BracketInfo`, `SyntaxIssue`, `SyntaxReport`, `Match`, `Snapshot`)은 `src/types.ts`에 있다.

## 파일 위치

| 파일 | 내용 | 시작 |
|---|---|---|
| `src/components/HighlightLayer.tsx` | 색 표시 층 | 11/17 |
| `src/logic/Tokenizer.ts` | 토큰화 | 11/19 |
| `src/logic/SyntaxChecker.ts` | 괄호 짝 맞추기, 오류 | 11/23 |
| `src/logic/SearchEngine.ts` | 검색, 다음·이전, 모두 바꾸기 | 11/26 |
| `src/components/FindReplacePanel.tsx` | 지금 있는 초안에 기능 추가 | 11/27 |
| `src/logic/ShortcutManager.ts` | 단축키 | 11/28 |
| `src/logic/HistoryManager.ts` | Undo/Redo | 12/2 |

단위 테스트는 같은 폴더에 `Tokenizer.test.ts`처럼 둔다.

## Tokenizer

```ts
class Tokenizer {
  // C 코드를 앞에서부터 한 번 읽어 토큰 목록을 만든다. O(n)
  // 토큰을 순서대로 이어 붙이면 원문과 같다(빈틈·겹침 없음).
  tokenize(code: string): Token[]
}
```

## SyntaxChecker

```ts
class SyntaxChecker {
  constructor(tokenizer?: Tokenizer)

  // 토큰화 → 스택으로 괄호 짝 맞추기 → 오류 목록. O(n)
  check(code: string): SyntaxReport

  // 마지막 check() 결과에서 offset 위치 괄호의 짝 위치. 괄호가 아니거나 짝이 없으면 null
  partnerOf(offset: number): number | null
}

// offset → 줄·열(1부터). SyntaxIssue를 만들 때 쓴다.
function positionOf(code: string, offset: number): { line: number; column: number }
```

오류 문구

| 경우 | 문구 |
|---|---|
| 종류가 다른 닫는 괄호 | `'X'의 짝이 맞지 않습니다.` |
| 스택이 빈 채 닫는 괄호 | `여는 괄호 없이 'X'가 나왔습니다.` |
| 끝까지 남은 여는 괄호 | `'X'의 짝이 없습니다.` |
| 닫히지 않은 주석 | `주석(/*)이 닫히지 않았습니다.` |
| 닫히지 않은 문자열·문자 | `문자열(")이 닫히지 않았습니다.` / `문자(')가 닫히지 않았습니다.` |

## SearchEngine

```ts
class SearchEngine {
  // 대소문자 구분, 글자 그대로 비교(indexOf). wholeWord가 참이면 다른 단어의 일부는 건너뛴다.
  // 현재 위치는 cursor 이후 첫 결과로 정한다(없으면 0번).
  search(text: string, query: string, wholeWord: boolean, cursor?: number): Match[]

  readonly matches: Match[]
  readonly currentIndex: number // 결과가 없으면 -1

  next(): Match | null // 마지막 다음은 처음. 결과가 없으면 null
  prev(): Match | null // 처음 이전은 마지막

  // 마지막 search() 결과를 모두 바꾼다. 앞에서부터 조각을 모아 한 번에 합친다. O(n)
  replaceAll(text: string, replacement: string): { text: string; count: number }
}
```

선택 영역을 옮기고 그 줄까지 스크롤하는 일은 Editor(김민서)가 한다.

## HistoryManager

파일마다 하나씩 만든다. App이 `Map<파일 id, HistoryManager>`로 보관하고 탭을 닫으면 지운다.

```ts
class HistoryManager {
  static readonly MAX_COUNT = 100
  static readonly MAX_BYTES = 10 * 1024 * 1024 // content.length × 2바이트로 계산

  record(before: Snapshot): void // undo 스택에 넣고 redo 스택을 비운다
  undo(current: Snapshot): Snapshot | null // 돌려받은 상태를 화면에 적용한다
  redo(current: Snapshot): Snapshot | null
  clear(): void

  readonly canUndo: boolean
  readonly canRedo: boolean
}
```

입력 묶기(0.5초), 붙여넣기·잘라내기·모두 바꾸기 직전 기록, 한글 조합 중 건너뛰기는 Editor에 연결할 때(12/3~12/4) 함께 처리한다.

## ShortcutManager

```ts
class ShortcutManager {
  register(combo: string, action: () => void): void // combo 예: "Ctrl+S", "Ctrl+Shift+Z"
  unregister(combo: string): void

  // 등록된 조합이면 preventDefault() 후 실행하고 true를 돌려준다.
  handle(event: KeyboardEvent): boolean
}

// 키 이벤트 → "Ctrl+S". metaKey(Cmd)도 Ctrl로 본다.
// 한글 입력 상태에서는 e.key가 "ㄴ"이 되므로 글자는 e.code("KeyS")로 판단한다.
function comboOf(event: KeyboardEvent): string
```

조합 문자열은 `Ctrl` → `Shift` → `Alt` → 키 순서로 쓰고, 영문 키는 대문자로 쓴다.

## HighlightLayer props

```ts
interface HighlightLayerProps {
  code: string
  report: SyntaxReport | null // C 파일(.c, .h)이 아니면 null → 색 없이 본문만 그린다
  matches: Match[] // 찾은 곳: 노랑 배경
  currentMatch: number // 현재 위치: 주황 배경. 없으면 -1
  cursor: number // textarea의 selectionStart. 커서 옆 괄호와 짝에 테두리
  ref?: Ref<HTMLPreElement> // Editor가 scrollTop·scrollLeft를 맞출 때 쓴다
}
```

## 김민서에게 필요한 것

| 언제 | 무엇 |
|---|---|
| 11/18 | Editor가 HighlightLayer를 textarea 뒤에 겹치고, 커서 위치(offset)와 스크롤 값을 넘겨 줌 |
| 11/25 | App이 `useMemo`로 `check()`를 부르고, `report.issues`로 상태바 문구와 줄 번호 옆 빨간 점을 그림 |
| 11/27 | Editor에 "start~end를 선택하고 그 줄까지 스크롤" 메서드 |
| 11/28 | App의 keydown 처리를 `ShortcutManager.handle()`로 바꿈 |
| 12/3 | Editor 입력 처리에 HistoryManager 연결(함께) |

## 11/15 점검에서 정할 것

1. `SyntaxIssue`에 `offset`도 넣을지. 지금은 설계서대로 줄·열·문구만 있다.
2. macOS에서 Cmd+Shift+Z도 다시 실행으로 받을지(FR-23은 Ctrl+Y만 적혀 있다).
3. 로직 클래스 폴더를 `src/logic/`으로 할지.
