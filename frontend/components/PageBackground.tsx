'use client';

import { usePathname } from 'next/navigation';

export default function PageBackground() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) return null;

  return (
    <div
      className="fixed inset-0 -z-10 min-h-screen animated-gradient"
      aria-hidden
    />
  );
}
