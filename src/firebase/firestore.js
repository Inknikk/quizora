import { db } from './config';
import {
  collection, getDocs, addDoc, doc, setDoc,
  query, where, orderBy, serverTimestamp, getDoc
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
    where('uid', '==', uid),
    orderBy('completedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const q = query(ref, where('uid', '==', uid), orderBy('completedAt', 'asc'));
  const snap = await getDocs(q);
  let streak = 0;
  let longest = 0;
  for (const d of snap.docs) {
    const data = d.data();
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
