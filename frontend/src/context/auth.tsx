import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getIdToken,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc, updateDoc } from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { type IdForm, type VerificationResult } from '@/core/identity';
import { type Role } from '@/core/stateMachine';
import {
  canAddRole, cleanRoles, normalizePhMobile, pickSignupFields, rolesFor, type ProfileInput, type SignupInput,
} from '@/core/userProfile';

type User = NonNullable<ReturnType<typeof getAuth>['currentUser']>;

/** Cloud Functions run in Singapore, next to Firestore. */
const FUNCTIONS_REGION = 'asia-southeast1';

/** users/{uid}. Everything except fullName, contact, email, roles is written by Cloud Functions. */
export type UserProfile = {
  fullName?: string;
  contact?: string;
  email?: string;
  roles?: string[];
  verified?: boolean;
  lenderTrustScore?: number;
  lenderRatingCount?: number;
  borrowerTrustScore?: number;
  borrowerRatingCount?: number;
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
  /** The roles this account holds: only what its owner chose. */
  roles: Role[];
  stage: AuthStage;
  /** True right after sign-up, until the ID step has been opened once. */
  shouldPromptVerify: boolean;
  clearVerifyPrompt: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: SignupInput) => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  addRole: (role: Role) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Sends the ID form to the verifyIdentity function. The form is never stored on the phone or in the cloud. */
  verifyIdentity: (form: IdForm) => Promise<VerificationResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const NO_INTERNET = 'No internet connection. Check your connection and try again.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'This email already has an account. Log in instead.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': NO_INTERNET,
  'firestore/unavailable': NO_INTERNET,
  'firestore/permission-denied': 'Could not save your profile. Please try again.',
  'functions/unavailable': NO_INTERNET,
  'functions/deadline-exceeded': NO_INTERNET,
  'functions/failed-precondition': 'Finish your profile first.',
};

/** Turns a Firebase error into a message a user can act on. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

function writeProfile(uid: string, input: ProfileInput, email: string | null) {
  if (!input.role) throw new Error('Role not chosen');
  // pickSignupFields keeps the write inside what the users create rule allows.
  const data = pickSignupFields({
    fullName: input.fullName.trim(),
    contact: normalizePhMobile(input.contact) ?? input.contact.trim(),
    email: email ?? undefined,
    roles: rolesFor(input.role),
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
  const [shouldPromptVerify, setShouldPromptVerify] = useState(false);

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
      setShouldPromptVerify(false);
    };
  }, [uid]);

  let stage: AuthStage;
  if (initializing) stage = 'loading';
  else if (!user) stage = 'signedOut';
  // Stay on the register form until the new account's profile is written.
  else if (registering && profileStatus !== 'ready') stage = 'signedOut';
  else if (profileStatus === 'loading') stage = 'loading';
  else stage = profileStatus === 'missing' ? 'needsProfile' : 'ready';

  const roles = cleanRoles(profile?.roles);

  const value: AuthValue = {
    user,
    profile,
    roles,
    stage,
    shouldPromptVerify,
    clearVerifyPrompt: () => setShouldPromptVerify(false),
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    },
    register: async (input) => {
      setRegistering(true);
      try {
        const cred = await createUserWithEmailAndPassword(getAuth(), input.email.trim(), input.password);
        await writeProfile(cred.user.uid, input, cred.user.email);
        setShouldPromptVerify(true);
      } finally {
        setRegistering(false);
      }
    },
    saveProfile: async (input) => {
      if (!user) throw new Error('Not signed in');
      await writeProfile(user.uid, input, user.email);
      setShouldPromptVerify(true);
    },
    addRole: async (role) => {
      if (!user || !canAddRole(roles, role)) return;
      // The rules allow roles only to grow: every role already held stays in the list.
      await updateDoc(doc(getFirestore(), 'users', user.uid), { roles: [...roles, role] });
    },
    resetPassword: (email) => sendPasswordResetEmail(getAuth(), email.trim()),
    verifyIdentity: async (form) => {
      if (!user) throw new Error('Not signed in');
      const call = httpsCallable<IdForm, VerificationResult>(getFunctions(undefined, FUNCTIONS_REGION), 'verifyIdentity');
      const { data } = await call(form);
      // The verified claim lives in the login token, so fetch a fresh one before the rules will see it.
      if (data.status === 'verified') await getIdToken(user, true);
      return data;
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
