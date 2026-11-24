import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Tokenizer } from '../logic/Tokenizer'
import type { SyntaxReport } from '../types'
import HighlightLayer from './HighlightLayer'

const tokenizer = new Tokenizer()

// 11/25 SyntaxChecker 전까지는 토큰만 채운 report를 쓴다.
const reportOf = (code: string): SyntaxReport => ({
  tokens: tokenizer.tokenize(code),
  brackets: [],
  issues: [],
})

const render = (code: string, report: SyntaxReport | null = null) =>
  renderToStaticMarkup(
    <HighlightLayer code={code} report={report} matches={[]} currentMatch={-1} cursor={0} />,
  )

// jsdom으로 다시 읽어 <pre>를 꺼낸다.
const preOf = (html: string) => {
  const box = document.createElement('div')
  box.innerHTML = html
  return box.querySelector('pre')!
}

const textOf = (html: string) => preOf(html).textContent

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

describe('HighlightLayer 토큰 색 (FR-16)', () => {
  it('주석은 tok-comment, 문자열과 문자는 tok-string으로 감싼다', () => {
    const code = 'int a; // 합계\ns = "x"; c = \'y\';'
    const spans = [...preOf(render(code, reportOf(code))).querySelectorAll('span')]
    expect(spans.map((s) => [s.className, s.textContent])).toEqual([
      ['tok-comment', '// 합계'],
      ['tok-string', '"x"'],
      ['tok-string', "'y'"],
    ])
  })

  it('색을 입혀도 글자는 원문과 같다', () => {
    const code = '/* a\n b */\tf("(", \'\\\'\'); // 끝\n'
    expect(textOf(render(code, reportOf(code)))).toBe(`${code} `)
  })

  it('report가 null이면(C 파일이 아니면) 색 없이 그린다', () => {
    expect(render('// 주석')).not.toContain('<span')
  })

  it('닫히지 않은 주석도 본문 끝까지 초록으로 그린다', () => {
    const code = 'x /* 열림\ny'
    const spans = preOf(render(code, reportOf(code))).querySelectorAll('span')
    expect(spans).toHaveLength(1)
    expect(spans[0].textContent).toBe('/* 열림\ny')
  })
})
