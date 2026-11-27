// Editor가 검색 결과로 옮길 때 쓰는 계산(설계서 3.4 4: "선택 영역을 옮기고 그 줄까지 스크롤하는 일은 Editor가 맡는다")
// .editor의 line-height(20px)와 .code-area의 padding(8px)과 같아야 한다.
export const LINE_HEIGHT = 20
export const PADDING_TOP = 8

// offset 위치가 몇 번째 줄인지(0부터)
export function lineIndexOf(text: string, offset: number): number {
  let line = 0
  for (let i = 0; i < offset && i < text.length; i += 1) if (text[i] === '\n') line += 1
  return line
}

// 그 줄이 이미 보이면 지금 scrollTop을 그대로, 아니면 화면 가운데에 오도록 한 scrollTop
export function scrollTopFor(lineIndex: number, scrollTop: number, viewHeight: number): number {
  const top = PADDING_TOP + lineIndex * LINE_HEIGHT
  const bottom = top + LINE_HEIGHT
  if (top >= scrollTop && bottom <= scrollTop + viewHeight) return scrollTop
  return Math.max(0, Math.round(top - (viewHeight - LINE_HEIGHT) / 2))
}
