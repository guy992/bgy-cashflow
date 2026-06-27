"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  computeChain, runScenario, rollingForecast, aging, emptyState,
  type CashState, type Txn, type RecurringRule,
} from "@/lib/engine";

const ILS = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

function demoState(): CashState {
  const s = emptyState(876286, 200000, 0, ["2026-06", "2026-07", "2026-08", "2026-09"]);
  s.sites = ["מאוחד", "חוף התמרים", "נווה תמר", "קאנטרי קלאב"];
  s.recurring = [
    { id: "r1", day: 1, site: "ניהול", dir: "תשלום", category: "ליווי עסקי BGY", amount: 40000, status: "מאומת", active: true },
    { id: "r2", day: 10, site: "מאוחד", dir: "תשלום", category: "משכורות נטו", amount: 750000, status: "אומדן", active: true },
    { id: "r3", day: 15, site: "מאוחד", dir: "תשלום", category: "מע״מ", amount: 150000, status: "אומדן", active: true },
    { id: "r4", day: 5, site: "מאוחד", dir: "תקבול", category: "גביית חייבים", amount: 1100000, status: "אומדן", active: true },
  ];
  s.transactions = [
    { id: 1, by: "מערכת", date: "2026-06-03", site: "חוף התמרים", dir: "תקבול", category: "כרטיסי אשראי", amount: 220000, status: "מאומת" },
    { id: 2, by: "מערכת", date: "2026-06-08", site: "נווה תמר", dir: "תשלום", category: "ספקים שוטף", amount: 90000, status: "מאומת" },
    { id: 3, by: "מערכת", date: "2026-06-20", site: "קאנטרי קלאב", dir: "תקבול", category: "מנויים", amount: 130000, status: "אומדן" },
  ];
  return s;
}

const C = { bg: "#eef2f7", card: "#ffffff", line: "#e2e8f0", navy: "#0f172a", sub: "#64748b", good: "#059669", bad: "#dc2626", warn: "#d97706", accent: "#1d4ed8" };
const card: CSSProperties = { background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: 16 };
const th: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 12, color: C.sub, borderBottom: "1px solid " + C.line, fontWeight: 600 };
const td: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 13, borderBottom: "1px solid #f1f5f9" };

const TABS = [
  { id: "dash", label: "דשבורד" },
  { id: "entry", label: "הזנת תנועות" },
  { id: "recurring", label: "הוראות קבע" },
  { id: "rolling", label: "תחזית מתגלגלת" },
  { id: "aging", label: "גבייה / חייבים" },
  { id: "scenarios", label: "תרחישים" },
];

export default function App() {
  const [state, setState] = useState<CashState>(demoState);
  const [tab, setTab] = useState("dash");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem("bgy_state"); if (raw) setState(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem("bgy_state", JSON.stringify(state)); } catch {} }, [state, loaded]);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, color: C.navy }}>
      <header style={{ background: C.navy, color: "#fff", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>מערכת ניהול תזרים מזומנים</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>BGY Consulting · White-label</div>
        </div>
        <button onClick={() => { if (confirm("לאפס לנתוני הדגמה?")) { localStorage.removeItem("bgy_state"); setState(demoState()); } }}
          style={{ background: "transparent", color: "#cbd5e1", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>איפוס דמו</button>
      </header>
      <nav style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexWrap: "wrap", borderBottom: "1px solid " + C.line, background: "#fff" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", border: "none", borderBottom: tab === t.id ? "2px solid " + C.accent : "2px solid transparent", background: "transparent", color: tab === t.id ? C.accent : C.sub, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontSize: 14 }}>{t.label}</button>
        ))}
      </nav>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        {tab === "dash" && <Dashboard state={state} />}
        {tab === "entry" && <Entry state={state} setState={setState} />}
        {tab === "recurring" && <Recurring state={state} setState={setState} />}
        {tab === "rolling" && <Rolling state={state} />}
        {tab === "aging" && <Aging state={state} />}
        {tab === "scenarios" && <Scenarios state={state} />}
      </main>
      <footer style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", padding: 24 }}>מנוע מאומת · נתונים נשמרים מקומית (בהמשך: Supabase) · BGY</footer>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (<div style={card}><div style={{ fontSize: 12, color: C.sub }}>{label}</div><div style={{ fontSize: 20, fontWeight: 700, color: color || C.navy, marginTop: 4 }}>{value}</div></div>);
}

