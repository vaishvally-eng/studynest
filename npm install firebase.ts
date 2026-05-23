import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7Ac1_JwvfwfMOYqk5SNdUziQajC-fbq0",
  authDomain: "studynest-20a69.firebaseapp.com",
  projectId: "studynest-20a69",
  storageBucket: "studynest-20a69.firebasestorage.app",
  messagingSenderId: "109430108348",
  appId: "1:109430108348:web:dd8a6647a5cfa5946560b9",
  measurementId: "G-587J1M7BJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll use across the app
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
