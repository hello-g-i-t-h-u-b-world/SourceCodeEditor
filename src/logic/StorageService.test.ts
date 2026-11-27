import { beforeEach, describe, expect, it } from 'vitest'
import type { EditorFile } from '../types'
import { STORAGE_KEYS, StorageReadError, StorageService } from './StorageService'

const file = (id: string, name = 'Main', content = ''): EditorFile => ({
  id,
  name,
  extension: 'c',
  content,
  isDirty: true,
})

describe('StorageService', () => {
  beforeEach(() => localStorage.clear())

  it('파일을 설계서 2.4 형식(editor-files)으로 기록하고 다시 읽는다', () => {
    const storage = new StorageService()
    storage.save(file('a', 'Main', 'int a;'), '2026-11-26T10:00:00.000Z')

    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.files)!)
    expect(raw.a).toEqual({
      id: 'a',
      name: 'Main',
      extension: 'c',
      content: 'int a;',
      savedAt: '2026-11-26T10:00:00.000Z',
    })
    expect(storage.load('a')?.content).toBe('int a;')
    expect(storage.load('없음')).toBeNull()
  })

  it('loadAll은 최근에 저장한 파일이 앞에 온다', () => {
    const storage = new StorageService()
    storage.save(file('a', 'Old'), '2026-11-26T10:00:00.000Z')
    storage.save(file('b', 'New'), '2026-11-26T11:00:00.000Z')
    expect(storage.loadAll().map((f) => f.name)).toEqual(['New', 'Old'])
  })

  it('remove는 그 파일만 지운다', () => {
    const storage = new StorageService()
    storage.save(file('a'), '2026-11-26T10:00:00.000Z')
    storage.save(file('b', 'Sub'), '2026-11-26T10:00:00.000Z')
    storage.remove('a')
    expect(storage.loadAll().map((f) => f.id)).toEqual(['b'])
  })

  it('열린 탭 목록과 선택한 탭을 기록하고 읽는다', () => {
    const storage = new StorageService()
    expect(storage.loadSession()).toEqual({ openTabs: [], activeId: null })
    storage.saveSession(['a', 'b'], 'b')
    expect(storage.loadSession()).toEqual({ openTabs: ['a', 'b'], activeId: 'b' })
    storage.saveSession([], null)
    expect(storage.loadSession()).toEqual({ openTabs: [], activeId: null })
  })

  it('저장소 데이터가 손상되면 StorageReadError를 던진다', () => {
    const storage = new StorageService()
    localStorage.setItem(STORAGE_KEYS.files, '{깨진 JSON')
    expect(() => storage.loadAll()).toThrow(StorageReadError)
    localStorage.setItem(STORAGE_KEYS.openTabs, '"문자열"')
    expect(() => storage.loadSession()).toThrow(StorageReadError)
  })
})
