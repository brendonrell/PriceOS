/*
 * bodyScrollLock — the one place body.modal-open gets applied.
 *
 * Modals float above the page; they must not move it. The lock CSS
 * (modal.css: body.modal-open { overflow: hidden }) hides the viewport
 * scrollbar, which used to make the whole page jump sideways by the
 * scrollbar's width on every modal open/close. lock() measures the live
 * scrollbar and writes the same width back as body padding for the
 * duration, so the underlying page doesn't shift a pixel.
 *
 * Refcounted: three surfaces lock independently (ModalContext, the note
 * prompt, the value prompt) and can overlap — e.g. a note prompt opened
 * over the artwork modal. The class + padding drop only when the LAST
 * lock releases (previously the first close stripped the class while
 * the other modal was still open).
 */

let locks = 0;
let savedPaddingRight = '';

export function lockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    locks += 1;
    if (locks > 1) return;
    const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
    savedPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add('modal-open');
}

export function unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    if (locks === 0) return;
    locks -= 1;
    if (locks > 0) return;
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = savedPaddingRight;
    savedPaddingRight = '';
}
