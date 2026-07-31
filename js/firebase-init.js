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

// تعطيل التخزين المؤقت مؤقتاً لتجنب المشاكل
if (window.db) {
    window.db.settings({ 
        merge: true 
    });
    
    // محاولة تفعيل التخزين المؤقت مع تجاهل الأخطاء
    window.db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ التخزين المؤقت مفعل');
        })
        .catch((err) => {
            console.warn('⚠️ فشل تفعيل التخزين المؤقت، نستمر بدون:', err);
        });
}

// ============================================================
// دالة التحقق من الاتصال
// ============================================================
window.checkConnection = function() {
    return new Promise((resolve) => {
        if (!window.db) return resolve(false);
        
        window.db.collection('users').limit(1).get()
            .then(() => {
                console.log('✅ الاتصال نشط');
                resolve(true);
            })
            .catch((err) => {
                console.warn('⚠️ فشل الاتصال:', err.message);
                resolve(false);
            });
    });
};

console.log('✅ تم تحميل firebase-init.js');
