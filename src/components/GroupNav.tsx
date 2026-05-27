"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === `/groups/${groupId}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const links = [
    { href: `/groups/${groupId}`, label: "Resumen" },
    { href: `/groups/${groupId}/predictions`, label: "Pronósticos" },
    { href: `/groups/${groupId}/ranking`, label: "Ranking" },
    { href: `/groups/${groupId}/admin`, label: "Admin" }
  ];

  return (
    <nav className="tabs" aria-label="Navegación de grupo">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={isActive(href) ? "tabButton active" : "tabButton"}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
