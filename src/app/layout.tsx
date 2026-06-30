import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '小英檢樂學 | GEPT Kids',
  description: '2026 全功能英檢 (小 GEPT / 初級) 自然發音與聽說讀寫全方位練習 App',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

const navItems = [
  { href: '/', label: '首頁' },
  { href: '/phonics', label: '發音積木' },
  { href: '/exam', label: '英檢模擬' },
  { href: '/plan', label: '學習計畫' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="font-kid min-h-screen">
        <header className="bg-sunny shadow-md">
          <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-4">
            <Link href="/" className="mr-auto text-2xl font-extrabold text-white drop-shadow">
              🌞 小英檢樂學
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-base font-bold text-amber-900 hover:bg-white/40 sm:text-lg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-12 py-6 text-center text-sm text-amber-700/70">
          © 2026 小英檢樂學 · 對標 GEPT Kids / 全民英檢初級
        </footer>
      </body>
    </html>
  );
}
