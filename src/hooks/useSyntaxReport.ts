import { useMemo } from 'react'
import { SyntaxChecker } from '../logic/SyntaxChecker'
import { isCFile, type SyntaxReport } from '../types'

// 편집기는 한 번에 파일 하나만 보여 주므로 검사기 하나를 같이 쓴다.
// partnerOf()는 마지막 check() 결과를 쓰고, check()는 아래 useMemo에서 지금 보이는 본문으로만 부른다.
export const syntaxChecker = new SyntaxChecker()

// 지금 열린 파일의 색 표시·문법 검사 결과. 본문이 바뀔 때마다 다시 계산한다(설계서 3.4, 매 입력마다 O(n)).
// C 파일(.c, .h)이 아니면 null이라 색 없이 그리고 검사하지 않는다(FR-24).
// App(김민서)은 이 훅을 부르기만 하고, 검사 내용이 바뀌어도 App은 고치지 않는다.
// 상태바 문구와 줄 번호 옆 빨간 점은 report.issues(위치 순)로 그린다.
export function useSyntaxReport(content: string | undefined, extension: string | undefined) {
  const checked = extension !== undefined && isCFile(extension)
  return useMemo<SyntaxReport | null>(
    () => (checked && content !== undefined ? syntaxChecker.check(content) : null),
    [content, checked],
  )
}
