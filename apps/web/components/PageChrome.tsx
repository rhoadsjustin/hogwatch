import Link from 'next/link';
import type { ReactNode } from 'react';

export function BackLink({ href = '/', children = 'Season dashboard' }: { href?: string; children?: ReactNode }) {
  return <Link className="backLink" href={href}>← {children}</Link>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="sectionHeading">
    <div>{eyebrow && <span className="overline">{eyebrow}</span>}<h2>{title}</h2></div>
    {action}
  </div>;
}
