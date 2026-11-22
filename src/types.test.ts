import { describe, expect, it } from 'vitest'
import { fullName, languageOf, type EditorFile } from './types'

// 테스트 환경 확인용. 실제 단위 테스트(U-01~U-33)는 각 클래스 파일 옆에 둔다.
describe('테스트 환경', () => {
  it('jsdom 환경에서 document를 쓸 수 있다', () => {
    const pre = document.createElement('pre')
    pre.textContent = 'int a;'
    expect(pre.textContent).toBe('int a;')
  })
})

describe('types.ts 보조 함수', () => {
  it('fullName은 "파일명.확장자"를 돌려준다', () => {
    const file: EditorFile = { id: '1', name: 'Main', extension: 'c', content: '', isDirty: false }
    expect(fullName(file)).toBe('Main.c')
  })

  it('languageOf는 확장자로 언어 이름을 찾고, 모르는 확장자는 Plain Text로 본다', () => {
    expect(languageOf('c')).toBe('C')
    expect(languageOf('H')).toBe('C')
    expect(languageOf('xyz')).toBe('Plain Text')
  })
})
