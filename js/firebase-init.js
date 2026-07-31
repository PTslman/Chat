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
}

// ============================================================
// ✅ دالة التحقق من الاتصال - باستخدام مسار صحيح
// ============================================================
window.checkConnection = function() {
    console.log('🔍 التحقق من الاتصال...');
    return new Promise(function(resolve) {
        if (!window.db) {
            console.log('❌ db غير موجود');
            resolve(false);
            return;
        }
        
        // استخدام مسار موجود مثل users أو messages
        // نستخدم users لأنها موجودة دائماً
        window.db.collection('users').limit(1).get()
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

// ============================================================
// 📶 مراقبة حالة الاتصال - باستخدام مسار صحيح
// ============================================================
window.monitorConnection = function() {
    if (!window.db) return;
    
    // استخدام مسار موجود
    window.db.collection('users').limit(1).onSnapshot(function() {
        console.log('✅ الاتصال بقاعدة البيانات نشط');
        var connectionError = document.getElementById('connectionError');
        if (connectionError) {
            connectionError.style.display = 'none';
        }
    }, function(error) {
        console.warn('⚠️ فقدان الاتصال بقاعدة البيانات:', error);
        var connectionError = document.getElementById('connectionError');
        if (connectionError) {
            connectionError.textContent = '⚠️ غير متصل بالإنترنت - جاري العمل بدون اتصال';
            connectionError.style.display = 'block';
        }
    });
};

console.log('✅ تم تحميل firebase-init.js');
console.log('✅ window.checkConnection:', typeof window.checkConnection);
