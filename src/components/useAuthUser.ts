"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { observeAuth } from "@/lib/firebase/auth";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
