import type { EditorFile } from '../types'

// 설계서 2.4 브라우저 저장소(localStorage) 데이터 형식
export const STORAGE_KEYS = {
  files: 'editor-files', // { [id]: StoredFile } 저장된 모든 파일. 닫은 파일도 남는다
  openTabs: 'editor-open-tabs', // 지금 열려 있는 탭의 id 순서
  activeTab: 'editor-active-tab', // 마지막에 선택한 탭의 id
} as const

// 저장소에 기록하는 파일 하나. isDirty는 저장하지 않는다(저장소에 있는 것은 항상 저장된 내용).
export interface StoredFile {
  id: string
  name: string
  extension: string
  content: string
  savedAt: string
}

export interface Session {
  openTabs: string[]
  activeId: string | null
}

// 저장소 데이터를 읽지 못했을 때(JSON 해석 실패 등) 던진다. 2.5 예외 처리 "복원"
export class StorageReadError extends Error {
  constructor() {
    super('저장된 데이터를 읽지 못했습니다')
    this.name = 'StorageReadError'
  }
}

// localStorage 읽기·쓰기를 전담한다. 다른 클래스는 localStorage를 직접 다루지 않는다(설계서 3.3).
// 쓰기 실패(용량 초과 QuotaExceededError 등)는 잡지 않고 그대로 던져 FileManager가 처리하게 한다.
export class StorageService {
  private readonly storage: Storage

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage
  }

  // 파일 하나를 기록한다. 같은 id가 있으면 덮어쓴다.
  save(file: EditorFile, savedAt: string): StoredFile {
    const all = this.readFiles()
    const stored: StoredFile = {
      id: file.id,
      name: file.name,
      extension: file.extension,
      content: file.content,
      savedAt,
    }
    all[file.id] = stored
    this.storage.setItem(STORAGE_KEYS.files, JSON.stringify(all))
    return stored
  }

  load(id: string): StoredFile | null {
    return this.readFiles()[id] ?? null
  }

  // 저장된 모든 파일. 열기 창의 목록에 쓴다(최근 저장한 것이 앞).
  loadAll(): StoredFile[] {
    return Object.values(this.readFiles()).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }

  remove(id: string): void {
    const all = this.readFiles()
    if (!(id in all)) return
    delete all[id]
    this.storage.setItem(STORAGE_KEYS.files, JSON.stringify(all))
  }

  saveSession(openTabs: string[], activeId: string | null): void {
    this.storage.setItem(STORAGE_KEYS.openTabs, JSON.stringify(openTabs))
    if (activeId === null) this.storage.removeItem(STORAGE_KEYS.activeTab)
    else this.storage.setItem(STORAGE_KEYS.activeTab, activeId)
  }

  loadSession(): Session {
    const tabs = this.parse(this.storage.getItem(STORAGE_KEYS.openTabs), [] as unknown)
    if (!Array.isArray(tabs) || !tabs.every((t) => typeof t === 'string')) throw new StorageReadError()
    return { openTabs: tabs, activeId: this.storage.getItem(STORAGE_KEYS.activeTab) }
  }

  private readFiles(): Record<string, StoredFile> {
    const data = this.parse(this.storage.getItem(STORAGE_KEYS.files), {} as unknown)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new StorageReadError()
    return data as Record<string, StoredFile>
  }

  private parse(raw: string | null, fallback: unknown): unknown {
    if (raw === null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      throw new StorageReadError()
    }
  }
}
