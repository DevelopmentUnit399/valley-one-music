// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app)