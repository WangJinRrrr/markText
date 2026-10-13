import { describe, expect, it } from 'vitest'
import { moveOutlineSection } from '../../../src/renderer/src/util/moveOutlineSection'

describe('moveOutlineSection', () => {
  it('moves a heading with its text and subordinate sections', () => {
    const source = '# A\n\nBody A\n\n## Child\n\nChild body\n\n# B\n\nBody B\n\n'
    expect(moveOutlineSection(source, 0, 2, true)).toBe(
      '# B\n\nBody B\n\n# A\n\nBody A\n\n## Child\n\nChild body\n\n'
    )
  })
  it('ignores headings in fenced code and keeps fenced contents', () => {
    const source = '# A\n\n```md\n# Fake\n```\n\n# B\n\nBody\n\n'
    expect(moveOutlineSection(source, 1, 0, false)).toBe(
      '# B\n\nBody\n\n# A\n\n```md\n# Fake\n```\n\n'
    )
  })
  it('does not move a section inside its own descendants', () => {
    const source = '# A\n\n## Child\n\nBody\n'
    expect(moveOutlineSection(source, 0, 1, false)).toBe(source)
  })
})
