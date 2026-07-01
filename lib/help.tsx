"use client";

import { useEffect, useState, type CSSProperties } from "react";

const C = {
  card: "#ffffff", line: "#e2e8f0", navy: "#0f172a", sub: "#64748b",
  accent: "#1d4ed8", good: "#059669", bg: "#eef2f7",
};
const card: CSSProperties = { background: C.card, border: "1px solid " + C.line, borderRadius: 12, padding: 16 };

// ===== חלונית משפטית (תנאי שימוש / פרטיות) =====
function LegalModal({ kind, onClose }: { kind: "tos" | "privacy"; onClose: () => void }) {
  const isTos = kind === "tos";
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ ...card, maxWidth: 640, width: "100%", maxHeight: "82vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{isTos ? "תנאי שימוש" : "מדיניות פרטיות"}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: C.sub }}>×</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "#334155" }}>
          <p style={{ marginTop: 0, fontSize: 12, color: C.sub }}>עדכון אחרון: תשפ״ו · BGY Consulting Ltd · guy@bgy.co.il</p>
          {isTos ? (
            <>
              <p><b>1. השירות.</b> מערכת ענן לניהול תזרים מזומנים לבתי מלון, במודל רב-לקוח עם בידוד נתונים מלא. השימוש מהווה הסכמה לתנאים אלה.</p>
              <p><b>2. רישיון.</b> רישיון שימוש מוגבל, לא בלעדי ולא ניתן להעברה, בהתאם לתכנית שנרכשה. אין להעתיק/למכור/להעניק גישה לצד שלישי ללא אישור בכתב.</p>
              <p><b>3. נתוני הלקוח.</b> הנתונים שתזין הם בבעלותך המלאה. BGY משתמשת בהם רק לצורך אספקת השירות, בכפוף למדיניות הפרטיות ול-DPA.</p>
              <p><b>4. תשלומים.</b> מנוי משולם מראש; אי-תשלום עלול להוביל להשעיה לאחר התראה. מחירים אינם כוללים מע״מ אלא אם צוין.</p>
              <p><b>5. זמינות.</b> נשאף לזמינות גבוהה אך ייתכנו הפסקות תחזוקה. השירות מתארח על תשתיות צד-שלישי.</p>
              <p><b>6. אחריות.</b> השירות ניתן כפי שהוא. <b>הוא כלי עזר לניהול תזרים ואינו ייעוץ פיננסי/חשבונאי.</b> ההחלטות העסקיות באחריותך. אחריות BGY מוגבלת בהתאם לדין.</p>
              <p><b>7. קניין רוחני.</b> כל הזכויות בשירות, בקוד ובמנוע שייכות ל-BGY.</p>
              <p><b>8. דין.</b> הדין הישראלי חל על תנאים אלה.</p>
              <p style={{ color: C.sub, fontSize: 12 }}>זו גרסת תקציר להצגה במערכת. המסמך המלא זמין לבקשה.</p>
            </>
          ) : (
            <>
              <p>המערכת פועלת בהתאם לחוק הגנת הפרטיות התשמ״א-1981, לתיקון מס׳ 13 (2025), ולעקרונות ה-GDPR.</p>
              <p><b>איזה מידע נאסף.</b> כתובת אימייל ופרטי הזדהות (סיסמאות נשמרות מוצפנות ואינן נגישות ל-BGY); נתוני תזרים עסקיים שתזין; ומידע טכני לצורך אבטחה וניטור תקלות.</p>
              <p><b>מטרות ובסיס חוקי.</b> אספקת השירות (ביצוע חוזה), אבטחה וניטור (אינטרס לגיטימי/חובה חוקית), חיוב (חובה חוקית).</p>
              <p><b>ספקי משנה.</b> Supabase (אחסון והזדהות, האיחוד האירופי), Vercel (אירוח), Sentry (ניטור תקלות, האיחוד האירופי), Google (הזדהות אופציונלית).</p>
              <p><b>אבטחה.</b> הצפנה בתעבורה (HTTPS), בקרת גישה מבוססת תפקידים, ובידוד רב-לקוח ברמת בסיס הנתונים (RLS) — כל לקוח ניגש רק לנתוניו.</p>
              <p><b>זכויותיך.</b> עיון, תיקון, מחיקה והתנגדות לעיבוד. לפניות: guy@bgy.co.il.</p>
              <p style={{ color: C.sub, fontSize: 12 }}>זו גרסת תקציר להצגה במערכת. מדיניות הפרטיות המלאה זמינה לבקשה.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== קישורים משפטיים (עם חלונית פנימית) =====
export function LegalLinks({ light }: { light?: boolean }) {
  const [k, setK] = useState<"tos" | "privacy" | null>(null);
  const col = light ? "#cbd5e1" : C.accent;
  const btn: CSSProperties = { background: "none", border: "none", color: col, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" };
  return (
    <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={() => setK("tos")} style={btn}>תנאי שימוש</button>
      <button onClick={() => setK("privacy")} style={btn}>מדיניות פרטיות</button>
      {k && <LegalModal kind={k} onClose={() => setK(null)} />}
    </span>
  );
}

// ===== באנר הסכמת עוגיות =====
export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("bgy_consent_v1")) setShow(true); } catch { /* ignore */ }
  }, []);
  if (!show) return null;
  const accept = () => { try { localStorage.setItem("bgy_consent_v1", "1"); } catch { /* ignore */ } setShow(false); };
  return (
    <div dir="rtl" style={{ position: "fixed", bottom: 12, left: 12, right: 12, maxWidth: 620, margin: "0 auto", background: C.navy, color: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", zIndex: 1100, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
        אנו משתמשים בעוגיות חיוניות בלבד להפעלת המערכת ולאבטחתה. המשך השימוש מהווה הסכמה. <span style={{ opacity: 0.85 }}><LegalLinks light /></span>
      </div>
      <button onClick={accept} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>הבנתי</button>
    </div>
  );
}

// ===== פוטר עם חיווי GDPR =====
export function AppFooter({ activeOrgName }: { activeOrgName?: string }) {
  return (
    <footer style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", padding: 24, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div>{activeOrgName ? "לקוח פעיל: " + activeOrgName + " · " : ""}נתונים מאובטחים בענן · בידוד מלא לכל לקוח · BGY</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: C.good }}>✓ תואם עקרונות GDPR וחוק הגנת הפרטיות</span>
        <LegalLinks />
      </div>
    </footer>
  );
}

// ===== מדריך המערכת =====
function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{n}</div>
      <div><div style={{ fontWeight: 600 }}>{title}</div><div style={{ fontSize: 13, color: C.sub }}>{body}</div></div>
    </div>
  );
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ ...card }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

