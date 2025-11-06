// ############# CONFIGURAÇÃO #############
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUpZ7MO8eBOvOtqsjjc4ypUrwBM0VySkWvUyAoiiPBbyXmkzjCBn5Ve1cTwtoq2FTg8g/exec";
// #########################################

const CACHE_NAME = 'fretes-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-fretes') {
        event.waitUntil(syncFretes());
    }
});

function syncFretes() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('fretesDB', 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['fretes'], 'readonly');
            const store = transaction.objectStore('fretes');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const fretesParaSincronizar = getAllRequest.result;
                if (fretesParaSincronizar.length > 0) {
                    sendDataToServer(fretesParaSincronizar).then(resolve).catch(reject);
                } else {
                    resolve();
                }
            };
            getAllRequest.onerror = (err) => reject(err);
        };
        request.onerror = (err) => reject(err);
    });
}

function sendDataToServer(fretes) {
    const promises = fretes.map(frete => {
        return fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(frete),
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json().then(() => frete.id);
        })
        .then(id => removeFromLocalDB(id))
        .catch(error => {
            console.error('Falha ao enviar frete:', error);
            return Promise.reject(error); // Rejeita para retentativa
        });
    });

    return Promise.allSettled(promises).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            return Promise.reject('Alguns envios falharam');
        }
        return Promise.resolve();
    });
}

function removeFromLocalDB(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('fretesDB', 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['fretes'], 'readwrite');
            const store = transaction.objectStore('fretes');
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = (err) => reject(err);
        };
        request.onerror = (err) => reject(err);
    });
}