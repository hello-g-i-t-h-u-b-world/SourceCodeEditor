import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from './components/ConfirmDialog'
import Editor, { type EditorHandle } from './components/Editor'
import FindReplacePanel from './components/FindReplacePanel'
import NewFileDialog from './components/NewFileDialog'
import OpenDialog from './components/OpenDialog'
import StatusBar from './components/StatusBar'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import { useSyntaxReport } from './hooks/useSyntaxReport'
import { AutoSaver } from './logic/AutoSaver'
import { FileError, FileManager } from './logic/FileManager'
import { StorageService, type StoredFile } from './logic/StorageService'
import { autoSavedStatus, koreanTime, syntaxStatus } from './statusMessages'
import { fullName, languageOf, type EditorFile } from './types'
import './App.css'

// 지금 떠 있는 대화상자
type Dialog =
  | null
  | { kind: 'new' }
  | { kind: 'open'; files: StoredFile[]; error: string | null }
  | { kind: 'close'; file: EditorFile } // 저장 안 된 탭 닫기 확인
  | { kind: 'exit' } // 저장 안 된 파일이 있을 때 종료 확인
  | { kind: 'delete'; file: StoredFile } // 저장소 파일 삭제 확인(FR-07)

const messageOf = (e: unknown) => (e instanceof FileError ? e.message : String(e))

// 저장 공간이 부족하면 다운로드하거나 열기 창에서 파일을 지우도록 안내한다(2.5 저장·자동 저장)
const withHint = (message: string) =>
  message.includes('저장 공간 부족') ? `${message} — 다운로드하거나 열기 창에서 파일을 삭제하세요` : message

