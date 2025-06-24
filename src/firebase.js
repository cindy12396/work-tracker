// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEOHQt5XwoPv2726iC3gbey24rQH9udBM",
  authDomain: "work-tracker-3a338.firebaseapp.com",
  projectId: "work-tracker-3a338",
  storageBucket: "work-tracker-3a338.appspot.com",
  messagingSenderId: "657929287005",
  appId: "1:657929287005:web:89c264cb22ebca2eb0a4b4",
  measurementId: "G-M8CG0MJN22"
};

// ✅ 一定要先 initializeApp，再做後續動作
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };