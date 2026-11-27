import { useRef } from 'react'
import type { StoredFile } from '../logic/StorageService'

interface OpenDialogProps {
  files: StoredFile[] // 저장소 파일 목록(최근 저장한 것이 앞)
  error: string | null // 목록을 읽지 못했을 때의 문구
  onOpenStored: (id: string) => void
  onOpenLocal: (files: File[]) => void
  onDelete: (file: StoredFile) => void // FR-07 삭제 버튼. 확인 창은 App이 띄운다
  onCancel: () => void
}

const savedTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })

// 3.2 대화상자 "열기": 저장소 파일 목록(파일명, 마지막 저장 시각, 삭제 버튼), 내 컴퓨터에서 열기 버튼, 취소
export default function OpenDialog({ files, error, onOpenStored, onOpenLocal, onDelete, onCancel }: OpenDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog open-dialog"
        role="dialog"
        aria-label="열기"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <h2>열기</h2>
        {error ? (
          <p className="dialog-error">{error}</p>
        ) : files.length === 0 ? (
          <p className="open-empty">저장된 파일이 없습니다.</p>
        ) : (
          <ul className="open-list">
            {files.map((f) => (
              <li key={f.id}>
                <button type="button" className="open-item" onClick={() => onOpenStored(f.id)}>
                  <span className="open-name">
                    {f.name}.{f.extension}
                  </span>
                  <span className="open-time">{savedTime(f.savedAt)}</span>
                </button>
                <button
                  type="button"
                  className="open-delete"
                  title={`${f.name}.${f.extension} 삭제`}
                  aria-label={`${f.name}.${f.extension} 삭제`}
                  onClick={() => onDelete(f)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="dialog-actions">
          <button type="button" className="open-local" onClick={() => inputRef.current?.click()}>
            내 컴퓨터에서 열기
          </button>
          <button type="button" autoFocus onClick={onCancel}>
            취소
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            e.target.value = '' // 같은 파일을 다시 골라도 change가 일어나게 한다
            if (picked.length > 0) onOpenLocal(picked) // 탐색기에서 취소하면 아무것도 하지 않는다
          }}
        />
      </div>
    </div>
  )
}
