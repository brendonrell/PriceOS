'use client';

/*
 * AccountCreateModal — Real User Accounts v0 signup surface.
 *
 * Renders when wagmi is connected + SIWE session is active + the
 * user row for the SIWE address has handle === null (or doesn't
 * exist yet). The user picks one of four PriceSprite vibes (each
 * quadrant renders the live composed sprite for THIS wallet under
 * that vibe — same wallet, four different sprites), types a handle,
 * and submits to /api/users/create.
 *
 * The 4 preview sprites are STATIC — no blink / yawn / sleep
 * animation here. Animation only plays on the menu sprite + the
 * PriceSpriteModal hero (the engine's main instance, gated on a
 * claimed identity). The modal renders one composeSprite() call per
 * vibe in 'awake' state and that's it.
 *
 * FULLY BLOCKING. No close button, no cancel button, no Esc handling,
 * no backdrop-click dismiss. The only exit path is a successful
 * submit. Rationale: identity claim is a one-time per-address gate
 * the entire profile/social layer depends on. Skipping it leaves a
 * partial user row that breaks /{handle} routing and follows joins.
 * If the user truly wants out, they can sign out from elsewhere
 * (the SIWE address goes away → modal unmounts via its parent).
 *
 * Handle input behaviour:
 *   - Live debounced typeahead against /api/handle/check (300ms).
 *   - Client-side format check runs synchronously on every keystroke
 *     so 'too_short' / 'invalid_chars' surface instantly, with no
 *     server roundtrip. The server check fires only once format is
 *     valid (saves a request on every mid-typing state).
 *   - In-flight fetches are aborted on new keystrokes so stale
 *     responses can't overwrite the latest state.
 *
 * Submit button enabled when: vibe picked, handle format-valid,
 * server says available, not currently submitting. On 409
 * handle_taken the local status flips to 'unavailable' and the
 * button re-enables once the user changes the handle.
 *
 * Visual shape mirrors the SignInModal pattern: centred dialog over
 * a fixed dark backdrop, colorway-tracking via --bg-color / --text-color.
 * The sprite chooser is a 2x2 grid above the handle row.
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    HANDLE_MAX_LENGTH,
    normaliseHandle,
    validateHandleFormat,
    type HandleValidationReason,
} from '@/lib/handle/validate';
import {
    PRICE_SPRITE_VIBES,
    getVibeLabel,
    type PriceSpriteVibe,
} from '@/lib/sprites/vibes';
import { composeSprite } from '@/lib/sprites/composer';
import type { UserRow } from '@/lib/supabase';
import type { HandleCheckReason } from '@/app/api/handle/check/route';
import { checkHandle, createUser } from '@/lib/wallet/accountClient';
import { isStandalone } from '@/lib/pwa/platform';
import { PwaInstallStep } from './PwaInstallStep';

interface Props {
    /** Render only when this is true. Parent drives this off
        siweAddress + the fetched user row (needsSignup). */
    open: boolean;
    /** Lowercased SIWE address — shown in the dialog header for
        confirmation that the user is claiming an identity for the
        right wallet. */
    address: string | null;
    /** Called on successful submit with the persisted UserRow. Parent
        is expected to update its known-user-row state so needsSignup
        flips to false → modal unmounts. */
    onAccountCreated: (user: UserRow) => void;
}

/* Friendly copy for the handle status row. Server-side reasons are
   short tokens — map them to one-line UI strings here. User-facing
   noun is "@name" per Platform Nomenclature SoT. */
const REASON_COPY: Record<HandleCheckReason, string> = {
    too_short: 'Min 3 characters.',
    too_long: 'Max 20 characters.',
    invalid_start: 'Must start with a letter or digit.',
    invalid_chars: 'Letters, digits, _ and - only.',
    all_digits: 'All-digit @names are reserved.',
    reserved: 'This @name is reserved.',
    taken: '@name is taken.',
};

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type HandleStatus =
    | { state: 'empty' }
    | { state: 'checking' }
    | { state: 'available' }
    | { state: 'unavailable'; reason: HandleCheckReason };

