'use client';

// Fälle pro Woche, gestapelt nach Ausgang. Feste Farbreihenfolge (chart1 bis chart5),
// 2 px Abstand zwischen Segmenten, Tooltip beim Zeigen oder Fokussieren, Tabelle darunter.
import { useState } from 'react';

import { de } from '@/i18n/de';

import { outcomeKeys, type Week } from '../lib/stats';

const t = de.portal.stats;
// Rahmen etwa in Anzeigegröße, damit Achsenbeschriftung nicht mitwächst
const W = 1180;
const H = 340;
const PAD = { l: 40, r: 8, t: 12, b: 30 };
const GAP = 2;

const short = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Berlin',
});

function niceMax(n: number) {
  const step = n <= 10 ? 2 : n <= 25 ? 5 : n <= 60 ? 10 : 20;
  return { max: Math.max(step, Math.ceil(n / step) * step), step };
}

export function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const [hover, setHover] = useState<number>();
  const { max, step } = niceMax(Math.max(...weeks.map((w) => w.total)));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const band = plotW / weeks.length;
  const barW = Math.min(56, band * 0.6);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const h = hover !== undefined ? weeks[hover] : undefined;

  return (
    <div className="chart">
      <ul className="legend">
        {outcomeKeys.map((k, i) => (
          <li key={k}>
            <span className={`sw c${i + 1}`} aria-hidden />
            {t.outcome[k]}
          </li>
        ))}
      </ul>
      <div className="plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.perWeek}>
          {ticks.map((v) => (
            <g key={v}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
              <text className="axis" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x = PAD.l + i * band + (band - barW) / 2;
            let acc = 0;
            const segs = outcomeKeys
              .map((k, ci) => ({ k, ci, v: w.counts[k] }))
              .filter((s) => s.v > 0);
            return (
              <g key={w.start} className={hover === i ? 'on' : undefined}>
                {segs.map((s, si) => {
                  const y0 = y(acc);
                  acc += s.v;
                  const y1 = y(acc);
                  const top = si === segs.length - 1;
                  const hgt = Math.max(0, y0 - y1 - (si > 0 ? GAP : 0));
                  return (
                    <g key={s.k} className={`c${s.ci + 1}`}>
                      <rect x={x} y={y1} width={barW} height={hgt} rx={top ? 4 : 0} />
                      {top && hgt > 4 ? (
                        <rect x={x} y={y1 + 4} width={barW} height={hgt - 4} />
                      ) : null}
                    </g>
                  );
                })}
                {i % 2 === 0 || weeks.length <= 8 ? (
                  <text className="axis" x={x + barW / 2} y={H - 8} textAnchor="middle">
                    {short.format(new Date(w.start))}
                  </text>
                ) : null}
                <rect
                  className="hit"
                  x={PAD.l + i * band}
                  y={PAD.t}
                  width={band}
                  height={plotH}
                  tabIndex={0}
                  aria-label={`${t.week(short.format(new Date(w.start)))}: ${w.total}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(undefined)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(undefined)}
                />
              </g>
            );
          })}
        </svg>
        {h && hover !== undefined ? (
          <div
            className="tip"
            style={{
              left: `${((PAD.l + (hover + 0.5) * band) / W) * 100}%`,
              top: `${(y(h.total) / H) * 100}%`,
            }}
            role="status"
          >
            <b>{t.week(short.format(new Date(h.start)))}</b>
            <span className="num">
              {t.total}: {h.total}
            </span>
            {outcomeKeys.map((k, i) =>
              h.counts[k] ? (
                <span key={k}>
                  <span className={`sw c${i + 1}`} aria-hidden /> {t.outcome[k]}{' '}
                  <b className="num">{h.counts[k]}</b>
                </span>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
      <details className="tableview">
        <summary>{t.table}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t.perWeek}</th>
              {outcomeKeys.map((k) => (
                <th key={k} scope="col">
                  {t.outcome[k]}
                </th>
              ))}
              <th scope="col">{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start}>
                <th scope="row">{t.week(short.format(new Date(w.start)))}</th>
                {outcomeKeys.map((k) => (
                  <td key={k} className="num">
                    {w.counts[k]}
                  </td>
                ))}
                <td className="num">{w.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
