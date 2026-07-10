'use client';

/**
 * NotePromptContext — singleton controller for the shared note-edit modal.
 *
 * Discriminated `prompt` shape supports:
 *   - kind: 'day'    — calendar day notes; backed by CalendarContext.dayNotes
 *   - kind: 'artist' — per-artist notes; backed by localStorage 'pd_artist_notes'
 *   - kind: 'output' — per-Output notes; backed by localStorage 'pd_token_notes'
 *                       (sim 5715-5814 + 6566-6603). chat #5 / Notes feature.
 *                       NB: localStorage key kept as 'pd_token_notes' for sim
 *                       parity + zero user data migration; PD nomenclature
 *                       names this kind 'output' at the API surface.
 *
 * MUST be mounted INSIDE <CalendarProvider> + <ToastProvider> + <ModalProvider>
 * in app/layout.tsx so the day-notes map, showToast(), and openModal() are
 * reachable. The output-label renders an underlined "PRISMS #1234" span whose
 * onClick fires open('output', id) — sim 5743 same behaviour, opens the
 * OutputPreview underneath the note prompt sheet (z-index 10001 vs 1000).
 *
 * Date label format mirrors sim line 5863 — the date string is rendered with
 * an underline + 3px offset. CAL_MONTH_SHORT already returns uppercase tokens
 * ('JAN', 'FEB', …), so the rendered output is "NOTE FOR: APR 19 2026" — no
 * css text-transform required. Artist label format mirrors sim line 10577 —
 * "ARTIST NOTE FOR: <underlined>${name}</underlined>" with the same 3px
 * underline offset; the "ARTIST" prefix distinguishes the kind at a glance.
 * Output label mirrors sim line 5743 — "NOTE FOR: <underlined-clickable>
 * ${PROJECT_TITLE} #${id}</underlined-clickable>".
 *
 * Toast strings — house format `Descriptor: STATUS` (Brendon 2026-06-10;
 * supersedes sim parity for toast wording site-wide):
 *   - 'Day Note: SAVED' / 'Day Note: REMOVED'
 *   - 'Artist Note: SAVED — ${name}' / 'Artist Note: CLEARED — ${name}'
 *   - 'Note: SAVED' / 'Note: REMOVED'                          (output kind)
 *
 * Kind threading: `prompt.kind` is forwarded to <NotePromptModal> so the
 * box element can apply `.artist-note-mode` for the slightly-shorter
 * artist sheet sizing (sim CSS 3591–3595). Sim keeps the class on the
 * box until close (sim 10608, 10627); when `prompt` flips to null at
 * close-start, `kind` becomes undefined and the class drops, matching
 * sim's mid-fade resize behaviour. Output kind uses the default sheet
 * sizing — sim has no `.token-note-mode` class, so we don't add one
 * (the default 72vh max-height suits longer collector notes).
 *
 * Output-note pre-population: openOutputNoteEditor accepts an optional
 * `prepopulate` second argument. When the user opens a note from the
 * Notes accordion list, NotesBox passes the matching MOCK_DEMO_NOTES
 * entry — sim 6601: `if (!tokenNotes[id] && demoNotes[id]) tokenNotes[id]
 * = demoNotes[id];`. The pre-populated text is persisted to localStorage
 * BEFORE the modal opens, so first-open from list shows view-mode with
 * saved markdown rendered (matches sim's behaviour exactly). Modal pill
 * + card hover icon callsites pass no prepopulate value — they open
 * empty in edit-mode for fresh notes, view-mode for already-saved.
 *
 * Output-label project resolution (the "everything says PRISMS" fix,
 * Brendon 2026-07-10 — this bug kept returning because the title was
 * hardcoded here): the label resolves its project the SAME way the output
 * modal does — explicit slug from the caller, else the open modal's
 * currentModalSlug, else the /art/{slug} route — and renders the registry
 * displayName. No slug resolvable → the label shows just "#id", never a
 * guessed project name.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import NotePromptModal from '../../components/NotePromptModal';
import { getProject } from '../project/registry';
import { useCalendar } from '../calendar/CalendarContext';
import { CAL_MONTH_SHORT } from '../calendar/data';
import { useToast } from './ToastContext';
import { useModal } from './ModalContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock';

interface DayPrompt {
    kind: 'day';
    dayKey: string;
}

interface ArtistPrompt {
    kind: 'artist';
    name: string;
}

interface OutputPrompt {
    kind: 'output';
    outputId: number;
    /* Project slug when the caller knows it (grid cards, list rows, bench).
       null → resolved at render from the open modal / the /art route. */
    slug: string | null;
}

