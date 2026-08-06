// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, where, getDocs } from "firebase/firestore";
import { getDatabase, ref, set, onDisconnect, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBVNXAFHyynNL7rD6LaYc4iYgvYPDdDH0c",
  authDomain: "semo-chat-f5fdf.firebaseapp.com",
  projectId: "semo-chat-f5fdf",
  storageBucket: "semo-chat-f5fdf.firebasestorage.app",
  messagingSenderId: "390244231579",
  appId: "1:390244231579:web:d6664b936abae9a730993e",
  measurementId: "G-0C6RXTC6LX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb, signInWithEmailAndPassword, signOut, onAuthStateChanged, 
         collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, 
         doc, updateDoc, deleteDoc, getDoc, setDoc, where, getDocs, ref, set, onDisconnect, onValue };
