import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SyntaxReport } from '../types'
import HighlightLayer from './HighlightLayer'

interface EditorProps {
  content: string
  report: SyntaxReport | null // C 파일이 아니면 null → 색 없이 그린다
  onChange: (content: string) => void
  onCursorChange: (line: number, column: number) => void
}

export default function Editor({ content, report, onChange, onCursorChange }: EditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const layerRef = useRef<HTMLPreElement>(null)
  const [caret, setCaret] = useState(0) // selectionStart. 색 표시 층이 커서 옆 괄호를 찾을 때 쓴다(11/26)
  const lineCount = content.split('\n').length

  const reportCursor = (el: HTMLTextAreaElement) => {
    const before = el.value.slice(0, el.selectionStart).split('\n')
    onCursorChange(before.length, before[before.length - 1].length + 1)
    setCaret(el.selectionStart)
  }

  // 색 표시 층과 줄 번호를 textarea의 스크롤 위치에 맞춘다.
  // textarea는 스크롤바가 생기면 그만큼 보이는 영역이 줄어든다. 두 층도 같은 크기만큼 줄여야
  // 맨 끝까지 스크롤했을 때 최대 스크롤 값이 같아져 글자가 어긋나지 않는다.
  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const scrollbarX = textarea.offsetHeight - textarea.clientHeight // 가로 스크롤바 높이
    const scrollbarY = textarea.offsetWidth - textarea.clientWidth // 세로 스크롤바 너비

    const layer = layerRef.current
    if (layer) {
      layer.style.bottom = `${scrollbarX}px`
      layer.style.right = `${scrollbarY}px`
      layer.scrollTop = textarea.scrollTop
      layer.scrollLeft = textarea.scrollLeft
    }
    const gutter = gutterRef.current
    if (gutter) {
      gutter.style.marginBottom = `${scrollbarX}px`
      gutter.scrollTop = textarea.scrollTop
    }
  }, [])

  // 본문이 바뀌면 스크롤바가 생기거나 없어질 수 있으므로 그릴 때마다 다시 맞춘다.
  useLayoutEffect(syncScroll)

  // 창 크기가 바뀌어도 다시 맞춘다.
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const observer = new ResizeObserver(syncScroll)
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [syncScroll])

  return (
    <div className="editor">
      <div className="gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* 뒤: 색을 입힌 글자(<pre>), 앞: 글자를 투명하게 한 textarea. 입력·선택·이동은 textarea가 맡는다. */}
      <div className="code-wrap">
        <HighlightLayer
          ref={layerRef}
          code={content}
          report={report}
          matches={[]}
          currentMatch={-1}
          cursor={caret}
        />
        <textarea
          ref={textareaRef}
          className="code-area"
          value={content}
          spellCheck={false}
          onChange={(e) => {
            onChange(e.target.value)
            reportCursor(e.target)
          }}
          onSelect={(e) => reportCursor(e.currentTarget)}
          onScroll={syncScroll}
        />
      </div>
    </div>
  )
}
