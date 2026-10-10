import { useEffect, useState } from 'react';
import { collection, getFirestore, onSnapshot, query, where } from '@react-native-firebase/firestore';

import { useAuth } from '@/context/auth';
import { useMode } from '@/context/mode';

export type InboxChat = { rentalId: string; itemId?: string; status?: string };

/**
 * Chats for the active role only: in lender mode the rentals where the user is the lender,
 * in borrower mode the ones where they are the borrower. Each rental has one chat between its two participants.
 */
export function useInbox() {
  const { user } = useAuth();
  const { mode } = useMode();
  const uid = user?.uid;
  const [result, setResult] = useState<{ key: string; chats: InboxChat[] } | null>(null);
  const key = `${uid}:${mode}`;

  useEffect(() => {
    if (!uid) return;
    const mine = query(
      collection(getFirestore(), 'rentals'),
      where(mode === 'lender' ? 'lenderId' : 'borrowerId', '==', uid),
    );
    return onSnapshot(
      mine,
      (snap) =>
        setResult({
          key,
          chats: snap.docs.map((d) => ({ rentalId: d.id, itemId: d.get('itemId') as string, status: d.get('status') as string })),
        }),
      () => setResult({ key, chats: [] }),
    );
  }, [uid, mode, key]);

  // A result from the other role is never shown while the new query loads.
  const current = result?.key === key ? result : null;
  return { chats: current?.chats ?? [], loading: !current };
}
