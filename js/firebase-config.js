// ============================================
// إعدادات Firebase - نيزك
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
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// تفعيل استمرارية الجلسة (7 أيام)
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('خطأ في تفعيل استمرارية الجلسة:', error);
});

// تفعيل التخزين غير المتصل (Offline)
enableIndexedDbPersistence(db).catch((error) => {
    if (error.code === 'failed-precondition') {
        console.warn('التخزين غير المتصل غير متاح (متصفح آخر مفتوح)');
    } else if (error.code === 'unimplemented') {
        console.warn('المتصفح لا يدعم التخزين غير المتصل');
    }
});

export { app, db, auth, storage };
