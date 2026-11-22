import type { Ref } from 'react'
import type { Match, SyntaxReport } from '../types'
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
// 지금은 골격 단계라 본문을 그대로 그린다. 토큰 색(11/24), 괄호 색(11/26), 검색 배경(11/28)을 차례로 더한다.
export default function HighlightLayer({ code, ref }: HighlightLayerProps) {
  // 본문이 줄바꿈으로 끝나면 <pre>는 마지막 빈 줄에 높이를 주지 않는다.
  // textarea와 높이를 맞추기 위해 끝에 공백 한 글자를 더한다.
  const text = code.endsWith('\n') ? `${code} ` : code

  return (
    <pre className="highlight-layer" ref={ref} aria-hidden="true">
      {text}
    </pre>
  )
}
