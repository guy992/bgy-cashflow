"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  computeChain, runScenario, rollingForecast, aging, emptyState,
  type CashState, type Txn, type RecurringRule,
} from "@/lib/engine";
import {
  loadRemote, saveRemote, signIn, signUp, signOut, getSession, onAuthChange,
  isSuperAdmin, listOrgs, getMyOrgs, createOrg, seedOrgState, searchProfileByEmail,
  addMembership, listMembers, type OrgRow,
} from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const ILS = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");
const num = (v: string) => { const n = Number(v); return isNaN(n) ? 0 : n; };

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
  s.brand = { name: "מערכת ניהול תזרים מזומנים", color: "#0f172a" };
  return s;
}

const C = {
  bg: "#eef2f7", card: "#ffffff", line: "#e2e8f0", navy: "#0f172a",
  sub: "#64748b", good: "#059669", bad: "#dc2626", warn: "#d97706", accent: "#1d4ed8",
};
const card: CSSProperties = { background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: 16 };
const th: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 12, color: C.sub, borderBottom: "1px solid " + C.line, fontWeight: 600 };
const td: CSSProperties = { textAlign: "right", padding: "8px 10px", fontSize: 13, borderBottom: "1px solid #f1f5f9" };
const inpBase: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" };

const BASE_TABS = [
  { id: "dash", label: "דשבורד" },
  { id: "entry", label: "הזנת תנועות" },
  { id: "recurring", label: "הוראות קבע" },
  { id: "rolling", label: "תחזית מתגלגלת" },
  { id: "aging", label: "גבייה / חייבים" },
  { id: "scenarios", label: "תרחישים" },
  { id: "settings", label: "הגדרות" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgId, setOrgId] = useState("");
  const [state, setState] = useState<CashState>(demoState);
  const [tab, setTab] = useState("dash");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSession().then((s) => { setSession(s); setAuthReady(true); });
    const { data: sub } = onAuthChange((s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshOrgs = async () => {
    const sup = await isSuperAdmin();
    setIsSuper(sup);
    const list = sup ? await listOrgs() : await getMyOrgs();
    setOrgs(list);
    setOrgId((prev) => prev && list.some((o) => o.id === prev) ? prev : (list.length ? list[0].id : ""));
    return list;
  };

  useEffect(() => {
    if (!session) { setOrgs([]); setOrgId(""); setIsSuper(false); setLoaded(false); return; }
    refreshOrgs();
  }, [session]);

  useEffect(() => {
    if (!session || !orgId) { setLoaded(false); return; }
    (async () => {
      try {
        const remote = await loadRemote(orgId);
        if (remote) setState(remote as CashState);
        else { const d = demoState(); setState(d); await saveRemote(orgId, d); }
      } catch { setState(demoState()); }
      setLoaded(true);
    })();
  }, [session, orgId]);

  useEffect(() => {
    if (!loaded || !session || !orgId) return;
    const t = setTimeout(() => { saveRemote(orgId, state); }, 800);
    return () => clearTimeout(t);
  }, [state, loaded, session, orgId]);

  if (!authReady) return <div dir="rtl" style={{ padding: 60, textAlign: "center", color: C.sub }}>טוען…</div>;
  if (!session) return <Login />;

  const tabs = isSuper ? [...BASE_TABS, { id: "console", label: "קונסולת BGY" }] : BASE_TABS;
  const activeOrg = orgs.find((o) => o.id === orgId);
  const noOrg = !orgId;
  const showData = !!orgId && loaded;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, color: C.navy }}>
      <header style={{ background: state.brand?.color || C.navy, color: "#fff", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{state.brand?.name || "מערכת ניהול תזרים מזומנים"}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>BGY Consulting · {session.user.email}{isSuper ? " · מנהל-על" : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {orgs.length > 0 && (
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ ...inpBase, background: "#1e293b", color: "#fff", border: "1px solid #334155" }}>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <button onClick={() => signOut()} style={{ background: "transparent", color: "#cbd5e1", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>התנתק</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 4, padding: "12px 24px 0", flexWrap: "wrap", borderBottom: "1px solid " + C.line, background: "#fff" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", border: "none", borderBottom: tab === t.id ? "2px solid " + C.accent : "2px solid transparent", background: "transparent", color: tab === t.id ? C.accent : C.sub, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", fontSize: 14 }}>{t.label}</button>
        ))}
      </nav>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        {tab === "console" && isSuper && <Console orgs={orgs} orgId={orgId} setOrgId={setOrgId} refreshOrgs={refreshOrgs} />}
        {tab !== "console" && noOrg && (
          <div style={{ ...card, textAlign: "center", color: C.sub }}>
            {isSuper ? "אין עדיין לקוחות. עבור לטאב \"קונסולת BGY\" ליצירת לקוח ראשון." : "החשבון שלך עדיין לא משויך ללקוח. פנה ל-BGY לשיוך."}
          </div>
        )}
        {tab !== "console" && showData && (
          <>
            {tab === "dash" && <Dashboard state={state} />}
            {tab === "entry" && <Entry state={state} setState={setState} />}
            {tab === "recurring" && <Recurring state={state} setState={setState} />}
            {tab === "rolling" && <Rolling state={state} />}
            {tab === "aging" && <Aging state={state} />}
            {tab === "scenarios" && <Scenarios state={state} />}
            {tab === "settings" && <Settings state={state} setState={setState} />}
          </>
        )}
      </main>
      <footer style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", padding: 24 }}>
        {activeOrg ? "לקוח פעיל: " + activeOrg.name + " · " : ""}נתונים מאובטחים בענן · בידוד מלא לכל לקוח · BGY
      </footer>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !pw) { setMsg("נא למלא אימייל וסיסמה"); return; }
    setBusy(true); setMsg("");
    const { error } = mode === "in" ? await signIn(email.trim(), pw) : await signUp(email.trim(), pw);
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("נרשמת בהצלחה — אפשר להתחבר.");
  };
  const inp: CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, marginBottom: 10, boxSizing: "border-box" };
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>מערכת תזרים מזומנים</div>
          <div style={{ fontSize: 13, color: C.sub }}>BGY Consulting</div>
        </div>
        <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        <input type="password" placeholder="סיסמה" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} style={inp} />
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          {busy ? "…" : mode === "in" ? "התחברות" : "הרשמה"}
        </button>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: C.bad, textAlign: "center" }}>{msg}</div>}
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, color: C.sub }}>
          {mode === "in" ? "אין חשבון? " : "יש חשבון? "}
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>
            {mode === "in" ? "הרשמה" : "התחברות"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: C.sub }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.navy, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Dashboard({ state }: { state: CashState }) {
  const [ym, setYm] = useState(state.months[0]);
  const chain = useMemo(() => computeChain(state), [state]);
  const m = chain[ym] || chain[state.months[0]];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>דשבורד · {ym}</h2>
        <select value={ym} onChange={(e) => setYm(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
          {state.months.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Kpi label="יתרת פתיחה" value={ILS(m.opening)} />
        <Kpi label="יתרת סגירה צפויה" value={ILS(m.close)} color={m.close < 0 ? C.bad : C.good} />
        <Kpi label="שפל נזילות" value={ILS(m.trough)} color={m.trough < state.crit ? C.bad : m.trough < state.warn ? C.warn : C.good} />
        <Kpi label="ימי אוברדרפט" value={String(m.od)} color={m.od > 0 ? C.bad : C.good} />
      </div>
      {m.alert !== "ok" && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, fontWeight: 600, background: m.alert === "crit" ? "#fef2f2" : "#fffbeb", color: m.alert === "crit" ? "#b91c1c" : "#b45309" }}>
          {m.alert === "crit" ? "קריטי" : "אזהרה"} — שפל צפוי {ILS(m.trough)} · שלמות הזנה {m.completeness}%
        </div>
      )}
      <div style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>מסלול יומי</h3>
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>תאריך</th><th style={th}>תקבולים</th><th style={th}>תשלומים</th><th style={th}>נטו</th><th style={th}>יתרה</th></tr></thead>
            <tbody>
              {m.days.filter((d) => d.rec || d.pay).map((d) => (
                <tr key={d.date}>
                  <td style={td}>{d.date}</td>
                  <td style={{ ...td, color: C.good }}>{d.rec ? ILS(d.rec) : "—"}</td>
                  <td style={{ ...td, color: C.bad }}>{d.pay ? ILS(d.pay) : "—"}</td>
                  <td style={td}>{ILS(d.net)}</td>
                  <td style={{ ...td, fontWeight: 600, color: d.proj < 0 ? C.bad : C.navy }}>{ILS(d.proj)}</td>
                </tr>
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
  const inp = inpBase;
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
              <tr key={t.id}>
                <td style={td}>{t.date}</td><td style={td}>{t.site}</td>
                <td style={{ ...td, color: t.dir === "תקבול" ? C.good : C.bad }}>{t.dir}</td>
                <td style={td}>{t.category}</td><td style={td}>{ILS(t.amount)}</td><td style={td}>{t.status}</td>
                <td style={td}><button onClick={() => del(t.id)} style={{ color: C.bad, background: "none", border: "none", cursor: "pointer" }}>מחק</button></td>
              </tr>
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
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.4 }}>
                <td style={td}>{r.day}</td><td style={td}>{r.site}</td>
                <td style={{ ...td, color: r.dir === "תקבול" ? C.good : C.bad }}>{r.dir}</td>
                <td style={td}>{r.category}</td><td style={td}>{ILS(r.amount)}</td><td style={td}>{r.status}</td>
                <td style={td}><input type="checkbox" checked={r.active} onChange={() => toggle(r.id)} /></td>
              </tr>
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
              <tr key={i}>
                <td style={td}>{r.start}</td>
                <td style={{ ...td, color: C.good }}>{r.rec ? ILS(r.rec) : "—"}</td>
                <td style={{ ...td, color: C.bad }}>{r.pay ? ILS(r.pay) : "—"}</td>
                <td style={td}>{ILS(r.net)}</td>
                <td style={{ ...td, fontWeight: 600, color: r.close < 0 ? C.bad : C.navy }}>{ILS(r.close)}</td>
                <td style={td}>{r.alert === "crit" ? "🔴" : r.alert === "warn" ? "🟡" : "🟢"}</td>
              </tr>
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
          <tbody>
            {a.buckets.map((b) => (
              <tr key={b.label}><td style={td}>{b.label}</td><td style={td}>{ILS(b.gross)}</td><td style={{ ...td, color: C.good }}>{ILS(b.expected)}</td></tr>
            ))}
          </tbody>
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
  const inp = inpBase;
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
  return (
    <div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: C.sub }}>{label}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", textDecoration: "line-through" }}>{f(b)}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{f(s)}</div>
    </div>
  );
}

function ListEdit({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  const inp: CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 };
  return (
    <div style={{ ...card, marginTop: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {items.map((it, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 999, padding: "4px 10px", fontSize: 13 }}>
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.bad, cursor: "pointer", fontSize: 14 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder={"הוסף " + label} style={{ ...inp, flex: 1 }} />
        <button onClick={() => { if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }} style={{ ...inp, background: C.accent, color: "#fff", border: "none", cursor: "pointer" }}>הוסף</button>
      </div>
    </div>
  );
}

function Settings({ state, setState }: { state: CashState; setState: (s: CashState) => void }) {
  const brand = state.brand || {};
  const inp: CSSProperties = { ...inpBase, width: "100%" };
  const lbl: CSSProperties = { fontSize: 12, color: C.sub, marginBottom: 4, display: "block" };
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>הגדרות ומיתוג</h2>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>מיתוג</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>שם המערכת</label>
            <input value={brand.name || ""} onChange={(e) => setState({ ...state, brand: { ...brand, name: e.target.value } })} style={inp} />
          </div>
          <div>
            <label style={lbl}>צבע ראשי</label>
            <input type="color" value={brand.color || "#0f172a"} onChange={(e) => setState({ ...state, brand: { ...brand, color: e.target.value } })} style={{ ...inp, height: 38, padding: 4 }} />
          </div>
        </div>
      </div>
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>פרמטרים פיננסיים</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <div><label style={lbl}>יתרת פתיחה</label><input type="number" value={state.opening} onChange={(e) => setState({ ...state, opening: num(e.target.value) })} style={inp} /></div>
          <div><label style={lbl}>סף אזהרה</label><input type="number" value={state.warn} onChange={(e) => setState({ ...state, warn: num(e.target.value) })} style={inp} /></div>
          <div><label style={lbl}>סף קריטי</label><input type="number" value={state.crit} onChange={(e) => setState({ ...state, crit: num(e.target.value) })} style={inp} /></div>
        </div>
      </div>
      <ListEdit label="אתרים" items={state.sites} onChange={(v) => setState({ ...state, sites: v })} />
      <ListEdit label="חודשים (YYYY-MM)" items={state.months} onChange={(v) => setState({ ...state, months: v })} />
      <ListEdit label="קטגוריות תקבול" items={state.catRec} onChange={(v) => setState({ ...state, catRec: v })} />
      <ListEdit label="קטגוריות תשלום" items={state.catPay} onChange={(v) => setState({ ...state, catPay: v })} />
    </>
  );
}

function Console({ orgs, orgId, setOrgId, refreshOrgs }: { orgs: OrgRow[]; orgId: string; setOrgId: (id: string) => void; refreshOrgs: () => Promise<OrgRow[]> }) {
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("0");
  const [warn, setWarn] = useState("0");
  const [crit, setCrit] = useState("0");
  const [bname, setBname] = useState("מערכת ניהול תזרים מזומנים");
  const [bcolor, setBcolor] = useState("#0f172a");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [amsg, setAmsg] = useState("");
  const [members, setMembers] = useState<{ user_id: string; role: string; email: string }[]>([]);

  useEffect(() => { (async () => { setMembers(orgId ? await listMembers(orgId) : []); })(); }, [orgId]);

  const create = async () => {
    if (!name.trim()) { setMsg("נא להזין שם לקוח"); return; }
    setBusy(true); setMsg("");
    const id = await createOrg(name.trim());
    if (!id) { setMsg("יצירה נכשלה — נדרשת הרשאת מנהל-על"); setBusy(false); return; }
    const st = emptyState(num(opening), num(warn), num(crit));
    st.brand = { name: bname, color: bcolor };
    await seedOrgState(id, st);
    await refreshOrgs();
    setOrgId(id);
    setMsg("הלקוח \"" + name.trim() + "\" נוצר ונבחר כפעיל ✓");
    setName("");
    setBusy(false);
  };

  const assign = async () => {
    if (!orgId) { setAmsg("בחר לקוח פעיל קודם"); return; }
    if (!email.trim()) { setAmsg("נא להזין אימייל"); return; }
    const p = await searchProfileByEmail(email);
    if (!p) { setAmsg("לא נמצא משתמש עם אימייל זה — שיירשם תחילה במסך ההתחברות"); return; }
    const ok = await addMembership(orgId, p.id, role);
    setAmsg(ok ? "שויך בהצלחה ✓" : "שיוך נכשל — ייתכן שכבר משויך");
    if (ok) { setEmail(""); setMembers(await listMembers(orgId)); }
  };

  const inp: CSSProperties = { ...inpBase, width: "100%" };
  const lbl: CSSProperties = { fontSize: 12, color: C.sub, marginBottom: 4, display: "block" };
  const activeName = orgs.find((o) => o.id === orgId)?.name || "—";

  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>קונסולת BGY · ניהול לקוחות</h2>

      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>לקוח חדש</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <div><label style={lbl}>שם הלקוח</label><input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="שם מלון / רשת" /></div>
          <div><label style={lbl}>שם מערכת (מיתוג)</label><input value={bname} onChange={(e) => setBname(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>צבע ראשי</label><input type="color" value={bcolor} onChange={(e) => setBcolor(e.target.value)} style={{ ...inp, height: 38, padding: 4 }} /></div>
          <div><label style={lbl}>יתרת פתיחה</label><input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>סף אזהרה</label><input type="number" value={warn} onChange={(e) => setWarn(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>סף קריטי</label><input type="number" value={crit} onChange={(e) => setCrit(e.target.value)} style={inp} /></div>
        </div>
        <button onClick={create} disabled={busy} style={{ ...inp, width: "auto", marginTop: 12, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, padding: "8px 20px" }}>{busy ? "יוצר…" : "צור לקוח"}</button>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.includes("✓") ? C.good : C.bad }}>{msg}</div>}
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>לקוחות ({orgs.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>שם</th><th style={th}>סטטוס</th><th style={th}></th></tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td style={td}>{o.name}</td>
                <td style={td}>{o.id === orgId ? "פעיל" : ""}</td>
                <td style={td}><button onClick={() => setOrgId(o.id)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer" }}>בחר</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>שיוך משתמש ללקוח הפעיל: {activeName}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ flex: 1, minWidth: 200 }}><label style={lbl}>אימייל המשתמש</label><input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} placeholder="user@example.com" /></div>
          <div><label style={lbl}>תפקיד</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inp}>
              <option value="owner">בעלים</option>
              <option value="admin">מנהל</option>
              <option value="editor">עורך</option>
              <option value="viewer">צופה</option>
            </select>
          </div>
          <button onClick={assign} style={{ ...inp, width: "auto", background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, padding: "8px 20px" }}>שייך</button>
        </div>
        {amsg && <div style={{ marginTop: 10, fontSize: 13, color: amsg.includes("✓") ? C.good : C.bad }}>{amsg}</div>}
        {members.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead><tr><th style={th}>אימייל</th><th style={th}>תפקיד</th></tr></thead>
            <tbody>{members.map((m) => <tr key={m.user_id}><td style={td}>{m.email}</td><td style={td}>{m.role}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
