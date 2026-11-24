import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HighlightLayer from './HighlightLayer'

const render = (code: string) =>
  renderToStaticMarkup(
    <HighlightLayer code={code} report={null} matches={[]} currentMatch={-1} cursor={0} />,
  )

// textContent를 꺼내기 위해 jsdom으로 다시 읽는다.
const textOf = (html: string) => {
  const box = document.createElement('div')
  box.innerHTML = html
  return box.querySelector('pre')?.textContent
}

describe('HighlightLayer 골격', () => {
  it('본문을 <pre> 안에 그대로 그린다', () => {
    expect(textOf(render('int a;\n\tb = "한글";'))).toBe('int a;\n\tb = "한글";')
  })

  it('본문이 줄바꿈으로 끝나면 마지막 빈 줄의 높이를 위해 공백 하나를 더한다', () => {
    expect(textOf(render('int a;\n'))).toBe('int a;\n ')
  })

  it('빈 본문은 빈 <pre>로 그린다', () => {
    expect(textOf(render(''))).toBe('')
  })

  it('화면 읽기 프로그램이 같은 글을 두 번 읽지 않도록 aria-hidden을 단다', () => {
    expect(render('x')).toContain('aria-hidden="true"')
  })
})
