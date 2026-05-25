"use client";

import Link from "next/link";
import { LogOut, Trophy } from "lucide-react";
import { useAuthUser } from "./useAuthUser";
import { logout } from "@/lib/firebase/auth";
import styles from "./Header.module.css";

export function Header() {
  const { user } = useAuthUser();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Trophy size={22} aria-hidden />
        Quiniela 2026
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
