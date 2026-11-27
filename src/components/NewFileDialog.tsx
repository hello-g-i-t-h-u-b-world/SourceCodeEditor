import { useState } from 'react'
import { validateNewFile } from '../logic/FileManager'

interface NewFileDialogProps {
  error: string | null // 만들기에 실패했을 때(예: "이미 있는 파일입니다") App이 넘겨 주는 문구
  onCreate: (name: string, extension: string) => void
  onCancel: () => void
}

export default function NewFileDialog({ error, onCreate, onCancel }: NewFileDialogProps) {
  const [name, setName] = useState('')
  const [extension, setExtension] = useState('c')
  const [submitted, setSubmitted] = useState('') // 마지막으로 생성을 누른 "파일명.확장자"

  const trimmedName = name.trim()
  const trimmedExt = extension.trim().replace(/^\./, '')
  // 비어 있으면 생성 버튼만 끄고, 쓸 수 없는 문자는 입력 칸 아래에 알려 준다(2.5 새 파일)
  const problem = trimmedName === '' || trimmedExt === '' ? null : validateNewFile(trimmedName, trimmedExt)
  const canCreate = trimmedName !== '' && trimmedExt !== '' && problem === null
  // App이 돌려준 오류("이미 있는 파일입니다")는 이름을 고치기 전까지만 보여 준다
  const message = problem ?? (submitted === `${trimmedName}.${trimmedExt}` ? error : null)

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!canCreate) return
          setSubmitted(`${trimmedName}.${trimmedExt}`)
          onCreate(trimmedName, trimmedExt)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <h2>새 파일</h2>
        <label>
          파일명
          <input autoFocus value={name} placeholder="Main" maxLength={50} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          확장자
          <input value={extension} placeholder="c" maxLength={11} onChange={(e) => setExtension(e.target.value)} />
        </label>
        <p className="dialog-preview">
          {trimmedName || 'Main'}.{trimmedExt || 'c'}
        </p>
        {message && (
          <p className="dialog-error" role="alert">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="primary" disabled={!canCreate}>
            생성
          </button>
        </div>
      </form>
    </div>
  )
}
