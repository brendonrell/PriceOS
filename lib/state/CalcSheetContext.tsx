'use client';

/*
 * CalcSheetContext
 *
 * The Calc — sim line 11597's window.openCalcSheet(tokenId). A bottom-sheet
 * (mobile) / centred card (desktop) slide-up that runs a quick "if I bought
 * this and flipped at floor, what's my net?" P&L ladder. Opened by the ƒ
 * tab in OutputPreview's compound action button (BUY-state only — sim 8762).
 *
 * Vocabulary parity with .value-prompt-* (inverted palette, .mounted/.active
 * two-stage display, slide-up motion, desktop centred-card override at
 * >600px). Field structure differs — calc has a single decimal input row
 * with an ETH suffix and a live "vs floor" delta below it, plus the static
 * P&L ladder. CSS lives in styles/modal.css alongside .modal-action-btn-calc.
 *
 * API: useCalcSheet().openCalcSheet({ tokenId, projectTitle, price, floor })
 *   - price: listed price in ETH, null if not listed
 *   - floor: project floor in ETH, null if unknown
 * Caller computes both numbers from its own meta source. Closing is via the
 * X button, backdrop tap, or programmatic closeCalcSheet.
 *
 * Auto-close: when the parent OutputPreview closes (or the modal stack
 * switches to a non-output surface), calc auto-dismisses. Sim hard-codes
 * this in closeModal (sim 7446); here we react to ModalContext rather than
 * coupling it back, keeping ModalContext unaware of calc.
 *
 * Single-instance singleton: opening a second calc while one is active
 * replaces the first config — matches sim's single #calcSheetWrap node.
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
import CalcSheet from '../../components/CalcSheet';
import { useModal } from './ModalContext';

export interface CalcSheetConfig {
    /** Token id under inspection — used for the context line + key. */
    tokenId: number;
    /** Project title — italicised in the context line, like value-prompt. */
    projectTitle: string;
    /** Listed price in ETH, or null if the token isn't listed. */
    price: number | null;
    /** Project floor in ETH, or null if no floor is available yet. */
    floor: number | null;
}

interface CalcSheetContextValue {
    openCalcSheet: (config: CalcSheetConfig) => void;
    closeCalcSheet: () => void;
}

const CalcSheetCtx = createContext<CalcSheetContextValue | null>(null);

export function CalcSheetProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<CalcSheetConfig | null>(null);
    const { openModal } = useModal();

    const openCalcSheet = useCallback((next: CalcSheetConfig) => {
        setConfig(next);
    }, []);

    const closeCalcSheet = useCallback(() => {
        setConfig(null);
    }, []);

    /* Auto-close when the parent modal closes or switches to another
       surface. Sim does this with a closeCalcSheet() call inside closeModal
       (sim 7446); we react to ModalContext instead of coupling it back, so
       calc stays a leaf consumer. */
    useEffect(() => {
        if (config != null && openModal?.name !== 'output') {
            setConfig(null);
        }
    }, [openModal, config]);

    const value = useMemo<CalcSheetContextValue>(
        () => ({ openCalcSheet, closeCalcSheet }),
        [openCalcSheet, closeCalcSheet]
    );

    return (
        <CalcSheetCtx.Provider value={value}>
            {children}
            <CalcSheet config={config} onClose={closeCalcSheet} />
        </CalcSheetCtx.Provider>
    );
}

export function useCalcSheet(): CalcSheetContextValue {
    const ctx = useContext(CalcSheetCtx);
    if (!ctx) {
        throw new Error('useCalcSheet must be used inside <CalcSheetProvider>');
    }
    return ctx;
}
