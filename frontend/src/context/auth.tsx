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

import { type SendEmailCodeResult, type VerifyEmailCodeResult } from '@/core/emailCode';
import { buildVerificationRequest, type IdForm, type VerificationRequest, type VerificationResult } from '@/core/identity';
import { type Role } from '@/core/stateMachine';
import {
  canAddRole, cleanRoles, normalizePhMobile, pickSignupFields, rolesFor, type ProfileInput, type SignupInput,
} from '@/core/userProfile';

type User = NonNullable<ReturnType<typeof getAuth>['currentUser']>;

/** Cloud Functions run in Singapore, next to Firestore. */
const FUNCTIONS_REGION = 'asia-southeast1';

function callable<Req, Res>(name: string) {
  return httpsCallable<Req, Res>(getFunctions(undefined, FUNCTIONS_REGION), name);
}

/** users/{uid}. Everything except fullName, contact, email, roles is written by Cloud Functions. */
export type UserProfile = {
  fullName?: string;
  contact?: string;
  email?: string;
  roles?: string[];
  verified?: boolean;
  /** Set only by the verifyEmailCode function. */
  emailVerified?: boolean;
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
  /**
   * Email/password accounts must confirm their email with a 6-digit code before the ID step.
   * True when verifyEmailCode has set users/{uid}.emailVerified, or for Google sign-in.
   */
  emailVerified: boolean;
  /** Emails a new 6-digit code (sendEmailCode). Refused within 60 seconds of the last one. */
  sendEmailCode: () => Promise<SendEmailCodeResult>;
  /** Checks a typed code (verifyEmailCode). */
  verifyEmailCode: (code: string) => Promise<VerifyEmailCodeResult>;
  /** Shown once on the Login screen, for example after the ID step signs the user out. */
  loginNotice: string;
  /** Signs out and leaves a message for the Login screen. */
  signOutToLogin: (notice: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: SignupInput) => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  addRole: (role: Role) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /**
   * Checks the ID form on the phone, then sends verifyIdentity only a hash of the ID type and number
   * and the pass/fail results. The raw form never leaves the phone and is never stored.
   */
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
};

/** Turns a Firebase error into a message a user can act on. */
export function authErrorMessage(e: unknown): string {
  const { code = '', message = '' } = (e ?? {}) as { code?: string; message?: string };
  // verifyIdentity explains its own preconditions ("Verify your email first.", "Finish your profile first.").
  if ((code === 'functions/failed-precondition' || code === 'functions/resource-exhausted') && message) return message;
  if (code === 'functions/invalid-argument' && message) return message;
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
  const [loginNotice, setLoginNotice] = useState('');

  useEffect(
    () =>
      onAuthStateChanged(getAuth(), (u) => {
        setUser(u);
        if (u) setLoginNotice('');
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
  // Google accounts arrive with a verified email and skip the code.
  const googleSignIn = user?.providerData.some((p) => p.providerId === 'google.com') ?? false;

  const value: AuthValue = {
    user,
    profile,
    roles,
    stage,
    shouldPromptVerify,
    clearVerifyPrompt: () => setShouldPromptVerify(false),
    emailVerified: profile?.emailVerified === true || googleSignIn,
    sendEmailCode: async () => (await callable<Record<string, never>, SendEmailCodeResult>('sendEmailCode')({})).data,
    verifyEmailCode: async (code) =>
      (await callable<{ code: string }, VerifyEmailCodeResult>('verifyEmailCode')({ code })).data,
    loginNotice,
    signOutToLogin: async (notice) => {
      await firebaseSignOut(getAuth());
      setLoginNotice(notice);
    },
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
      const request = buildVerificationRequest(form, profile?.fullName ?? '');
      const { data } = await callable<VerificationRequest, VerificationResult>('verifyIdentity')(request);
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
