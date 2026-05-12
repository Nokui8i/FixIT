import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { getFirebaseAuth } from "@/shared/firebase/client";

export function useFirebaseAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
