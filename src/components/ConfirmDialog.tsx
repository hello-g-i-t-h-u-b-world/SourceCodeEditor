export interface ConfirmChoice {
  label: string
  primary?: boolean
  onClick: () => void
}

interface ConfirmDialogProps {
  message: string
  note?: string // 덧붙이는 주의 문구(예: "열려 있는 파일입니다")
  choices: ConfirmChoice[] // 마지막은 보통 "취소"
  onCancel: () => void // 바깥을 누르거나 Esc
}

// 3.2 대화상자 "확인": 안내 문구와 선택 버튼
// 탭 닫기: 저장 후 닫기 / 저장 안 하고 닫기 / 취소, 종료: 저장 후 종료 / 저장 안 하고 종료 / 취소
export default function ConfirmDialog({ message, note, choices, onCancel }: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog confirm-dialog"
        role="alertdialog"
        aria-label={message}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <p className="confirm-message">{message}</p>
        {note && <p className="confirm-note">{note}</p>}
        <div className="dialog-actions">
          {choices.map((c, i) => (
            <button
              key={c.label}
              type="button"
              className={c.primary ? 'primary' : undefined}
              autoFocus={i === 0}
              onClick={c.onClick}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
