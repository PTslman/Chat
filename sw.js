// ============================================================
// نيزك - Service Worker
// ============================================================

const CACHE_NAME = 'nezek-chat-v2';
const OFFLINE_URL = 'index.html';

// الملفات التي سيتم تخزينها مؤقتاً
const ASSETS = [
    'index.html',
    'manifest.json',
    'favicon.ico',
    'icons/icon-72.png',
    'icons/icon-96.png',
    'icons/icon-128.png',
    'icons/icon-144.png',
    'icons/icon-152.png',
    'icons/icon-192.png',
    'icons/icon-384.png',
    'icons/icon-512.png'
];

// ============================================================
// 1. التثبيت
// ============================================================
self.addEventListener('install', event => {
    console.log('[SW] تثبيت Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] تخزين الملفات مؤقتاً');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] تم التثبيت بنجاح');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] فشل التثبيت:', error);
            })
    );
});

// ============================================================
// 2. التنشيط
// ============================================================
self.addEventListener('activate', event => {
    console.log('[SW] تنشيط Service Worker...');
    
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] حذف cache قديم:', key);
                        return caches.delete(key);
                    })
            );
        })
        .then(() => {
            console.log('[SW] تم التنشيط بنجاح');
            return self.clients.claim();
        })
    );
});

// ============================================================
// 3. استقبال الطلبات - استراتيجية Cache First ثم Network
// ============================================================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // تجاهل طلبات Firebase و API الخارجية
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('api.dicebear.com')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // تجاهل طلبات الإحصائيات
    if (url.pathname.includes('analytics') || 
        url.pathname.includes('telemetry')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // استراتيجية: Cache First ثم Network
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // تحديث الكاش في الخلفية
                    fetch(request)
                        .then(networkResponse => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(request, networkResponse));
                            }
                        })
                        .catch(() => {});
                    return cachedResponse;
                }
                
                // إذا لم يكن في الكاش، جلب من الشبكة
                return fetch(request)
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, networkResponse));
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[SW] فشل جلب:', error);
                        // محاولة إرجاع صفحة الخطأ أو الصفحة الرئيسية
                        if (request.mode === 'navigate') {
                            return caches.match('index.html');
                        }
                        return new Response('⚠️ غير متصل بالإنترنت', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// ============================================================
// 4. التعامل مع الإشعارات
// ============================================================
self.addEventListener('push', event => {
    console.log('[SW] استلام إشعار:', event);
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || '📩 نيزك';
    const options = {
        body: data.body || 'لديك رسالة جديدة',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-96.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: '📖 فتح'
            },
            {
                action: 'close',
                title: '✕ إغلاق'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================
// 5. التعامل مع الضغط على الإشعار
// ============================================================
self.addEventListener('notificationclick', event => {
    console.log('[SW] الضغط على الإشعار:', event);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // البحث عن نافذة مفتوحة للتطبيق
                for (const client of windowClients) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // إذا لم تكن هناك نافذة، فتح واحدة جديدة
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ============================================================
// 6. التعامل مع المزامنة في الخلفية
// ============================================================
self.addEventListener('sync', event => {
    console.log('[SW] مزامنة في الخلفية:', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(
            // يمكن إضافة منطق مزامنة الرسائل هنا
            console.log('[SW] مزامنة الرسائل...')
        );
    }
});

// ============================================================
// 7. تحديث الـ SW
// ============================================================
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

// ============================================================
// 8. معالجة الأخطاء
// ============================================================
self.addEventListener('error', event => {
    console.error('[SW] خطأ:', event.message);
});

console.log('✅ Service Worker جاهز للتشغيل');
