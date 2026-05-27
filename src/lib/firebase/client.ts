"use client";

import { getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

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
