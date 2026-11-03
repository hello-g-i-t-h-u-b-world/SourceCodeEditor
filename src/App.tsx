import { useEffect, useState } from 'react'
import Editor from './components/Editor'
import FindReplacePanel from './components/FindReplacePanel'
import NewFileDialog from './components/NewFileDialog'
import StatusBar from './components/StatusBar'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import { languageOf, type EditorFile } from './types'
import './App.css'

// UI 확인용 샘플 파일
const sampleFiles: EditorFile[] = [
  {
    id: '1',
    name: 'Main',
    extension: 'c',
    content: '#include <stdio.h>\n\n/* 프로그램 시작 */\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    isDirty: false,
  },
  {
    id: '2',
    name: 'file1',
    extension: 'c',
    content: '// file1.c\nint add(int a, int b) {\n    return a + b;\n}\n',
    isDirty: false,
  },
]

function App() {
  const [files, setFiles] = useState<EditorFile[]>(sampleFiles)
  const [activeId, setActiveId] = useState<string | null>(sampleFiles[0].id)
  const [showNewFile, setShowNewFile] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })

  const activeFile = files.find((f) => f.id === activeId) ?? null

  // TODO: 저장 로직 구현 (저장 버튼 / Ctrl+S / 15초 자동 저장에서 공통 사용)
  const handleSave = () => {}

  // TODO: 파일 탐색기 열고 파일 내용 + 확장자 읽기
  const handleOpen = () => {}

  // TODO: 프로그램 종료
  const handleExit = () => {}

  // TODO: 단어 검색
  const handleFind = (_query: string) => {}

  // TODO: 단어 전부 바꾸기
  const handleReplaceAll = (_query: string, _replacement: string) => {}

  const handleCreate = (name: string, extension: string) => {
    const file: EditorFile = { id: crypto.randomUUID(), name, extension, content: '', isDirty: false }
    setFiles((prev) => [...prev, file])
    setActiveId(file.id)
    setShowNewFile(false)
  }

  const handleClose = (id: string) => {
    const index = files.findIndex((f) => f.id === id)
    const remaining = files.filter((f) => f.id !== id)
    setFiles(remaining)
    if (id === activeId) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
    }
  }

  const handleChange = (content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeId ? { ...f, content, isDirty: true } : f)),
    )
  }

  // 단축키: Ctrl+F 검색/바꾸기 창, Ctrl+S 저장
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        e.preventDefault() // 브라우저 기본 검색창 막기
        setShowFind(true)
      } else if (key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="app">
      <Toolbar
        onNewFile={() => setShowNewFile(true)}
        onOpen={handleOpen}
        onSave={handleSave}
        onExit={handleExit}
      />
      <TabBar files={files} activeId={activeId} onSelect={setActiveId} onClose={handleClose} />

      <main className="workspace">
        {showFind && (
          <FindReplacePanel
            matchCount={null}
            onFind={handleFind}
            onReplaceAll={handleReplaceAll}
            onClose={() => setShowFind(false)}
          />
        )}
        {activeFile ? (
          <Editor
            key={activeFile.id}
            content={activeFile.content}
            onChange={handleChange}
            onCursorChange={(line, column) => setCursor({ line, column })}
          />
        ) : (
          <div className="empty-state">
            <p>열린 파일이 없습니다.</p>
            <p>
              <b>새파일</b> 또는 <b>열기</b> 버튼으로 시작하세요.
            </p>
          </div>
        )}
      </main>

      <StatusBar
        language={activeFile ? languageOf(activeFile.extension) : '-'}
        line={cursor.line}
        column={cursor.column}
        syntaxMessage="문법 검사: 대기 중"
        autoSaveMessage="자동 저장: 15초"
      />

      {showNewFile && (
        <NewFileDialog onCreate={handleCreate} onCancel={() => setShowNewFile(false)} />
      )}
    </div>
  )
}

export default App
