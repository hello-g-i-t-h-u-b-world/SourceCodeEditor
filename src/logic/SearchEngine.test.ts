import { describe, expect, it } from 'vitest'
import { SearchEngine, isWholeWord, isWordChar } from './SearchEngine'

// 찾은 곳의 시작 위치만 꺼낸다.
const startsOf = (text: string, query: string, wholeWord = true) =>
  new SearchEngine().search(text, query, wholeWord).map((m) => m.start)

describe('SearchEngine 단위 테스트 (설계서 3.5)', () => {
  it('U-13: count Count count 에서 count는 [0, 12], 대소문자가 다른 Count는 찾지 않는다', () => {
    const engine = new SearchEngine()
    expect(engine.search('count Count count', 'count', true)).toEqual([
      { start: 0, end: 5 },
      { start: 12, end: 17 },
    ])
    expect(engine.currentIndex).toBe(0)
  })

  it('U-14: U-13 뒤 next() 2번이면 현재 위치가 0 → 12 → 0 (끝에서 처음으로)', () => {
    const engine = new SearchEngine()
    engine.search('count Count count', 'count', true)
    expect(engine.next()?.start).toBe(12)
    expect(engine.next()?.start).toBe(0)
    expect(engine.currentIndex).toBe(0)
  })

  it('U-15: U-13 뒤 prev() 1번이면 현재 위치가 0 → 12 (처음에서 마지막으로)', () => {
    const engine = new SearchEngine()
    engine.search('count Count count', 'count', true)
    expect(engine.prev()?.start).toBe(12)
    expect(engine.currentIndex).toBe(1)
  })

  it('U-16: count counter count 에서 단어 단위를 켜면 [0, 14], counter는 찾지 않는다', () => {
    expect(startsOf('count counter count', 'count', true)).toEqual([0, 14])
  })

  it('U-17: U-16과 같은 본문에서 단어 단위를 끄면 [0, 6, 14]', () => {
    expect(startsOf('count counter count', 'count', false)).toEqual([0, 6, 14])
  })

  it('U-18: f(x) + g(x) 에서 (x는 [1, 8]. 기호로 시작하므로 앞 글자 f, g는 보지 않는다', () => {
    expect(startsOf('f(x) + g(x)', '(x', true)).toEqual([1, 8])
  })

  it('U-19: a(b) a(b) 에서 a(b)를 x로 모두 바꾸면 x x, 바뀐 개수 2', () => {
    const engine = new SearchEngine()
    engine.search('a(b) a(b)', 'a(b)', true)
    expect(engine.replaceAll('a(b) a(b)', 'x')).toEqual({ text: 'x x', count: 2 })
  })

  it('U-20: 일치하는 곳이 없으면 결과 0개, 모두 바꾸기 0개, 본문 그대로', () => {
    const engine = new SearchEngine()
    expect(engine.search('int a = 0;', 'total', true)).toEqual([])
    expect(engine.currentIndex).toBe(-1)
    expect(engine.next()).toBeNull()
    expect(engine.prev()).toBeNull()
    expect(engine.replaceAll('int a = 0;', 'x')).toEqual({ text: 'int a = 0;', count: 0 })
  })
})

describe('SearchEngine 설계 검증 표 (3.4)', () => {
  it('5번: max_value 에서 max는 단어 단위로 찾지 않는다. 뒤 글자 _가 단어 글자이다', () => {
    expect(startsOf('max_value', 'max', true)).toEqual([])
    expect(startsOf('max_value', 'max', false)).toEqual([0])
  })

  it('한글은 단어 글자가 아니므로 합계를 에서 합계를 찾는다', () => {
    expect(startsOf('합계를 더한다', '합계', true)).toEqual([0])
  })
})

describe('isWordChar, isWholeWord', () => {
  it('영문자, 숫자, _만 단어 글자이고 본문 밖은 아니다', () => {
    expect(['a', 'Z', '0', '9', '_'].every(isWordChar)).toBe(true)
    expect(['(', ' ', '\n', '합', '$', ''].some(isWordChar)).toBe(false)
    expect(isWordChar(undefined)).toBe(false)
  })

  it('본문 처음과 끝은 경계로 본다', () => {
    expect(isWholeWord('count', 0, 'count')).toBe(true)
  })

  it('검색어 끝이 기호이면 뒤 글자는 보지 않는다', () => {
    expect(isWholeWord('f(x)', 0, 'f(')).toBe(true)
    expect(isWholeWord('af(x)', 1, 'f(')).toBe(false) // 앞 글자 a는 본다
  })
})

