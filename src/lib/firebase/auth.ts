"use client";

import {
  User,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./client";
import type { UserProfile } from "@/types";

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await ensureUserProfile(credential.user.uid, displayName, email);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user.uid, credential.user.displayName ?? "", credential.user.email ?? email);
  return credential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  await ensureUserProfile(
    credential.user.uid,
    credential.user.displayName ?? "",
    credential.user.email ?? ""
  );
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function ensureUserProfile(uid: string, displayName: string, email: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      displayName: displayName || email,
      email,
      createdAt: serverTimestamp(),
      roleGlobal: "user"
    } satisfies Omit<UserProfile, "createdAt"> & { createdAt: unknown });
  }
}

export async function registerWithInvite(email: string, password: string, displayName: string) {
  return registerWithEmail(email, password, displayName);
}
