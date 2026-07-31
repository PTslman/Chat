// ============================================================
// 🚀 FIREBASE INIT - نيزك v3.5.0 (الحل النهائي)
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

// ============================================================
// 🔥 تمكين التخزين المؤقت (Persistence) بشكل قوي
// ============================================================
if (window.db) {
    window.db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ التخزين المؤقت مفعل بنجاح');
        })
        .catch((err) => {
            console.warn('⚠️ فشل تفعيل التخزين المؤقت:', err);
            // نستمر بدون persistence
        });

    // إعدادات إضافية لتحسين الأداء
    window.db.settings({ merge: true });
}

// ============================================================
// 📶 دالة التحقق من الاتصال - باستخدام onSnapshot
// ============================================================
window.checkConnection = function() {
    return new Promise((resolve) => {
        if (!window.db) return resolve(false);
        
        // استخدام onSnapshot بدلاً من get() للاستماع الفوري
        const unsub = window.db.collection('users').limit(1).onSnapshot(
            () => {
                unsub();
                resolve(true);
            },
            (error) => {
                unsub();
                console.warn('⚠️ فشل الاتصال:', error.message);
                resolve(false);
            }
        );
        
        // مهلة 5 ثوانٍ
        setTimeout(() => {
            unsub();
            resolve(false);
        }, 5000);
    });
};

// ============================================================
// 📡 مراقبة الاتصال المستمر
// ============================================================
window.startConnectionMonitor = function(callback) {
    if (!window.db) return;
    
    let isOnline = true;
    window.db.collection('users').limit(1).onSnapshot(
        () => {
            if (!isOnline) {
                isOnline = true;
                console.log('✅ الاتصال عاد');
                if (callback) callback(true);
            }
        },
        (error) => {
            if (isOnline) {
                isOnline = false;
                console.warn('⚠️ فقدان الاتصال:', error.message);
                if (callback) callback(false);
            }
        }
    );
};

console.log('✅ تم تحميل firebase-init.js (الحل النهائي)');
