// ============================================
// إعدادات Firebase الخاصة بمشروع نيزك
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAmEzziPwReETciyHcqUsThKmmwonH9FK0",
    authDomain: "nezak-b7284.firebaseapp.com",
    projectId: "nezak-b7284",
    storageBucket: "nezak-b7284.firebasestorage.app",
    messagingSenderId: "242982946613",
    appId: "1:242982946613:web:b77d5f65b0204bff042e7c",
    measurementId: "G-66MHWVRSQY"
};

// ============================================
// تهيئة Firebase
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
