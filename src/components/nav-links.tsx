'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLinks({ items, label }: { items: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    const clean = href.replace(/\/$/, '') || '/';
    if (clean === '/' || clean === '/en') return pathname === clean;
    return pathname === clean || pathname.startsWith(`${clean}/`);
  };
  return (
    <nav aria-label={label} className="hidden items-center gap-7 lg:flex">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`relative py-2 font-semibold transition-colors hover:text-white ${active ? 'text-white' : 'text-[#c3c7cc]'}`}>
            {item.label}
            {active && <span aria-hidden className="slash absolute -bottom-0.5 left-0 h-[3px]! w-full! skew-x-[-32deg]" />}
          </Link>
        );
      })}
    </nav>
  );
}
