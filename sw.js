// ============================================
// Service Worker - نيزك
// ============================================

const CACHE_NAME = 'nezak-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/chat.css',
    '/css/sidebar.css',
    '/css/responsive.css',
    '/css/animations.css',
    '/js/app.js',
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/chat.js',
    '/js/contacts.js',
    '/js/utils.js',
    '/assets/images/default-avatar.png'
];

// تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('تم فتح الكاش');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('تم تثبيت Service Worker');
                return self.skipWaiting();
            })
    );
});

// تنشيط الـ Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('تم تنشيط Service Worker');
            return self.clients.claim();
        })
    );
});

// استجابة للطلبات
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // إرجاع النسخة المخزنة أو طلبها من الشبكة
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // تخزين النسخة الجديدة
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    })
                    .catch(() => {
                        // في حالة عدم الاتصال
                        return new Response('غير متصل بالإنترنت', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// إشعارات الدفع (مثال)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: 'assets/icons/icon-192x192.png',
        badge: 'assets/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'فتح'
            },
            {
                action: 'close',
                title: 'إغلاق'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('نيزك', options)
    );
});

// استجابة للإشعارات
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        // فتح التطبيق
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
