/*
 * DispatchPage — renders one stored edition of The Dispatch (server-side).
 * Shared by /dispatch (latest) and /dispatch/[date] (permanent archive URL).
 * Editions are immutable rows; this component never computes market data.
 */

import type { DispatchBody } from '@/lib/dispatch/build.server';
import DispatchClose from './DispatchClose';
import DigestSignup from './DigestSignup';
import DispatchColophonUrl from './DispatchColophonUrl';

export interface DispatchNav {
  prev: string | null;
  next: string | null;
}

export default function DispatchPage({ body, nav }: { body: DispatchBody; nav: DispatchNav }) {
  return (
    <main className="dispatch-page">
      <DispatchClose />
      <header className="dp-masthead">
        <div className="dp-paper-name">THE PD DISPATCH</div>
        <div className="dp-edition-line">
          {body.weekend ? 'WEEKEND EDITION · ' : ''}
          EDITION {body.edition} · PRICEDAY {body.edition} · {body.date}
        </div>
      </header>

      <section className="dp-section dp-lead">
        <h1 className="dp-lead-head">{body.lead.head}</h1>
        <p className="dp-lead-body">{body.lead.body}</p>
      </section>

      <section className="dp-section">
        <h2 className="dp-rule">BY THE NUMBERS</h2>
        <table className="dp-numbers">
          <tbody>
            {body.numbers.map((row) => (
              <tr key={row.label}>
                <td className="dp-num-label">{row.label}</td>
                <td className="dp-num-value">
                  {row.href ? <a href={row.href}>{row.value}</a> : row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* The desks (2026-07-16+ editions) — each prints whatever it carries;
          older stored editions simply have none. Same paper chrome. */}
      {(body.desks ?? []).map((d) => (
        <section className="dp-section" key={d.head}>
          <h2 className="dp-rule">{d.head}</h2>
          {d.prose?.map((p, i) => <p className="dp-prose" key={i}>{p}</p>)}
          {d.list && (
            <ul className="dp-noted">
              {d.list.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          {d.rows && (
            <table className="dp-numbers">
              <tbody>
                {d.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="dp-num-label">{row.label}</td>
                    <td className="dp-num-value">
                      {row.href ? <a href={row.href}>{row.value}</a> : row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      <section className="dp-section">
        <h2 className="dp-rule">FROM THE SALON</h2>
        <p className="dp-prose">{body.salon}</p>
      </section>

      <section className="dp-section">
        <h2 className="dp-rule">NOTED</h2>
        <ul className="dp-noted">
          {body.noted.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </section>

      <section className="dp-section">
        <h2 className="dp-rule">{'TOMORROW’S HORIZON'}</h2>
        <ul className="dp-noted">
          {body.horizon.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </section>

      <DigestSignup />

      <nav className="dp-nav">
        {nav.prev ? <a href={`/dispatch/${nav.prev}`}>{'‹︎'} PREVIOUS</a> : <span />}
        <a href="/dispatch">LATEST</a>
        {nav.next ? <a href={`/dispatch/${nav.next}`}>NEXT {'›︎'}</a> : <span />}
      </nav>
      <div className="dp-colophon">
        PRINTED ONCE, KEPT FOREVER<span className="dp-colophon-sep"> · </span>
        <DispatchColophonUrl url={`pricediscussion.com/dispatch/${body.cal_date}`} />
      </div>
    </main>
  );
}
