import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoSaver } from './AutoSaver'
import { FileManager } from './FileManager'
import { StorageService } from './StorageService'

describe('AutoSaver', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('U-32 가짜 타이머로 15초 진행: 변경이 있을 때만 saveAllDirty()를 1회 호출한다', () => {
    const fm = new FileManager(new StorageService())
    const saveAll = vi.spyOn(fm, 'saveAllDirty')
    const onSaved = vi.fn()
    const saver = new AutoSaver(fm, onSaved)
    const { id } = fm.create('Main', 'c')
    saver.start()

    vi.advanceTimersByTime(15_000) // 변경 없음 → 건너뜀
    expect(saveAll).not.toHaveBeenCalled()

    fm.updateContent(id, 'int a;') // 타이머를 만든 뒤 바뀐 내용
    vi.advanceTimersByTime(14_999)
    expect(saveAll).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(saveAll).toHaveBeenCalledOnce()
    expect(onSaved).toHaveBeenCalledWith({ saved: 1, error: null })
    expect(fm.hasDirty()).toBe(false)
    expect(fm.storedFiles()[0].content).toBe('int a;')

    vi.advanceTimersByTime(15_000) // 이미 저장됨 → 다시 부르지 않음
    expect(saveAll).toHaveBeenCalledOnce()
  })

  it('start를 두 번 불러도 타이머는 하나이고, stop 뒤에는 저장하지 않는다', () => {
    const fm = new FileManager(new StorageService())
    const onSaved = vi.fn()
    const saver = new AutoSaver(fm, onSaved)
    const { id } = fm.create('Main', 'c')
    saver.start()
    saver.start()
    fm.updateContent(id, 'x')
    vi.advanceTimersByTime(15_000)
    expect(onSaved).toHaveBeenCalledOnce()

    saver.stop()
    expect(saver.running).toBe(false)
    fm.updateContent(id, 'y')
    vi.advanceTimersByTime(30_000)
    expect(onSaved).toHaveBeenCalledOnce()
  })
})
