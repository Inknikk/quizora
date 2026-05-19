import { db } from './config';
import {
  collection, getDocs, addDoc, doc, setDoc,
  query, where, serverTimestamp, getDoc
} from 'firebase/firestore';

// --- Quiz Banks ---
export async function getQuizBanks() {
  const snap = await getDocs(collection(db, 'quizBanks'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getQuizBank(id) {
  const snap = await getDoc(doc(db, 'quizBanks', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// --- Results ---
export async function saveResult(uid, bankId, score, total, answers, bestStreak) {
  await addDoc(collection(db, 'results'), {
    uid,
    bankId,
    score,
    total,
    percentage: Math.round((score / total) * 100),
    answers,
    bestStreak: bestStreak || 0,
    completedAt: serverTimestamp(),
  });
}

export async function getUserResults(uid) {
  const q = query(
    collection(db, 'results'),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.completedAt?.toMillis?.() || 0;
      const tb = b.completedAt?.toMillis?.() || 0;
      return tb - ta;
    });
}

// --- Seed AWS questions (run once) ---
export async function seedQuizBank(bankData) {
  const ref = doc(collection(db, 'quizBanks'));
  await setDoc(ref, {
    ...bankData,
    createdAt: serverTimestamp(),
    questionCount: bankData.questions.length,
  });
  return ref.id;
}

// --- Blunders (persist across progress resets) ---
export async function saveBlunders(uid, questions) {
  const ref = doc(db, 'blunders', uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data().questions || [] : [];
  const seen = new Set(existing.map(q => q.question));
  const newOnes = questions.filter(q => !seen.has(q.question));
  if (newOnes.length === 0) return;
  await setDoc(ref, {
    uid,
    questions: [...existing, ...newOnes],
    updatedAt: serverTimestamp(),
  });
}

export async function getUserBlunders(uid) {
  const ref = doc(db, 'blunders', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().questions || [] : [];
}

export async function getUserAccuracy(uid) {
  const ref = collection(db, 'results');
  const q = query(ref, where('uid', '==', uid));
  const snap = await getDocs(q);
  let totalCorrect = 0;
  let totalQuestions = 0;
  snap.docs.forEach(d => {
    totalCorrect += d.data().score || 0;
    totalQuestions += d.data().total || 0;
  });
  return { totalCorrect, totalQuestions, totalQuizzes: snap.docs.length };
}

export async function getUserLongestStreak(uid) {
  const ref = collection(db, 'results');
  const q = query(ref, where('uid', '==', uid));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => d.data()).sort((a, b) => {
    const ta = a.completedAt?.toMillis?.() || 0;
    const tb = b.completedAt?.toMillis?.() || 0;
    return ta - tb;
  });
  let streak = 0;
  let longest = 0;
  for (const data of docs) {
    if ((data.bestStreak || 0) > longest) longest = data.bestStreak;
    const answers = data.answers || [];
    for (const a of answers) {
      if (a.isCorrect) {
        streak++;
        if (streak > longest) longest = streak;
      } else {
        streak = 0;
      }
    }
  }
  return longest;
}
