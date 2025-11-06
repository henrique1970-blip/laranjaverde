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
    form.addEventListener('submit', async (event) => { // Adicionado "async" aqui
        event.preventDefault();
        
        // Desabilitar o botão para evitar cliques duplos
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

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
            fotosAbastecimento: [], // Será preenchido pelas promessas
            fotosManutencao: [] // Será preenchido pelas promessas
        };

        // 1. Coletar promessas de Abastecimento (fotos)
        const promessasFotosAbastecimento = Array.from(document.querySelectorAll('.abastecimento-item')).map(async (item) => {
            const fotoInput = item.querySelector('input[type="file"]');
            // Adiciona os dados de texto (síncrono)
            dadosFrete.abastecimentos.push({
                valor: item.querySelector('[data-field="valor"]').value,
                data: item.querySelector('[data-field="data"]').value,
                local: item.querySelector('[data-field="local"]').value,
                posto: item.querySelector('[data-field="posto"]').value,
                litros: item.querySelector('[data-field="litros"]').value,
                km: item.querySelector('[data-field="km"]').value,
            });
            
            // Retorna a promessa da foto (assíncrono)
            if (fotoInput.files[0]) {
                return toBase64(fotoInput.files[0]);
            }
            return null; // Retorna null se não houver foto
        });

        // 2. Coletar promessas de Manutenção (fotos)
        const promessasFotosManutencao = Array.from(document.querySelectorAll('.manutencao-item')).map(async (item) => {
            const fotoInput = item.querySelector('input[type="file"]');
            // Adiciona os dados de texto (síncrono)
            dadosFrete.manutencoes.push({
                valor: item.querySelector('[data-field="valor"]').value,
                data: item.querySelector('[data-field="data"]').value,
                local: item.querySelector('[data-field="local"]').value,
                servico: item.querySelector('[data-field="servico"]').value,
            });
            
            // Retorna a promessa da foto (assíncrono)
            if (fotoInput.files[0]) {
                return toBase64(fotoInput.files[0]);
            }
            return null;
        });

        // 3. Aguardar TODAS as promessas de conversão de fotos
        try {
            const fotosAbastecimentoBase64 = await Promise.all(promessasFotosAbastecimento);
            const fotosManutencaoBase64 = await Promise.all(promessasFotosManutencao);

            // 4. Popular os arrays de fotos (filtrando os nulos)
            dadosFrete.fotosAbastecimento = fotosAbastecimentoBase64.filter(foto => foto !== null);
            dadosFrete.fotosManutencao = fotosManutencaoBase64.filter(foto => foto !== null);

            // 5. Agora sim, salvar os dados completos localmente
            saveDataLocally(dadosFrete);

        } catch (error) {
            console.error("Erro ao converter fotos para Base64:", error);
            showAlert('Erro ao processar as fotos. Tente novamente.', 'error');
        } finally {
            // Reabilitar o botão
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar e Enviar';
        }
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
        showAlert('Dados salvos localmente! Tentando enviar...', 'success');
        form.reset();
        abastecimentosContainer.innerHTML = '';
        manutencoesContainer.innerHTML = '';

        // TENTA ENVIAR IMEDIATAMENTE
        attemptImmediateSync(data);
    };

    request.onerror = (event) => {
        showAlert('Erro ao salvar os dados localmente.', 'error');
        console.error('Erro no IndexedDB:', event.target.error);
    };
}

// Função para tentar enviar imediatamente
function attemptImmediateSync(data) {
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
    })
    .then(response => {
        if (!response.ok) throw new Error('Falha no servidor');
        return response.json();
    })
    .then(() => {
        // Remove do IndexedDB se enviado com sucesso
        removeFromLocalDB(data.id);
        showAlert('Dados enviados com sucesso!', 'success');
    })
    .catch(err => {
        console.log('Envio imediato falhou (será sincronizado depois):', err);
        // Deixa no IndexedDB para o sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-fretes'));
        }
    });
}

function removeFromLocalDB(id) {
    if (!db) return;
    const transaction = db.transaction(['fretes'], 'readwrite');
    const store = transaction.objectStore('fretes');
    store.delete(id);
}

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