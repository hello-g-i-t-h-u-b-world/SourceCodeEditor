import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileError, FileManager, MAX_FILE_BYTES, splitFileName, validateNewFile } from './FileManager'
import { STORAGE_KEYS, StorageService } from './StorageService'

// 저장 시각과 id를 고정해 결과를 예측할 수 있게 한다.
function makeManager(storage = new StorageService()) {
  let n = 0
  return new FileManager(storage, {
    now: () => new Date('2026-11-26T10:00:00.000Z'),
    newId: () => `id${++n}`,
  })
}

// 정해진 키에 쓸 때 용량 초과를 흉내 내는 저장소
class FullStorage implements Storage {
  private data = new Map<string, string>()
  full = false
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.full && key === STORAGE_KEYS.files) throw new DOMException('full', 'QuotaExceededError')
    this.data.set(key, value)
  }
}

describe('FileManager', () => {
  beforeEach(() => localStorage.clear())

  it("U-24 create('Main', '.c')는 탭 1개를 활성 탭으로 만들고 저장소에도 기록한다", () => {
    const fm = makeManager()
    const file = fm.create('Main', '.c')
    expect(file).toMatchObject({ name: 'Main', extension: 'c', content: '', isDirty: false })
    expect(fm.files).toHaveLength(1)
    expect(fm.activeId).toBe(file.id)
    expect(fm.storedFiles().map((f) => `${f.name}.${f.extension}`)).toEqual(['Main.c'])
  })

  it('U-25 같은 Main.c를 한 번 더 만들면 "이미 있는 파일" 오류이고 파일 수는 그대로다', () => {
    const fm = makeManager()
    fm.create('Main', 'c')
    expect(() => fm.create('Main', 'c')).toThrow('이미 있는 파일입니다')
    expect(fm.files).toHaveLength(1)
    expect(fm.storedFiles()).toHaveLength(1)
  })

  it('닫은 파일과 이름이 같아도 저장소에 있으면 새로 만들 수 없다', () => {
    const fm = makeManager()
    const file = fm.create('Main', 'c')
    fm.close(file.id)
    expect(() => fm.create('Main', 'c')).toThrow(FileError)
  })

  it('새 파일 이름 규칙(2.4): 1~50자 한글·영문·숫자·_·-, 확장자 1~10자 영문·숫자', () => {
    expect(validateNewFile('합계_v2-1', 'c')).toBeNull()
    expect(validateNewFile('', 'c')).not.toBeNull()
    expect(validateNewFile('a b', 'c')).toBe('파일명에 쓸 수 없는 문자가 있습니다')
    expect(validateNewFile('a/b', 'c')).toBe('파일명에 쓸 수 없는 문자가 있습니다')
    expect(validateNewFile('x'.repeat(51), 'c')).not.toBeNull()
    expect(validateNewFile('Main', 'c+')).not.toBeNull()
    expect(validateNewFile('Main', 'abcdefghijk')).not.toBeNull()
  })

  it('U-26 저장 → close → openStored: 닫아도 저장소에 남고, 다시 열면 내용이 같다', () => {
    const fm = makeManager()
    const { id } = fm.create('Main', 'c')
    fm.updateContent(id, 'int main(void) {}\n')
    expect(fm.activeFile?.isDirty).toBe(true)
    fm.save(id)
    expect(fm.activeFile?.isDirty).toBe(false)

    fm.close(id)
    expect(fm.files).toHaveLength(0)
    expect(fm.storedFiles()).toHaveLength(1)

    const reopened = fm.openStored(id)
    expect(reopened.content).toBe('int main(void) {}\n')
    expect(reopened.isDirty).toBe(false)
  })

  it('이미 열린 저장소 파일을 다시 열면 새 탭 없이 그 탭으로 옮긴다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    fm.create('B', 'c')
    fm.openStored(a.id)
    expect(fm.files).toHaveLength(2)
    expect(fm.activeId).toBe(a.id)
  })

  it('U-27 저장소에 sort.c가 있을 때 내 컴퓨터의 sort.c를 열면 sort_2.c로 열리고 기존 sort.c는 그대로다', async () => {
    const fm = makeManager()
    const old = fm.create('sort', 'c')
    fm.updateContent(old.id, 'old')
    fm.save(old.id)

    const result = await fm.openFiles([new File(['new'], 'sort.c')])
    expect(result).toEqual({ opened: 1, failed: 0 })
    expect(fm.activeFile).toMatchObject({ name: 'sort_2', extension: 'c', content: 'new' })
    expect(fm.storedFiles().find((f) => f.id === old.id)?.content).toBe('old')
  })

  it('U-28 CRLF 파일은 LF로 바뀌고, 1MB를 넘거나 UTF-8이 아닌 파일은 탭을 만들지 않는다', async () => {
    const fm = makeManager()
    const crlf = new File(['a\r\nb\r\n'], 'win.c')
    const big = new File(['x'.repeat(MAX_FILE_BYTES + 1)], 'big.c')
    const euckr = new File([new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb])], 'old.c') // "한글"을 EUC-KR로

    const result = await fm.openFiles([crlf, big, euckr])
    expect(result).toEqual({ opened: 1, failed: 2 })
    expect(fm.files.map((f) => f.content)).toEqual(['a\nb\n'])
  })

  it('확장자가 없는 파일은 txt로 연다', () => {
    expect(splitFileName('sort.c')).toEqual({ name: 'sort', extension: 'c' })
    expect(splitFileName('archive.tar.gz')).toEqual({ name: 'archive.tar', extension: 'gz' })
    expect(splitFileName('Makefile')).toEqual({ name: 'Makefile', extension: 'txt' })
  })

  it('닫으면 바로 오른쪽 탭(없으면 왼쪽)이 활성 탭이 된다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    const b = fm.create('B', 'c')
    const c = fm.create('C', 'c')
    fm.setActive(b.id)
    fm.close(b.id)
    expect(fm.activeId).toBe(c.id)
    fm.close(c.id)
    expect(fm.activeId).toBe(a.id)
    fm.closeAll()
    expect(fm.files).toEqual([])
    expect(fm.activeId).toBeNull()
  })

  it('내용이 같으면 ● 표시를 켜지 않는다', () => {
    const fm = makeManager()
    const { id } = fm.create('A', 'c')
    fm.updateContent(id, '')
    expect(fm.hasDirty()).toBe(false)
    fm.updateContent(id, 'x')
    expect(fm.hasDirty()).toBe(true)
  })

  it('saveAllDirty는 바뀐 파일만 저장한다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    fm.create('B', 'c')
    fm.updateContent(a.id, 'x')
    expect(fm.saveAllDirty()).toEqual({ saved: 1, error: null })
    expect(fm.hasDirty()).toBe(false)
  })

  it('U-29 열려 있는 파일을 remove하면 저장소와 탭 목록에서 모두 사라진다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    const b = fm.create('B', 'c')
    expect(fm.isOpen(a.id)).toBe(true)
    fm.remove(a.id)
    expect(fm.isOpen(a.id)).toBe(false)
    expect(fm.files.map((f) => f.id)).toEqual([b.id])
    expect(fm.storedFiles().map((f) => f.id)).toEqual([b.id])

    // 다시 열면 같은 이름으로 새로 만들 수 있다
    expect(() => fm.create('A', 'c')).not.toThrow()
  })

  it('닫혀 있는 파일을 remove하면 저장소에서만 지우고 탭은 그대로다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    const b = fm.create('B', 'c')
    fm.close(a.id)
    fm.remove(a.id)
    expect(fm.files.map((f) => f.id)).toEqual([b.id])
    expect(fm.activeId).toBe(b.id)
    expect(fm.storedFiles()).toHaveLength(1)
  })

  it('U-30 저장 후 새 인스턴스에서 loadSession()하면 열린 탭, 활성 탭, 내용이 복원된다', () => {
    const fm = makeManager()
    const a = fm.create('A', 'c')
    const b = fm.create('B', 'c')
    fm.updateContent(a.id, 'int a;')
    fm.save(a.id)
    fm.setActive(a.id)

    const next = makeManager()
    expect(next.loadSession()).toEqual({ restored: 2, error: null })
    expect(next.files.map((f) => f.id)).toEqual([a.id, b.id])
    expect(next.activeId).toBe(a.id)
    expect(next.activeFile?.content).toBe('int a;')
  })

  it('복원할 때 저장소에 없는 id는 건너뛰고, 데이터가 손상되면 빈 상태로 시작한다', () => {
    localStorage.setItem(STORAGE_KEYS.openTabs, JSON.stringify(['없는id']))
    const fm = makeManager()
    expect(fm.loadSession()).toEqual({ restored: 0, error: null })

    localStorage.setItem(STORAGE_KEYS.openTabs, '{깨짐')
    expect(fm.loadSession()).toEqual({ restored: 0, error: '저장된 데이터를 읽지 못했습니다' })
    expect(fm.files).toEqual([])
  })

  it('U-31 저장 공간이 부족하면 오류를 돌려주고 isDirty가 true로 남는다', () => {
    const raw = new FullStorage()
    const fm = makeManager(new StorageService(raw))
    const { id } = fm.create('A', 'c')
    fm.updateContent(id, 'x')

    raw.full = true
    expect(() => fm.save(id)).toThrow('저장 실패: 저장 공간 부족')
    expect(fm.activeFile?.isDirty).toBe(true)
    expect(fm.saveAllDirty()).toEqual({ saved: 0, error: '저장 실패: 저장 공간 부족' })

    // 새 파일도 저장하지 못하면 탭을 만들지 않는다
    expect(() => fm.create('B', 'c')).toThrow('저장 실패: 저장 공간 부족')
    expect(fm.files).toHaveLength(1)
  })

  describe('다운로드', () => {
    afterEach(() => vi.restoreAllMocks())

    it('지금 편집 중인 내용을 "파일명.확장자"로 내려받고 ● 표시는 그대로 둔다', async () => {
      const created: Blob[] = []
      URL.createObjectURL = vi.fn((blob: Blob) => {
        created.push(blob)
        return 'blob:test'
      })
      URL.revokeObjectURL = vi.fn()
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('Main.c')
      })

      const fm = makeManager()
      const { id } = fm.create('Main', 'c')
      fm.updateContent(id, '편집 중')
      fm.download(id)

      expect(click).toHaveBeenCalledOnce()
      expect(await created[0].text()).toBe('편집 중')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
      expect(fm.activeFile?.isDirty).toBe(true)
    })
  })
})
