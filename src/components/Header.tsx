"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuthUser } from "./useAuthUser";
import { logout } from "@/lib/firebase/auth";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuthUser();
  const displayName = user?.displayName || user?.email || "Usuario";

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
        <Link href="/groups/new">Crear grupo</Link>
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
