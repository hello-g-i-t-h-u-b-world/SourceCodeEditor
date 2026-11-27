import { useMemo, type Ref } from 'react'
import { syntaxChecker } from '../hooks/useSyntaxReport'
import type { Match, SyntaxReport } from '../types'
import { segmentsOf } from './tokenSegments'
import './HighlightLayer.css'

export interface HighlightLayerProps {
  code: string
  report: SyntaxReport | null // C 파일(.c, .h)이 아니면 null → 색 없이 본문만 그린다
  matches: Match[] // 찾은 곳: 노랑 배경
  currentMatch: number // 현재 위치: 주황 배경. 없으면 -1
  cursor: number // textarea의 selectionStart. 커서 옆 괄호와 짝에 테두리
  ref?: Ref<HTMLPreElement> // Editor가 scrollTop·scrollLeft를 맞출 때 쓴다
}

// 색 표시 층. textarea 뒤에 겹쳐 놓고, 사용자는 이 층의 글자를 보고 textarea에 입력한다.
// 토큰 색(주석 초록, 문자열·문자 주황), 괄호 색과 오류 표시, 커서 옆 괄호 테두리를 그린다.
// 검색 배경(11/28)은 다음에 더한다.
export default function HighlightLayer({ code, report, cursor, ref }: HighlightLayerProps) {
  const [activeAt, activePartner] = report ? activePairAt(cursor) : NO_PAIR

  // 본문이 바뀌거나 테두리를 그릴 괄호가 바뀔 때만 다시 나눈다. 커서가 괄호 밖에서만 움직이면 다시 계산하지 않는다.
  const segments = useMemo(
    () =>
      report
        ? segmentsOf(
            code,
            report.tokens,
            report.brackets,
            activeAt >= 0 ? [activeAt, activePartner] : [],
          )
        : [{ text: code, className: null }],
    [code, report, activeAt, activePartner],
  )

  return (
    <pre className="highlight-layer" ref={ref} aria-hidden="true">
      {segments.map((s, i) =>
        s.className ? (
          <span key={i} className={s.className}>
            {s.text}
          </span>
        ) : (
          s.text
        ),
      )}
      {/* 본문이 줄바꿈으로 끝나면 <pre>는 마지막 빈 줄에 높이를 주지 않는다.
          textarea와 높이를 맞추기 위해 끝에 공백 한 글자를 더한다. */}
      {code.endsWith('\n') ? ' ' : null}
    </pre>
  )
}

const NO_PAIR = [-1, -1] as const

// 커서 바로 앞이나 뒤 글자가 짝이 있는 괄호이면 [그 괄호 위치, 짝 위치]. 둘 다 괄호이면 앞 글자를 먼저 본다.
// 예: f(a)| 에서는 )와 (, |(a) 에서는 (와 ). 짝은 SyntaxChecker가 검사할 때 만든 pairs에서 바로 찾는다.
// report는 useSyntaxReport가 같은 검사기로 만든 것이므로 partnerOf()도 같은 본문의 결과이다.
function activePairAt(cursor: number): readonly [number, number] {
  for (const offset of [cursor - 1, cursor]) {
    const partner = syntaxChecker.partnerOf(offset)
    if (partner !== null) return [offset, partner]
  }
  return NO_PAIR
}
