'use client';

/**
 * NotePromptContext — singleton controller for the shared note-edit modal.
 *
 * Exposes openDayNoteEditor(dayKey) for now. The internal `prompt` shape is
 * discriminated by `kind`, so future Token Notes / Artist Notes can plug in
 * by extending the union without touching the modal component itself.
 *
 * MUST be mounted INSIDE <CalendarProvider> in app/layout.tsx so the day-notes
 * map and setDayNote action are reachable via useCalendar().
 *
 * Date label format mirrors sim line 5863 — the date string is rendered with
 * an underline + 3px offset. CAL_MONTH_SHORT already returns uppercase tokens
 * ('JAN', 'FEB', …), so the rendered output is "NOTE FOR: APR 19 2026" — no
 * css text-transform required.
 *
 * Toast on save is DEFERRED — sim's showToast('Day Note SAVED' / '… REMOVED')
 * has no React port yet. Marked with TODO(toast) below; one-line wire-in once
 * the toast infra lands.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import NotePromptModal from '../../components/NotePromptModal';
import { useCalendar } from '../calendar/CalendarContext';
import { CAL_MONTH_SHORT } from '../calendar/data';

interface DayPrompt {
  kind: 'day';
  dayKey: string;
}

// Discriminated union — extend with TokenPrompt / ArtistPrompt later.
type Prompt = DayPrompt;

interface NotePromptContextValue {
  openDayNoteEditor: (dayKey: string) => void;
  closeNotePrompt: () => void;
}

const NotePromptCtx = createContext<NotePromptContextValue | null>(null);

/** Format a 'YYYY-MM-DD' day key as 'MMM D YYYY' (e.g. 'APR 19 2026'). */
function formatDayLabel(dayKey: string): string {
  const parts = dayKey.split('-');
  if (parts.length !== 3) return dayKey;
  const yy = parts[0];
  const mIdx = parseInt(parts[1], 10) - 1;
  const dd = parseInt(parts[2], 10);
  const mShort = CAL_MONTH_SHORT[mIdx];
  if (!mShort || Number.isNaN(dd)) return dayKey;
  return `${mShort} ${dd} ${yy}`;
}

export function NotePromptProvider({ children }: { children: ReactNode }) {
  const { dayNotes, setDayNote } = useCalendar();
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const openDayNoteEditor = useCallback((dayKey: string) => {
    if (!dayKey) return;
    setPrompt({ kind: 'day', dayKey });
  }, []);

  const closeNotePrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  const handleSave = useCallback(
    (value: string) => {
      if (!prompt) return;
      if (prompt.kind === 'day') {
        setDayNote(prompt.dayKey, value);
        // TODO(toast): showToast(value ? 'Day Note SAVED' : 'Day Note REMOVED')
      }
      setPrompt(null);
    },
    [prompt, setDayNote]
  );

  // Resolve current value + label for the open prompt.
  const open = prompt !== null;
  const initialValue =
    prompt && prompt.kind === 'day' ? dayNotes[prompt.dayKey] || '' : '';
  const label =
    prompt && prompt.kind === 'day' ? (
      <>
        NOTE FOR:{' '}
        <span
          style={{
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {formatDayLabel(prompt.dayKey)}
        </span>
      </>
    ) : null;

  const value = useMemo<NotePromptContextValue>(
    () => ({ openDayNoteEditor, closeNotePrompt }),
    [openDayNoteEditor, closeNotePrompt]
  );

  return (
    <NotePromptCtx.Provider value={value}>
      {children}
      <NotePromptModal
        open={open}
        label={label}
        initialValue={initialValue}
        onClose={closeNotePrompt}
        onSave={handleSave}
      />
    </NotePromptCtx.Provider>
  );
}

export function useNotePrompt(): NotePromptContextValue {
  const ctx = useContext(NotePromptCtx);
  if (!ctx) {
    throw new Error(
      'useNotePrompt must be used inside <NotePromptProvider>'
    );
  }
  return ctx;
}
