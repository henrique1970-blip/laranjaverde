


// ############# CONFIGURAÇÃO #############
// COLE AQUI A URL DO SEU SCRIPT PUBLICADO
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
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
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
                    console.log('Enviando dados pendentes:', fretesParaSincronizar);
                    sendDataToServer(fretesParaSincronizar).then(resolve).catch(reject);
                } else {
                    console.log('Nenhum dado para sincronizar.');
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
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script espera text/plain para doPost
            mode: 'no-cors' // Essencial para evitar erros de CORS com Apps Script
        }).then(response => {
            // Como estamos em modo no-cors, não podemos ler a resposta.
            // Assumimos sucesso e removemos do DB local.
            console.log('Dado enviado (provavelmente com sucesso):', frete.id);
            return removeFromLocalDB(frete.id);
        });
    });

    return Promise.all(promises);
}

function removeFromLocalDB(id) {
     return new Promise((resolve, reject) => {
        const request = indexedDB.open('fretesDB', 1);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['fretes'], 'readwrite');
            const store = transaction.objectStore('fretes');
            const deleteRequest = store.delete(id);
            deleteRequest.onsuccess = () => {
                console.log(`Registro ${id} removido do IndexedDB.`);
                resolve();
            };
            deleteRequest.onerror = (err) => reject(err);
        };
        request.onerror = (err) => reject(err);
     });
}