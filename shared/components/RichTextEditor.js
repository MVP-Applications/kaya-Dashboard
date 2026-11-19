'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import { Extension, getHTMLFromFragment } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { plainToRichHtml } from '@/shared/lib/rich-text'
import { CharCount } from '@/shared/components/LimitedInput'

/**
 * Text editor for paragraph fields (blog paragraphs, a page's body
 * paragraphs): bold, italic, bullet / numbered lists and links — nothing
 * else, matching what kaya-nest-api keeps on save and kaya-website renders.
 *
 * Controlled like a textarea: `value` is an HTML fragment (or plain text
 * saved before the editor existed) and `onChange(html)` reports every edit,
 * with '' for an empty editor.
 */
const EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    // Would leave an empty paragraph after every list in the saved HTML.
    trailingNode: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      // Decided per link in setLink(): other sites open in a new tab, our own pages don't.
      HTMLAttributes: { target: null, rel: null },
    },
  }),
]

/**
 * Stops an edit that would take the saved HTML past `getMax()` characters
 * (the API checks the HTML, so formatting counts). Edits that shrink an
 * already-too-long value, and content set from outside (load, Discard,
 * language switch), always go through.
 */
function maxHtmlLength(getMax, onBlocked) {
  return Extension.create({
    name: 'maxHtmlLength',
    addProseMirrorPlugins() {
      const { schema } = this.editor
      return [new Plugin({
        key: new PluginKey('maxHtmlLength'),
        filterTransaction(tr, state) {
          const max = getMax()
          if (!max || !tr.docChanged || tr.getMeta('preventUpdate')) return true
          const next = getHTMLFromFragment(tr.doc.content, schema).length
          if (next <= max) return true
          if (next <= getHTMLFromFragment(state.doc.content, schema).length) return true
          onBlocked()
          return false
        },
      })]
    },
  })
}

export default function RichTextEditor({ value, onChange, dir, disabled = false, placeholder = '', label = '', max }) {
  // Read by the length plugin, which is created once with the editor.
  const maxRef = useRef(max)
  maxRef.current = max
  // An edit (typing past the limit, a long paste) was refused.
  const [blocked, setBlocked] = useState(false)

  // What the editor last reported, so a parent re-render with that same value
  // doesn't reset the content (and the cursor).
  const emitted = useRef(value || '')
  // The editor's own rendering of the value it was given (see onCreate);
  // null until it's ready, '' once the admin has edited.
  const loaded = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [...EXTENSIONS, maxHtmlLength(() => maxRef.current, () => setBlocked(true))],
    content: plainToRichHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ad-rte-content',
        'aria-label': label || 'Text',
        'aria-multiline': 'true',
        role: 'textbox',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    // TipTap tidies the loaded content (e.g. old plain text into paragraphs)
    // with a transaction of its own — not an edit, so nothing is reported
    // until the content actually differs from what was loaded.
    // It runs before onCreate, so anything earlier is ignored.
    onCreate: ({ editor: e }) => { loaded.current = e.getHTML() },
    onUpdate: ({ editor: e }) => {
      if (loaded.current === null || e.getHTML() === loaded.current) return
      loaded.current = ''
      setBlocked(false)
      const html = e.isEmpty ? '' : e.getHTML()
      emitted.current = html
      onChangeRef.current(html)
    },
  })

  // Discard, Revert, the EN/AR switch… replace the value from outside.
  useEffect(() => {
    if (!editor || (value || '') === emitted.current) return
    emitted.current = value || ''
    editor.commands.setContent(plainToRichHtml(value), { emitUpdate: false })
    loaded.current = editor.getHTML()
  }, [editor, value])

  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? {
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
      href: e.getAttributes('link').href || '',
      empty: e.isEmpty,
    } : null),
  })

  // The link field under the toolbar — part of the unsaved draft, so local.
  const [linking, setLinking] = useState(false)
  const [href, setHref] = useState('')

  function openLink() {
    setHref(state?.href || '')
    setLinking(true)
  }
  function applyLink() {
    const url = href.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) chain.unsetLink().run()
    else chain.setLink({ href: url, target: /^https?:\/\//i.test(url) ? '_blank' : null }).run()
    setLinking(false)
  }
  function removeLink() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinking(false)
  }

  const run = fn => () => fn(editor.chain().focus()).run()
  const btn = (active, title, onClick, children) => (
    <button type="button" className={`ad-rte-btn${active ? ' active' : ''}`} title={title} aria-label={title}
      aria-pressed={active} disabled={disabled || !editor} onMouseDown={e => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  )

  return (
    <>
    <div className={`ad-rte${disabled ? ' ad-rte--disabled' : ''}${state?.empty ? ' ad-rte--empty' : ''}`} dir={dir}>
      {!disabled && (
        <div className="ad-rte-bar" role="toolbar" aria-label="Formatting">
          {btn(state?.bold, 'Bold', run(c => c.toggleBold()), <strong>B</strong>)}
          {btn(state?.italic, 'Italic', run(c => c.toggleItalic()), <em>I</em>)}
          <span className="ad-rte-sep" aria-hidden="true" />
          {btn(state?.bullet, 'Bullet list', run(c => c.toggleBulletList()), '•≡')}
          {btn(state?.ordered, 'Numbered list', run(c => c.toggleOrderedList()), '1.≡')}
          <span className="ad-rte-sep" aria-hidden="true" />
          {btn(state?.link || linking, state?.link ? 'Edit link' : 'Add link', openLink, '🔗')}
        </div>
      )}
      {linking && (
        <div className="ad-rte-link" dir="ltr">
          <input className="ad-input" value={href} autoFocus placeholder="https://… or /about"
            aria-label="Link address" onChange={e => setHref(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') { e.preventDefault(); setLinking(false) }
            }} />
          <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={applyLink}>Apply</button>
          {state?.link && <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={removeLink}>Remove link</button>}
          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setLinking(false)}>Cancel</button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
    {max > 0 && (
      <CharCount length={(value || '').length} max={max}
        note={blocked ? `That would go over the ${max} character limit. Formatting such as bold, lists and links counts too.` : ''} />
    )}
    </>
  )
}
