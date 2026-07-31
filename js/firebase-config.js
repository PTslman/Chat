// استيراد مكتبات Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where, getDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyAmEzziPwReETciyHcqUsThKmmwonH9FK0",
  authDomain: "nezak-b7284.firebaseapp.com",
  projectId: "nezak-b7284",
  storageBucket: "nezak-b7284.firebasestorage.app",
  messagingSenderId: "242982946613",
  appId: "1:242982946613:web:b77d5f65b0204bff042e7c",
  measurementId: "G-66MHWVRSQY"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// تصدير الخدمات
export { db, auth, storage, analytics, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where, getDoc, ref, uploadBytes, getDownloadURL, deleteObject, signInAnonymously, onAuthStateChanged, signOut };
