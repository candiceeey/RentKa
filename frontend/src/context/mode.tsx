import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '@/context/auth';
import { type Role } from '@/core/stateMachine';

const KEY = 'rentka.mode';

type ModeValue = {
  /** The side of the app being shown. Always a role the account holds. */
  mode: Role;
  setMode: (mode: Role) => void;
};

const ModeContext = createContext<ModeValue | null>(null);

/** Which side of the app is showing. Kept on the phone only; the account's roles live in Firestore. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const { roles } = useAuth();
  const [saved, setSaved] = useState<Role>('borrower');

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((value) => {
        if (value === 'lender' || value === 'borrower') setSaved(value);
      })
      .catch(() => {});
  }, []);

  // A single-role account always shows that role, whatever was saved before.
  const mode = roles.includes(saved) ? saved : (roles[0] ?? saved);

  const setMode = (next: Role) => {
    if (!roles.includes(next)) return;
    setSaved(next);
    SecureStore.setItemAsync(KEY, next).catch(() => {});
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeValue {
  const value = useContext(ModeContext);
  if (!value) throw new Error('useMode must be used inside ModeProvider');
  return value;
}
