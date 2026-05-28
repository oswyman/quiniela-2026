"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Settings, Target, Users2 } from "lucide-react";

export function GroupNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === `/groups/${groupId}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const links = [
    { href: `/groups/${groupId}`,                         label: "Resumen",         icon: <LayoutDashboard size={14} aria-hidden /> },
    { href: `/groups/${groupId}/predictions`,             label: "Mis pronósticos", icon: <Target size={14} aria-hidden /> },
    { href: `/groups/${groupId}/predictions/group`,       label: "Grupo",           icon: <Users2 size={14} aria-hidden /> },
    { href: `/groups/${groupId}/ranking`,                 label: "Ranking",         icon: <BarChart3 size={14} aria-hidden /> },
    { href: `/groups/${groupId}/admin`,                   label: "Admin",           icon: <Settings size={14} aria-hidden /> },
  ];

  return (
    <nav className="tabs" aria-label="Navegación de grupo">
      {links.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          className={isActive(href) ? "tabButton active" : "tabButton"}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  );
}