function Dashboard({ state }: { state: CashState }) {
  const [ym, setYm] = useState(state.months[0]);
  const chain = useMemo(() => computeChain(state), [state]);
  const m = chain[ym] || chain[state.months[0]];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>דשבורד · {ym}</h2>
        <select value={ym} onChange={(e) => setYm(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>{state.months.map((mm) => <option key={mm} value={mm}>{mm}</option>)}</select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Kpi label="יתרת פתיחה" value={ILS(m.opening)} />
        <Kpi label="יתרת סגירה צפויה" value={ILS(m.close)} color={m.close < 0 ? C.bad : C.good} />
        <Kpi label="שפל נזילות" value={ILS(m.trough)} color={m.trough < state.crit ? C.bad : m.trough < state.warn ? C.warn : C.good} />
        <Kpi label="ימי אוברדרפט" value={String(m.od)} color={m.od > 0 ? C.bad : C.good} />
      </div>
      {m.alert !== "ok" && (<div style={{ marginTop: 12, padding: 12, borderRadius: 8, fontWeight: 600, background: m.alert === "crit" ? "#fef2f2" : "#fffbeb", color: m.alert === "crit" ? "#b91c1c" : "#b45309" }}>{m.alert === "crit" ? "קריטי" : "אזהרה"} — שפל צפוי {ILS(m.trough)} · שלמות הזנה {m.completeness}%</div>)}
      <div style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>מסלול יומי</h3>
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>תאריך</th><th style={th}>תקבולים</th><th style={th}>תשלומים</th><th style={th}>נטו</th><th style={th}>יתרה</th></tr></thead>
            <tbody>
              {m.days.filter((d) => d.rec || d.pay).map((d) => (
                <tr key={d.date}><td style={td}>{d.date}</td><td style={{ ...td, color: C.good }}>{d.rec ? ILS(d.rec) : "—"}</td><td style={{ ...td, color: C.bad }}>{d.pay ? ILS(d.pay) : "—"}</td><td style={td}>{ILS(d.net)}</td><td style={{ ...td, fontWeight: 600, color: d.proj < 0 ? C.bad : C.navy }}>{ILS(d.proj)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Entry({ state, setState }: { state: CashState; setState: (s: CashState) => void }) {
  const [f, setF] = useState({ date: state.months[0] + "-15", site: state.sites[0], dir: "תקבול", category: "", amount: "", status: "אומדן" });
  const add = () => {
    const amt = Math.abs(Number(f.amount) || 0);
    if (!amt) return;
    const t: Txn = { id: Date.now(), by: "ידני", date: f.date, site: f.site, dir: f.dir as Txn["dir"], category: f.category || "אחר", amount: amt, status: f.status as Txn["status"] };
    setState({ ...state, transactions: [...state.transactions, t] });
    setF({ ...f, category: "", amount: "" });
  };
  const del = (id: Txn["id"]) => setState({ ...state, transactions: state.transactions.filter((t) => t.id !== id) });
  const inp: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 };
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>הזנת תנועות</h2>
      <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, alignItems: "end" }}>
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={inp} />
        <select value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} style={inp}>{state.sites.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={f.dir} onChange={(e) => setF({ ...f, dir: e.target.value })} style={inp}><option>תקבול</option><option>תשלום</option></select>
        <input placeholder="קטגוריה" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} style={inp} />
        <input placeholder="סכום" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={inp} />
        <button onClick={add} style={{ ...inp, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>הוסף</button>
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>תאריך</th><th style={th}>אתר</th><th style={th}>כיוון</th><th style={th}>קטגוריה</th><th style={th}>סכום</th><th style={th}>סטטוס</th><th style={th}></th></tr></thead>
          <tbody>
            {[...state.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t) => (
              <tr key={t.id}><td style={td}>{t.date}</td><td style={td}>{t.site}</td><td style={{ ...td, color: t.dir === "תקבול" ? C.good : C.bad }}>{t.dir}</td><td style={td}>{t.category}</td><td style={td}>{ILS(t.amount)}</td><td style={td}>{t.status}</td><td style={td}><button onClick={() => del(t.id)} style={{ color: C.bad, background: "none", border: "none", cursor: "pointer" }}>מחק</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Recurring({ state, setState }: { state: CashState; setState: (s: CashState) => void }) {
  const toggle = (id: RecurringRule["id"]) => setState({ ...state, recurring: state.recurring.map((r) => r.id === id ? { ...r, active: !r.active } : r) });
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>הוראות קבע</h2>
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>יום</th><th style={th}>אתר</th><th style={th}>כיוון</th><th style={th}>קטגוריה</th><th style={th}>סכום</th><th style={th}>סטטוס</th><th style={th}>פעיל</th></tr></thead>
          <tbody>
            {state.recurring.map((r) => (
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.4 }}><td style={td}>{r.day}</td><td style={td}>{r.site}</td><td style={{ ...td, color: r.dir === "תקבול" ? C.good : C.bad }}>{r.dir}</td><td style={td}>{r.category}</td><td style={td}>{ILS(r.amount)}</td><td style={td}>{r.status}</td><td style={td}><input type="checkbox" checked={r.active} onChange={() => toggle(r.id)} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Rolling({ state }: { state: CashState }) {
  const rows = useMemo(() => rollingForecast(state, 13), [state]);
  const trough = Math.min(...rows.map((r) => r.close));
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>תחזית מתגלגלת · 13 שבועות</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi label="יתרה בעוד 13 שבועות" value={ILS(rows[rows.length - 1].close)} color={rows[rows.length - 1].close < 0 ? C.bad : C.good} />
        <Kpi label="שפל צפוי בטווח" value={ILS(trough)} color={trough < 0 ? C.bad : C.good} />
      </div>
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>שבוע</th><th style={th}>תקבולים</th><th style={th}>תשלומים</th><th style={th}>נטו</th><th style={th}>יתרת סגירה</th><th style={th}>התראה</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td style={td}>{r.start}</td><td style={{ ...td, color: C.good }}>{r.rec ? ILS(r.rec) : "—"}</td><td style={{ ...td, color: C.bad }}>{r.pay ? ILS(r.pay) : "—"}</td><td style={td}>{ILS(r.net)}</td><td style={{ ...td, fontWeight: 600, color: r.close < 0 ? C.bad : C.navy }}>{ILS(r.close)}</td><td style={td}>{r.alert === "crit" ? "🔴" : r.alert === "warn" ? "🟡" : "🟢"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Aging({ state }: { state: CashState }) {
  const a = useMemo(() => aging(state), [state]);
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>גבייה / חייבים</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        <Kpi label="סך חייבים (ברוטו)" value={ILS(a.totalGross)} />
        <Kpi label="גבייה צפויה (משוקלל)" value={ILS(a.totalExpected)} color={C.good} />
      </div>
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>טווח</th><th style={th}>ברוטו</th><th style={th}>צפי גבייה</th></tr></thead>
          <tbody>{a.buckets.map((b) => (<tr key={b.label}><td style={td}>{b.label}</td><td style={td}>{ILS(b.gross)}</td><td style={{ ...td, color: C.good }}>{ILS(b.expected)}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

function Scenarios({ state }: { state: CashState }) {
  const [ym, setYm] = useState(state.months[state.months.length - 1]);
  const [amount, setAmount] = useState("500000");
  const [dir, setDir] = useState("תקבול");
  const base = useMemo(() => computeChain(state)[ym], [state, ym]);
  const scen = useMemo(() => {
    const amt = Math.abs(Number(amount) || 0);
    const delta: Txn[] = amt ? [{ id: "sc", date: ym + "-15", site: "מאוחד", dir: dir as Txn["dir"], category: "תרחיש", amount: amt, status: "אומדן" }] : [];
    return runScenario(state, delta)[ym];
  }, [state, ym, amount, dir]);
  const inp: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 };
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>תרחישים · מה-אם</h2>
      <div style={{ ...card, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={ym} onChange={(e) => setYm(e.target.value)} style={inp}>{state.months.map((m) => <option key={m}>{m}</option>)}</select>
        <select value={dir} onChange={(e) => setDir(e.target.value)} style={inp}><option>תקבול</option><option>תשלום</option></select>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={inp} />
        <span style={{ fontSize: 13, color: C.sub }}>הזרקה ל-15 בחודש {ym}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
        <Cmp label="יתרת סגירה" b={base.close} s={scen.close} />
        <Cmp label="שפל" b={base.trough} s={scen.trough} />
        <Cmp label="ימי אוברדרפט" b={base.od} s={scen.od} count />
      </div>
    </>
  );
}

function Cmp({ label, b, s, count }: { label: string; b: number; s: number; count?: boolean }) {
  const f = (n: number) => (count ? String(n) : ILS(n));
  const diff = s - b;
  const better = count ? diff < 0 : diff > 0;
  const color = diff === 0 ? "#334155" : better ? C.good : C.bad;
  return (<div style={{ ...card, textAlign: "center" }}><div style={{ fontSize: 12, color: C.sub }}>{label}</div><div style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>{f(b)}</div><div style={{ fontSize: 20, fontWeight: 700, color }}>{f(s)}</div></div>);
}
