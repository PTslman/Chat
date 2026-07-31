// ============================================================
// 🚀 FIREBASE INIT - نيزك v3.5.0
// ============================================================

console.log('🚀 بدء تهيئة Firebase...');

try {
    firebase.initializeApp(window.firebaseConfig);
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    
    console.log('✅ تم تهيئة Firebase بنجاح');
} catch (e) {
    console.error('❌ فشل تهيئة Firebase:', e);
    const connectionError = document.getElementById('connectionError');
    if (connectionError) {
        connectionError.textContent = '⚠️ فشل تحميل Firebase: ' + e.message;
        connectionError.style.display = 'block';
    }
}

// تفعيل التخزين المؤقت
if (window.db) {
    window.db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ التخزين المؤقت مفعل');
        })
        .catch((err) => {
            console.warn('⚠️ فشل تفعيل التخزين المؤقت:', err);
        });
}

console.log('✅ تم تحميل firebase-init.js');
