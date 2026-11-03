import { fullName, type EditorFile } from '../types'

interface TabBarProps {
  files: EditorFile[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export default function TabBar({ files, activeId, onSelect, onClose }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {files.map((file) => (
        <div
          key={file.id}
          className={`tab ${file.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(file.id)}
        >
          <span className="tab-name">
            {fullName(file)}
            {file.isDirty && <span className="dirty-dot"> ●</span>}
          </span>
          <button
            type="button"
            className="tab-close"
            title="닫기"
            onClick={(e) => {
              e.stopPropagation()
              onClose(file.id)
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </nav>
  )
}
