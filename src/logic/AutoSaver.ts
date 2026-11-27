import type { FileManager, SaveAllResult } from './FileManager'

// FR-08 자동 저장: 15초마다 바뀐 파일이 있을 때만 FileManager.saveAllDirty()를 부른다(설계서 3.4 5).
// 타이머는 React 상태가 아니라 FileManager에서 최신 내용을 읽으므로, 타이머를 만든 뒤 바뀐 내용도 저장된다.
export class AutoSaver {
  static readonly INTERVAL_MS = 15_000

  private readonly fileManager: FileManager
  private readonly onSaved: (result: SaveAllResult) => void
  private readonly intervalMs: number
  private timerId: ReturnType<typeof setInterval> | null = null

  constructor(
    fileManager: FileManager,
    onSaved: (result: SaveAllResult) => void,
    intervalMs: number = AutoSaver.INTERVAL_MS,
  ) {
    this.fileManager = fileManager
    this.onSaved = onSaved
    this.intervalMs = intervalMs
  }

  get running(): boolean {
    return this.timerId !== null
  }

  start(): void {
    if (this.timerId !== null) return // 두 번 불러도 타이머는 하나
    this.timerId = setInterval(() => this.tick(), this.intervalMs)
  }

  stop(): void {
    if (this.timerId === null) return
    clearInterval(this.timerId)
    this.timerId = null
  }

  // 한 주기. 바뀐 파일이 없으면 건너뛴다(2.5 자동 저장).
  tick(): void {
    if (!this.fileManager.hasDirty()) return
    this.onSaved(this.fileManager.saveAllDirty())
  }
}