export function AccountCreateModal({
    open,
    address,
    onAccountCreated,
}: Props) {
    const [selectedVibe, setSelectedVibe] =
        useState<PriceSpriteVibe | null>(null);
    const [handleInput, setHandleInput] = useState('');
    const [status, setStatus] = useState<HandleStatus>({ state: 'empty' });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    /* After a successful claim we hold the new row and show Step 3 (the PWA
       prompt) before finishing — UNLESS already running as the installed app,
       in which case there's nothing to prompt and we finish immediately. */
    const [createdUser, setCreatedUser] = useState<UserRow | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    /* Normalised handle for downstream comparisons + submit. Echoed
       back to the input on render so trailing whitespace etc. doesn't
       desync the display from the value we'd actually submit. */
    const normalised = useMemo(
        () => normaliseHandle(handleInput),
        [handleInput]
    );

    /* Cancel any in-flight server check on unmount or open=false. */
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    /* Handle change → synchronous format check, then debounced
       server uniqueness check. Format-fail short-circuits to
       'unavailable' with the format reason; only valid-format handles
       go to the server. */
    const onHandleChange = useCallback(
        (raw: string) => {
            /* Live-strip to lowercase + the allowed character set as
               the user types. citext at the DB is case-insensitive
               anyway, but mirroring the storage form back to the
               input avoids the visual surprise of "BRENDON" being
               accepted as "brendon" on submit. Length cap matches the
               server constraint. */
            const cleaned = raw
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, HANDLE_MAX_LENGTH);
            setHandleInput(cleaned);
            setSubmitError(null);

            /* Cancel pending work — both the debounce timer and any
               in-flight server fetch. */
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }

            if (cleaned.length === 0) {
                setStatus({ state: 'empty' });
                return;
            }

            const format = validateHandleFormat(cleaned);
            if (!format.valid && format.reason) {
                setStatus({
                    state: 'unavailable',
                    reason: format.reason as HandleValidationReason,
                });
                return;
            }

            /* Valid format → show 'checking' immediately, fire the
               server check on the debounce. */
            setStatus({ state: 'checking' });
            debounceRef.current = setTimeout(() => {
                const ctrl = new AbortController();
                abortRef.current = ctrl;
                checkHandle(cleaned, ctrl.signal)
                    .then((res) => {
                        if (ctrl.signal.aborted) return;
                        if (res.available) {
                            setStatus({ state: 'available' });
                        } else {
                            setStatus({
                                state: 'unavailable',
                                reason: res.reason ?? 'taken',
                            });
                        }
                    })
                    .catch((err: unknown) => {
                        if (
                            err instanceof DOMException
                            && err.name === 'AbortError'
                        ) {
                            return;
                        }
                        /* Network / 5xx — leave the user in 'checking'
                           so they can retry by changing the handle and
                           changing it back, but surface the error so
                           it's not silent. */
                        setSubmitError(
                            'Could not check @name availability. Try again.'
                        );
                    });
            }, 300);
        },
        []
    );

    const canSubmit =
        !submitting
        && selectedVibe !== null
        && status.state === 'available';

    const onSubmit = useCallback(async () => {
        if (!canSubmit || !selectedVibe) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const res = await createUser({
                handle: normalised,
                price_sprite: selectedVibe,
            });
            if (res.ok) {
                // Already installed → no point prompting; finish now. Otherwise
                // advance to Step 3 (the home-screen prompt).
                if (isStandalone()) onAccountCreated(res.user);
                else setCreatedUser(res.user);
                return;
            }
            /* ok=false path — map reason to UI feedback. */
            if (res.reason === 'handle_taken') {
                setStatus({ state: 'unavailable', reason: 'taken' });
                setSubmitError('@name is taken. Try another.');
            } else if (res.reason === 'handle_invalid') {
                const r = res.details?.handle_reason;
                if (r) setStatus({ state: 'unavailable', reason: r });
                setSubmitError('@name is not valid.');
            } else if (res.reason === 'sprite_invalid') {
                setSubmitError('Pick a vibe to continue.');
            } else if (res.reason === 'already_claimed') {
                setSubmitError(
                    'This wallet already has an account. Refresh the page.'
                );
            } else {
                setSubmitError(res.error || 'Could not create account.');
            }
        } catch {
            setSubmitError(
                'Could not create account right now. Try again.'
            );
        } finally {
            setSubmitting(false);
        }
    }, [canSubmit, selectedVibe, normalised, onAccountCreated]);

    if (!open) return null;

    /* Step 3 — the PWA home-screen prompt, shown after the account is claimed.
       onDone finishes signup (parent flips needsSignup → modal unmounts). */
    if (createdUser) {
        return (
            <div
                className="account-create-modal-backdrop"
                role="dialog"
                aria-modal="true"
                aria-label="Add PD to your home screen"
            >
                <div className="account-create-modal pwa-step-modal">
                    <PwaInstallStep onDone={() => onAccountCreated(createdUser)} />
                </div>
            </div>
        );
    }

    /* Status row text — one line under the input. */
    const statusText: string =
        status.state === 'empty'
            ? 'Pick something you\u2019ll keep. Cannot be changed later.'
            : status.state === 'checking'
                ? 'Checking…'
                : status.state === 'available'
                    ? `@${normalised} is available.`
                    : REASON_COPY[status.reason];

    const statusTone: 'idle' | 'ok' | 'bad' =
        status.state === 'available'
            ? 'ok'
            : status.state === 'unavailable'
                ? 'bad'
                : 'idle';

    return (
        <div
            className="account-create-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-create-modal-title"
        >
            <div className="account-create-modal">
                <div
                    className="account-create-modal-title"
                    id="account-create-modal-title"
                >
                    CLAIM YOUR PD ACCOUNT
                </div>
                <div className="account-create-modal-body">
                    Choose a PriceSprite (based on vibe) and @name. Both
                    are permanent on this wallet.
                </div>
                {address && (
                    <div className="account-create-modal-addr">
                        {shortAddr(address)}
                    </div>
                )}

                <div className="account-create-modal-section-label">
                    PRICESPRITE
                </div>
                <div
                    className="account-create-modal-sprite-grid"
                    role="radiogroup"
                    aria-label="Pick a PriceSprite vibe"
                >
                    {PRICE_SPRITE_VIBES.map((vibe) => {
                        const isSelected = selectedVibe === vibe;
                        /* Modal quadrants are STATIC — no animation.
                           Animation only plays on the menu sprite +
                           PriceSpriteModal hero (the engine's main
                           instance). Sprite flows from the deterministic
                           composer with no fallback glyph; composeSprite
                           returns null only on malformed addresses, and
                           parent gates open on !!siweAddress, so an
                           empty cell would only show if both invariants
                           break simultaneously. */
                        const composed = address
                            ? composeSprite(address, vibe, 'awake')
                            : null;
                        const glyph = composed?.fullString ?? '';
                        const label = getVibeLabel(vibe);
                        return (
                            <button
                                key={vibe}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${label} vibe`}
                                className={
                                    'account-create-modal-sprite-cell'
                                    + (isSelected
                                        ? ' account-create-modal-sprite-cell-selected'
                                        : '')
                                }
                                onClick={() => {
                                    setSelectedVibe(vibe);
                                    setSubmitError(null);
                                }}
                                disabled={submitting}
                            >
                                <span className="account-create-modal-sprite-glyph">
                                    {glyph}
                                </span>
                                <span className="account-create-modal-sprite-label">
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="account-create-modal-section-label">
                    @NAME
                </div>
                <div className="account-create-modal-handle-row">
                    <span className="account-create-modal-handle-at">@</span>
                    <input
                        type="text"
                        className="account-create-modal-handle-input"
                        value={handleInput}
                        onChange={(e) => onHandleChange(e.target.value)}
                        placeholder="yourname"
                        maxLength={HANDLE_MAX_LENGTH}
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="text"
                        disabled={submitting}
                        aria-describedby="account-create-modal-handle-status"
                    />
                </div>
                <div
                    id="account-create-modal-handle-status"
                    className={
                        'account-create-modal-handle-status'
                        + ` account-create-modal-handle-status-${statusTone}`
                    }
                >
                    {statusText}
                </div>

                {submitError && (
                    <div className="account-create-modal-error">
                        {submitError}
                    </div>
                )}

                <div className="account-create-modal-actions">
                    <button
                        type="button"
                        className="account-create-modal-btn account-create-modal-btn-primary"
                        onClick={() => {
                            void onSubmit();
                        }}
                        disabled={!canSubmit}
                    >
                        {submitting ? 'CLAIMING…' : 'CLAIM ACCOUNT'}
                    </button>
                </div>
            </div>
        </div>
    );
}
