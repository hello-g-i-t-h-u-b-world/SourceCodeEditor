interface StatusBarProps {
  language: string
  line: number
  column: number
  syntaxMessage: string // 문법 검사 결과(statusMessages.ts의 syntaxStatus)
  syntaxError: boolean // 오류가 있으면 문구를 강조한다
  autoSaveMessage: string // 자동 저장 시각, 저장·열기 실패 안내
}

export default function StatusBar({
  language,
  line,
  column,
  syntaxMessage,
  syntaxError,
  autoSaveMessage,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span className={`status-syntax ${syntaxError ? 'has-error' : ''}`}>
        {syntaxError ? '⚠ ' : ''}
        {syntaxMessage}
      </span>
      <span className="status-right">
        <span>{autoSaveMessage}</span>
        {language !== '-' && (
          <span>
            줄 {line}, 열 {column}
          </span>
        )}
        <span>{language}</span>
      </span>
    </footer>
  )
}
