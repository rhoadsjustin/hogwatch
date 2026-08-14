import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'HogWatch | Arkansas football analytics',
  description: 'Weekly, opponent-adjusted Arkansas football analytics.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link className="brand" href="/" aria-label="HogWatch season dashboard">
            <span className="mark">H</span>
            <span><b>HOGWATCH</b><small>ARKANSAS FOOTBALL ANALYTICS</small></span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/">Dashboard</Link>
            <Link href="/trends">Trends</Link>
          </nav>
          <span className="season">2026 SEASON</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
