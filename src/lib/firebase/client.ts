"use client";

import { getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:demo"
};

const app = typeof window === "undefined" ? null : getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

if (app && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = app ? getAuth(app) : null as unknown as ReturnType<typeof getAuth>;
export const db = app ? getFirestore(app) : null as unknown as ReturnType<typeof getFirestore>;
export const functions = app ? getFunctions(app) : null as unknown as ReturnType<typeof getFunctions>;

// Conectar a Firebase Local Emulator Suite cuando NEXT_PUBLIC_USE_EMULATOR=true
// Guard para HMR: evitar llamar connect*Emulator más de una vez por instancia
if (app && typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_EMULATOR === "true") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (!win.__fbEmulatorsConnected) {
    win.__fbEmulatorsConnected = true;
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }
}
