"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CheckSquare, LayoutDashboard, Settings, Target, Users2 } from "lucide-react";

export function GroupNav({ groupId, liveCount = 0 }: { groupId: string; liveCount?: number }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === `/groups/${groupId}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const links = [
    { href: `/groups/${groupId}`,                   label: "Resumen",         icon: <LayoutDashboard size={14} aria-hidden /> },
    { href: `/groups/${groupId}/predictions`,        label: "Mis pronósticos", icon: <Target size={14} aria-hidden /> },
    { href: `/groups/${groupId}/predictions/group`,  label: "Grupo",           icon: <Users2 size={14} aria-hidden /> },
    { href: `/groups/${groupId}/results`,            label: "Resultados",      icon: <CheckSquare size={14} aria-hidden />, live: liveCount > 0 },
    { href: `/groups/${groupId}/ranking`,            label: "Ranking",         icon: <BarChart3 size={14} aria-hidden /> },
    { href: `/groups/${groupId}/admin`,              label: "Admin",           icon: <Settings size={14} aria-hidden /> },
  ];

  return (
    <nav className="tabs" aria-label="Navegación de grupo">
      {links.map(({ href, label, icon, live }) => (
        <Link
          key={href}
          href={href}
          className={isActive(href) ? "tabButton active" : "tabButton"}
        >
          {icon}
          {label}
          {live ? <span className="liveDot" style={{ marginLeft: 4 }} aria-label="Partidos en vivo" /> : null}
        </Link>
      ))}
    </nav>
  );
}
