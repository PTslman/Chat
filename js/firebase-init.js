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

// تفعيل وضع عدم الاتصال مع إعدادات أفضل
if (window.db) {
    window.db.enablePersistence({ 
        synchronizeTabs: true,
        experimentalForceOwningTab: true
    })
    .then(function() {
        console.log('✅ تم تفعيل التخزين المؤقت');
    })
    .catch(function(err) {
        console.warn('⚠️ فشل تفعيل التخزين المؤقت:', err);
        console.log('📌 نستمر بدون تخزين مؤقت');
    });
    
    // إعدادات إضافية للاتصال
    window.db.settings({
        merge: true
    });
}

// ============================================================
// ✅ دالة التحقق من الاتصال - معرفة على window
// ============================================================
window.checkConnection = function() {
    console.log('🔍 التحقق من الاتصال...');
    return new Promise(function(resolve) {
        if (!window.db) {
            console.log('❌ db غير موجود');
            resolve(false);
            return;
        }
        
        // محاولة قراءة مستند بسيط للتحقق
        window.db.collection('_').doc('_').get()
            .then(function() {
                console.log('✅ الاتصال نشط');
                resolve(true);
            })
            .catch(function(err) {
                console.warn('⚠️ فشل الاتصال:', err.message);
                resolve(false);
            });
    });
};

// مراقبة حالة الاتصال
if (window.db) {
    window.db.collection('_').doc('_').onSnapshot(function() {
        console.log('✅ الاتصال بقاعدة البيانات نشط');
    }, function(error) {
        console.warn('⚠️ فقدان الاتصال بقاعدة البيانات:', error);
    });
}

console.log('✅ تم تحميل firebase-init.js');
console.log('✅ window.checkConnection:', typeof window.checkConnection);
