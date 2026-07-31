import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getFirestore, 
    collection, doc, getDoc, getDocs, 
    addDoc, updateDoc, deleteDoc, 
    onSnapshot, query, orderBy, 
    where, serverTimestamp, setDoc,
    writeBatch, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// تصدير كل شيء
export {
    db, auth, storage, analytics,
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy,
    where, serverTimestamp, setDoc,
    writeBatch, limit,
    signInAnonymously, onAuthStateChanged, signOut,
    ref, uploadBytes, getDownloadURL, deleteObject
};
