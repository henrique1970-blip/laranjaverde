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
            headers: { 'Content-Type': 'application/json' }, // Mude para application/json
            mode: 'cors' // Mude de 'no-cors' para 'cors'
        })
        .then(response => {
            // Agora podemos ler a resposta!
            if (response.ok) {
                // Se o servidor disse OK (status 200-299), removemos do DB local.
                console.log('Dado enviado com sucesso:', frete.id);
                return removeFromLocalDB(frete.id);
            } else {
                // Se o servidor deu erro (4xx, 5xx), não removemos.
                console.error('Falha ao enviar dado. Status:', response.status);
                // Rejeitamos a promessa para que o 'sync' tente novamente mais tarde.
                return Promise.reject(new Error('Falha no servidor: ' + response.status));
            }
        })
        .catch(error => {
            // Erro de rede (offline, DNS, etc.)
            console.error('Erro de rede ao enviar dado:', error);
            // Rejeitamos a promessa para que o 'sync' tente novamente.
            return Promise.reject(error);
        });
    });

    // Promise.all vai parar se UM falhar, o que é bom.
    // Assim, a sincronização será retentada para todos os que falharam.
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