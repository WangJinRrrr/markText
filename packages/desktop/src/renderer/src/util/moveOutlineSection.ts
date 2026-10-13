import { marked } from 'marked'

export function moveOutlineSection(
  markdown: string,
  sourceIndex: number,
  targetIndex: number,
  after: boolean
): string {
  markdown = markdown.replace(/\r\n?/g, '\n')
  const headings: Array<{ start: number; depth: number }> = []
  let offset = 0
  for (const token of marked.lexer(markdown)) {
    if (token.type === 'heading') headings.push({ start: offset, depth: token.depth })
    offset += token.raw.length
  }
  const source = headings[sourceIndex]
  const target = headings[targetIndex]
  if (!source || !target || sourceIndex === targetIndex) return markdown
  const endOfSection = (index: number): number => {
    const heading = headings[index]!
    return (
      headings.slice(index + 1).find((next) => next.depth <= heading.depth)?.start ??
      markdown.length
    )
  }
  const end = endOfSection(sourceIndex)
  const destination = after ? endOfSection(targetIndex) : target.start
  if (destination >= source.start && destination <= end) return markdown
  const section = markdown.slice(source.start, end)
  const rest = markdown.slice(0, source.start) + markdown.slice(end)
  const insertion = destination > end ? destination - section.length : destination
  const before = rest.slice(0, insertion)
  const following = rest.slice(insertion)
  const separatorBefore = before && !before.endsWith('\n') ? '\n\n' : ''
  const separatorAfter = following && !section.endsWith('\n') ? '\n\n' : ''
  return before + separatorBefore + section + separatorAfter + following
}
