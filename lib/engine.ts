// מנוע התזרים — פורט נקי מ-Apps Script ל-TypeScript

export type Dir = "תקבול" | "תשלום";
export type Status = "מאומת" | "אומדן";

export interface Txn {
  id: string | number;
  date: string;
  site: string;
  dir: Dir;
  category: string;
  amount: number;
  status: Status;
  note?: string;
  rec?: boolean;
  recId?: string | number;
  by?: string;
}

export interface RecurringRule {
  id: string | number;
  day: number;
  site: string;
  dir: Dir;
  category: string;
  amount: number;
  status: Status;
  note?: string;
  active: boolean;
}

export interface AgingRules {
  b0_30: { days: number; prob: number };
  b31_60: { days: number; prob: number };
  b61_90: { days: number; prob: number };
  b90p: { days: number; prob: number };
}

export interface CashState {
  opening: number;
  warn: number;
  crit: number;
  sites: string[];
  catRec: string[];
  catPay: string[];
  transactions: Txn[];
  recurring: RecurringRule[];
  actuals: Record<string, number>;
  months: string[];
  agingRules?: AgingRules;
  brand?: { name?: string; color?: string };
}

export interface DayRow {
  date: string;
  rec: number;
  pay: number;
  net: number;
  proj: number;
  actual: boolean;
}

export type Alert = "crit" | "warn" | "ok";

export interface MonthResult {
  ym: string;
  opening: number;
  days: DayRow[];
  monRec: number;
  monPay: number;
  net: number;
  close: number;
  trough: number;
  od: number;
  alert: Alert;
  completeness: number;
}

export type Chain = Record<string, MonthResult>;

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function applyRecurring(state: CashState, ym: string): Txn[] {
  const dim = daysInMonth(ym);
  return (state.recurring || [])
    .filter((r) => r.active)
    .map((r) => {
      const day = Math.min(Math.max(1, r.day), dim);
      return {
        id: "rec_" + r.id + "_" + ym,
        date: ym + "-" + pad2(day),
        site: r.site,
        dir: r.dir,
        category: r.category,
        amount: Math.abs(r.amount),
        status: r.status || "אומדן",
        note: (r.note || "") + " [הו״ק]",
        by: "הוראת קבע",
        rec: true,
        recId: r.id,
      } as Txn;
    });
}

export function computeChain(state: CashState): Chain {
  const months = (state.months || []).slice().sort();
  const out: Chain = {};
  let carry = state.opening || 0;
  for (const ym of months) {
    const recTxns = applyRecurring(state, ym);
    const all = (state.transactions || [])
      .filter((t) => t.date && t.date.slice(0, 7) === ym && !t.rec)
      .concat(recTxns);
    const byDate: Record<string, { rec: number; pay: number }> = {};
    let verifiedAmt = 0;
    let totalAmt = 0;
    for (const t of all) {
      const amt = Math.abs(t.amount);
      totalAmt += amt;
      if (t.status === "מאומת") verifiedAmt += amt;
      if (!byDate[t.date]) byDate[t.date] = { rec: 0, pay: 0 };
      if (t.dir === "תקבול") byDate[t.date].rec += amt;
      else byDate[t.date].pay += amt;
    }
    const dim = daysInMonth(ym);
    const days: DayRow[] = [];
    let monRec = 0, monPay = 0, trough = Infinity, od = 0;
    const opening = carry;
    for (let d = 1; d <= dim; d++) {
      const date = ym + "-" + pad2(d);
      const agg = byDate[date] || { rec: 0, pay: 0 };
      const net = agg.rec - agg.pay;
      let proj = carry + net;
      let actual = false;
      if (state.actuals && Object.prototype.hasOwnProperty.call(state.actuals, date)) {
        proj = state.actuals[date];
        actual = true;
      }
      carry = proj;
      monRec += agg.rec;
      monPay += agg.pay;
      if (proj < trough) trough = proj;
      if (proj < 0) od++;
      days.push({ date, rec: agg.rec, pay: agg.pay, net, proj, actual });
    }
    const close = carry;
    const alert: Alert = trough < (state.crit ?? 0) ? "crit" : trough < (state.warn ?? 0) ? "warn" : "ok";
    out[ym] = { ym, opening, days, monRec, monPay, net: monRec - monPay, close, trough: trough === Infinity ? opening : trough, od, alert, completeness: totalAmt > 0 ? Math.round((verifiedAmt / totalAmt) * 100) : 100 };
  }
  return out;
}

