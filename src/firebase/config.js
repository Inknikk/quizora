import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBBhnrpPmjl5jDbIJh5J2j5TAv_4e4IJ8U",
  authDomain: "quizora-ff1db.firebaseapp.com",
  projectId: "quizora-ff1db",
  storageBucket: "quizora-ff1db.firebasestorage.app",
  messagingSenderId: "435081845452",
  appId: "1:435081845452:web:6557ad7d40ce59bc334069"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;