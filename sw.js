/* 현장지휘 보드 — 오프라인 캐시 서비스워커
   배포할 때마다 CACHE 버전을 올리면 이전 캐시가 교체된다. */
var CACHE = "fireboard-v1.10";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 캐시 우선 + 백그라운드 갱신(stale-while-revalidate):
   오프라인이면 캐시로 즉시 동작, 온라인이면 다음 실행을 위해 최신본을 받아둔다 */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (cached) {
      var fetched = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        /* 오프라인: 내비게이션 요청은 앱 본체로 폴백 */
        if (e.request.mode === "navigate") return caches.match("./index.html");
      });
      return cached || fetched;
    })
  );
});