export function runScenario(state: CashState, deltas: Txn[]): Chain {
  return computeChain({ ...state, transactions: (state.transactions || []).concat(deltas || []) });
}

export function emptyState(opening = 0, warn = 0, crit = 0, months?: string[]): CashState {
  const now = new Date();
  const gen: string[] = [];
  for (let i = 0; i < 4; i++) {
    let y = now.getFullYear();
    let m = now.getMonth() + 1 + i;
    while (m > 12) { m -= 12; y++; }
    gen.push(y + "-" + pad2(m));
  }
  return {
    opening, warn, crit,
    sites: ["מאוחד"],
    catRec: ["גביית חייבים", "הפקדות מלקוחות", "אחר"],
    catPay: ["משכורות", "ספקים", "מע״מ", "אחר"],
    transactions: [], recurring: [], actuals: {},
    months: months && months.length ? months : gen,
  };
}

export interface WeekRow { start: string; end: string; rec: number; pay: number; net: number; close: number; alert: Alert; }

function ymd(d: Date): string {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function allTxns(state: CashState): Txn[] {
  let out: Txn[] = (state.transactions || []).filter((t) => !t.rec);
  for (const ym of state.months || []) out = out.concat(applyRecurring(state, ym));
  return out;
}

export function rollingForecast(state: CashState, weeks = 13): WeekRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDate: Record<string, number> = {};
  for (const t of allTxns(state)) {
    const amt = (t.dir === "תקבול" ? 1 : -1) * Math.abs(t.amount);
    byDate[t.date] = (byDate[t.date] || 0) + amt;
  }
  let running = state.opening || 0;
  for (const date in byDate) if (date < ymd(today)) running += byDate[date];
  const rows: WeekRow[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = new Date(today);
    start.setDate(start.getDate() + w * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    let rec = 0, pay = 0;
    for (const t of allTxns(state)) {
      if (t.date >= ymd(start) && t.date <= ymd(end)) {
        if (t.dir === "תקבול") rec += Math.abs(t.amount);
        else pay += Math.abs(t.amount);
      }
    }
    const net = rec - pay;
    running += net;
    const alert: Alert = running < (state.crit ?? 0) ? "crit" : running < (state.warn ?? 0) ? "warn" : "ok";
    rows.push({ start: ymd(start), end: ymd(end), rec, pay, net, close: running, alert });
  }
  return rows;
}

export interface AgingBucket { label: string; gross: number; expected: number; }

export function aging(state: CashState): { buckets: AgingBucket[]; totalGross: number; totalExpected: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const r = state.agingRules || { b0_30: { days: 15, prob: 0.95 }, b31_60: { days: 25, prob: 0.85 }, b61_90: { days: 45, prob: 0.65 }, b90p: { days: 75, prob: 0.4 } };
  const defs = [
    { label: "0–30 יום", min: 0, max: 30, prob: r.b0_30.prob },
    { label: "31–60 יום", min: 31, max: 60, prob: r.b31_60.prob },
    { label: "61–90 יום", min: 61, max: 90, prob: r.b61_90.prob },
    { label: "90+ יום", min: 91, max: 100000, prob: r.b90p.prob },
  ];
  const buckets: AgingBucket[] = defs.map((d) => ({ label: d.label, gross: 0, expected: 0 }));
  for (const t of allTxns(state)) {
    if (t.dir !== "תקבול") continue;
    const due = new Date(t.date);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    const idx = defs.findIndex((d) => days >= d.min && days <= d.max);
    if (idx < 0) continue;
    const amt = Math.abs(t.amount);
    buckets[idx].gross += amt;
    buckets[idx].expected += amt * defs[idx].prob;
  }
  const totalGross = buckets.reduce((s, b) => s + b.gross, 0);
  const totalExpected = buckets.reduce((s, b) => s + b.expected, 0);
  return { buckets, totalGross, totalExpected };
}
