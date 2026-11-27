import { fullName, type EditorFile } from '../types'
import { StorageReadError, StorageService, type StoredFile } from './StorageService'

// 파일 하나의 최대 크기(설계서 2.3 저장 용량, 2.4 열 파일)
export const MAX_FILE_BYTES = 1024 * 1024

// 새 파일 이름 규칙(설계서 2.4 입력): 1~50자, 한글·영문·숫자·_·- 만. 확장자: 1~10자 영문·숫자
const NAME_RULE = /^[0-9A-Za-z가-힣_-]{1,50}$/
const EXT_RULE = /^[0-9A-Za-z]{1,10}$/

// 사용자에게 보여 줄 문구를 담은 오류. App은 message를 그대로 안내 문구나 상태바에 띄운다.
export class FileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileError'
  }
}

export interface SaveAllResult {
  saved: number
  error: string | null // 하나라도 실패하면 첫 실패 문구
}

export interface OpenResult {
  opened: number
  failed: number
}

export interface RestoreResult {
  restored: number
  error: string | null
}

// 새 파일 창의 입력을 검사한다. 문제가 없으면 null, 있으면 안내 문구(설계서 2.5 새 파일)
export function validateNewFile(name: string, extension: string): string | null {
  if (name === '' || extension === '') return '파일명과 확장자를 입력하세요'
  if (!NAME_RULE.test(name)) return '파일명에 쓸 수 없는 문자가 있습니다'
  if (!EXT_RULE.test(extension)) return '확장자는 1~10자의 영문·숫자만 쓸 수 있습니다'
  return null
}

// 저장 실패 문구. 용량 초과는 따로 알려 준다(2.5 저장·자동 저장)
function saveErrorMessage(error: unknown): string {
  const quota =
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  return quota ? '저장 실패: 저장 공간 부족' : '저장 실패: 브라우저 저장소를 쓸 수 없습니다'
}

// "sort.c" → { name: "sort", extension: "c" }. 확장자가 없으면 txt로 본다(2.4 열 파일)
export function splitFileName(fileName: string): { name: string; extension: string } {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0 || dot === fileName.length - 1) {
    return { name: dot === fileName.length - 1 ? fileName.slice(0, -1) : fileName, extension: 'txt' }
  }
  return { name: fileName.slice(0, dot), extension: fileName.slice(dot + 1) }
}

const toEditorFile = (s: StoredFile): EditorFile => ({
  id: s.id,
  name: s.name,
  extension: s.extension,
  content: s.content,
  isDirty: false,
  savedAt: s.savedAt,
})

// 열린 파일 목록(탭)과 현재 탭을 관리한다(설계서 3.3 FileManager).
// 목록과 파일 객체는 바꿀 때마다 새로 만든다. App은 메서드를 부른 뒤 files·activeId를 React 상태로 복사해 다시 그린다.
export class FileManager {
  private readonly storage: StorageService
  private readonly now: () => Date
  private readonly newId: () => string
  private _files: EditorFile[] = []
  private _activeId: string | null = null