export function HelpGuide() {
  return (
    <>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>ברוכים הבאים 👋 מדריך המערכת</h2>
      <p style={{ color: C.sub, fontSize: 14, marginTop: 0 }}>כל מה שצריך כדי להתחיל לנהל תזרים מזומנים — גם אם זו הפעם הראשונה שלך.</p>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>התחלה מהירה — 4 צעדים</div>
        <div style={{ display: "grid", gap: 14 }}>
          <Step n={1} title="הגדרות בסיס" body="בטאב 'הגדרות' קבע יתרת פתיחה, סף אזהרה וסף קריטי, והוסף את האתרים והקטגוריות שלך." />
          <Step n={2} title="הוראות קבע" body="בטאב 'הוראות קבע' הזן הכנסות/הוצאות חוזרות חודשיות (משכורות, מע״מ, גבייה קבועה) — הן מתמלאות אוטומטית בכל חודש." />
          <Step n={3} title="הזנת תנועות וחייבים" body="ב'הזנת תנועות' הוסף תקבולים/תשלומים חד-פעמיים. ב'גבייה/חייבים' הוסף תקבולים עתידיים צפויים." />
          <Step n={4} title="צפייה בתזרים" body="בדשבורד תראה תמונת מצב וגרפים; ב'תחזית מתגלגלת' 13 שבועות קדימה; וב'תרחישים' תבדוק מה-אם." />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <GuideCard title="דשבורד" body="תמונת מצב חודשית: יתרת פתיחה/סגירה, שפל נזילות (הנקודה הנמוכה ביותר), וימי אוברדרפט. הגרפים מציגים את מסלול היתרה היומי מול ספי האזהרה/קריטי, ותקבולים מול תשלומים לפי חודש." />
        <GuideCard title="הזנת תנועות" body="הוספת תקבול (כסף נכנס) או תשלום (כסף יוצא) לתאריך מסוים: בחר תאריך, אתר, כיוון, קטגוריה וסכום, וסמן אם מאומת או אומדן." />
        <GuideCard title="הוראות קבע" body="הכנסות/הוצאות שחוזרות בכל חודש באותו יום. הוסף פעם אחת — והמערכת משבצת אותן אוטומטית בכל החודשים. אפשר להפעיל/לכבות ולמחוק." />
        <GuideCard title="תחזית מתגלגלת" body="מבט של 13 שבועות קדימה: כמה ייכנס וייצא בכל שבוע, יתרת הסגירה הצפויה, והתראה צבעונית על שבועות בסיכון." />
        <GuideCard title="גבייה / חייבים" body="ניהול תקבולים עתידיים (חייבים). המערכת משקללת סיכוי גבייה לפי ותק החוב ומציגה 'גבייה צפויה' מול 'ברוטו'." />
        <GuideCard title="תרחישים (מה-אם)" body="בדיקה מהירה: מה יקרה ליתרה ולשפל אם ייכנס/ייצא סכום מסוים בחודש נבחר — בלי לשנות את הנתונים האמיתיים." />
        <GuideCard title="הגדרות ומיתוג" body="שם וצבע המערכת, יתרת פתיחה וספים, ורשימות האתרים והקטגוריות. שינויים נשמרים אוטומטית בענן." />
        <GuideCard title="סטטוסים: מאומת / אומדן" body="'מאומת' = תנועה ודאית; 'אומדן' = הערכה. שלמות ההזנה בדשבורד מציגה איזה אחוז מהנתונים כבר מאומת." />
      </div>

      <div style={{ ...card, marginTop: 16, background: "#f8fafc" }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>פרטיות ואבטחה</div>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
          הנתונים שלך מאובטחים, מוצפנים בתעבורה, ומבודדים במלואם מכל לקוח אחר (RLS). המערכת פועלת בהתאם לעקרונות GDPR ולחוק הגנת הפרטיות. פרטים: <LegalLinks />
        </div>
      </div>

      <div style={{ textAlign: "center", color: C.sub, fontSize: 13, marginTop: 16 }}>
        צריך עזרה נוספת? כתוב לנו: <a href="mailto:guy@bgy.co.il" style={{ color: C.accent }}>guy@bgy.co.il</a>
      </div>
    </>
  );
}
