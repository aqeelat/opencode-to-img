# Markdown Render Test

This is a **comprehensive test** of the rendering pipeline. It covers *inline formatting*, `inline code`, and ~~strikethrough~~.

## Inline Code

Use the `renderToImage()` function with the `backend` parameter set to `"canvas"`. The arrow → symbol should render correctly. Other symbols: — (em dash), … (ellipsis), "smart quotes".

## Code Block

```typescript
interface Renderer {
  name: string
  render(markdown: string, options: RenderOptions): Promise<RenderResult>
}

// ponytail: factory not needed, one implementation per backend
const createRenderer = (name: string): Renderer => ({
  name,
  async render(markdown, opts) {
    const png = await draw(markdown, opts)
    return { backend: name, png }
  },
})
```

```python
def fibonacci(n: int) -> list[int]:
    """Generate the first n Fibonacci numbers."""
    result = [0, 1]
    for i in range(2, n):
        result.append(result[i-1] + result[i-2])
    return result[:n]
```

## Lists

### Unordered list with multi-line items

- **First item** with a title
  Body text that should appear on the next line, not on the same line as the title.
- **Second item** with bold title
  This body should also be on a separate line.
  Additional paragraph within the same list item.
- Simple item without a title body

### Ordered list

1. First step: configure the renderer
2. Second step: call `render()` with markdown input
3. Third step: write the PNG output to disk

### Nested list

- Top level item
  - Nested item A
  - Nested item B
    - Deeply nested item
- Another top level item

## Table

| Backend    | Dep Size | External Browser | Glyph Coverage |
|------------|----------|------------------|----------------|
| canvas     | 25M      | No               | System fonts   |
| og         | 12M      | No               | Google Fonts   |
| satori     | 13M      | No               | Limited        |
| takumi     | 8M       | No               | Geist (bundled)|
| chrome     | 21M      | Yes              | System fonts   |
| firefox    | 21M      | Yes              | System fonts   |

## Blockquote

> This is a blockquote. It should have a left border and muted text color.
>
> Multiple paragraphs within the blockquote should work correctly.

## Horizontal Rule

---

End of document.
