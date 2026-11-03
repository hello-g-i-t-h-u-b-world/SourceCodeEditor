import { useState } from 'react'

interface NewFileDialogProps {
  onCreate: (name: string, extension: string) => void
  onCancel: () => void
}

export default function NewFileDialog({ onCreate, onCancel }: NewFileDialogProps) {
  const [name, setName] = useState('')
  const [extension, setExtension] = useState('c')

  const canCreate = name.trim() !== '' && extension.trim() !== ''

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (canCreate) onCreate(name.trim(), extension.trim().replace(/^\./, ''))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <h2>새 파일</h2>
        <label>
          파일명
          <input
            autoFocus
            value={name}
            placeholder="Main"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          확장자
          <input
            value={extension}
            placeholder="c"
            onChange={(e) => setExtension(e.target.value)}
          />
        </label>
        <p className="dialog-preview">
          {name || 'Main'}.{extension.replace(/^\./, '') || 'c'}
        </p>
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
