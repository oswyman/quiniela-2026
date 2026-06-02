"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { CookieBanner, getStoredConsent } from "./CookieBanner";

export function AnalyticsProvider() {
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);

  useEffect(() => {
    setConsent(getStoredConsent());
  }, []);

  return (
    <>
      <CookieBanner onConsent={setConsent} />
      {consent === "accepted" ? <Analytics /> : null}
    </>
  );
}
