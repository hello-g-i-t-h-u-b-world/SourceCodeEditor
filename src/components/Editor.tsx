import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import type { SyntaxReport } from '../types'
import { lineIndexOf, scrollTopFor } from './editorScroll'
import HighlightLayer from './HighlightLayer'

// App이 ref로 부르는 Editor 메서드. 검색(SearchEngine)이 돌려준 위치로 옮길 때 쓴다(이재성 요청 11/27).
export interface EditorHandle {
  // start~end를 선택하고, 그 줄이 보이지 않으면 화면 가운데로 스크롤한다. 편집 영역에 포커스를 주지 않으면
  // 검색 창 입력이 끊기므로 focus는 고를 수 있게 한다.
  selectRange(start: number, end: number, options?: { focus?: boolean }): void
  focus(): void
}

interface EditorProps {
  content: string
  report: SyntaxReport | null // C 파일이 아니면 null → 색 없이 그린다
  onChange: (content: string) => void
  onCursorChange: (line: number, column: number) => void
  ref?: Ref<EditorHandle>
}

const TAB = '    ' // Tab 키는 공백 4칸(FR-10)

export default function Editor({ content, report, onChange, onCursorChange, ref }: EditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const layerRef = useRef<HTMLPreElement>(null)
  const [caret, setCaret] = useState(0) // selectionStart. 색 표시 층이 커서 옆 괄호를 찾을 때 쓴다(11/26)
  const lineCount = content.split('\n').length
  // 오류가 있는 줄(1부터). 줄 번호 옆에 빨간 점을 찍는다(FR-17)
  const issueLines = useMemo(() => new Set(report?.issues.map((i) => i.line) ?? []), [report])

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

  useImperativeHandle(
    ref,
    () => ({
      selectRange(start, end, options = {}) {
        const el = textareaRef.current
        if (!el) return
        if (options.focus ?? true) el.focus({ preventScroll: true })
        el.setSelectionRange(start, end)
        el.scrollTop = scrollTopFor(lineIndexOf(el.value, start), el.scrollTop, el.clientHeight)
        syncScroll()
        reportCursor(el)
      },
      focus() {
        textareaRef.current?.focus()
      },
    }),
  )

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
          <div key={i} className={issueLines.has(i + 1) ? 'line-error' : undefined}>
            {i + 1}
          </div>
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
          onKeyDown={(e) => {
            // Tab만 기본 동작(포커스 이동)을 막고 공백 4칸을 넣는다. 나머지 이동·편집 키는 textarea 기본 동작(설계서 3.4 3)
            if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
            e.preventDefault()
            const el = e.currentTarget
            el.setRangeText(TAB, el.selectionStart, el.selectionEnd, 'end')
            onChange(el.value)
            reportCursor(el)
          }}
          onSelect={(e) => reportCursor(e.currentTarget)}
          onScroll={syncScroll}
        />
      </div>
    </div>
  )
}
