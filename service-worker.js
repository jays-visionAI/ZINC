const CACHE_NAME = 'zinc-v2-' + new Date().toISOString().split('T')[0]; // Update this version manually or via build script to force cache refresh
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './command-center.html',
    './styles.css',
    './script.js',
    './command-center.js',
    './auth.js',
    './firebase-config.js',
    './translations.js',
    './i18n-inject.js',
    './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    // Force this service worker to become the active one, bypassing the waiting state
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all: app shell and content');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    // Take control of all clients immediately
    event.waitUntil(clients.claim());

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - Network First for HTML, Cache First for others (or Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
    // For HTML requests, try network first to get the latest version
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other assets, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request).then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
    );
});
