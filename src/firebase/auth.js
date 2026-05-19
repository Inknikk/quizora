import { auth, db, googleProvider } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, collection, getDocs, writeBatch
} from 'firebase/firestore';

export async function registerUser(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName,
    email,
    createdAt: serverTimestamp(),
    totalQuizzes: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    theme: 'midnight',
    lastActive: serverTimestamp(),
  });
  return cred.user;
}

export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName,
      email: user.email,
      createdAt: serverTimestamp(),
      totalQuizzes: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      theme: 'midnight',
      lastActive: serverTimestamp(),
    });
  }
  return user;
}

export function logoutUser() {
  return signOut(auth);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserStats(uid, correct, total, bestStreak) {
  const ref = doc(db, 'users', uid);
  const updates = {
    totalQuizzes: increment(1),
    totalCorrect: increment(correct),
    totalQuestions: increment(total),
    lastActive: serverTimestamp(),
  };
  if (bestStreak > 0) {
    const snap = await getDoc(ref);
    const current = snap.data()?.longestStreak || 0;
    if (bestStreak > current) updates.longestStreak = bestStreak;
  }
  await updateDoc(ref, updates);
  return updates.longestStreak || 0;
}

export async function updateUserTheme(uid, theme) {
  await updateDoc(doc(db, 'users', uid), { theme });
}

export async function updateUserCorners(uid, corners) {
  await updateDoc(doc(db, 'users', uid), { corners });
}

export async function updateUserDisplayName(uid, displayName) {
  await updateProfile(auth.currentUser, { displayName });
  await updateDoc(doc(db, 'users', uid), { displayName });
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function resetUserProgress(uid) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), {
    totalQuizzes: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    longestStreak: 0,
  });
  const resultsSnap = await getDocs(collection(db, 'results'));
  resultsSnap.docs.forEach(d => {
    if (d.data().uid === uid) batch.delete(d.ref);
  });
  await batch.commit();
}
