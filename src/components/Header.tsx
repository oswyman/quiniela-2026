"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { useAuthUser } from "./useAuthUser";
import { logout } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/firestore";
import { canCreateGroup } from "@/lib/permissions";
import type { UserProfile } from "@/types";
import styles from "./Header.module.css";

function FootballMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4"/>
      <polygon points="10,4 13.5,7.5 12.5,12 7.5,12 6.5,7.5" fill="currentColor" opacity="0.82"/>
      <line x1="10" y1="4" x2="10" y2="1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="13.5" y1="7.5" x2="17.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12.5" y1="12" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7.5" y1="12" x2="4.5" y2="15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="6.5" y1="7.5" x2="2.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function Header() {
  const { user } = useAuthUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const displayName = user?.displayName || user?.email || "Usuario";

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    getUserProfile(user.uid).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  return (
    <header className={styles.header}>
      <a href="#main-content" className={styles.skipLink}>Saltar al contenido</a>
      <Link href="/" className={styles.brand}>
        <span className={styles.mark}><FootballMark /></span>
        <span className={styles.brandText}>
          <strong>La Cancha</strong>
          <span>Quinielas privadas Mundial 2026</span>
        </span>
      </Link>
      <nav className={styles.nav}>
        <Link href="/dashboard">Dashboard</Link>
        {canCreateGroup(profile) ? <Link href="/groups/new">Crear grupo</Link> : null}
        {user ? (
          <span className={styles.sessionCluster}>
            <span className={styles.userBadge} title={displayName}><UserRound size={15} aria-hidden /> {displayName}</span>
            <button className={styles.iconButton} onClick={() => logout()} title="Cerrar sesión" type="button">
              <LogOut size={18} aria-hidden />
            </button>
          </span>
        ) : (
          <Link href="/login">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}
