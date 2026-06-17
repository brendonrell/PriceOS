/*
 * beforeinstallprompt capture (Android / desktop Chrome).
 *
 * Chrome fires `beforeinstallprompt` when it deems the app installable, but only
 * if you preventDefault + stash the event can you trigger the native install
 * dialog later (on a user gesture). This module attaches that listener on first
 * import — so import it once near the app root (PriceOSShell) and the event is
 * captured even though the signup Step 3 modal mounts much later.
 *
 * iOS never fires this; getInstallPrompt() simply returns null there and the
 * Step 3 UI falls back to the Share → Add to Home Screen instruction.
 */

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
    });
}

/** Whether Chrome has offered us a native install prompt this session. */
export function hasInstallPrompt(): boolean {
    return deferred !== null;
}

/**
 * Fire the native install dialog (Android/desktop Chrome). Must be called from a
 * user gesture. Returns the user's choice, or 'unavailable' if Chrome never
 * offered the prompt (→ caller shows the manual instruction instead).
 */
export async function fireInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred) return 'unavailable';
    try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        return choice.outcome;
    } catch {
        return 'unavailable';
    }
}
