"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuthUser } from "./useAuthUser";
import { logout } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firebase/firestore";
import { canCreateGroup } from "@/lib/permissions";
import type { UserProfile } from "@/types";
import styles from "./Header.module.css";

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
      <Link href="/" className={styles.brand}>
        <span className={styles.mark}><ShieldCheck size={20} aria-hidden /></span>
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
