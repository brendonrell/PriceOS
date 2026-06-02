'use client';

export default function OfflinePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        padding: '2rem',
        gap: '1.5rem',
        background: 'var(--bg-color, #111111)',
        color: 'var(--text-color, #e0e0e0)',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
        textAlign: 'center',
      }}
    >
      {/* Logo pill */}
      <div
        style={{
          background: '#000',
          borderRadius: 4,
          padding: '0 12px',
          height: 28,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Courier New, monospace',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#FFE600',
            letterSpacing: '0.08em',
          }}
        >
          $PRICE
        </span>
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-rubik-mono, monospace)',
          fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        You&apos;re offline
      </h1>

      <p
        style={{
          margin: 0,
          maxWidth: 320,
          fontSize: '0.875rem',
          opacity: 0.65,
          lineHeight: 1.6,
        }}
      >
        Price Discussion needs a connection to load live prices and wallet data.
        Reconnect and the page you wanted will load automatically.
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1.5rem',
          border: '1px solid var(--text-color, #e0e0e0)',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--text-color, #e0e0e0)',
          fontFamily: 'var(--font-inter, Inter, sans-serif)',
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
