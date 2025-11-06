// ############# CONFIGURAÇÃO #############
// COLE AQUI A URL DO SEU SCRIPT PUBLICADO
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUpZ7MO8eBOvOtqsjjc4ypUrwBM0VySkWvUyAoiiPBbyXmkzjCBn5Ve1cTwtoq2FTg8g/exec";

// #########################################


// Espera o DOM carregar para executar o código
document.addEventListener('DOMContentLoaded', () => {

    // Seleção de Elementos do DOM
    const loginScreen = document.getElementById('login-screen');
    const mainForm = document.getElementById('main-form');
    const btnEntrar = document.getElementById('btn-entrar');
    const btnSair = document.getElementById('btn-sair');
    const inputMotoristaLogin = document.getElementById('input-motorista-login');
    const motoristaField = document.getElementById('motorista');
    
    const form = document.getElementById('frete-form');
    const pesoSaidaInput = document.getElementById('peso-saida');
    const valorToneladaInput = document.getElementById('valor-tonelada');
    const valorTotalInput = document.getElementById('valor-total');

    const transportadoraOutraRadio = document.getElementById('outra');
    const transportadoraLVRadio = document.getElementById('laranja-verde');
    const outraTransportadoraInput = document.getElementById('outra-transportadora');

    const btnAddAbastecimento = document.getElementById('add-abastecimento');
    const abastecimentosContainer = document.getElementById('abastecimentos-container');
    
    const btnAddManutencao = document.getElementById('add-manutencao');
    const manutencoesContainer = document.getElementById('manutencoes-container');

    // Inicialização do IndexedDB
    let db;
    const request = indexedDB.open('fretesDB', 1);

    request.onerror = (event) => showAlert('Erro ao abrir o banco de dados local.', 'error');
    request.onsuccess = (event) => {
        db = event.target.result;
        console.log("Banco de dados local aberto com sucesso.");
    };
    request.onupgradeneeded = (event) => {
        let db = event.target.result;
        db.createObjectStore('fretes', { keyPath: 'id', autoIncrement: true });
    };

    // Registrar Service Worker para funcionalidade offline
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado com sucesso.'))
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }


    // --- LÓGICA DE LOGIN E NAVEGAÇÃO ---
    btnEntrar.addEventListener('click', () => {
        const nomeMotorista = inputMotoristaLogin.value.trim();
        if (nomeMotorista) {
            motoristaField.value = nomeMotorista;
            loginScreen.style.display = 'none';
            mainForm.style.display = 'block';
        } else {
            showAlert('Por favor, identifique-se para continuar.', 'info');
        }
    });

    btnSair.addEventListener('click', () => {
        if (confirm('Deseja realmente sair?')) {
            window.close(); // Tenta fechar a aba
        }
    });

    // --- LÓGICA DO FORMULÁRIO ---
    
    // Cálculo automático do valor total
    [pesoSaidaInput, valorToneladaInput].forEach(input => {
        input.addEventListener('input', () => {
            const peso = parseFloat(pesoSaidaInput.value) || 0;
            const valorTon = parseFloat(valorToneladaInput.value) || 0;
            valorTotalInput.value = (peso * valorTon).toFixed(2);
        });
    });

    // Mostrar/ocultar campo de "outra transportadora"
    transportadoraOutraRadio.addEventListener('change', () => {
        outraTransportadoraInput.style.display = 'block';
        outraTransportadoraInput.required = true;
    });
    transportadoraLVRadio.addEventListener('change', () => {
        outraTransportadoraInput.style.display = 'none';
        outraTransportadoraInput.required = false;
    });

    // Adicionar campos dinâmicos de abastecimento
    btnAddAbastecimento.addEventListener('click', () => {
        const index = abastecimentosContainer.children.length;
        abastecimentosContainer.insertAdjacentHTML('beforeend', createAbastecimentoHTML(index));
    });

    // Adicionar campos dinâmicos de manutenção
    btnAddManutencao.addEventListener('click', () => {
        const index = manutencoesContainer.children.length;
        manutencoesContainer.insertAdjacentHTML('beforeend', createManutencaoHTML(index));
    });

    // --- SUBMISSÃO DO FORMULÁRIO ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // Coletar todos os dados do formulário
        const dadosFrete = {
            id: new Date().getTime(), // ID único para o IndexedDB
            motorista: document.getElementById('motorista').value,
            placa: document.getElementById('placa').value,
            origem: document.getElementById('origem').value,
            destino: document.getElementById('destino').value,
            transportadora: document.querySelector('input[name="transportadora"]:checked').value === 'outra' ? document.getElementById('outra-transportadora').value : 'Laranja Verde',
            produto: document.getElementById('produto').value,
            dataSaida: document.getElementById('data-saida').value,
            kmSaida: document.getElementById('km-saida').value,
            kmChegada: document.getElementById('km-chegada').value,
            pesoSaida: document.getElementById('peso-saida').value,
            valorTonelada: document.getElementById('valor-tonelada').value,
            valorTotal: document.getElementById('valor-total').value,
            dataDescarga: document.getElementById('data-descarga').value,
            abastecimentos: [],
            manutencoes: [],
            fotosAbastecimento: [],
            fotosManutencao: []
        };
        
        // Coletar dados de abastecimentos
        document.querySelectorAll('.abastecimento-item').forEach(async (item) => {
            const fotoInput = item.querySelector('input[type="file"]');
            dadosFrete.abastecimentos.push({
                valor: item.querySelector('[data-field="valor"]').value,
                data: item.querySelector('[data-field="data"]').value,
                local: item.querySelector('[data-field="local"]').value,
                posto: item.querySelector('[data-field="posto"]').value,
                litros: item.querySelector('[data-field="litros"]').value,
                km: item.querySelector('[data-field="km"]').value,
            });
            if (fotoInput.files[0]) {
                 const base64 = await toBase64(fotoInput.files[0]);
                 dadosFrete.fotosAbastecimento.push(base64);
            }
        });

        // Coletar dados de manutenções
        document.querySelectorAll('.manutencao-item').forEach(async (item) => {
             const fotoInput = item.querySelector('input[type="file"]');
            dadosFrete.manutencoes.push({
                valor: item.querySelector('[data-field="valor"]').value,
                data: item.querySelector('[data-field="data"]').value,
                local: item.querySelector('[data-field="local"]').value,
                servico: item.querySelector('[data-field="servico"]').value,
            });
            if (fotoInput.files[0]) {
                 const base64 = await toBase64(fotoInput.files[0]);
                 dadosFrete.fotosManutencao.push(base64);
            }
        });

        // Salvar no IndexedDB
        saveDataLocally(dadosFrete);
    });

    // Função para salvar dados no IndexedDB
    function saveDataLocally(data) {
        if (!db) {
            showAlert('Banco de dados local não está pronto.', 'error');
            return;
        }
        const transaction = db.transaction(['fretes'], 'readwrite');
        const store = transaction.objectStore('fretes');
        const request = store.add(data);

        request.onsuccess = () => {
            showAlert('Dados salvos localmente! Serão enviados assim que houver conexão.', 'success');
            form.reset(); // Limpa o formulário
            abastecimentosContainer.innerHTML = ''; // Limpa seções dinâmicas
            manutencoesContainer.innerHTML = '';   // Limpa seções dinâmicas
            
            // Disparar o evento de sincronização
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.sync.register('sync-fretes');
                });
            } else {
                 // Fallback para navegadores sem Background Sync
                 attemptSync();
            }
        };

        request.onerror = (event) => {
            showAlert('Erro ao salvar os dados localmente.', 'error');
            console.error('Erro no IndexedDB:', event.target.error);
        };
    }
});


