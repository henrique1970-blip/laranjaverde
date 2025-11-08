document.addEventListener("DOMContentLoaded", () => {

    // *** IMPORTANTE ***
    // Cole aqui o URL do seu Google Apps Script (que você obterá na Etapa 5)
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbj19eTq9hIC0faZ2fa2Q0sQ0cz1n3S3wcWzlrT-msCDw5j7c1jPoIyYQ3oucTYh-xRw/exec';


    // --- Referências de Tela ---
    const screenEntry = document.getElementById('screen-entry');
    const screenQuery = document.getElementById('screen-query');
    const screenForm = document.getElementById('screen-form');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // --- Elementos da Tela de Entrada ---
    const motoristaNomeInput = document.getElementById('motorista-nome');
    const placaCaminhaoInput = document.getElementById('placa-caminhao');
    const dataAtualInput = document.getElementById('data-atual');
    const codigoViagemInput = document.getElementById('codigo-viagem');
    const btnIniciarFrete = document.getElementById('btn-iniciar-frete');
    const btnEditarFrete = document.getElementById('btn-editar-frete');

    // --- Elementos da Tela de Consulta (NOVO) ---
    const queryForm = document.getElementById('query-form');
    const queryMotoristaNome = document.getElementById('query-motorista-nome');
    const queryData = document.getElementById('query-data');
    const btnBuscarFretes = document.getElementById('btn-buscar-fretes');
    const queryResults = document.getElementById('query-results');
    const queryFreteSelect = document.getElementById('query-frete-select');
    const btnCarregarFrete = document.getElementById('btn-carregar-frete');
    const btnVoltarDaConsulta = document.getElementById('btn-voltar-da-consulta');

    // --- Elementos da Tela de Formulário ---
    const freteForm = document.getElementById('frete-form');
    const formTitle = document.getElementById('form-title');
    const formMotorista = document.getElementById('form-motorista');
    const formFreteId = document.getElementById('form-frete-id');
    const radioTransportadoraOutra = document.getElementById('radio-transportadora-outra');
    const radioTransportadoraLV = document.getElementById('radio-transportadora-lv');
    const inputTransportadoraOutraNome = document.getElementById('form-transportadora-outra-nome');
    const pesoSaidaInput = document.getElementById('form-peso-saida');
    const valorToneladaInput = document.getElementById('form-valor-tonelada');
    const valorTotalInput = document.getElementById('form-valor-total');
    const btnAddAbastecimento = document.getElementById('btn-add-abastecimento');
    const abastecimentosLista = document.getElementById('abastecimentos-lista');
    const btnAddManutencao = document.getElementById('btn-add-manutencao');
    const manutencoesLista = document.getElementById('manutencoes-lista');
    const btnVoltar = document.getElementById('btn-voltar');

    // --- Variáveis de Estado ---
    let freteCounter = 0;
    let currentMode = 'add'; // 'add' ou 'edit'
    let currentEditData = {}; // Armazena dados do frete em edição

    // --- FUNÇÕES AUXILIARES (Datas, Arquivos, etc.) ---
    
    function formatarDataDisplay(date) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }
    
    function reformatarDataParaPlanilha(dataString) { // Recebe 'yyyy-mm-dd'
        if (!dataString) return "";
        const parts = dataString.split('-');
        if (parts.length !== 3) return dataString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`; // Retorna 'dd/mm/aaaa'
    }
    
    function reformatarDataParaInput(dataString) { // Recebe 'dd/mm/aaaa'
        if (!dataString) return "";
        const parts = dataString.split('/');
        if (parts.length !== 3) return dataString;
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Retorna 'yyyy-mm-dd'
    }
    
    function obterDDMM(date) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        return `${dia}${mes}`;
    }

    function lerArquivoComoBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve({ fileName: "", fileType: "", fileBase64: "" });
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve({
                    fileName: file.name,
                    fileType: file.type,
                    fileBase64: base64String
                });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    function showLoading(text) {
        loadingText.textContent = text;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    // --- LÓGICA DA TELA DE ENTRADA ---
    
    function inicializarEntrada() {
        const hoje = new Date();
        dataAtualInput.value = formatarDataDisplay(hoje);
        
        function gerarCodigoViagem() {
            const nome = motoristaNomeInput.value.trim();
            const primeiroNome = nome.split(' ')[0] || '';
            const placa = placaCaminhaoInput.value.trim();
            
            if (primeiroNome && placa) {
                const ddmm = obterDDMM(hoje);
                codigoViagemInput.value = `${primeiroNome}-${ddmm}`;
                btnIniciarFrete.disabled = false;
            } else {
                codigoViagemInput.value = '';
                btnIniciarFrete.disabled = true;
            }
        }
        motoristaNomeInput.addEventListener('input', gerarCodigoViagem);
        placaCaminhaoInput.addEventListener('input', gerarCodigoViagem);
        gerarCodigoViagem();
    }

    // --- LÓGICA DA TELA DE CONSULTA (NOVO) ---

    btnEditarFrete.addEventListener('click', () => {
        currentMode = 'edit';
        queryForm.reset();
        queryResults.style.display = 'none';
        queryFreteSelect.innerHTML = '';
        // Preenche o nome do motorista da tela inicial, se houver
        queryMotoristaNome.value = motoristaNomeInput.value; 
        showScreen('screen-query');
    });

    btnVoltarDaConsulta.addEventListener('click', () => {
        showScreen('screen-entry');
    });

    btnBuscarFretes.addEventListener('click', async () => {
        const motorista = queryMotoristaNome.value.trim();
        if (!motorista) {
            alert('Por favor, digite o nome do motorista.');
            return;
        }

        showLoading('Buscando fretes...');
        
        const payload = {
            action: 'getFretesList',
            motorista: motorista,
            // Converte data para dd/mm/aaaa para buscar
            data: reformatarDataParaPlanilha(queryData.value) 
        };

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status === 'success' && result.data.length > 0) {
                queryFreteSelect.innerHTML = ''; // Limpa opções anteriores
                result.data.forEach(frete => {
                    const option = document.createElement('option');
                    option.value = frete.codigoFrete;
                    option.textContent = frete.displayText;
                    queryFreteSelect.appendChild(option);
                });
                queryResults.style.display = 'block';
            } else {
                alert('Nenhum frete encontrado para este motorista' + (payload.data ? ' na data informada.' : '.'));
                queryResults.style.display = 'none';
            }
        } catch (error) {
            alert('Erro ao buscar fretes: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    btnCarregarFrete.addEventListener('click', async () => {
        const codigoFrete = queryFreteSelect.value;
        if (!codigoFrete) {
            alert('Nenhum frete selecionado.');
            return;
        }
        
        showLoading('Carregando dados do frete...');
        
        const payload = {
            action: 'getFreteDetails',
            codigoFrete: codigoFrete
        };
        
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (result.status === 'success') {
                currentEditData = result.data; // Salva os dados
                populateFormForEdit(currentEditData);
                showScreen('screen-form');
            } else {
                alert('Erro ao carregar dados: ' + result.message);
            }
        } catch (error) {
            alert('Erro ao carregar frete: ' + error.message);
        } finally {
            hideLoading();
        }
    });


    // --- LÓGICA DA TELA DE FORMULÁRIO (ADICIONAR E EDITAR) ---

    // Habilita/Desabilita todos os campos principais do frete

    function setMainFieldsReadOnly(isReadOnly) {
        // CORREÇÃO: Removemos os campos que devem estar SEMPRE bloqueados
        const fields = [
            'form-origem', 'form-destino', 
            'form-produto', 'form-data-saida', 'form-km-saida', 'form-peso-saida', 
            'form-valor-tonelada', 
            'radio-transportadora-lv', 'radio-transportadora-outra', 'form-transportadora-outra-nome'
        ];

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el.type === 'radio') {
                el.disabled = isReadOnly;
            } else {
                el.readOnly = isReadOnly;
            }
        });
        
        // Desabilita os fieldsets para travar os radios
        document.getElementById('fieldset-transportadora').disabled = isReadOnly;
    }

    // Prepara o formulário para ADICIONAR um novo frete
    btnIniciarFrete.addEventListener('click', () => {
        currentMode = 'add';
        freteCounter++; 
        
        freteForm.reset(); 
        abastecimentosLista.innerHTML = '';
        manutencoesLista.innerHTML = '';
        inputTransportadoraOutraNome.style.display = 'none';
        radioTransportadoraLV.checked = true;

        // Preenche campos da viagem
        formMotorista.value = motoristaNomeInput.value;
        formFreteId.value = `${codigoViagemInput.value}-${freteCounter}`;
        
        formTitle.textContent = 'Adicionar Novo Frete';
        setMainFieldsReadOnly(false); // Destrava todos os campos
        
        showScreen('screen-form');
    });

    // Prepara o formulário para EDITAR um frete existente
    function populateFormForEdit(data) {
        freteForm.reset(); 
        abastecimentosLista.innerHTML = ''; // Limpa para adicionar novos
        manutencoesLista.innerHTML = ''; // Limpa para adicionar novos

        formTitle.textContent = 'Editar Frete';
        
        const frete = data.frete;
        
        // Preenche todos os campos com os dados buscados
        formMotorista.value = frete.motorista;
        formFreteId.value = frete.codigoFrete;
        formFreteId.value = frete.codigoFrete;
        document.getElementById('form-origem').value = frete.origem;
        document.getElementById('form-destino').value = frete.destino;
        document.getElementById('form-produto').value = frete.produto;
        document.getElementById('form-km-saida').value = frete.kmSaida;
        pesoSaidaInput.value = frete.pesoSaida;
        valorToneladaInput.value = frete.valorTonelada;
        valorTotalInput.value = frete.valorTotal;

        // Converte datas dd/mm/aaaa para yyyy-mm-dd para os inputs
        document.getElementById('form-data-saida').value = reformatarDataParaInput(frete.dataSaida);
        document.getElementById('form-km-chegada').value = frete.kmChegada;
        document.getElementById('form-data-descarga').value = reformatarDataParaInput(frete.dataDescarga);
        
        // Ajusta a transportadora
        if (frete.transportadora === 'Laranja Verde') {
            radioTransportadoraLV.checked = true;
            inputTransportadoraOutraNome.style.display = 'none';
        } else {
            radioTransportadoraOutra.checked = true;
            inputTransportadoraOutraNome.value = frete.transportadora;
            inputTransportadoraOutraNome.style.display = 'block';
        }
        
        // Trava os campos principais
        setMainFieldsReadOnly(true);
        
        // Libera os campos de edição
        document.getElementById('form-km-chegada').readOnly = false;
        document.getElementById('form-data-descarga').readOnly = false;

        // NOTA: Os abastecimentos/manutenções existentes não são mostrados,
        // mas o usuário pode ADICIONAR novos, conforme solicitado.
    }

    btnVoltar.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja voltar? Todos os dados não salvos serão perdidos.')) {
            // Se estava editando, volta para a tela de consulta
            if (currentMode === 'edit') {
                showScreen('screen-query');
            } else { // Se estava adicionando, volta para a tela inicial
                showScreen('screen-entry');
            }
        }
    });

    // --- Lógica de Cálculo e Adição Dinâmica (Sem mudanças) ---
    
    function calcularValorTotal() {
        const peso = parseFloat(pesoSaidaInput.value) || 0;
        const valorTon = parseFloat(valorToneladaInput.value) || 0;
        valorTotalInput.value = (peso * valorTon).toFixed(2);
    }
    pesoSaidaInput.addEventListener('input', calcularValorTotal);
    valorToneladaInput.addEventListener('input', calcularValorTotal);

    radioTransportadoraOutra.addEventListener('change', () => {
        inputTransportadoraOutraNome.style.display = 'block';
        inputTransportadoraOutraNome.required = true;
    });
    radioTransportadoraLV.addEventListener('change', () => {
        inputTransportadoraOutraNome.style.display = 'none';
        inputTransportadoraOutraNome.required = false;
    });

    btnAddAbastecimento.addEventListener('click', () => {
        const index = abastecimentosLista.children.length;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-item');
        newItem.innerHTML = `
            <h4>Abastecimento #${index + 1} (Novo)</h4>
            <label>Valor (R$):</label>
            <input type="number" step="0.01" class="abastecimento-valor" required>
            <label>Data:</label>
            <input type="date" class="abastecimento-data" required>
            <label>Local:</label>
            <input type="text" class="abastecimento-local">
            <label>Nome do Posto:</label>
            <input type="text" class="abastecimento-posto">
            <label>Litros:</label>
            <input type="number" step="0.01" class="abastecimento-litros">
            <label>Quilometragem:</label>
            <input type="number" class="abastecimento-km">
            <label>Foto da Nota:</label>
            <input type="file" class="abastecimento-foto" accept="image/*">
        `;
        abastecimentosLista.appendChild(newItem);
    });

    btnAddManutencao.addEventListener('click', () => {
        const index = manutencoesLista.children.length;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-item');
        newItem.innerHTML = `
            <h4>Manutenção #${index + 1} (Nova)</h4>
            <label>Valor (R$):</label>
            <input type="number" step="0.01" class="manutencao-valor" required>
            <label>Data:</label>
            <input type="date" class="manutencao-data" required>
            <label>Local:</label>
            <input type="text" class="manutencao-local">
            <label>Serviço Prestado:</label>
            <input type="text" class="manutencao-servico">
            <label>Foto da Nota:</label>
            <input type="file" class="manutencao-foto" accept="image/*">
        `;
        manutencoesLista.appendChild(newItem);
    });

    // --- ENVIO DO FORMULÁRIO (LÓGICA DIVIDIDA) ---

    freteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_DEPLOYADO') {
            alert('Erro: O URL do Google Apps Script não foi configurado.');
            return;
        }

        if (currentMode === 'add') {
            await handleAddNewFrete();
        } else if (currentMode === 'edit') {
            await handleUpdateFrete();
        }
    });

    // Função para SALVAR (MODO ADICIONAR)
    async function handleAddNewFrete() {
        showLoading('Enviando dados...');
        
        try {
            // 1. Coletar dados do Frete Principal
            let transportadoraNome = radioTransportadoraLV.checked ? "Laranja Verde" : inputTransportadoraOutraNome.value;
            const dadosFrete = {
                motorista: motoristaNomeInput.value,
                placa: placaCaminhaoInput.value,
                dataViagem: dataAtualInput.value,
                codigoViagem: codigoViagemInput.value,
                codigoFrete: formFreteId.value,
                origem: document.getElementById('form-origem').value,
                destino: document.getElementById('form-destino').value,
                transportadora: transportadoraNome,
                produto: document.getElementById('form-produto').value,
                dataSaida: reformatarDataParaPlanilha(document.getElementById('form-data-saida').value),
                kmSaida: document.getElementById('form-km-saida').value,
                kmChegada: document.getElementById('form-km-chegada').value,
                pesoSaida: pesoSaidaInput.value,
                valorTonelada: valorToneladaInput.value,
                valorTotal: valorTotalInput.value,
                dataDescarga: reformatarDataParaPlanilha(document.getElementById('form-data-descarga').value),
            };

            // 2. Coletar Abastecimentos
            const abastecimentosPromessas = [];
            document.querySelectorAll('#abastecimentos-lista .dynamic-item').forEach(item => {
                const fileInput = item.querySelector('.abastecimento-foto');
                abastecimentosPromessas.push(
                    lerArquivoComoBase64(fileInput.files[0]).then(fileData => ({
                        data: reformatarDataParaPlanilha(item.querySelector('.abastecimento-data').value),
                        valor: item.querySelector('.abastecimento-valor').value,
                        local: item.querySelector('.abastecimento-local').value,
                        posto: item.querySelector('.abastecimento-posto').value,
                        litros: item.querySelector('.abastecimento-litros').value,
                        km: item.querySelector('.abastecimento-km').value,
                        foto: fileData
                    }))
                );
            });
            
            // 3. Coletar Manutenções
            const manutencoesPromessas = [];
            document.querySelectorAll('#manutencoes-lista .dynamic-item').forEach(item => {
                const fileInput = item.querySelector('.manutencao-foto');
                manutencoesPromessas.push(
                    lerArquivoComoBase64(fileInput.files[0]).then(fileData => ({
                        data: reformatarDataParaPlanilha(item.querySelector('.manutencao-data').value),
                        valor: item.querySelector('.manutencao-valor').value,
                        local: item.querySelector('.manutencao-local').value,
                        servico: item.querySelector('.manutencao-servico').value,
                        foto: fileData
                    }))
                );
            });
            
            const abastecimentos = await Promise.all(abastecimentosPromessas);
            const manutencoes = await Promise.all(manutencoesPromessas);

            // 4. Montar o objeto final
            const payload = {
                action: 'addNewFrete',
                frete: dadosFrete,
                abastecimentos: abastecimentos,
                manutencoes: manutencoes
            };

            // 5. Enviar
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status === 'success') {
                alert('Frete salvo com sucesso!');
                btnIniciarFrete.click(); // Prepara para o próximo frete
            } else {
                throw new Error(result.message || 'Erro desconhecido no servidor.');
            }
        } catch (error) {
            alert(`Erro ao salvar. Verifique sua conexão.\nDetalhe: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    // Função para SALVAR (MODO EDITAR)
    async function handleUpdateFrete() {
        showLoading('Atualizando dados...');
        
        try {
            // 1. Coletar APENAS novos abastecimentos
            const abastecimentosPromessas = [];
            document.querySelectorAll('#abastecimentos-lista .dynamic-item').forEach(item => {
                const fileInput = item.querySelector('.abastecimento-foto');
                abastecimentosPromessas.push(
                    lerArquivoComoBase64(fileInput.files[0]).then(fileData => ({
                        data: reformatarDataParaPlanilha(item.querySelector('.abastecimento-data').value),
                        valor: item.querySelector('.abastecimento-valor').value,
                        local: item.querySelector('.abastecimento-local').value,
                        posto: item.querySelector('.abastecimento-posto').value,
                        litros: item.querySelector('.abastecimento-litros').value,
                        km: item.querySelector('.abastecimento-km').value,
                        foto: fileData
                    }))
                );
            });
            
            // 2. Coletar APENAS novas manutenções
            const manutencoesPromessas = [];
            document.querySelectorAll('#manutencoes-lista .dynamic-item').forEach(item => {
                const fileInput = item.querySelector('.manutencao-foto');
                manutencoesPromessas.push(
                    lerArquivoComoBase64(fileInput.files[0]).then(fileData => ({
                        data: reformatarDataParaPlanilha(item.querySelector('.manutencao-data').value),
                        valor: item.querySelector('.manutencao-valor').value,
                        local: item.querySelector('.manutencao-local').value,
                        servico: item.querySelector('.manutencao-servico').value,
                        foto: fileData
                    }))
                );
            });

            const abastecimentos = await Promise.all(abastecimentosPromessas);
            const manutencoes = await Promise.all(manutencoesPromessas);
            
            // 3. Montar o payload de ATUALIZAÇÃO
            const payload = {
                action: 'updateFrete',
                codigoFrete: formFreteId.value,
                // Pega os dois campos editáveis
                kmChegada: document.getElementById('form-km-chegada').value,
                dataDescarga: reformatarDataParaPlanilha(document.getElementById('form-data-descarga').value),
                // Adiciona os novos itens
                abastecimentos: abastecimentos,
                manutencoes: manutencoes
            };

            // 4. Enviar
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                redirect: 'follow', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status === 'success') {
                alert('Frete atualizado com sucesso!');
                showScreen('screen-entry'); // Volta para o início
            } else {
                throw new Error(result.message || 'Erro desconhecido no servidor.');
            }
        } catch (error) {
            alert(`Erro ao atualizar. Verifique sua conexão.\nDetalhe: ${error.message}`);
        } finally {
            hideLoading();
        }
    }


    // --- INICIALIZAÇÃO ---
    inicializarEntrada();
    showScreen('screen-entry');
});