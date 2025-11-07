// ############# CONFIGURAÇÃO #############
// COLE AQUI A URL DO SEU SCRIPT PUBLICADO
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw48rzi3T9hTp-K-3WqDG2lvq_U89wKD2kYd3og8Xq0MN7qdxT9A31GPTFKcL-FHGSLpA/exec"; 
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

// ##################################################################
// ############# FUNÇÃO CORRIGIDA - INÍCIO #############
// ##################################################################
function sendDataToServer(fretes) {
    const promises = fretes.map(frete => {
        
        console.log("Tentando enviar frete:", frete.id);

        return fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(frete),
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8' 
            },
            // mode: 'no-cors' // <-- ESTA LINHA FOI REMOVIDA (ERA O PROBLEMA)
        })
        .then(response => {
            // Agora podemos ler a resposta!
            // Se a resposta NÃO for OK (ex: 404, 500, ou falha de CORS), jogue um erro.
            if (!response.ok) {
                throw new Error(`Erro de rede/servidor: ${response.status} ${response.statusText}`);
            }
            // A resposta foi OK, agora lemos o JSON que o code.gs enviou
            return response.json(); 
        })
        .then(data => {
            // Verificamos o status DENTRO do JSON enviado pelo Apps Script
            if (data.status === 'success') {
                // SUCESSO REAL! O code.gs confirmou.
                console.log('Dado enviado e confirmado pelo servidor:', frete.id);
                // Só agora podemos remover do DB local.
                return removeFromLocalDB(frete.id);
            } else {
                // O Apps Script reportou um erro (ex: falha ao salvar no Drive)
                console.error('Erro reportado pelo Apps Script:', data.message);
                // Jogue um erro para que este item NÃO seja removido do DB e tente de novo.
                throw new Error(data.message);
            }
        })
        .catch(error => {
            // Falha no fetch (offline) ou erro no .then()
            console.error(`Falha ao enviar o registro ${frete.id}. Tentará novamente.`, error);
            // Joga o erro para que o Promise.all falhe e o sync tente novamente mais tarde.
            throw error;
        });
    });

    // Promise.all garante que SÓ se todos os fretes forem enviados com sucesso,
    // o evento de sync será concluído.
    return Promise.all(promises);
}
// ##################################################################
// ############# FUNÇÃO CORRIGIDA - FIM #############
// ##################################################################


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