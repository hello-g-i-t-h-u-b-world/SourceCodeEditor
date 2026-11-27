import type { Match } from '../types'

// 설계서 3.4 4) 검색, 다음·이전 이동, 모두 바꾸기.
// 정규식 대신 indexOf로 글자 그대로 비교하므로 (, * 같은 기호도 그대로 찾는다. 대소문자는 구분한다.
// SearchEngine은 위치만 돌려주고, 선택 영역을 옮기고 그 줄까지 스크롤하는 일은 Editor가 한다.

// 단어 글자: 영문자, 숫자, _. 본문 밖(undefined)이면 거짓.
// 한글은 단어 글자로 보지 않으므로 "합계를"에서 "합계"를 찾을 수 있다.
export function isWordChar(c: string | undefined): boolean {
  return c !== undefined && /^[A-Za-z0-9_]$/.test(c)
}

// text의 i 위치에서 찾은 query가 다른 단어의 일부가 아닌지.
// 검색어의 첫 글자·끝 글자가 단어 글자일 때만 그쪽 경계를 검사한다.
// 그래서 f(x)에서 (x처럼 기호로 시작하는 검색어는 앞 글자 f를 보지 않는다.
export function isWholeWord(text: string, i: number, query: string): boolean {
  if (isWordChar(query[0]) && isWordChar(text[i - 1])) return false
  if (isWordChar(query.at(-1)) && isWordChar(text[i + query.length])) return false
  return true
}

export class SearchEngine {
  private _matches: Match[] = []
  private _currentIndex = -1
  // 마지막 search()의 조건. replaceAll()이 다른 본문을 받으면 이 조건으로 다시 찾는다.
  private text = ''
  private query = ''
  private wholeWord = true

  get matches(): readonly Match[] {
    return this._matches
  }

  // 현재 위치(matches의 인덱스). 결과가 없으면 -1
  get currentIndex(): number {
    return this._currentIndex
  }

  // 찾은 곳을 앞에서부터 모두 돌려준다. 겹치지 않게 찾는다(aaa에서 aa는 0 하나).
  // 현재 위치는 cursor 이후(cursor 위치 포함) 첫 결과이고, 없으면 처음(0번)이다.
  search(text: string, query: string, wholeWord: boolean, cursor = 0): Match[] {
    this.text = text
    this.query = query
    this.wholeWord = wholeWord

    const matches: Match[] = []
    if (query !== '') {
      let i = text.indexOf(query)
      while (i !== -1) {
        if (!wholeWord || isWholeWord(text, i, query)) {
          matches.push({ start: i, end: i + query.length })
          i = text.indexOf(query, i + query.length) // 찾은 곳 다음부터: 겹치지 않게
        } else {
          i = text.indexOf(query, i + 1) // 다른 단어의 일부면 한 글자 뒤부터 다시
        }
      }
    }

    this._matches = matches
    if (matches.length === 0) {
      this._currentIndex = -1
    } else {
      const after = matches.findIndex((m) => m.start >= cursor)
      this._currentIndex = after === -1 ? 0 : after
    }
    return matches
  }

  // 다음 위치. 마지막 다음은 처음. 결과가 없으면 null
  next(): Match | null {
    return this.move(1)
  }

  // 이전 위치. 처음 이전은 마지막. 결과가 없으면 null
  prev(): Match | null {
    return this.move(-1)
  }

  // 마지막 search() 결과를 모두 replacement로 바꾼다.
  // 앞에서부터 바뀌지 않는 조각과 바꿀 문자열을 배열에 모았다가 마지막에 한 번만 합친다. O(n)
  // (찾을 때마다 문자열을 새로 만들면 매번 본문 전체를 복사해서 O(n × 개수)가 된다.)
  // 바꾼 뒤에는 위치가 모두 달라지므로 결과를 비운다.
  replaceAll(text: string, replacement: string): { text: string; count: number } {
    // 검색한 뒤 본문이 바뀌었으면 옛 위치로 자르지 않도록 같은 조건으로 다시 찾는다.
    if (text !== this.text) this.search(text, this.query, this.wholeWord)

    const parts: string[] = []
    let pos = 0
    for (const m of this._matches) {
      parts.push(text.slice(pos, m.start), replacement)
      pos = m.end
    }
    parts.push(text.slice(pos))

    const count = this._matches.length
    this._matches = []
    this._currentIndex = -1
    return { text: parts.join(''), count }
  }

  private move(step: 1 | -1): Match | null {
    const n = this._matches.length
    if (n === 0) return null
    this._currentIndex = (this._currentIndex + step + n) % n
    return this._matches[this._currentIndex]
  }
}
