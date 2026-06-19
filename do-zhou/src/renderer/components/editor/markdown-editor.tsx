import { useEffect, useRef } from 'react'
import { EditorView, keymap, drawSelection, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'

interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  placeholder?: string
  onCursorChange?: (line: number, col: number) => void
}

const readOnlyComp = new Compartment()

function createExtensions(doc: string, onChange?: (v: string) => void, onCursor?: (l: number, c: number) => void, ph?: string) {
  const exts = [
    markdown(),
    oneDark,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    drawSelection(),
    EditorView.lineWrapping,
    readOnlyComp.of(EditorState.readOnly.of(false)),
    EditorView.updateListener.of(update => {
      if (update.docChanged && onChange) onChange(update.state.doc.toString())
      if (update.selectionSet && onCursor) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        onCursor(line.number, pos - line.from + 1)
      }
    }),
  ]
  if (ph) exts.push(cmPlaceholder(ph))
  return exts
}

export function MarkdownEditor({
  value, onChange, readOnly = false, onCursorChange,
}: MarkdownEditorProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCursorRef = useRef(onCursorChange)
  onCursorRef.current = onCursorChange

  // 初始化
  useEffect(() => {
    if (!containerRef.current || viewRef.current) return
    const state = EditorState.create({
      doc: value,
      extensions: createExtensions(value, onChangeRef.current, onCursorRef.current),
    })
    viewRef.current = new EditorView({ state, parent: containerRef.current })
    // 强制 .cm-editor 不能扩展 — flex 约束高度后，CodeMirror 默认 overflow:visible 会撑开
    const cmEditor = viewRef.current.dom
    cmEditor.style.overflow = 'hidden'
    cmEditor.style.maxHeight = '100%'
    return () => { viewRef.current?.destroy(); viewRef.current = null }
  }, []) // eslint-disable-line

  // 外部更新 value
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const cd = view.state.doc.toString()
    if (value !== cd) {
      view.dispatch({ changes: { from: 0, to: cd.length, insert: value } })
    }
  }, [value])

  // 只读切换（用 Compartment）
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyComp.reconfigure(EditorState.readOnly.of(readOnly)),
    })
  }, [readOnly])

  return <div ref={containerRef} className="flex-1 w-full min-h-0 overflow-hidden" />
}
