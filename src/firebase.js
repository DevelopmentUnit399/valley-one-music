// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkxb-RiIgfR7vwr2iOTkZh3y9Z1wqLgqM",
  authDomain: "valley-one-music.firebaseapp.com",
  projectId: "valley-one-music",
  storageBucket: "valley-one-music.firebasestorage.app",
  messagingSenderId: "1003536130379",
  appId: "1:1003536130379:web:1068f56a95b1b26c80c8ce",
  measurementId: "G-LFFM74B0WJ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);

// FCM is not supported in all environments (e.g. private browsing, Safari iOS < 16.4)
export const messagingPromise = isSupported().then(supported => supported ? getMessaging(app) : null);