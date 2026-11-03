interface ToolbarProps {
  onNewFile: () => void
  onOpen: () => void
  onSave: () => void
  onExit: () => void
}

export default function Toolbar({ onNewFile, onOpen, onSave, onExit }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-buttons">
        <button type="button" onClick={onNewFile} title="새 파일">
          새파일
        </button>
        <button type="button" onClick={onOpen} title="열기">
          열기
        </button>
        <button type="button" onClick={onSave} title="저장 (Ctrl+S)">
          저장
        </button>
      </div>
      <span className="toolbar-title">프로그램 소스 편집기</span>
      <button type="button" className="exit-button" onClick={onExit} title="종료">
        ✕
      </button>
    </header>
  )
}