function App() {
  // FileManager는 처음 한 번만 만든다. 렌더링마다 새로 만들면 열린 파일 목록이 사라진다(3.3 React와 연결하는 방법).
  // 만들 때 마지막에 열려 있던 탭을 복원한다(FR-09). 설계서는 useRef였지만, 렌더링 중 ref를 읽지 않도록
  // 처음 한 번만 실행되는 useState 초기화 함수로 만든다(효과는 같다).
  const [fm] = useState(() => new FileManager(new StorageService()))
  const [restored] = useState(() => fm.loadSession())

  // 메서드를 부른 뒤 바뀐 목록을 React 상태로 복사해 다시 그린다.
  const [files, setFiles] = useState<EditorFile[]>(fm.files)
  const [activeId, setActiveId] = useState<string | null>(fm.activeId)
  const sync = () => {
    setFiles(fm.files)
    setActiveId(fm.activeId)
  }

  // 검색 결과로 옮길 때 editorRef.current.selectRange(start, end)를 부른다(SearchEngine 연결 때 사용)
  const editorRef = useRef<EditorHandle>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [newFileError, setNewFileError] = useState<string | null>(null)
  const [showFind, setShowFind] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  // 상태 표시줄 오른쪽: 자동 저장 시각, 저장 실패·열기 실패 안내
  const [notice, setNotice] = useState(restored.error ?? '자동 저장: 15초마다')

  const activeFile = files.find((f) => f.id === activeId) ?? null
  const hasDirty = files.some((f) => f.isDirty)

  // 색 표시·문법 검사 결과. C 파일이 아니면 null
  const report = useSyntaxReport(activeFile?.content, activeFile?.extension)

  // FR-08 자동 저장: 15초마다 바뀐 파일만 저장한다.
  useEffect(() => {
    const saver = new AutoSaver(fm, (result) => {
      setFiles(fm.files)
      setNotice(result.error ? withHint(result.error) : autoSavedStatus(new Date()))
    })
    saver.start()
    return () => saver.stop()
  }, [fm])

  // 저장 안 된 파일이 있는데 브라우저 탭을 닫거나 새로고침하면 경고한다(2.5 브라우저)
  useEffect(() => {
    if (!hasDirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasDirty])

  // FR-04 저장: 저장 버튼과 Ctrl+S
  const handleSave = () => {
    if (!activeId) return
    try {
      fm.save(activeId)
      setNotice(`저장됨 ${koreanTime(new Date())}`)
    } catch (e) {
      setNotice(withHint(messageOf(e))) // ● 표시는 그대로 남는다
    }
    sync()
  }

  // FR-06 다운로드
  const handleDownload = () => {
    if (activeId) fm.download(activeId)
  }

  // FR-01 새 파일
  const handleCreate = (name: string, extension: string) => {
    try {
      fm.create(name, extension)
      sync()
      setDialog(null)
      setNewFileError(null)
    } catch (e) {
      setNewFileError(messageOf(e)) // "이미 있는 파일입니다" 등은 창 안에 보여 준다
    }
  }

  // FR-02 열기: 저장소 목록 창을 띄운다
  const handleOpen = () => {
    try {
      setDialog({ kind: 'open', files: fm.storedFiles(), error: null })
    } catch (e) {
      setDialog({ kind: 'open', files: [], error: messageOf(e) })
    }
  }

  // FR-07 파일 삭제: 확인 후 저장소에서 지우고, 열려 있으면 탭도 닫는다. 끝나면 목록으로 돌아간다.
  const deleteStored = (file: StoredFile) => {
    try {
      fm.remove(file.id)
    } catch (e) {
      setNotice(messageOf(e))
    }
    sync()
    handleOpen()
  }

  const handleOpenStored = (id: string) => {
    try {
      fm.openStored(id)
      sync()
      setDialog(null)
    } catch (e) {
      setNotice(messageOf(e))
    }
  }

  const handleOpenLocal = async (picked: File[]) => {
    setDialog(null)
    const { failed } = await fm.openFiles(picked)
    sync()
    if (failed === 0) return
    setNotice(
      picked.length === 1
        ? '열 수 없는 파일입니다(1MB 이하의 UTF-8 텍스트만 지원)'
        : `${picked.length}개 중 ${failed}개를 열지 못했습니다`,
    )
  }

  // FR-03 닫기: 저장 안 된 파일이면 먼저 묻는다
  const handleClose = (id: string) => {
    const file = files.find((f) => f.id === id)
    if (!file) return
    if (file.isDirty) {
      setDialog({ kind: 'close', file })
      return
    }
    fm.close(id)
    sync()
  }

  const closeAfterSave = (id: string) => {
    try {
      fm.save(id)
    } catch (e) {
      setNotice(messageOf(e)) // 저장하지 못하면 닫지 않는다
      sync()
      setDialog(null)
      return
    }
    fm.close(id)
    sync()
    setDialog(null)
  }

  // FR-05 종료: 저장 안 된 파일이 있으면 묻고, 모든 탭을 닫아 빈 화면을 보여 준다
  const handleExit = () => {
    if (files.length === 0) return // 열린 탭이 없으면 아무것도 하지 않는다
    if (hasDirty) {
      setDialog({ kind: 'exit' })
      return
    }
    fm.closeAll()
    sync()
  }

  const exitAfterSave = () => {
    const { error } = fm.saveAllDirty()
    setDialog(null)
    if (error) {
      setNotice(error) // 하나라도 저장하지 못하면 종료하지 않는다
      sync()
      return
    }
    fm.closeAll()
    sync()
  }

  const exitWithoutSave = () => {
    fm.closeAll()
    sync()
    setDialog(null)
  }

  // TODO(이재성): 단어 검색 — SearchEngine 연결
  const handleFind = (_query: string) => {}

  // TODO(이재성): 모두 바꾸기 — SearchEngine 연결
  const handleReplaceAll = (_query: string, _replacement: string) => {}

  const handleChange = (content: string) => {
    if (!activeId) return
    fm.updateContent(activeId, content)
    sync()
  }

  // 단축키: Ctrl+F 검색/바꾸기 창, Ctrl+S 저장 (ShortcutManager가 생기면 그쪽으로 옮긴다)
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
        hasFile={activeFile !== null}
        onNewFile={() => {
          setNewFileError(null)
          setDialog({ kind: 'new' })
        }}
        onOpen={handleOpen}
        onSave={handleSave}
        onDownload={handleDownload}
        onExit={handleExit}
      />
      <TabBar
        files={files}
        activeId={activeId}
        onSelect={(id) => {
          fm.setActive(id)
          sync()
        }}
        onClose={handleClose}
      />

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
            ref={editorRef}
            key={activeFile.id}
            content={activeFile.content}
            report={report}
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
        syntaxMessage={syntaxStatus(report, activeFile !== null)}
        syntaxError={(report?.issues.length ?? 0) > 0}
        autoSaveMessage={notice}
      />

      {dialog?.kind === 'new' && (
        <NewFileDialog error={newFileError} onCreate={handleCreate} onCancel={() => setDialog(null)} />
      )}
      {dialog?.kind === 'open' && (
        <OpenDialog
          files={dialog.files}
          error={dialog.error}
          onOpenStored={handleOpenStored}
          onOpenLocal={handleOpenLocal}
          onDelete={(file) => setDialog({ kind: 'delete', file })}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          message={`${dialog.file.name}.${dialog.file.extension}을(를) 저장소에서 삭제할까요? 되돌릴 수 없습니다`}
          note={fm.isOpen(dialog.file.id) ? '열려 있는 파일입니다. 삭제하면 탭도 닫힙니다.' : undefined}
          onCancel={handleOpen}
          choices={[
            { label: '삭제', primary: true, onClick: () => deleteStored(dialog.file) },
            { label: '취소', onClick: handleOpen },
          ]}
        />
      )}
      {dialog?.kind === 'close' && (
        <ConfirmDialog
          message={`${fullName(dialog.file)}의 변경 내용을 저장할까요?`}
          onCancel={() => setDialog(null)}
          choices={[
            { label: '저장 후 닫기', primary: true, onClick: () => closeAfterSave(dialog.file.id) },
            {
              label: '저장 안 하고 닫기', // 저장소의 이전 내용은 남는다
              onClick: () => {
                fm.close(dialog.file.id)
                sync()
                setDialog(null)
              },
            },
            { label: '취소', onClick: () => setDialog(null) },
          ]}
        />
      )}
      {dialog?.kind === 'exit' && (
        <ConfirmDialog
          message="저장하지 않은 파일이 있습니다"
          onCancel={() => setDialog(null)}
          choices={[
            { label: '저장 후 종료', primary: true, onClick: exitAfterSave },
            { label: '저장 안 하고 종료', onClick: exitWithoutSave },
            { label: '취소', onClick: () => setDialog(null) },
          ]}
        />
      )}
    </div>
  )
}

export default App
