/* 순공 플래너 서비스워커 — 오프라인 지원 + 자동 업데이트 */
const CACHE = 'sungong-v3';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon.svg', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 → 실패하면 캐시 (온라인이면 항상 최신, 오프라인이면 캐시로 작동)
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 외부 요청(유튜브 등)은 건드리지 않고 그대로 통과
  if (new URL(req.url).origin !== self.location.origin) return;

  // 앱 코드(HTML/JS/JSON)는 브라우저 HTTP 캐시를 건너뛰고 항상 새로 받아온다.
  // (이걸 안 하면 오래된 버전이 계속 보여서 업데이트가 반영되지 않음)
  const url = new URL(req.url);
  const isCode = req.mode === 'navigate' || /\.(html|js|json)$/.test(url.pathname) || url.pathname.endsWith('/');
  const fetchOpts = isCode ? { cache: 'no-store' } : undefined;

  e.respondWith(
    fetch(fetchOpts ? new Request(req, fetchOpts) : req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
