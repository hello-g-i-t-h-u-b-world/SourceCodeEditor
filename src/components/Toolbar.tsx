interface ToolbarProps {
  hasFile: boolean // 열린 파일이 없으면 저장·다운로드 버튼을 끈다(3.2 툴바)
  onNewFile: () => void
  onOpen: () => void
  onSave: () => void
  onDownload: () => void
  onExit: () => void
}

export default function Toolbar({ hasFile, onNewFile, onOpen, onSave, onDownload, onExit }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-buttons">
        <button type="button" onClick={onNewFile} title="새 파일">
          새파일
        </button>
        <button type="button" onClick={onOpen} title="열기">
          열기
        </button>
        <button type="button" onClick={onSave} disabled={!hasFile} title="저장 (Ctrl+S)">
          저장
        </button>
        <button type="button" onClick={onDownload} disabled={!hasFile} title="내 컴퓨터로 내려받기">
          다운로드
        </button>
      </div>
      <span className="toolbar-title">프로그램 소스 편집기</span>
      <button type="button" className="exit-button" onClick={onExit} title="종료">
        ✕
      </button>
    </header>
  )
}