describe('SearchEngine 검색', () => {
  it('찾은 곳은 겹치지 않는다', () => {
    expect(startsOf('aaaa', 'aa', false)).toEqual([0, 2])
  })

  it('다른 단어의 일부를 건너뛴 뒤 바로 이어지는 곳도 찾는다', () => {
    // xcount 안의 count는 건너뛰고 한 글자 뒤부터 다시 찾는다
    expect(startsOf('xcount count', 'count', true)).toEqual([7])
  })

  it('검색어가 비어 있으면 찾지 않는다', () => {
    const engine = new SearchEngine()
    expect(engine.search('abc', '', true)).toEqual([])
    expect(engine.currentIndex).toBe(-1)
  })

  it('정규식 기호도 글자 그대로 찾는다', () => {
    expect(startsOf('a.b a*b a.b', 'a.b', false)).toEqual([0, 8])
  })

  it('여러 줄 본문에서도 위치는 본문 맨 앞부터 센다', () => {
    expect(startsOf('int count;\n\tcount++;\n', 'count', true)).toEqual([4, 12])
  })
})

describe('SearchEngine 현재 위치', () => {
  const text = 'count Count count count' // count는 0, 12, 18

  it('현재 위치는 커서 뒤의 첫 결과다', () => {
    const engine = new SearchEngine()
    engine.search(text, 'count', true, 7)
    expect(engine.currentIndex).toBe(1)
  })

  it('커서가 결과의 시작에 있으면 그 결과가 현재 위치다', () => {
    const engine = new SearchEngine()
    engine.search(text, 'count', true, 12)
    expect(engine.currentIndex).toBe(1)
  })

  it('커서 뒤에 결과가 없으면 처음 결과다', () => {
    const engine = new SearchEngine()
    engine.search(text, 'count', true, 20)
    expect(engine.currentIndex).toBe(0)
  })

  it('다시 검색하면 이전 결과는 지운다', () => {
    const engine = new SearchEngine()
    engine.search(text, 'count', true)
    engine.search(text, 'none', true)
    expect(engine.matches).toEqual([])
    expect(engine.next()).toBeNull()
  })
})

describe('SearchEngine 모두 바꾸기', () => {
  it('바꿀 문자열이 비어 있으면 찾은 곳을 지운다', () => {
    const engine = new SearchEngine()
    engine.search('a, b, c', ', ', false)
    expect(engine.replaceAll('a, b, c', '')).toEqual({ text: 'abc', count: 2 })
  })

  it('단어 단위로 찾은 곳만 바꾼다 (설계서 사용 시나리오: count → total)', () => {
    const text = 'int count = 0;\ncount++; counter = count;'
    const engine = new SearchEngine()
    engine.search(text, 'count', true)
    expect(engine.replaceAll(text, 'total')).toEqual({
      text: 'int total = 0;\ntotal++; counter = total;',
      count: 3,
    })
  })

  it('바꿀 문자열 안에 검색어가 있어도 한 번만 바꾼다', () => {
    const engine = new SearchEngine()
    engine.search('a a', 'a', true)
    expect(engine.replaceAll('a a', 'aa')).toEqual({ text: 'aa aa', count: 2 })
  })

  it('바꾼 뒤에는 결과를 비운다', () => {
    const engine = new SearchEngine()
    engine.search('a a', 'a', true)
    engine.replaceAll('a a', 'b')
    expect(engine.matches).toEqual([])
    expect(engine.currentIndex).toBe(-1)
  })

  it('검색한 뒤 본문이 바뀌었으면 같은 조건으로 다시 찾아 바꾼다', () => {
    const engine = new SearchEngine()
    engine.search('count', 'count', true)
    expect(engine.replaceAll('x = count + count', 'n')).toEqual({ text: 'x = n + n', count: 2 })
  })

  it('찾은 곳이 많아도 한 번에 합친다 (1,000줄)', () => {
    const text = 'count += 1;\n'.repeat(1000)
    const engine = new SearchEngine()
    engine.search(text, 'count', true)
    const result = engine.replaceAll(text, 'total')
    expect(result.count).toBe(1000)
    expect(result.text).toBe('total += 1;\n'.repeat(1000))
  })
})