type Prompt = DayPrompt | ArtistPrompt | OutputPrompt;

interface NotePromptContextValue {
    openDayNoteEditor: (dayKey: string) => void;
    openArtistNoteEditor: (name: string) => void;
    /**
     * Open the per-output note editor.
     *
     * @param outputId  Numeric output id (sim's `_notePromptId`).
     * @param prepopulate  Optional markdown body to seed pd_token_notes
     *                     IF AND ONLY IF the output has no existing saved
     *                     note. Mirrors sim 6601 demoNotes pre-fill.
     *                     NotesBox passes MOCK_DEMO_NOTES[id]; modal pill
     *                     + card hi-note callsites pass nothing.
     */
    openOutputNoteEditor: (outputId: number, prepopulate?: string, slug?: string) => void;
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
    const { open: openModal, currentModalSlug } = useModal();
    const pathname = usePathname();
    const [artistNotes, setArtistNotes] = useLocalStorage<Record<string, string>>(
        'pd_artist_notes',
        {}
    );
    /* Output notes — sim 5715-5717. Variable renamed to outputNotes for PD
       nomenclature, but localStorage key 'pd_token_notes' stays for sim
       parity + zero user data migration. Keys round-trip to strings via
       JSON, so the type is Record<string, string> at the storage layer;
       runtime lookups by numeric outputId still work via JS property-access
       coercion. */
    const [outputNotes, setOutputNotes] = useLocalStorage<Record<string, string>>(
        'pd_token_notes',
        {}
    );
    /* Test phase: notes start EMPTY for everyone — no seeded demo notes
       (Brendon 2026-06-24). One-time purge wipes any previously-seeded demo
       notes (and the legacy seed/hide flags) so existing browsers reset clean;
       the demo seed is gone for good. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (localStorage.getItem('pd_notes_reset_v1') === '1') return;
        setOutputNotes({});
        try {
            localStorage.removeItem('pd_notes_seeded');
            localStorage.removeItem('pd_notes_deleted');
        } catch { /* ignore */ }
        localStorage.setItem('pd_notes_reset_v1', '1');
        window.dispatchEvent(new Event('pd:notes-changed'));
    }, [setOutputNotes]);
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    const openDayNoteEditor = useCallback((dayKey: string) => {
        if (!dayKey) return;
        setPrompt({ kind: 'day', dayKey });
    }, []);

    const openArtistNoteEditor = useCallback((name: string) => {
        if (!name) return;
        setPrompt({ kind: 'artist', name });
    }, []);

    const openOutputNoteEditor = useCallback(
        (outputId: number, prepopulate?: string, slug?: string) => {
            if (typeof outputId !== 'number' || Number.isNaN(outputId)) return;
            const key = String(outputId);
            /* Sim 6601 — only seed if there's no existing saved note. */
            if (prepopulate) {
                setOutputNotes((prev) => {
                    if (prev[key]) return prev;
                    return { ...prev, [key]: prepopulate };
                });
            }
            setPrompt({ kind: 'output', outputId, slug: slug?.toLowerCase() ?? null });
        },
        [setOutputNotes]
    );

    const closeNotePrompt = useCallback(() => {
        setPrompt(null);
    }, []);

    /* G item 10 — body.modal-open while the note prompt is mounted.
       DropdownContext's outside-mousedown handler gates on this class
       (DropdownContext.tsx F45/BUG-19 guard) — without it, a click
       inside the open note-prompt overlay closes the connect menu out
       from under the user. ModalContext does this for its own modals
       (ModalContext.tsx) but the note prompt manages its own overlay,
       so the gate has to be set here too. */
    useEffect(() => {
        if (!prompt) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [prompt]);

    const handleSave = useCallback(
        (value: string) => {
            if (!prompt) return;
            if (prompt.kind === 'day') {
                setDayNote(prompt.dayKey, value);
                showToast(value ? 'Day Note: SAVED' : 'Day Note: REMOVED');
            } else if (prompt.kind === 'artist') {
                const trimmed = value.trim();
                setArtistNotes((prev) => {
                    const next = { ...prev };
                    if (trimmed) next[prompt.name] = trimmed;
                    else delete next[prompt.name];
                    return next;
                });
                window.dispatchEvent(new Event('pd:artist-notes-changed'));
                showToast(
                    trimmed
                        ? `Artist Note: SAVED \u2014 ${prompt.name}`
                        : `Artist Note: CLEARED \u2014 ${prompt.name}`
                );
            } else if (prompt.kind === 'output') {
                /* Sim 5803-5812 — trimmed empty deletes; non-empty saves;
                   toast string is the bare 'Note SAVED' / 'Note REMOVED'
                   (no kind prefix, sim 5812). */
                const trimmed = value.trim();
                const key = String(prompt.outputId);
                setOutputNotes((prev) => {
                    const next = { ...prev };
                    if (trimmed) next[key] = trimmed;
                    else delete next[key];
                    return next;
                });
                window.dispatchEvent(new Event('pd:notes-changed'));
                showToast(trimmed ? 'Note: SAVED' : 'Note: REMOVED');
            }
            setPrompt(null);
        },
        [prompt, setDayNote, showToast, setArtistNotes, setOutputNotes]
    );

    /* Click handler for the underlined output-name span inside the output
       label. Sim 5743 stops propagation (so the wrap's backdrop-close
       doesn't fire) then calls openModal(id). Note prompt stays open;
       OutputPreview opens at z-index 1000 underneath the note prompt's
       z-index 10001. When the user dismisses the note prompt, the
       OutputPreview is revealed. */
    const handleOutputLabelClick = useCallback(
        (e: React.MouseEvent, outputId: number, slug: string | null) => {
            e.stopPropagation();
            openModal('output', outputId, slug ?? undefined);
        },
        [openModal]
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
                    ARTIST NOTE FOR:{' '}
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
        } else if (prompt.kind === 'output') {
            const outputId = prompt.outputId;
            initialValue = outputNotes[String(outputId)] || '';
            /* Resolve the project the way the output modal does: explicit
               caller slug -> the open modal's slug -> the /art/{slug} route.
               Unresolvable -> label is just "#id" (never a guessed name). */
            const routeSlug = pathname?.startsWith('/art/')
                ? (pathname.split('/')[2] ?? '').toLowerCase() || null
                : null;
            const noteSlug = prompt.slug ?? currentModalSlug ?? routeSlug;
            const projectName = noteSlug
                ? (getProject(noteSlug)?.displayName ?? noteSlug).toUpperCase()
                : null;
            label = (
                <>
                    NOTE FOR:{' '}
                    <span
                        style={{
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            cursor: 'pointer',
                        }}
                        onClick={(e) => handleOutputLabelClick(e, outputId, noteSlug)}
                    >
                        {projectName ? `${projectName} #${outputId}` : `#${outputId}`}
                    </span>
                </>
            );
        }
    }

    const value = useMemo<NotePromptContextValue>(
        () => ({
            openDayNoteEditor,
            openArtistNoteEditor,
            openOutputNoteEditor,
            closeNotePrompt,
        }),
        [
            openDayNoteEditor,
            openArtistNoteEditor,
            openOutputNoteEditor,
            closeNotePrompt,
        ]
    );

    return (
        <NotePromptCtx.Provider value={value}>
            {children}
            <NotePromptModal
                open={open}
                kind={prompt?.kind}
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
