const CACHE_NAME = 'nezek-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/themes.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/firebase-config.js',
  '/manifest.json'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('تم فتح الكاش');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// تنشيط Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// اعتراض الطلبات
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // استرجاع من الكاش إذا وجد
        if (response) {
          return response;
        }
        
        // محاولة الطلب من الشبكة
        return fetch(event.request)
          .then((response) => {
            // تخزين الموارد الجديدة
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // صفحة الخطأ إذا كان الطلب فاشل
            return new Response('عذراً، لا يوجد اتصال بالإنترنت', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// إشعارات الدفع (للإصدارات المستقبلية)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// فتح التطبيق عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// المزامنة في الخلفية
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // مزامنة الرسائل غير المرسلة
  try {
    const cache = await caches.open('pending-messages');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();
        // إعادة محاولة إرسال الرسالة
        await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('خطأ في المزامنة:', error);
  }
      }
