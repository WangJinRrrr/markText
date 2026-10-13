// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

const renderer = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }))
vi.mock('../index', () => ({ default: async () => renderer }))
import { renderDiagram } from '../render'

describe('concurrent Mermaid rendering', () => {
  it('finishes one render before applying the next theme and recovers after errors', async () => {
    let release!: () => void
    renderer.parse.mockResolvedValue(true)
    renderer.render
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ svg: '<svg viewBox="0 0 1 1"></svg>' })
          })
      )
      .mockRejectedValueOnce(new Error('Invalid diagram'))
      .mockResolvedValue({ svg: '<svg viewBox="0 0 1 1"></svg>' })
    const options = {
      type: 'mermaid',
      code: 'graph TD; A-->B',
      target: document.createElement('div'),
      vegaTheme: 'default',
      mermaidTheme: 'default',
      plantumlServer: '',
      sequenceTheme: 'simple' as const
    }
    const first = renderDiagram(options)
    const second = renderDiagram({
      ...options,
      mermaidTheme: 'dark',
      target: document.createElement('div')
    })
    const failure = expect(second).rejects.toThrow('Invalid diagram')
    await vi.waitFor(() => expect(renderer.render).toHaveBeenCalledTimes(1))
    expect(renderer.initialize).toHaveBeenCalledTimes(1)
    release()
    await first
    await failure
    await renderDiagram(options)
    expect(renderer.initialize).toHaveBeenCalledTimes(3)
    expect(renderer.render).toHaveBeenCalledTimes(3)
  })
})
