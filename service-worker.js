const CACHE_NAME = 'zinc-v3-' + new Date().getTime(); // Force update with timestamp
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

// ... (install/activate same) ...

// Fetch event - Network First for HTML, CSS, JS to ensure updates
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isCoreFile = url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js');

    if (isCoreFile) {
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

    // For images/fonts, try cache first
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
