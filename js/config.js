// ============================================================
// 🔥 CONFIG - نيزك v3.5.0
// ============================================================

// ============================================================
// 👑 ADMIN CONFIG
// ============================================================
const ADMIN_NAME = "slx23m";
const ADMIN_PASSWORD = "1442";
const VERSION = "v3.5.0";

// جعلها عامة
window.ADMIN_NAME = ADMIN_NAME;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;
window.VERSION = VERSION;

// ============================================================
// 🚫 DEFAULT BAD WORDS
// ============================================================
const DEFAULT_BAD_WORDS = [
    'كس', 'قحب', 'عاهر', 'زاني', 'زنا', 'خنا', 'لوط',
    'منيوك', 'شرموط', 'قحبة', 'عاهرة', 'زانية', 'خنيث',
    'مخنث', 'لاطي', 'لوطي', 'شاذ', 'منيوكة', 'شرموطة',
    'مومس', 'داعر', 'داعرة', 'فاجر', 'فاجرة'
];

window.DEFAULT_BAD_WORDS = DEFAULT_BAD_WORDS;

// ============================================================
// 🔒 FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyAmEzziPwReETciyHcqUsThKmmwonH9FK0",
    authDomain: "nezak-b7284.firebaseapp.com",
    projectId: "nezak-b7284",
    storageBucket: "nezak-b7284.firebasestorage.app",
    messagingSenderId: "242982946613",
    appId: "1:242982946613:web:b77d5f65b0204bff042e7c",
    measurementId: "G-66MHWVRSQY"
};

window.firebaseConfig = firebaseConfig;
