import { describe, expect, it } from 'vitest'
import { lineIndexOf, scrollTopFor } from './editorScroll'

describe('Editor 선택 이동 계산', () => {
  it('lineIndexOf는 offset 앞의 줄바꿈 개수다', () => {
    const text = 'a\nbb\nccc'
    expect(lineIndexOf(text, 0)).toBe(0)
    expect(lineIndexOf(text, 2)).toBe(1)
    expect(lineIndexOf(text, 5)).toBe(2)
    expect(lineIndexOf(text, 99)).toBe(2)
  })

  it('이미 보이는 줄이면 스크롤하지 않는다', () => {
    // 3번째 줄(0부터 2)은 8 + 40 = 48~68px. 0~200px 화면 안에 있다.
    expect(scrollTopFor(2, 0, 200)).toBe(0)
  })

  it('화면 밖의 줄은 화면 가운데로 스크롤한다', () => {
    // 100번째 줄(0부터 99): 8 + 1980 = 1988px. 가운데로 = 1988 - (200 - 20) / 2 = 1898
    expect(scrollTopFor(99, 0, 200)).toBe(1898)
    // 위로 지나간 줄도 같다
    expect(scrollTopFor(0, 500, 200)).toBe(0)
  })
})
