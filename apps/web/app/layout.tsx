import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'HogWatch', description: 'Arkansas football progress dashboard' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="top"><div className="brand"><div className="mark">H</div><div><b>HOGWATCH</b><span>Arkansas Football Analytics</span></div></div><div className="season">2026 SEASON</div></header><main>{children}</main></body></html>;
}
