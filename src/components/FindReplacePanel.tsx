import { useState } from 'react'

interface FindReplacePanelProps {
  matchCount: number | null // 검색 결과 개수 (검색 기능 구현 전에는 null)
  onFind: (query: string) => void
  onReplaceAll: (query: string, replacement: string) => void
  onClose: () => void
}

export default function FindReplacePanel({
  matchCount,
  onFind,
  onReplaceAll,
  onClose,
}: FindReplacePanelProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')

  return (
    <div
      className="find-panel"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="find-row">
        <input
          autoFocus
          value={query}
          placeholder="찾기"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onFind(query)
          }}
        />
        <span className="match-count">{matchCount === null ? '' : `${matchCount}개`}</span>
        <button type="button" onClick={() => onFind(query)}>
          검색
        </button>
        <button type="button" className="find-close" title="닫기 (Esc)" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="find-row">
        <input
          value={replacement}
          placeholder="바꾸기"
          onChange={(e) => setReplacement(e.target.value)}
        />
        <button type="button" onClick={() => onReplaceAll(query, replacement)}>
          모두 바꾸기
        </button>
      </div>
    </div>
  )
}
