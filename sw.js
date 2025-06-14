// Service Worker 用於 PWA 離線功能
// 定義快取名稱和需要快取的檔案清單
const CACHE_NAME = 'boolean-minimizer-v1';
const urlsToCache = [
  './',
  './index.html',
  './patrick-method-core.js',
  './manifest.json'
];

// 監聽 Service Worker 安裝事件
self.addEventListener('install', function(event) {
  // 等待快取操作完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // 將指定的檔案加入快取
        return cache.addAll(urlsToCache);
      })
  );
});

// 監聽網路請求事件
self.addEventListener('fetch', function(event) {
  // 攔截所有網路請求
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果快取中有對應的資源，直接回傳快取版本
        if (response) {
          return response;
        }
        // 否則發送網路請求取得資源
        return fetch(event.request);
      }
    )
  );
}); 