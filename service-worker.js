const CACHE_NAME = 'salary-plan-v1.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存文件中:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  // 只缓存同源请求
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // 如果缓存中有，直接返回
          if (response) {
            console.log('从缓存返回:', event.request.url);
            return response;
          }
          
          // 否则从网络获取
          console.log('从网络获取:', event.request.url);
          return fetch(event.request)
            .then(response => {
              // 检查响应是否有效
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 克隆响应以缓存
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(error => {
              console.error('获取失败:', error);
              // 可以返回一个离线页面
              return new Response('网络连接失败，请检查网络设置', {
                status: 408,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// 监听推送通知（可选）
self.addEventListener('push', event => {
  const data = event.data ? event.data.text() : '新消息';
  const options = {
    body: data,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'salary-plan-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification('薪酬计划表', options)
  );
});

// 处理推送通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});