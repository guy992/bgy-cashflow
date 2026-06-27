import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BGY תזרים מזומנים",
  description: "מערכת ניהול תזרים מזומנים — BGY Consulting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif",
          background: "#eef2f7",
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
