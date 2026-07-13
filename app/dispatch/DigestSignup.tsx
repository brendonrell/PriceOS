'use client';

/*
 * DigestSignup — the Dispatch page's subscription slip for the email DIGEST
 * (3 editions a month: the 1st, 11th and 22nd). Posts to
 * /api/newsletter/subscribe; the list of record lives in Resend.
 * Dressed in the paper's own chrome (dp-* rules — Rule #0).
 */

import { useState } from 'react';
import { useToast } from '@/lib/state/ToastContext';

export default function DigestSignup() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const v = email.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; state?: string; error?: string } | null;
      if (j?.ok) {
        setEmail('');
        showToast(j.state === 'already' ? 'Digest: ALREADY ON THE LIST' : 'Digest: SUBSCRIBED');
      } else {
        showToast(`Digest: ${(j?.error ?? 'try again in a minute').toUpperCase()}`);
      }
    } catch {
      showToast('Digest: TRY AGAIN IN A MINUTE');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dp-section dp-digest">
      <h2 className="dp-rule">THE DIGEST — THIS PAPER, IN YOUR INBOX</h2>
      <p className="dp-prose">
        Three editions a month — the 1st, 11th and 22nd. The stretch&apos;s ledger,
        what came through the filter, and the art itself. Assembled by the
        platform, read in one coffee.
      </p>
      <div className="dp-digest-row">
        <input
          className="dp-digest-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          maxLength={254}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
        />
        <button type="button" className="dp-digest-btn" disabled={busy || !email.trim()} onClick={() => void submit()}>
          {busy ? 'PRESSING…' : 'SUBSCRIBE'}
        </button>
      </div>
    </section>
  );
}
