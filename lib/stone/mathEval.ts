/*
 * lib/stone/mathEval.ts — the Command Stone's inline calculator.
 *
 * Type `3*546` and the stone answers instantly ($0, deterministic, no model —
 * the same simulated-intelligence contract as every other hand). A tiny safe
 * arithmetic evaluator (tokenizer + shunting-yard → RPN): NO eval(), so a typed
 * line can never run code. Pure + testable.
 *
 * Only a real EXPRESSION evaluates — it must carry at least one binary operator
 * and at least one digit, so a bare "22" or a project name never reads as math
 * and falls straight through to GO/FIND.
 */

export interface MathResult {
    /** The cleaned expression (pretty operators normalised to ascii). */
    expr: string;
    /** The evaluated value. Always finite. */
    value: number;
}

/* Only these characters may appear — the gate that keeps words/handles out. */
const ALLOWED = /^[0-9+\-*\/().%^×÷·\s]+$/;
/* At least one binary operator (a lone number is not a calculation). */
const HAS_OP = /[-+*\/%^×÷·]/;

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'lp' } | { t: 'rp' };

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
const RIGHT: Record<string, boolean> = { '^': true };

function tokenize(s: string): Tok[] | null {
    const out: Tok[] = [];
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (c === ' ') { i++; continue; }
        if (c >= '0' && c <= '9' || c === '.') {
            let j = i;
            let dots = 0;
            while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) {
                if (s[j] === '.') dots++;
                j++;
            }
            if (dots > 1) return null; // "1.2.3"
            const v = parseFloat(s.slice(i, j));
            if (!Number.isFinite(v)) return null;
            out.push({ t: 'num', v });
            i = j;
            continue;
        }
        if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
        if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
        // normalise the pretty operators to their ascii form
        const op = c === '×' ? '*' : c === '÷' ? '/' : c === '·' ? '*' : c;
        if (op in PREC) { out.push({ t: 'op', v: op }); i++; continue; }
        return null;
    }
    return out;
}

/** Fold unary +/- into the number that follows (so "-3" and "2*-3" parse). */
function resolveUnary(toks: Tok[]): Tok[] | null {
    const out: Tok[] = [];
    for (let i = 0; i < toks.length; i++) {
        const tk = toks[i];
        if (tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
            const prev = out[out.length - 1];
            const isUnary = !prev || prev.t === 'op' || prev.t === 'lp';
            if (isUnary) {
                const next = toks[i + 1];
                if (!next || next.t !== 'num') {
                    // unary before a paren: multiply by ±1
                    out.push({ t: 'num', v: tk.v === '-' ? -1 : 1 });
                    out.push({ t: 'op', v: '*' });
                    continue;
                }
                out.push({ t: 'num', v: tk.v === '-' ? -next.v : next.v });
                i++; // consumed the number
                continue;
            }
        }
        out.push(tk);
    }
    return out;
}

function toRpn(toks: Tok[]): Tok[] | null {
    const output: Tok[] = [];
    const ops: Tok[] = [];
    for (const tk of toks) {
        if (tk.t === 'num') output.push(tk);
        else if (tk.t === 'op') {
            while (ops.length) {
                const top = ops[ops.length - 1];
                if (top.t === 'op' &&
                    (PREC[top.v] > PREC[tk.v] || (PREC[top.v] === PREC[tk.v] && !RIGHT[tk.v]))) {
                    output.push(ops.pop() as Tok);
                } else break;
            }
            ops.push(tk);
        } else if (tk.t === 'lp') ops.push(tk);
        else { // rp
            let found = false;
            while (ops.length) {
                const top = ops.pop() as Tok;
                if (top.t === 'lp') { found = true; break; }
                output.push(top);
            }
            if (!found) return null; // mismatched paren
        }
    }
    while (ops.length) {
        const top = ops.pop() as Tok;
        if (top.t === 'lp') return null;
        output.push(top);
    }
    return output;
}

function evalRpn(rpn: Tok[]): number | null {
    const st: number[] = [];
    for (const tk of rpn) {
        if (tk.t === 'num') { st.push(tk.v); continue; }
        if (tk.t !== 'op') return null;
        const b = st.pop();
        const a = st.pop();
        if (a === undefined || b === undefined) return null;
        let r: number;
        switch (tk.v) {
            case '+': r = a + b; break;
            case '-': r = a - b; break;
            case '*': r = a * b; break;
            case '/': if (b === 0) return null; r = a / b; break;
            case '%': if (b === 0) return null; r = a % b; break;
            case '^': r = Math.pow(a, b); break;
            default: return null;
        }
        if (!Number.isFinite(r)) return null;
        st.push(r);
    }
    return st.length === 1 ? st[0] : null;
}

/** Evaluate a typed line as arithmetic, or null if it isn't a calculation. */
export function evalMath(line: string): MathResult | null {
    const s = line.trim();
    if (!s || s.length > 120) return null;
    if (!ALLOWED.test(s)) return null;
    if (!/[0-9]/.test(s) || !HAS_OP.test(s)) return null;
    const toks = tokenize(s);
    if (!toks || toks.length < 3) return null; // need at least num op num
    const unary = resolveUnary(toks);
    if (!unary) return null;
    const rpn = toRpn(unary);
    if (!rpn) return null;
    const value = evalRpn(rpn);
    if (value == null || !Number.isFinite(value)) return null;
    const expr = s.replace(/×/g, '×').replace(/\s+/g, ' ');
    return { expr, value };
}

/** Pretty-print a result: thin-space thousands, trim float noise. */
export function formatMathValue(v: number): string {
    if (Number.isInteger(v)) return v.toLocaleString('en-US');
    // round away binary-float dust (0.1+0.2), keep up to 8 real decimals
    const rounded = Math.round(v * 1e8) / 1e8;
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

/* ── PD NUMEROLOGY — when a result lands on a number PD cares about, the
   stone says so (Brendon: "possibly if the result is relevant to PD mention
   that below lol"). Command-stone only; the global search stays bare. Exact
   matches on the notable few — never a stretch. ── */
const PD_NUMBERS: ReadonlyArray<{ n: number; note: string }> = [
    { n: 0, note: 'Zero. The void before the first block.' },
    { n: 1, note: 'One. The genesis — where every ledger starts.' },
    { n: 22, note: '22 — the most you can mint in a single transaction.' },
    { n: 42, note: '42. The Answer to Life, the Universe, and Everything.' },
    { n: 69, note: 'Nice.' },
    { n: 100, note: 'First 100 — a founding-era tag.' },
    { n: 420, note: 'Blaze it.' },
    { n: 500, note: 'First 500 — the early cohort.' },
    { n: 1000, note: 'A per-mille — the ‰, PD’s own mark. Also First 1000.' },
    { n: 1337, note: 'Leet.' },
    { n: 100_000_000, note: '100M — the entire fixed supply of $PRICE.' },
];

/** A one-line PD note for a result, or null. Integer results only. */
export function pdNumberNote(value: number): string | null {
    if (!Number.isInteger(value)) return null;
    return PD_NUMBERS.find((e) => e.n === value)?.note ?? null;
}
