import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import { type Role } from '@/core/stateMachine';

const KEY = 'rentka.mode';

type ModeValue = {
  mode: Role;
  setMode: (mode: Role) => void;
};

const ModeContext = createContext<ModeValue | null>(null);

/** Which side of the app is showing. Kept on the phone only: one account has both roles. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Role>('borrower');

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((saved) => {
        if (saved === 'lender' || saved === 'borrower') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: Role) => {
    setModeState(next);
    SecureStore.setItemAsync(KEY, next).catch(() => {});
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeValue {
  const value = useContext(ModeContext);
  if (!value) throw new Error('useMode must be used inside ModeProvider');
  return value;
}
