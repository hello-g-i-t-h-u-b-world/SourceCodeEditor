import { useRef } from 'react'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  onCursorChange: (line: number, column: number) => void
}

export default function Editor({ content, onChange, onCursorChange }: EditorProps) {
  const gutterRef = useRef<HTMLDivElement>(null)
  const lineCount = content.split('\n').length

  const reportCursor = (el: HTMLTextAreaElement) => {
    const before = el.value.slice(0, el.selectionStart).split('\n')
    onCursorChange(before.length, before[before.length - 1].length + 1)
  }

  return (
    <div className="editor">
      <div className="gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        className="code-area"
        value={content}
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value)
          reportCursor(e.target)
        }}
        onSelect={(e) => reportCursor(e.currentTarget)}
        onScroll={(e) => {
          if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop
        }}
      />
    </div>
  )
}
