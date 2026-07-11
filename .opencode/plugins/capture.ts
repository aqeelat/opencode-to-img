import type { Message, Part } from "@opencode-ai/sdk/v2"
import type { TuiDialogSelectOption, TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { captureMarkdown, type CaptureBackend } from "../lib/capture"
import { BACKENDS } from "../lib/render/registry"
import { THEME_COLORS } from "../lib/render/css"
import type { Theme, ThemeColors } from "../lib/render/types"

type AssistantMessage = Extract<Message, { role: "assistant" }>
type ContentChoice = "assistant" | "question-and-assistant"
type ThemeChoice = "opencode" | Theme

function textFromParts(parts: ReadonlyArray<Part>): string {
  return parts
    .filter((part): part is Extract<Part, { type: "text" }> =>
      part.type === "text" && !part.ignored && part.text.length > 0,
    )
    .map((part) => part.text)
    .join("\n\n")
}

function firstLine(text: string): string {
  const line = text.split("\n").find((value) => value.trim())?.trim() ?? "Untitled response"
  return line.length > 80 ? `${line.slice(0, 77)}...` : line
}

function timeLabel(value: number): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function cssColor(color: unknown): string {
  if (color && typeof color === "object" && "toInts" in color && typeof color.toInts === "function") {
    const [r, g, b, a] = color.toInts() as [number, number, number, number]
    return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a / 255})`
  }
  return String(color)
}

function opencodeColors(current: Record<string, unknown>, mode: Theme): ThemeColors {
  const fallback = THEME_COLORS[mode]
  const color = (key: string, defaultValue: string) => current[key] ? cssColor(current[key]) : defaultValue
  return {
    bg: color("background", fallback.bg),
    text: color("markdownText", fallback.text),
    heading: color("markdownHeading", fallback.heading),
    codeBg: color("backgroundPanel", fallback.codeBg),
    codeText: color("markdownCodeBlock", fallback.codeText),
    inlineCodeBg: color("backgroundElement", fallback.inlineCodeBg),
    inlineCodeText: color("markdownCode", fallback.inlineCodeText),
    border: color("border", fallback.border),
    accent: color("markdownLink", fallback.accent),
    muted: color("textMuted", fallback.muted),
    quoteBorder: color("markdownBlockQuote", fallback.quoteBorder),
    syntax: {
      comment: color("syntaxComment", fallback.syntax.comment),
      keyword: color("syntaxKeyword", fallback.syntax.keyword),
      function: color("syntaxFunction", fallback.syntax.function),
      variable: color("syntaxVariable", fallback.syntax.variable),
      string: color("syntaxString", fallback.syntax.string),
      number: color("syntaxNumber", fallback.syntax.number),
      type: color("syntaxType", fallback.syntax.type),
      operator: color("syntaxOperator", fallback.syntax.operator),
      punctuation: color("syntaxPunctuation", fallback.syntax.punctuation),
    },
  }
}

const tui: TuiPlugin = async (api) => {
  const select = <Value>(title: string, options: TuiDialogSelectOption<Value>[]) => {
    const DialogSelect = api.ui.DialogSelect<Value>
    api.ui.dialog.setSize("large")
    api.ui.dialog.replace(() => DialogSelect({
      title,
      options,
    }))
  }

  const notifyError = (message: string) => api.ui.toast({ variant: "error", title: "Capture failed", message })

  const chooseTheme = (
    markdown: string,
    backend: CaptureBackend,
    outputDir: string,
  ) => {
    const active = api.theme.selected
    const options: TuiDialogSelectOption<ThemeChoice>[] = [
      {
        title: `Current OpenCode theme (${active})`,
        description: "Use the active TUI colors",
        value: "opencode",
      },
      { title: "Light", description: "Use the built-in light palette", value: "light" },
      { title: "Dark", description: "Use the built-in dark palette", value: "dark" },
    ]
    for (const option of options) {
      option.onSelect = async () => {
        api.ui.dialog.clear()
        const choice = option.value
        const theme = choice === "opencode" ? api.theme.mode() : choice
        const colors = choice === "opencode"
          ? opencodeColors(api.theme.current as unknown as Record<string, unknown>, theme)
          : undefined
        const result = await captureMarkdown({
          markdown,
          backend,
          outputDir,
          width: 1000,
          theme,
          colors,
        })
        if (result.files.length === 0) {
          notifyError(result.failures.map((failure) => `${failure.backend}: ${failure.message}`).join("; "))
          return
        }
        const failed = result.failures.length
        api.ui.toast({
          variant: failed ? "warning" : "success",
          title: failed ? "Capture completed with failures" : "Capture saved",
          message: failed
            ? `${result.files.length} saved, ${failed} failed. ${result.files.join(", ")}`
            : result.files.join(", "),
          duration: 8000,
        })
      }
    }
    select("Capture theme", options)
  }

  const chooseBackend = (markdown: string, outputDir: string) => {
    const options: TuiDialogSelectOption<CaptureBackend>[] = [
      ...BACKENDS.map((backend) => ({
        title: backend,
        description: backend === "canvas" ? "Default, self-contained renderer" : `Render with ${backend}`,
        value: backend as CaptureBackend,
      })),
      { title: "all", description: "Try every backend; unavailable browsers are skipped", value: "all" },
    ]
    for (const option of options) {
      option.onSelect = () => chooseTheme(markdown, option.value, outputDir)
    }
    select("Capture backend", options)
  }

  const chooseContent = (
    assistant: AssistantMessage,
    assistantText: string,
    messages: ReadonlyArray<Message>,
    outputDir: string,
  ) => {
    const parent = messages.find((message) => message.id === assistant.parentID && message.role === "user")
    const question = parent ? textFromParts(api.state.part(parent.id)) : ""
    const options: TuiDialogSelectOption<ContentChoice>[] = [
      {
        title: "Assistant response",
        description: "Capture only the selected response",
        value: "assistant",
        onSelect: () => chooseBackend(assistantText, outputDir),
      },
    ]
    if (question) {
      options.push({
        title: "Question and response",
        description: "Include the exact preceding user message",
        value: "question-and-assistant",
        onSelect: () => chooseBackend(`${question}\n\n---\n\n${assistantText}`, outputDir),
      })
    }
    select("Capture content", options)
  }

  const run = () => {
    const route = api.route.current
    if (route.name !== "session" || !("params" in route) || typeof route.params?.sessionID !== "string") {
      notifyError("Open a session before using /capture.")
      return
    }
    if (!api.state.ready) {
      notifyError("Session state is still loading. Try again in a moment.")
      return
    }
    const messages = api.state.session.messages(route.params.sessionID)
    const responses = messages
      .filter((message): message is AssistantMessage =>
        message.role === "assistant" &&
        message.time.completed !== undefined &&
        message.error === undefined &&
        textFromParts(api.state.part(message.id)).trim().length > 0,
      )
      .reverse()
      .slice(0, 20)
    if (responses.length === 0) {
      notifyError("This session has no completed assistant response to capture.")
      return
    }
    const outputDir = api.state.path.worktree || api.state.path.directory
    const options: TuiDialogSelectOption<AssistantMessage>[] = responses.map((message) => {
      const text = textFromParts(api.state.part(message.id))
      return {
        title: firstLine(text),
        description: timeLabel(message.time.completed ?? message.time.created),
        value: message,
        onSelect: () => chooseContent(message, text, messages, outputDir),
      }
    })
    select("Capture response", options)
  }

  api.keymap.registerLayer({
    commands: [
      {
        name: "capture.response",
        title: "Capture response as PNG",
        category: "Plugin",
        namespace: "palette",
        slashName: "capture",
        enabled: () => api.route.current.name === "session",
        run,
      },
    ],
    bindings: [],
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-to-img.capture",
  tui,
}

export default plugin
