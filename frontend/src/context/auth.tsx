import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from '@react-native-firebase/firestore';

import {
  ALL_ROLES, normalizePhMobile, pickSignupFields, type ProfileInput, type SignupInput,
} from '@/core/userProfile';

type User = NonNullable<ReturnType<typeof getAuth>['currentUser']>;

/** users/{uid}. Everything except fullName, contact, email, roles is written by Cloud Functions. */
export type UserProfile = {
  fullName?: string;
  contact?: string;
  email?: string;
  roles?: string[];
  verified?: boolean;
  trustScore?: number;
  ratingCount?: number;
};

type ProfileStatus = 'loading' | 'missing' | 'ready';

/**
 * loading: auth state or profile not known yet.
 * needsProfile: signed in, but users/{uid} was never written (for example the connection dropped at sign-up).
 */
export type AuthStage = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

type AuthValue = {
  user: User | null;
  profile: UserProfile | null;
  stage: AuthStage;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: SignupInput) => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'This email already has an account. Log in instead.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No internet connection. Check your connection and try again.',
  'firestore/unavailable': 'No internet connection. Check your connection and try again.',
  'firestore/permission-denied': 'Could not save your profile. Please try again.',
};

/** Turns a Firebase error into a message a user can act on. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

function writeProfile(uid: string, input: ProfileInput, email: string | null) {
  // pickSignupFields keeps the write inside what the users create rule allows.
  const data = pickSignupFields({
    fullName: input.fullName.trim(),
    contact: normalizePhMobile(input.contact) ?? input.contact.trim(),
    email: email ?? undefined,
    roles: ALL_ROLES,
    createdAt: serverTimestamp(),
  });
  return setDoc(doc(getFirestore(), 'users', uid), data);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading');
  // While register() runs, the account exists but its profile is not written yet.
  const [registering, setRegistering] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (u) => {
        setUser(u);
        setInitializing(false);
      }),
    [],
  );

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(
      doc(getFirestore(), 'users', uid),
      (snap) => {
        const data = snap.data() as UserProfile | undefined;
        setProfile(data ?? null);
        setProfileStatus(data ? 'ready' : 'missing');
      },
      () => setProfileStatus('missing'),
    );
    return () => {
      unsubscribe();
      setProfile(null);
      setProfileStatus('loading');
    };
  }, [uid]);

  let stage: AuthStage;
  if (initializing) stage = 'loading';
  else if (!user) stage = 'signedOut';
  // Stay on the register form until the new account's profile is written.
  else if (registering && profileStatus !== 'ready') stage = 'signedOut';
  else if (profileStatus === 'loading') stage = 'loading';
  else stage = profileStatus === 'missing' ? 'needsProfile' : 'ready';

  const value: AuthValue = {
    user,
    profile,
    stage,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    },
    register: async (input) => {
      setRegistering(true);
      try {
        const cred = await createUserWithEmailAndPassword(getAuth(), input.email.trim(), input.password);
        await writeProfile(cred.user.uid, input, cred.user.email);
      } finally {
        setRegistering(false);
      }
    },
    saveProfile: async (input) => {
      if (!user) throw new Error('Not signed in');
      await writeProfile(user.uid, input, user.email);
    },
    signOut: () => firebaseSignOut(getAuth()),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
