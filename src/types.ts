export interface EditorFile {
  id: string
  name: string // 파일명 (확장자 제외)
  extension: string // 확장자 (점 제외, 예: "c", "ts")
  content: string
  isDirty: boolean // 저장되지 않은 변경사항 여부
}

export const fullName = (file: EditorFile) => `${file.name}.${file.extension}`

// 확장자로 언어 이름 표시 (문법 검사 기능에서 재사용 예정)
export const languageOf = (extension: string) => {
  const map: Record<string, string> = {
    c: 'C',
    h: 'C',
    cpp: 'C++',
    java: 'Java',
    js: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    py: 'Python',
    html: 'HTML',
    css: 'CSS',
    txt: 'Plain Text',
  }
  return map[extension.toLowerCase()] ?? 'Plain Text'
}
