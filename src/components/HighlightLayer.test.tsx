import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { syntaxChecker } from '../hooks/useSyntaxReport'
import type { SyntaxReport } from '../types'
import HighlightLayer from './HighlightLayer'

// 앱과 같은 검사기로 검사한다. 커서 옆 괄호의 짝(partnerOf)이 이 검사 결과에서 나온다.
const reportOf = (code: string): SyntaxReport => syntaxChecker.check(code)

const render = (code: string, report: SyntaxReport | null = null, cursor = 0) =>
  renderToStaticMarkup(
    <HighlightLayer code={code} report={report} matches={[]} currentMatch={-1} cursor={cursor} />,
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

describe('HighlightLayer 괄호 (FR-15, FR-17)', () => {
  // 테두리가 그려진 괄호 글자들
  const activeOf = (code: string, cursor: number) => {
    const pre = preOf(render(code, reportOf(code), cursor))
    return [...pre.querySelectorAll('.br-active')].map((s) => s.textContent)
  }

  it('짝이 있는 괄호는 깊이에 따라 색을 입히고 짝 없는 괄호는 br-error로 그린다', () => {
    const code = 'f(a[0]) )'
    const spans = [...preOf(render(code, reportOf(code))).querySelectorAll('span')]
    expect(spans.map((s) => [s.className, s.textContent])).toEqual([
      ['br-0', '('],
      ['br-1', '['],
      ['br-1', ']'],
      ['br-0', ')'],
      ['br-error', ')'],
    ])
  })

  it('커서 바로 뒤 글자가 괄호이면 그 괄호와 짝에 테두리를 그린다', () => {
    expect(activeOf('f(a)', 1)).toEqual(['(', ')']) // f|(a)
  })

  it('커서 바로 앞 글자가 괄호이면 그 괄호와 짝에 테두리를 그린다', () => {
    expect(activeOf('f(a)', 4)).toEqual(['(', ')']) // f(a)|
  })

  it('앞뒤가 모두 괄호이면 앞 글자를 먼저 본다', () => {
    expect(activeOf('(a)[b]', 3)).toEqual(['(', ')']) // (a)|[b]
  })

  it('커서 옆이 괄호가 아니거나 짝 없는 괄호이면 테두리가 없다', () => {
    expect(activeOf('f(a) + b', 6)).toEqual([]) // f(a) +| b
    expect(activeOf('f(a', 2)).toEqual([]) // f(|a 의 (는 짝이 없다
  })

  it('C 파일이 아니면(report가 null) 괄호 색도 테두리도 없다', () => {
    expect(render('f(a)', null, 1)).not.toContain('<span')
  })

  it('괄호 색과 테두리를 입혀도 글자는 원문과 같다', () => {
    const code = 'int main(void) {\n\tif (a[0] > 0 { s = "}"; }\n}\n'
    expect(textOf(render(code, reportOf(code), 9))).toBe(`${code} `)
  })
})
