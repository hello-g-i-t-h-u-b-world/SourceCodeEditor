interface StatusBarProps {
  language: string
  line: number
  column: number
  syntaxMessage: string // 괄호 짝/주석 검사 결과 (추후 구현)
  autoSaveMessage: string // 15초 자동 저장 상태 (추후 구현)
}

export default function StatusBar({
  language,
  line,
  column,
  syntaxMessage,
  autoSaveMessage,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span className="status-syntax">{syntaxMessage}</span>
      <span className="status-right">
        <span>{autoSaveMessage}</span>
        <span>
          줄 {line}, 열 {column}
        </span>
        <span>{language}</span>
      </span>
    </footer>
  )
}
