'use client';

/**
 * NotePromptContext — singleton controller for the shared note-edit modal.
 *
 * Discriminated `prompt` shape supports:
 *   - kind: 'day'    — calendar day notes; backed by CalendarContext.dayNotes
 *   - kind: 'artist' — per-artist notes; backed by localStorage 'pd_artist_notes'
 *
 * MUST be mounted INSIDE <CalendarProvider> + <ToastProvider> in
 * app/layout.tsx so the day-notes map and showToast() are reachable.
 *
 * Date label format mirrors sim line 5863 — the date string is rendered with
 * an underline + 3px offset. CAL_MONTH_SHORT already returns uppercase tokens
 * ('JAN', 'FEB', …), so the rendered output is "NOTE FOR: APR 19 2026" — no
 * css text-transform required.
 *
 * Toast: showToast() now wired up. Sim's exact strings:
 *   - 'Day Note SAVED' / 'Day Note REMOVED'           (sim ~5867)
 *   - `Note saved: ${name}` / `Note cleared: ${name}` (sim editArtistNote)
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
import { useToast } from './ToastContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface DayPrompt {
    kind: 'day';
    dayKey: string;
}

interface ArtistPrompt {
    kind: 'artist';
    name: string;
}

type Prompt = DayPrompt | ArtistPrompt;

interface NotePromptContextValue {
    openDayNoteEditor: (dayKey: string) => void;
    openArtistNoteEditor: (name: string) => void;
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
    const { showToast } = useToast();
    const [artistNotes, setArtistNotes] = useLocalStorage<Record<string, string>>(
        'pd_artist_notes',
        {}
    );
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    const openDayNoteEditor = useCallback((dayKey: string) => {
        if (!dayKey) return;
        setPrompt({ kind: 'day', dayKey });
    }, []);

    const openArtistNoteEditor = useCallback((name: string) => {
        if (!name) return;
        setPrompt({ kind: 'artist', name });
    }, []);

    const closeNotePrompt = useCallback(() => {
        setPrompt(null);
    }, []);

    const handleSave = useCallback(
        (value: string) => {
            if (!prompt) return;
            if (prompt.kind === 'day') {
                setDayNote(prompt.dayKey, value);
                showToast(value ? 'Day Note SAVED' : 'Day Note REMOVED');
            } else if (prompt.kind === 'artist') {
                const trimmed = value.trim();
                setArtistNotes((prev) => {
                    const next = { ...prev };
                    if (trimmed) next[prompt.name] = trimmed;
                    else delete next[prompt.name];
                    return next;
                });
                showToast(
                    trimmed
                        ? `Note saved: ${prompt.name}`
                        : `Note cleared: ${prompt.name}`
                );
            }
            setPrompt(null);
        },
        [prompt, setDayNote, showToast, setArtistNotes]
    );

    // Resolve current value + label for the open prompt.
    const open = prompt !== null;
    let initialValue = '';
    let label: ReactNode = null;
    if (prompt) {
        if (prompt.kind === 'day') {
            initialValue = dayNotes[prompt.dayKey] || '';
            label = (
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
            );
        } else if (prompt.kind === 'artist') {
            initialValue = artistNotes[prompt.name] || '';
            label = (
                <>
                    NOTE FOR:{' '}
                    <span
                        style={{
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                        }}
                    >
                        {prompt.name}
                    </span>
                </>
            );
        }
    }

    const value = useMemo<NotePromptContextValue>(
        () => ({ openDayNoteEditor, openArtistNoteEditor, closeNotePrompt }),
        [openDayNoteEditor, openArtistNoteEditor, closeNotePrompt]
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
        throw new Error('useNotePrompt must be used inside <NotePromptProvider>');
    }
    return ctx;
}
