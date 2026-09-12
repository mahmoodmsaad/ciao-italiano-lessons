/**
 * Chhote SVG charts - koi external chart library istemal nahi hui.
 * Rang validated categorical palette se hain: slot 1 blue, slot 2 orange.
 */
import { useState } from 'react';

export const SERIES_COLORS = { primary: '#2a78d6', secondary: '#eb6834' };

const VB_W = 640;
const VB_H = 320;
const PAD = { top: 16, right: 12, bottom: 34, left: 40 };

/** Axis ke liye "sundar" upper limit - 0, 5, 10, 20, 50, 100... */
function niceMax(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

/** Sirf upar ke do corners round - bar baseline par anchored rehta hai. */
function topRoundedBar(x, y, width, height, radius = 4) {
  const r = Math.min(radius, width / 2, height);
  if (height <= 0) return '';
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ');
}

/**
 * Do series ka grouped bar chart (misal: har mahine issued vs returned).
 * data: [{ label, issued, returned }]
 */
export function MonthlyBarChart({ data, labels }) {
  const [hover, setHover] = useState(null);

  if (!data?.length) {
    return <p className="py-12 text-center text-sm text-slate-500">Dikhane ke liye data nahi hai.</p>;
  }

  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.issued, d.returned])));

  const groupW = plotW / data.length;
  const barW = Math.min(22, (groupW - 12) / 2);
  const gap = 2; // do bars ke darmiyan surface gap

  const yFor = (value) => PAD.top + plotH - (value / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full min-w-[460px]"
          role="img"
          aria-label={`${labels.primary} aur ${labels.secondary} ka mahana muqabla`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={VB_W - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
                {tick}
              </text>
            </g>
          ))}

          {data.map((row, index) => {
            const groupX = PAD.left + index * groupW;
            const centerX = groupX + groupW / 2;
            const active = hover === index;

            return (
              <g
                key={row.label}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              >
                {/* Poora group hover target hai taake pointer ko bar par exact rakhna na pare */}
                <rect x={groupX} y={PAD.top} width={groupW} height={plotH} fill="transparent" />
                {active && (
                  <rect x={groupX} y={PAD.top} width={groupW} height={plotH} fill="#0f172a" opacity="0.04" />
                )}

                <path
                  d={topRoundedBar(centerX - barW - gap / 2, yFor(row.issued), barW, plotH - (yFor(row.issued) - PAD.top))}
                  fill={SERIES_COLORS.primary}
                />
                <path
                  d={topRoundedBar(centerX + gap / 2, yFor(row.returned), barW, plotH - (yFor(row.returned) - PAD.top))}
                  fill={SERIES_COLORS.secondary}
                />

                <text x={centerX} y={VB_H - 12} textAnchor="middle" fontSize="11" fill="#64748b">
                  {row.label}
                </text>
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={VB_W - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        </svg>
      </div>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((PAD.left + (hover + 0.5) * (plotW / data.length)) / VB_W) * 100}%` }}
        >
          <p className="mb-1 font-semibold text-slate-800">{data[hover].label}</p>
          <TooltipRow color={SERIES_COLORS.primary} label={labels.primary} value={data[hover].issued} />
          <TooltipRow color={SERIES_COLORS.secondary} label={labels.secondary} value={data[hover].returned} />
        </div>
      )}

      <Legend
        items={[
          { color: SERIES_COLORS.primary, label: labels.primary },
          { color: SERIES_COLORS.secondary, label: labels.secondary },
        ]}
      />
    </div>
  );
}

function TooltipRow({ color, label, value }) {
  return (
    <p className="flex items-center gap-2 text-slate-600">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </p>
  );
}

export function Legend({ items }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Ek hi series ke horizontal bars (misal: category wise books).
 * Legend nahi chahiye - heading khud bata deti hai ke ye kya hai.
 */
export function CategoryBars({ data }) {
  if (!data?.length) {
    return <p className="py-12 text-center text-sm text-slate-500">Dikhane ke liye data nahi hai.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.books));

  return (
    <ul className="space-y-3">
      {data.map((row) => (
        <li key={row.category}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{row.category}</span>
            <span className="shrink-0 font-semibold text-slate-800">
              {row.books} <span className="font-normal text-slate-400">({row.copies} copies)</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (row.books / max) * 100)}%`,
                background: SERIES_COLORS.primary,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
