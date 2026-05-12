'use client';

/*
 * SignInModal — "Verify your account" surface.
 *
 * Renders when wagmi is connected but no SIWE session is active. Has a
 * Sign button that calls the parent's `onSign` (which runs the SIWE
 * round-trip via signMessageAsync), and a Cancel button that
 * disconnects wagmi to drop the user back to a clean disconnected
 * state.
 *
 * Why a modal instead of auto-firing the sign request from a
 * useEffect:
 *   - The sign popup is a user-gesture-anchored action. On iOS Safari
 *     in particular, popping a sign request from a useEffect right
 *     after wagmi flips 'connecting' → 'connected' often gets dropped
 *     by the wallet (no gesture credit window, or the wallet has
 *     already bounced back to Safari before the request lands).
 *     Anchoring the request to a click on this modal's Sign button
 *     restores a clean gesture lineage.
 *   - Retry surface. The prior auto-fire path had no recovery if the
 *     first sign request failed — autoSign would disconnect the wallet
 *     and the user would have to start over. With this modal, a
 *     rejected or dropped signature leaves the modal in place so the
 *     user can tap Sign again without re-connecting.
 *
 * Visual shape mirrors the bare RainbowKit verify step from earlier
 * builds: centred dialog with the connected address shown for
 * confirmation, plus the two action buttons. Styling pulls from
 * --bg-color / --text-color so the modal tracks the active theme.
 */

interface Props {
    /** Render only when this is true. */
    open: boolean;
    /** Connected wallet address — shown in the dialog for confirmation. */
    address: string | null;
    /** True while a signature request is in flight. Disables the buttons
        so a double-tap can't re-enter autoSign mid-prompt. */
    signing: boolean;
    /** Sign button handler. Parent runs the SIWE round-trip. */
    onSign: () => void;
    /** Cancel button handler. Parent calls wagmi.disconnect. */
    onCancel: () => void;
}

function shortAddr(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function SignInModal({ open, address, signing, onSign, onCancel }: Props) {
    if (!open) return null;
    return (
        <div className="signin-modal-backdrop" role="dialog" aria-modal="true">
            <div className="signin-modal">
                <div className="signin-modal-title">VERIFY YOUR ACCOUNT</div>
                <div className="signin-modal-body">
                    Sign a message in your wallet to log in. No transaction
                    is sent and no fee is charged.
                </div>
                {address && (
                    <div className="signin-modal-addr">{shortAddr(address)}</div>
                )}
                <div className="signin-modal-actions">
                    <button
                        type="button"
                        className="signin-modal-btn signin-modal-btn-primary"
                        onClick={onSign}
                        disabled={signing}
                    >
                        {signing ? 'WAITING FOR SIGNATURE…' : 'SIGN MESSAGE'}
                    </button>
                    <button
                        type="button"
                        className="signin-modal-btn signin-modal-btn-secondary"
                        onClick={onCancel}
                        disabled={signing}
                    >
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}
