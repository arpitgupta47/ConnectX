import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7iBl0aaPkVFMSq4HQSCq7iHeysPbrU6I",
  authDomain: "connectx-2454c.firebaseapp.com",
  projectId: "connectx-2454c",
  storageBucket: "connectx-2454c.firebasestorage.app",
  messagingSenderId: "1057885985764",
  appId: "1:1057885985764:web:dad24cf5eca770e31105f1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

