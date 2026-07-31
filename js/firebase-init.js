// ============================================================
// 🚀 FIREBASE INIT - نيزك v3.5.0
// ============================================================

console.log('🚀 بدء تهيئة Firebase...');

// استخدام window.db و window.auth
try {
    // تهيئة Firebase
    firebase.initializeApp(window.firebaseConfig);
    
    // تعيين المتغيرات على window
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    
    console.log('✅ تم تهيئة Firebase بنجاح');
    console.log('✅ db:', window.db ? 'موجود' : 'غير موجود');
    console.log('✅ auth:', window.auth ? 'موجود' : 'غير موجود');
} catch (e) {
    console.error('❌ فشل تهيئة Firebase:', e);
    const connectionError = document.getElementById('connectionError');
    if (connectionError) {
        connectionError.textContent = '⚠️ فشل تحميل Firebase: ' + e.message;
        connectionError.style.display = 'block';
    }
}

// تفعيل وضع عدم الاتصال
if (window.db) {
    window.db.enablePersistence({ synchronizeTabs: true })
        .then(function() {
            console.log('✅ تم تفعيل التخزين المؤقت');
        })
        .catch(function(err) {
            console.warn('⚠️ فشل تفعيل التخزين المؤقت:', err);
        });
}
