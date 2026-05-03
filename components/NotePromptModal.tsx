'use client';

/**
 * NotePromptModal — generic note editor / viewer modal.
 *
 * Bottom-sheet on mobile, centred card on desktop (CSS handles the
 * responsive split via styles/notePrompt.css).
 *
 * Open with `initialValue` non-empty to start in VIEW mode (saved
 * markdown rendered, Edit + Close buttons). Empty `initialValue`
 * starts in EDIT mode (textarea + Save + Cancel).
 *
 * Save trims the value. Empty trim is forwarded to onSave so the
 * caller can delete its stored note.
 *
 * Animation: two-step mount → active transition (matches the
 * double-RAF pattern at sim.html lines 5882–5886). Closing reverses
 * the active class then unmounts after 260ms (matches the CSS
 * `transition: opacity 0.25s ease`).
 *
 * Generic on purpose — Day Notes and Artist Notes wire it up via
 * NotePromptContext. Token Notes will reuse the same modal once
 * NotePromptContext gets its token-kind branch (NPF-Prompt-Token).
 *
 * `kind` prop drives the `.artist-note-mode` class on the box —
 * applies the slightly shorter artist-sheet sizing from sim CSS
 * 3591–3595. Sim adds the class at sim 10576 and removes it on close
 * (sim 10608, 10627); when the parent flips kind to undefined at
 * close-start, the class drops, matching sim's mid-fade behaviour.
 */

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { renderNoteMarkdown } from '../lib/calendar/utils';

interface NotePromptModalProps {
  open: boolean;
  kind?: 'day' | 'artist';
  label: ReactNode;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function NotePromptModal({
  open,
  kind,
  label,
  initialValue,
  onClose,
  onSave,
}: NotePromptModalProps) {
  // SSR gate — createPortal needs document.body, only available on the client.
  const [isClient, setIsClient] = useState(false);

  // Animation state. `mounted` toggles display:none → display:flex.
  // `active` triggers the opacity + transform transition.
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  // Internal mode: 'view' shows the rendered markdown; 'edit' shows the textarea.
  const [mode, setMode] = useState<'view' | 'edit'>('edit');

  // Live textarea value. Reset to initialValue on each open.
  const [value, setValue] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tracks where the most recent mousedown landed. Must live above the
  // early returns below — React requires every hook to run in the same
  // order every render. We only close on backdrop click if BOTH mousedown
  // AND mouseup happened on the backdrop itself — otherwise text-drag
  // selections (mousedown in the textarea, mouseup outside the box)
  // would close the modal.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset internal state every time the modal opens.
  useEffect(() => {
    if (open) {
      setMode(initialValue ? 'view' : 'edit');
      setValue(initialValue);
    }
  }, [open, initialValue]);

  // Mount → active transition (open=true) or active → unmount (open=false).
  useEffect(() => {
    if (open) {
      setMounted(true);
      let raf2: number | null = null;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setActive(true);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2 !== null) cancelAnimationFrame(raf2);
      };
    }
    setActive(false);
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  // Auto-focus textarea whenever the user is in edit mode.
  // Matches sim's `setTimeout(() => txt.focus(), 60)`.
  useEffect(() => {
    if (!open || mode !== 'edit') return;
    const t = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [open, mode]);

  // Escape closes — only listen while open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Skip render until client + at least one of (open / animating-out).
  if (!isClient) return null;
  if (!open && !mounted) return null;

  // Backdrop close handlers — see mouseDownTargetRef declaration above
  // for why this is split into mousedown + mouseup rather than onClick.
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget &&
      mouseDownTargetRef.current === e.currentTarget
    ) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const handlePrimaryClick = () => {
    if (mode === 'view') {
      // Switch to edit mode; value already pre-filled from initialValue.
      setMode('edit');
      return;
    }
    onSave(value.trim());
  };

  const cancelLabel = mode === 'view' ? 'Close' : 'Cancel';
  const saveLabel = mode === 'view' ? 'Edit' : 'Save';

  const wrapClassName = [
    'note-prompt-wrap',
    mounted && 'mounted',
    active && 'active',
  ]
    .filter(Boolean)
    .join(' ');

  const boxClassName = [
    'note-prompt-box',
    mode === 'view' && 'view-mode',
    kind === 'artist' && 'artist-note-mode',
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      className={wrapClassName}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className={boxClassName}>
        <div className="note-prompt-handle" />
        <span
          className="note-prompt-close-x"
          onClick={onClose}
          title="Close"
        >
          {'\u00d7\ufe0e'}
        </span>
        <div className="note-prompt-label">{label}</div>
        <textarea
          ref={textareaRef}
          className="note-prompt-textarea"
          placeholder="type your note..."
          rows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div
          className="note-prompt-view"
          dangerouslySetInnerHTML={{ __html: renderNoteMarkdown(initialValue) }}
        />
        <div className="note-prompt-actions">
          <button
            type="button"
            className="note-prompt-btn"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="note-prompt-btn primary"
            onClick={handlePrimaryClick}
          >
            {saveLabel}
          </button>
        </div>
        <div className="note-prompt-markdown-hint">
          Markdown supported: **bold**, _italic_, `code`
        </div>
      </div>
    </div>,
    document.body,
  );
}