// --- FUNÇÕES AUXILIARES ---

// Cria o HTML para um novo item de abastecimento
function createAbastecimentoHTML(index) {
    return `
        <div class="dynamic-section abastecimento-item">
            <h4>Abastecimento ${index + 1}</h4>
            <input type="number" step="0.01" placeholder="Valor (R$)" data-field="valor" required>
            <input type="date" data-field="data" required>
            <input type="text" placeholder="Local" data-field="local" required>
            <input type="text" placeholder="Nome do Posto" data-field="posto" required>
            <input type="number" step="0.01" placeholder="Litros" data-field="litros" required>
            <input type="number" placeholder="Quilometragem" data-field="km" required>
            <label>Foto da NF:</label>
            <input type="file" accept="image/*" capture="environment">
        </div>
    `;
}

// Cria o HTML para um novo item de manutenção
function createManutencaoHTML(index) {
    return `
        <div class="dynamic-section manutencao-item">
            <h4>Manutenção ${index + 1}</h4>
            <input type="number" step="0.01" placeholder="Valor (R$)" data-field="valor" required>
            <input type="date" data-field="data" required>
            <input type="text" placeholder="Local" data-field="local" required>
            <input type="text" placeholder="Serviço Prestado" data-field="servico" required>
            <label>Foto da NF:</label>
            <input type="file" accept="image/*" capture="environment">
        </div>
    `;
}

// Converte um arquivo para Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});


// Função para exibir alertas modais personalizados
function showAlert(message, type = 'info') { // types: info, success, error
    const modal = document.getElementById('custom-alert');
    const content = modal.querySelector('.alert-content');
    const messageP = document.getElementById('alert-message');
    const closeBtn = modal.querySelector('.close-btn');

    messageP.textContent = message;
    content.className = 'alert-content ' + type; // Adiciona a classe de cor
    modal.style.display = 'flex';

    const closeModal = () => modal.style.display = 'none';
    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };
}