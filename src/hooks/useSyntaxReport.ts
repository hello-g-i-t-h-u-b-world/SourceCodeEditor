import { useMemo } from 'react'
import { Tokenizer } from '../logic/Tokenizer'
import { isCFile, type SyntaxReport } from '../types'

// 상태가 없는 클래스라 하나만 만들어 같이 쓴다.
const tokenizer = new Tokenizer()

// 지금 열린 파일의 색 표시·문법 검사 결과. 본문이 바뀔 때마다 다시 계산한다(설계서 3.4, 매 입력마다 O(n)).
// C 파일(.c, .h)이 아니면 null이라 색 없이 그린다.
// App(김민서)은 이 훅을 부르기만 하고, 검사 내용이 바뀌어도 App은 고치지 않는다.
// TODO(11/25, 이재성): SyntaxChecker.check()로 바꿔 괄호 결과(brackets)와 오류(issues)도 채운다.
export function useSyntaxReport(content: string | undefined, extension: string | undefined) {
  const checked = extension !== undefined && isCFile(extension)
  return useMemo<SyntaxReport | null>(
    () =>
      checked && content !== undefined
        ? { tokens: tokenizer.tokenize(content), brackets: [], issues: [] }
        : null,
    [content, checked],
  )
}
