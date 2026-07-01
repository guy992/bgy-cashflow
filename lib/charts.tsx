"use client";

// גרפים ב-SVG טהור — ללא תלות חיצונית (בטוח ל-build)

const ILS = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");
const short = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return Math.round(n / 1e3) + "K";
  return String(Math.round(n));
};

// עקומה חלקה (Catmull-Rom → Bézier)
interface Pt { x: number; y: number }
function smoothPath(pts: Pt[]): string {
  if (!pts.length) return "";
  if (pts.length < 3) return pts.map((p, i) => (i === 0 ? "M " : "L ") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  const t = 0.16;
  let d = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
  }
  return d;
}

export interface LinePoint { label: string; value: number }

// גרף קו — מסלול יתרה יומי עם ספי אזהרה/קריטי
export function BalanceLine({ points, warn, crit }: { points: LinePoint[]; warn: number; crit: number }) {
  const W = 720, H = 240, padL = 52, padR = 12, padT = 16, padB = 28;
  if (!points.length) return <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>אין נתונים להצגה</div>;
  const vals = points.map((p) => p.value);
  const ys = vals.concat([warn, crit, 0]);
  let min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, gap = span * 0.12;
  min -= gap; max += gap;
  const iw = W - padL - padR, ih = H - padT - padB;
  const X = (i: number) => padL + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1));
  const Y = (v: number) => padT + ih * (1 - (v - min) / (max - min));
  const coords = points.map((p, i) => ({ x: X(i), y: Y(p.value) }));
  const line = smoothPath(coords);
  const area = line + " L " + X(points.length - 1).toFixed(1) + " " + Y(min).toFixed(1) + " L " + X(0).toFixed(1) + " " + Y(min).toFixed(1) + " Z";
  const grid = [max - gap, (max + min) / 2, min + gap];
  const showThr = (t: number) => t >= min && t <= max;
  const step = Math.max(1, Math.ceil(points.length / 8));
  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="bgArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={"g" + i}>
          <line x1={padL} y1={Y(g)} x2={W - padR} y2={Y(g)} stroke="#eef2f7" strokeWidth="1" />
          <text x={padL - 6} y={Y(g) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{short(g)}</text>
        </g>
      ))}
      {showThr(0) && <line x1={padL} y1={Y(0)} x2={W - padR} y2={Y(0)} stroke="#cbd5e1" strokeWidth="1" />}
      {showThr(warn) && <line x1={padL} y1={Y(warn)} x2={W - padR} y2={Y(warn)} stroke="#d97706" strokeWidth="1" strokeDasharray="5 4" />}
      {showThr(crit) && <line x1={padL} y1={Y(crit)} x2={W - padR} y2={Y(crit)} stroke="#dc2626" strokeWidth="1" strokeDasharray="5 4" />}
      <path d={area} fill="url(#bgArea)" />
      <path d={line} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={"c" + i} cx={X(i)} cy={Y(p.value)} r={points.length > 40 ? 0 : 2.5} fill={p.value < crit ? "#dc2626" : p.value < warn ? "#d97706" : "#1d4ed8"} />
      ))}
      {points.map((p, i) => (i % step === 0 || i === points.length - 1 ? (
        <text key={"x" + i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
      ) : null))}
    </svg>
  );
}

export interface BarRow { label: string; rec: number; pay: number }

// גרף עמודות — תקבולים מול תשלומים לחודש
export function MonthlyBars({ rows }: { rows: BarRow[] }) {
  const W = 720, H = 240, padL = 52, padR = 12, padT = 16, padB = 28;
  if (!rows.length) return <div style={{ color: "#94a3b8", fontSize: 13, padding: 24, textAlign: "center" }}>אין נתונים להצגה</div>;
  const max = Math.max(1, Math.max.apply(null, rows.map((r) => Math.max(r.rec, r.pay))));
  const iw = W - padL - padR, ih = H - padT - padB;
  const groupW = iw / rows.length;
  const barW = Math.min(26, groupW * 0.32);
  const Y = (v: number) => padT + ih * (1 - v / max);
  const grid = [max, max * 0.66, max * 0.33, 0];
  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
      {grid.map((g, i) => (
        <g key={"g" + i}>
          <line x1={padL} y1={Y(g)} x2={W - padR} y2={Y(g)} stroke="#eef2f7" strokeWidth="1" />
          <text x={padL - 6} y={Y(g) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{short(g)}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cx = padL + groupW * i + groupW / 2;
        return (
          <g key={"b" + i}>
            <rect x={cx - barW - 2} y={Y(r.rec)} width={barW} height={Math.max(0, Y(0) - Y(r.rec))} rx="3" fill="#059669" />
            <rect x={cx + 2} y={Y(r.pay)} width={barW} height={Math.max(0, Y(0) - Y(r.pay))} rx="3" fill="#dc2626" />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{r.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ items }: { items: { c: string; t: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b", marginTop: 8 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: it.c, display: "inline-block" }} />
          {it.t}
        </span>
      ))}
    </div>
  );
}

export { ILS as chartILS };
