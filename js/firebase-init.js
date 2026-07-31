// ============================================================
// 🚀 FIREBASE INIT - نيزك v3.5.0
// ============================================================

console.log('🚀 بدء تهيئة Firebase...');

// جعل db و auth عامين (Global)
let app;
let db;
let auth;

try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    
    // جعلهما عامين على window
    window.db = db;
    window.auth = auth;
    
    console.log('✅ تم تهيئة Firebase بنجاح');
} catch (e) {
    console.error('❌ فشل تهيئة Firebase:', e);
    const connectionError = document.getElementById('connectionError');
    if (connectionError) {
        connectionError.textContent = '⚠️ فشل تحميل Firebase: ' + e.message;
        connectionError.style.display = 'block';
    }
}

// تفعيل وضع عدم الاتصال (Offline Persistence)
if (db) {
    db.enablePersistence({ synchronizeTabs: true })
        .then(function() {
            console.log('✅ تم تفعيل التخزين المؤقت (Offline Persistence)');
        })
        .catch(function(err) {
            console.warn('⚠️ فشل تفعيل التخزين المؤقت:', err);
        });
}
