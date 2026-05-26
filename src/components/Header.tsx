"use client";

import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuthUser } from "./useAuthUser";
import { logout } from "@/lib/firebase/auth";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuthUser();

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
          <button className={styles.iconButton} onClick={() => logout()} title="Cerrar sesión" type="button">
            <LogOut size={18} aria-hidden />
          </button>
        ) : (
          <Link href="/login">Iniciar sesión</Link>
        )}
      </nav>
    </header>
  );
}
