document.addEventListener("DOMContentLoaded", () => {

    // *** IMPORTANTE ***
    // Cole aqui o URL do seu Google Apps Script (que você obterá na Etapa 5)
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbj19eTq9hIC0faZ2fa2Q0sQ0cz1n3S3wcWzlrT-msCDw5j7c1jPoIyYQ3oucTYh-xRw/exec';

    // Referências de Tela
    const screenEntry = document.getElementById('screen-entry');
    const screenForm = document.getElementById('screen-form');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Elementos da Tela de Entrada
    const entryForm = document.getElementById('entry-form');
    const motoristaNomeInput = document.getElementById('motorista-nome');
    const placaCaminhaoInput = document.getElementById('placa-caminhao');
    const dataAtualInput = document.getElementById('data-atual');
    const codigoViagemInput = document.getElementById('codigo-viagem');
    const btnIniciarFrete = document.getElementById('btn-iniciar-frete');

    // Elementos da Tela de Formulário
    const freteForm = document.getElementById('frete-form');
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

    const btnSalvar = document.getElementById('btn-salvar');
    const btnVoltar = document.getElementById('btn-voltar');

    let freteCounter = 0; // Contador para o número de ordem do frete

    // --- FUNÇÕES AUXILIARES ---

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    function formatarData(date) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0'); // Mês é base 0
        const ano = date.getFullYear();
        return `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD para inputs de data
    }
    
    function obterDDMM(date) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        return `${dia}${mes}`;
    }

    // --- INICIALIZAÇÃO DA TELA DE ENTRADA ---
    
    function inicializarEntrada() {
        const hoje = new Date();
        dataAtualInput.value = formatarData(hoje);
        
        function gerarCodigoViagem() {
            const nome = motoristaNomeInput.value.trim();
            const primeiroNome = nome.split(' ')[0] || '';
            
            if (primeiroNome && placaCaminhaoInput.value.trim()) {
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
        
        gerarCodigoViagem(); // Chamar uma vez para desabilitar o botão inicialmente
    }

    // --- LÓGICA DA TELA DE FORMULÁRIO ---

    btnIniciarFrete.addEventListener('click', () => {
        freteCounter++; // Incrementa o número do frete
        
        // Preenche dados da tela de entrada
        formMotorista.value = motoristaNomeInput.value;
        formFreteId.value = `${codigoViagemInput.value}-${freteCounter}`;
        
        // Reseta o formulário
        freteForm.reset(); 
        abastecimentosLista.innerHTML = ''; // Limpa listas dinâmicas
        manutencoesLista.innerHTML = '';
        inputTransportadoraOutraNome.style.display = 'none'; // Reseta rádio
        radioTransportadoraLV.checked = true;

        // Re-preenche os campos não-editáveis
        formMotorista.value = motoristaNomeInput.value;
        formFreteId.value = `${codigoViagemInput.value}-${freteCounter}`;

        showScreen('screen-form');
    });

    btnVoltar.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja voltar? Todos os dados não salvos serão perdidos.')) {
            showScreen('screen-entry');
            // Não resetamos o freteCounter, pois ele pertence à viagem atual
        }
    });

    // Lógica do Rádio da Transportadora
    radioTransportadoraOutra.addEventListener('change', () => {
        inputTransportadoraOutraNome.style.display = 'block';
        inputTransportadoraOutraNome.required = true;
    });
    radioTransportadoraLV.addEventListener('change', () => {
        inputTransportadoraOutraNome.style.display = 'none';
        inputTransportadoraOutraNome.required = false;
    });

    // Cálculo do Valor Total
    function calcularValorTotal() {
        const peso = parseFloat(pesoSaidaInput.value) || 0;
        const valorTon = parseFloat(valorToneladaInput.value) || 0;
        valorTotalInput.value = (peso * valorTon).toFixed(2);
    }
    pesoSaidaInput.addEventListener('input', calcularValorTotal);
    valorToneladaInput.addEventListener('input', calcularValorTotal);

    // Adição Dinâmica de Abastecimento
    btnAddAbastecimento.addEventListener('click', () => {
        const index = abastecimentosLista.children.length;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-item');
        newItem.innerHTML = `
            <h4>Abastecimento #${index + 1}</h4>
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

    // Adição Dinâmica de Manutenção
    btnAddManutencao.addEventListener('click', () => {
        const index = manutencoesLista.children.length;
        const newItem = document.createElement('div');
        newItem.classList.add('dynamic-item');
        newItem.innerHTML = `
            <h4>Manutenção #${index + 1}</h4>
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

    // --- ENVIO DO FORMULÁRIO ---

    freteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (GOOGLE_SCRIPT_URL === 'COLE_AQUI_O_URL_DO_SEU_SCRIPT_DEPLOYADO') {
            alert('Erro: O URL do Google Apps Script não foi configurado em script.js.');
            return;
        }

        loadingOverlay.style.display = 'flex';

        // 1. Coletar dados do Frete Principal
        let transportadoraNome = radioTransportadoraLV.checked ? "Laranja Verde" : inputTransportadoraOutraNome.value;

        const dadosFrete = {
            // Dados da Viagem (para vincular)
            motorista: motoristaNomeInput.value,
            placa: placaCaminhaoInput.value,
            dataViagem: dataAtualInput.value,
            codigoViagem: codigoViagemInput.value,
            // Dados do Frete
            codigoFrete: formFreteId.value,
            origem: document.getElementById('form-origem').value,
            destino: document.getElementById('form-destino').value,
            transportadora: transportadoraNome,
            produto: document.getElementById('form-produto').value,
            dataSaida: document.getElementById('form-data-saida').value,
            kmSaida: document.getElementById('form-km-saida').value,
            kmChegada: document.getElementById('form-km-chegada').value,
            pesoSaida: pesoSaidaInput.value,
            valorTonelada: valorToneladaInput.value,
            valorTotal: valorTotalInput.value,
            dataDescarga: document.getElementById('form-data-descarga').value,
        };

        // 2. Coletar Abastecimentos
        const abastecimentos = [];
        document.querySelectorAll('#abastecimentos-lista .dynamic-item').forEach(item => {
            abastecimentos.push({
                valor: item.querySelector('.abastecimento-valor').value,
                data: item.querySelector('.abastecimento-data').value,
                local: item.querySelector('.abastecimento-local').value,
                posto: item.querySelector('.abastecimento-posto').value,
                litros: item.querySelector('.abastecimento-litros').value,
                km: item.querySelector('.abastecimento-km').value,
                // A foto será tratada no GAS (veja a complexidade abaixo)
            });
        });

        // 3. Coletar Manutenções
        const manutencoes = [];
        document.querySelectorAll('#manutencoes-lista .dynamic-item').forEach(item => {
            manutencoes.push({
                valor: item.querySelector('.manutencao-valor').value,
                data: item.querySelector('.manutencao-data').value,
                local: item.querySelector('.manutencao-local').value,
                servico: item.querySelector('.manutencao-servico').value,
            });
        });

        // 4. Montar o objeto final
        const payload = {
            frete: dadosFrete,
            abastecimentos: abastecimentos,
            manutencoes: manutencoes
        };

        // **Aviso sobre FOTOS:** Enviar arquivos (fotos) para Google Sheets/Drive
        // via Apps Script a partir de um formulário HTML é MUITO complexo.
        // Requer codificação Base64 no cliente e decodificação no servidor (GAS)
        // para salvar no Google Drive e então colocar o link na planilha.
        //
        // O código atual envia apenas os *dados de texto*. A lógica de upload de
        // arquivos foi omitida para simplificar a solução inicial.

        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                // Redirecionamento é necessário para scripts do Google
                redirect: 'follow', 
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // Requerido pelo GAS para JSON em modo 'text'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('Frete salvo com sucesso!');
                // Limpa o formulário e volta para a tela de adicionar MAIS fretes
                // (ou pode voltar para a tela inicial)
                btnIniciarFrete.click(); // Simula o clique para preparar o próximo frete
            } else {
                throw new Error(result.message || 'Erro desconhecido no servidor.');
            }

        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            alert(`Erro ao salvar. Verifique sua conexão e tente novamente.\nDetalhe: ${error.message}`);
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // --- INICIALIZAÇÃO ---
    inicializarEntrada();
    showScreen('screen-entry');
});