'use client';

/*
 * PingButton — profile CTA to send a person-to-person Ping (direct message)
 * to this user via POST /api/pings/send. Hidden on your own profile and when
 * signed out. Uses the Value Prompt sheet to compose (native prompt is banned).
 */

import { useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';

export default function PingButton({
  targetAddress,
  targetHandle,
}: {
  targetAddress: string;
  targetHandle?: string | null;
}) {
  const { siweAddress } = useAuth();
  const { showToast } = useToast();
  const { openValuePrompt } = useValuePrompt();
  const [busy, setBusy] = useState(false);

  const me = siweAddress?.toLowerCase() ?? null;
  const target = targetAddress.toLowerCase();
  if (me === target) return null; // no pinging yourself

  const label = targetHandle ? `@${targetHandle}` : 'wallet';

  const send = async (message: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/pings/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: target, message }),
      });
      if (r.status === 201) {
        const j = (await r.json().catch(() => ({}))) as { delivered?: boolean };
        showToast(j.delivered === false ? `Ping: BLOCKED` : `Ping: SENT`);
      } else {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        showToast(j.error ? String(j.error) : 'Ping: FAILED');
      }
    } catch {
      showToast('Ping: FAILED');
    } finally {
      setBusy(false);
    }
  };

  const compose = () => {
    if (!me) {
      showToast('Wallet: CONNECT TO PING');
      return;
    }
    openValuePrompt({
      title: `Ping ${label}`,
      help: 'Send them a direct ping.',
      fields: [{ label: 'Message', placeholder: 'Say something…' }],
      submit: 'Send',
      onSubmit: (values) => {
        if (!values) return; // cancelled
        const message = (values[0] ?? '').trim();
        if (!message) {
          showToast('Ping: EMPTY');
          return;
        }
        void send(message);
      },
    });
  };

  return (
    <button
      type="button"
      className="btn-mint btn-ping"
      title={`Ping ${label}`}
      onClick={compose}
      disabled={busy}
    >
      <span className="mint-lbl">{busy ? '…' : 'PING'}</span>
    </button>
  );
}
