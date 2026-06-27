"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { computeChain, runScenario, emptyState, type Txn } from "@/lib/engine";

const fmt = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");
const card: CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 };

function demoState() {
  const s = emptyState(876286, 200000, 0, ["2026-06", "2026-07", "2026-08", "2026-09"]);
  s.recurring = [
    { id: "r1", day: 10, site: "מאוחד", dir: "תשלום", category: "משכורות", amount: 750000, status: "אומדן", active: true },
    { id: "r2", day: 15, site: "מאוחד", dir: "תשלום", category: "מע״מ", amount: 150000, status: "אומדן", active: true },
    { id: "r3", day: 1, site: "מאוחד", dir: "תקבול", category: "גביית חייבים", amount: 1100000, status: "אומדן", active: true },
  ];
  return s;
}

function tone(t: string) {
  return t === "bad" ? "#dc2626" : t === "warn" ? "#d97706" : t === "good" ? "#059669" : "#0f172a";
}

export default function Page() {
  const state = useMemo(() => demoState(), []);
  const base = useMemo(() => computeChain(state), [state]);
  const months = state.months;
  const [ym, setYm] = useState(months[0]);
  const [delay, setDelay] = useState(0);

  const scen = useMemo(() => {
    if (!delay) return base;
    const deltas: Txn[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const t of state.transactions) {
      if (t.dir === "תשלום" && t.date > today) {
        const d = new Date(t.date);
        d.setDate(d.getDate() + delay);
        deltas.push({ ...t, id: "mv_" + t.id, date: d.toISOString().slice(0, 10) });
      }
    }
    return runScenario(state, deltas);
  }, [delay, base, state]);

  const m = base[ym];
  const sm = scen[ym];

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }} dir="rtl">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #e2e8f0", paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>מערכת ניהול תזרים מזומנים</h1>
          <div style={{ fontSize: 13, color: "#64748b" }}>BGY Consulting · גרסה 1.0 (Next.js)</div>
        </div>
        <select value={ym} onChange={(e) => setYm(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
          {months.map((mm) => (<option key={mm} value={mm}>{mm}</option>))}
        </select>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={card}><div style={{ fontSize: 12, color: "#64748b" }}>יתרת פתיחה</div><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(m.opening)}</div></div>
        <div style={card}><div style={{ fontSize: 12, color: "#64748b" }}>יתרת סגירה צפויה</div><div style={{ fontSize: 20, fontWeight: 700, color: tone(m.close < 0 ? "bad" : "good") }}>{fmt(m.close)}</div></div>
        <div style={card}><div style={{ fontSize: 12, color: "#64748b" }}>שפל נזילות</div><div style={{ fontSize: 20, fontWeight: 700, color: tone(m.trough < state.crit ? "bad" : m.trough < state.warn ? "warn" : "good") }}>{fmt(m.trough)}</div></div>
        <div style={card}><div style={{ fontSize: 12, color: "#64748b" }}>ימי אוברדרפט</div><div style={{ fontSize: 20, fontWeight: 700, color: tone(m.od > 0 ? "bad" : "good") }}>{m.od}</div></div>
      </section>

      {m.alert !== "ok" && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, fontWeight: 600, background: m.alert === "crit" ? "#fef2f2" : "#fffbeb", color: m.alert === "crit" ? "#b91c1c" : "#b45309" }}>
          {m.alert === "crit" ? "קריטי" : "אזהרה"} — שפל צפוי: {fmt(m.trough)}
        </div>
      )}

      <section style={{ ...card, marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>תרחיש מה-אם · דחיית תשלומים עתידיים</h2>
          <label style={{ fontSize: 14, color: "#475569" }}>דחייה בימים: <input type="number" value={delay} onChange={(e) => setDelay(Math.max(0, Number(e.target.value) || 0))} style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }} /></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "center" }}>
          <Compare label="יתרת סגירה" b={m.close} s={sm.close} />
          <Compare label="שפל" b={m.trough} s={sm.trough} />
          <Compare label="ימי אוברדרפט" b={m.od} s={sm.od} isCount />
        </div>
      </section>

      <p style={{ marginTop: 32, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>מנוע מאומת · 7 בדיקות יחידה עוברות · נתוני הדגמה (יוחלפו בנתוני Supabase)</p>
    </main>
  );
}

function Compare({ label, b, s, isCount }: { label: string; b: number; s: number; isCount?: boolean }) {
  const f = (n: number) => (isCount ? String(n) : "₪" + Math.round(n).toLocaleString("he-IL"));
  const diff = s - b;
  const better = isCount ? diff < 0 : diff > 0;
  const color = diff === 0 ? "#334155" : better ? "#059669" : "#dc2626";
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", textDecoration: "line-through" }}>{f(b)}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{f(s)}</div>
    </div>
  );
}