  constructor(
    storage: StorageService,
    options: { now?: () => Date; newId?: () => string } = {},
  ) {
    this.storage = storage
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  get files(): EditorFile[] {
    return this._files
  }

  get activeId(): string | null {
    return this._activeId
  }

  get activeFile(): EditorFile | null {
    return this._files.find((f) => f.id === this._activeId) ?? null
  }

  // 열기 창의 저장소 파일 목록
  storedFiles(): StoredFile[] {
    return this.storage.loadAll()
  }

  setActive(id: string): void {
    if (!this._files.some((f) => f.id === id) || id === this._activeId) return
    this._activeId = id
    this.saveSessionQuietly()
  }

  // FR-01 새 파일: 빈 파일을 새 탭으로 만들고 저장소에 바로 기록한다.
  create(name: string, extension: string): EditorFile {
    const ext = extension.replace(/^\./, '')
    const problem = validateNewFile(name, ext)
    if (problem) throw new FileError(problem)
    if (this.nameTaken(`${name}.${ext}`)) throw new FileError('이미 있는 파일입니다')

    const file: EditorFile = { id: this.newId(), name, extension: ext, content: '', isDirty: false, savedAt: null }
    // 저장 공간이 없으면 FileError를 던지고 탭을 만들지 않는다
    const opened = { ...file, savedAt: this.write(file) }
    this.addTab(opened)
    return opened
  }

  // FR-02 저장소 파일 열기. 이미 열려 있으면 그 탭으로 옮긴다.
  openStored(id: string): EditorFile {
    const open = this._files.find((f) => f.id === id)
    if (open) {
      this.setActive(id)
      return open
    }
    const stored = this.storage.load(id)
    if (!stored) throw new FileError('저장소에 없는 파일입니다')
    this.addTab(toEditorFile(stored))
    return this.activeFile!
  }

  // FR-02 내 컴퓨터 파일 열기(여러 개 가능). 열 수 있는 것만 열고 개수를 돌려준다.
  // 1MB 이하의 UTF-8 텍스트만 열고, CRLF는 LF로 바꾼다. 연 파일은 바로 저장소에 기록한다.
  // 저장소나 열린 탭에 같은 이름이 있으면 덮어쓰지 않고 이름 뒤에 _2, _3 …을 붙인다.
  async openFiles(files: File[]): Promise<OpenResult> {
    let opened = 0
    let failed = 0
    for (const file of files) {
      const content = await readUtf8(file)
      if (content === null) {
        failed += 1
        continue
      }
      const { name, extension } = splitFileName(file.name)
      const entry: EditorFile = {
        id: this.newId(),
        name: this.uniqueName(name, extension),
        extension,
        content,
        isDirty: false,
        savedAt: null,
      }
      try {
        this.addTab({ ...entry, savedAt: this.write(entry) })
        opened += 1
      } catch {
        failed += 1
      }
    }
    return { opened, failed }
  }

  // 입력할 때마다 부른다. 내용이 바뀌면 ● 표시(isDirty)를 켠다.
  updateContent(id: string, content: string): void {
    this._files = this._files.map((f) => (f.id === id && f.content !== content ? { ...f, content, isDirty: true } : f))
  }

  // FR-04 저장. 저장 버튼, Ctrl+S, 자동 저장이 모두 이 메서드를 거친다(설계서 3.4 5).
  // 실패하면 isDirty를 그대로 두고 FileError를 던진다.
  save(id: string): EditorFile {
    const file = this.findFile(id)
    if (!file) throw new FileError('열려 있지 않은 파일입니다')
    const saved = { ...file, isDirty: false, savedAt: this.write(file) }
    this._files = this._files.map((f) => (f.id === id ? saved : f))
    return saved
  }

  hasDirty(): boolean {
    return this._files.some((f) => f.isDirty)
  }

  // 바뀐 파일만 모두 저장한다. 자동 저장(FR-08)과 "저장 후 종료"에서 쓴다.
  saveAllDirty(): SaveAllResult {
    let saved = 0
    let error: string | null = null
    for (const file of this._files.filter((f) => f.isDirty)) {
      try {
        this.save(file.id)
        saved += 1
      } catch (e) {
        error ??= e instanceof FileError ? e.message : String(e)
      }
    }
    return { saved, error }
  }

  // FR-03 닫기: 탭만 닫는다. 파일은 저장소에 남는다. 저장 확인은 App이 먼저 묻는다.
  close(id: string): void {
    const index = this._files.findIndex((f) => f.id === id)
    if (index < 0) return
    this._files = this._files.filter((f) => f.id !== id)
    if (this._activeId === id) {
      this._activeId = this._files[Math.min(index, this._files.length - 1)]?.id ?? null
    }
    this.saveSessionQuietly()
  }

  // FR-05 종료: 열린 탭을 모두 닫는다.
  closeAll(): void {
    this._files = []
    this._activeId = null
    this.saveSessionQuietly()
  }

  // FR-07 파일 삭제: 저장소에서 지운다. 탭으로 열려 있으면 탭도 함께 닫는다(2.2 파일 삭제 흐름).
  // 확인 창은 App이 먼저 띄운다. 되돌릴 수 없다.
  remove(id: string): void {
    try {
      this.storage.remove(id)
    } catch {
      throw new FileError('삭제 실패: 브라우저 저장소를 쓸 수 없습니다')
    }
    this.close(id)
  }

  isOpen(id: string): boolean {
    return this._files.some((f) => f.id === id)
  }

  // FR-06 다운로드: 지금 편집 중인 내용을 "파일명.확장자"로 내려받는다. 저장 상태(●)는 바꾸지 않는다.
  download(id: string): void {
    const file = this.findFile(id)
    if (!file) return
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fullName(file)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // FR-09 작업 복원: 마지막에 열려 있던 탭과 선택한 탭을 다시 연다.
  // 저장소에 없는 id는 건너뛰고, 데이터가 손상됐으면 빈 상태로 시작한다(2.5 복원).
  loadSession(): RestoreResult {
    try {
      const { openTabs, activeId } = this.storage.loadSession()
      const files = openTabs
        .map((id) => this.storage.load(id))
        .filter((s): s is StoredFile => s !== null)
        .map(toEditorFile)
      this._files = files
      this._activeId = files.some((f) => f.id === activeId) ? activeId : (files[0]?.id ?? null)
      return { restored: files.length, error: null }
    } catch (e) {
      this._files = []
      this._activeId = null
      return { restored: 0, error: e instanceof StorageReadError ? e.message : '저장된 데이터를 읽지 못했습니다' }
    }
  }

  // ───────── 내부 도우미 ─────────

  private findFile(id: string): EditorFile | undefined {
    return this._files.find((f) => f.id === id)
  }

  // 저장소에 기록하고 저장 시각을 돌려준다. 실패하면 사용자용 문구를 담은 FileError
  private write(file: EditorFile): string {
    try {
      return this.storage.save(file, this.now().toISOString()).savedAt
    } catch (e) {
      throw new FileError(saveErrorMessage(e))
    }
  }

  private addTab(file: EditorFile): void {
    this._files = [...this._files, file]
    this._activeId = file.id
    this.saveSessionQuietly()
  }

  // "파일명.확장자"가 저장소나 열린 탭에 이미 있는지
  private nameTaken(full: string): boolean {
    let stored: StoredFile[] = []
    try {
      stored = this.storage.loadAll()
    } catch {
      // 저장소를 읽지 못하면 열린 탭만 본다
    }
    return [...stored, ...this._files].some((f) => `${f.name}.${f.extension}` === full)
  }

  private uniqueName(name: string, extension: string): string {
    if (!this.nameTaken(`${name}.${extension}`)) return name
    for (let n = 2; ; n += 1) {
      const candidate = `${name}_${n}`
      if (!this.nameTaken(`${candidate}.${extension}`)) return candidate
    }
  }

  // 탭 상태 기록은 실패해도 편집을 막지 않는다(다음 저장 때 다시 기록된다).
  private saveSessionQuietly(): void {
    try {
      this.storage.saveSession(
        this._files.map((f) => f.id),
        this._activeId,
      )
    } catch {
      // 저장 공간 부족 등은 무시한다
    }
  }
}

// 1MB 이하의 UTF-8 텍스트이면 내용(줄바꿈은 LF), 아니면 null
async function readUtf8(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_BYTES) return null
  try {
    const bytes = await file.arrayBuffer()
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return text.replace(/\r\n?/g, '\n')
  } catch {
    return null
  }
}
