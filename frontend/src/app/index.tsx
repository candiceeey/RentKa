import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';

export default function FirebaseTest() {
  const [email, setEmail] = useState('test1@rentka.test');
  const [password, setPassword] = useState('Test1234!');
  const [log, setLog] = useState<string[]>([]);

  const add = (m: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l]);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    try {
      const r = await fn();
      add(`OK  ${label}${r ? ': ' + r : ''}`);
    } catch (e: any) {
      add(`ERROR  ${label}: ${e?.code ?? ''} ${e?.message ?? e}`);
    }
  };

  const signUp = () =>
    run('sign up', async () => {
      const c = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
      return c.user.uid;
    });

  const signIn = () =>
    run('sign in', async () => {
      const c = await signInWithEmailAndPassword(getAuth(), email.trim(), password);
      return c.user.uid;
    });

  const write = () =>
    run('write Firestore', async () => {
      const u = getAuth().currentUser;
      if (!u) throw new Error('Sign in first');
      // Real rules: a user may only write fullName, contact, fcmToken on their own doc.
      await setDoc(doc(getFirestore(), 'users', u.uid), { fullName: 'Test User' }, { merge: true });
    });

  const read = () =>
    run('read Firestore', async () => {
      const u = getAuth().currentUser;
      if (!u) throw new Error('Sign in first');
      const snap = await getDoc(doc(getFirestore(), 'users', u.uid));
      const d = snap.data();
      return d ? JSON.stringify(d) : 'no document';
    });

  const out = () => run('sign out', () => signOut(getAuth()));

  return (
    <ScrollView style={{ backgroundColor: '#ffffff' }} contentContainerStyle={s.box}>
      <Text style={s.h}>RentKa: Firebase test</Text>
      <TextInput style={s.in} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.in} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <View style={s.row}><Button title="1. Sign up" onPress={signUp} /><Button title="Sign in" onPress={signIn} /></View>
      <View style={s.row}><Button title="2. Write" onPress={write} /><Button title="3. Read" onPress={read} /><Button title="Sign out" onPress={out} /></View>
      {log.map((l, i) => (<Text key={i} style={s.log}>{l}</Text>))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  box: { padding: 20, paddingTop: 70, gap: 12, backgroundColor: '#ffffff' },
  h: { fontSize: 22, fontWeight: '700', color: '#000000' },
  in: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, color: '#000000' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  log: { fontSize: 12, color: '#000000' },
});