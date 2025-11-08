/*
 * CÓDIGO DO GOOGLE APPS SCRIPT (BACKEND) - V2 (Com Roteador de Ações)
 */

// ID da sua Planilha Google 
const SPREADSHEET_ID = "1DaQrfAEv4hLi1gDJqRYnd1rV9uiX4nzA836Y9XEoe8I";
// ID da Pasta do Google Drive 
const FOLDER_ID = "1fKRyqP1-b34sflAxuWPs_zYCZrfslcvu";
// Nomes das Abas (Sheets) 
const SHEET_FRETES = "Fretes";
const SHEET_ABASTECIMENTOS = "Abastecimentos";
const SHEET_MANUTENCOES = "Manutencoes";
// Definição dos Cabeçalhos 
const HEADER_FRETES = [
  "Timestamp", "Código Frete", "Código Viagem", "Motorista", "Placa", 
  "Origem", "Destino", "Transportadora", "Produto", "Data Saída", 
  "Km Saída", "Km Chegada", "Peso Saída (t)", "Valor/t (R$)", 
  "Valor Total (R$)", "Data Descarga"
];
const HEADER_ABASTECIMENTOS = [
  "Timestamp", "Código Frete", "Data", "Valor (R$)", "Local", 
  "Posto", "Litros", "Km", "Link Nota Fiscal"
];
const HEADER_MANUTENCOES = [
  "Timestamp", "Código Frete", "Data", "Valor (R$)", "Local", "Serviço",
  "Link Nota Fiscal"
];

// --- FUNÇÕES AUXILIARES ---

/**
 * Função auxiliar para obter a aba ou criá-la com o cabeçalho. 
 */
function getSheetAndSetupHeader(ss, sheetName, headerArray) {
  let sheet = ss.getSheetByName(sheetName); 
  if (sheet == null) { 
    sheet = ss.insertSheet(sheetName); 
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerArray); 
    const headerRange = sheet.getRange(1, 1, 1, headerArray.length); 
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1); 
  }
  return sheet; 
}

/**
 * Salva um arquivo Base64 no Google Drive e retorna o link. 
 */
function saveFileToDrive(base64Data, mimeType, fileName, folderId, codigoFrete) {
  try {
    if (!base64Data || !fileName) {
      return ""; 
    }
    const decodedData = Utilities.base64Decode(base64Data); 
    const blob = Utilities.newBlob(decodedData, mimeType, fileName); 
    const folder = DriveApp.getFolderById(folderId); 
    const timestamp = new Date().toISOString().replace(/:/g, '-'); 
    const uniqueFileName = `${codigoFrete}_${timestamp}_${fileName}`; 
    const file = folder.createFile(blob.setName(uniqueFileName));
    return file.getUrl(); 
  } catch (e) {
    Logger.log(`Erro ao salvar arquivo: ${e}`);
    return `Erro ao salvar: ${e.message}`; 
  }
}

/**
 * Helper para criar a resposta JSON
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper para converter uma linha (array) em um objeto (usando cabeçalhos)
 */
function rowToObject(row, headers) {
  const obj = {};
  headers.forEach((header, index) => {
    // Converte datas da planilha (Objeto Date) para string dd/mm/aaaa
    if (row[index] instanceof Date) {
      obj[header] = Utilities.formatDate(row[index], Session.getScriptTimeZone(), "dd/MM/yyyy");
    } else {
      obj[header] = row[index];
    }
  });
  return obj;
}

// --- ROTEADOR PRINCIPAL ---

/**
 * Esta é a função principal que recebe os dados do app (via POST)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Roteador de Ações
    switch (data.action) {
      case 'addNewFrete':
        return handleAddNewFrete(data);
      case 'getFretesList':
        return handleGetFretesList(data);
      case 'getFreteDetails':
        return handleGetFreteDetails(data);
      case 'updateFrete':
        return handleUpdateFrete(data);
      default:
        return createJsonResponse({ status: 'error', message: 'Ação desconhecida' });
    }

  } catch (error) {
    Logger.log(error); 
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack }); 
  }
}

// --- LÓGICA DAS AÇÕES ---

/**
 * Ação: addNewFrete
 * Salva um frete completamente novo e seus itens.
 */
function handleAddNewFrete(data) {
  const frete = data.frete; 
  const abastecimentos = data.abastecimentos || [];
  const manutencoes = data.manutencoes || [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fretesSheet = getSheetAndSetupHeader(ss, SHEET_FRETES, HEADER_FRETES); 
  const abastecimentosSheet = getSheetAndSetupHeader(ss, SHEET_ABASTECIMENTOS, HEADER_ABASTECIMENTOS); 
  const manutencoesSheet = getSheetAndSetupHeader(ss, SHEET_MANUTENCOES, HEADER_MANUTENCOES); 

  // 1. Escrever os dados do Frete 
  const freteRow = [
    new Date(),           // Timestamp
    frete.codigoFrete,    // Código Frete
    frete.codigoViagem,   // Código Viagem
    frete.motorista,      // Motorista
    frete.placa,          // Placa 
    frete.origem,         // Origem
    frete.destino,        // Destino
    frete.transportadora, // Transportadora
    frete.produto,        // Produto
    frete.dataSaida,      // Data Saída (dd/mm/aaaa)
    frete.kmSaida,        // Km Saída
    frete.kmChegada,      // Km Chegada
    frete.pesoSaida,      // Peso Saída (t) 
    frete.valorTonelada,  // Valor/t (R$)
    frete.valorTotal,     // Valor Total (R$)
    frete.dataDescarga    // Data Descarga (dd/mm/aaaa)
  ];
  fretesSheet.appendRow(freteRow); 

  // 2. Escrever os dados de Abastecimento 
  abastecimentos.forEach(abast => {
    const linkNota = saveFileToDrive(
      abast.foto.fileBase64, abast.foto.fileType, abast.foto.fileName,
      FOLDER_ID, frete.codigoFrete
    );
    const abastRow = [
      new Date(), frete.codigoFrete, abast.data, abast.valor, abast.local,
      abast.posto, abast.litros, abast.km, linkNota
    ]; 
    abastecimentosSheet.appendRow(abastRow);
  });

  // 3. Escrever os dados de Manutenção 
  manutencoes.forEach(manut => {
    const linkNota = saveFileToDrive(
      manut.foto.fileBase64, manut.foto.fileType, manut.foto.fileName,
      FOLDER_ID, frete.codigoFrete
    ); 
    const manutRow = [
      new Date(), frete.codigoFrete, manut.data, manut.valor, manut.local,
      manut.servico, linkNota
    ]; 
    manutencoesSheet.appendRow(manutRow);
  });

  return createJsonResponse({ status: 'success', message: 'Dados salvos.' }); 
}

/**
 * Ação: getFretesList (NOVA)
 * Busca fretes com base no motorista e (opcionalmente) na data.
 */
function handleGetFretesList(data) {
  const motorista = data.motorista;
  const dataBusca = data.data; // Formato dd/mm/aaaa

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fretesSheet = getSheetAndSetupHeader(ss, SHEET_FRETES, HEADER_FRETES);
  
  const dataRange = fretesSheet.getDataRange();
  const values = dataRange.getValues();

  const results = [];
  
  // Índices das colunas (base 0)
  const colIndexMotorista = 3;   // Col D 
  const colIndexDataSaida = 9;   // Col J 
  const colIndexCodigoFrete = 1; // Col B 
  const colIndexOrigem = 5;      // Col F 
  const colIndexDestino = 6;     // Col G 

  // Loop a partir da linha 1 (índice 1) para pular o cabeçalho
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const motoristaPlanilha = row[colIndexMotorista];
    
    // Formata a data da planilha (que pode ser Objeto Date) para dd/mm/aaaa
    let dataSaidaPlanilha = row[colIndexDataSaida];
    if (dataSaidaPlanilha instanceof Date) {
      dataSaidaPlanilha = Utilities.formatDate(dataSaidaPlanilha, Session.getScriptTimeZone(), "dd/MM/yyyy");
    }
    
    // Filtro 1: Motorista (case-insensitive)
    const matchMotorista = motoristaPlanilha.toLowerCase() === motorista.toLowerCase();
    
    // Filtro 2: Data (só se foi fornecida)
    let matchData = true;
    if (dataBusca) {
      matchData = (dataSaidaPlanilha === dataBusca);
    }
    
    if (matchMotorista && matchData) {
      const codigoFrete = row[colIndexCodigoFrete];
      const origem = row[colIndexOrigem];
      const destino = row[colIndexDestino];
      
      results.push({
        codigoFrete: codigoFrete,
        displayText: `${codigoFrete} (Saída: ${dataSaidaPlanilha} | ${origem} -> ${destino})`
      });
    }
  }
  
  return createJsonResponse({ status: 'success', data: results });
}

/**
 * Ação: getFreteDetails (NOVA)
 * Pega todos os dados de um frete específico.
 */
function handleGetFreteDetails(data) {
  const codigoFrete = data.codigoFrete;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fretesSheet = getSheetAndSetupHeader(ss, SHEET_FRETES, HEADER_FRETES);
  
  const dataRange = fretesSheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0]; // Pega cabeçalhos da linha 1
  
  const colIndexCodigoFrete = 1; // Col B 

  for (let i = 1; i < values.length; i++) {
    if (values[i][colIndexCodigoFrete] === codigoFrete) {
      const freteData = rowToObject(values[i], headers);
      
      // O script.js espera um objeto { data: { frete: {...} } }
      // Renomeia as chaves para camelCase para facilitar no JS
      const freteDetails = {
        codigoFrete: freteData["Código Frete"],
        motorista: freteData["Motorista"],
        origem: freteData["Origem"],
        destino: freteData["Destino"],
        transportadora: freteData["Transportadora"],
        produto: freteData["Produto"],
        dataSaida: freteData["Data Saída"], // dd/mm/aaaa
        kmSaida: freteData["Km Saída"],
        kmChegada: freteData["Km Chegada"],
        pesoSaida: freteData["Peso Saída (t)"],
        valorTonelada: freteData["Valor/t (R$)"],
        valorTotal: freteData["Valor Total (R$)"],
        dataDescarga: freteData["Data Descarga"] // dd/mm/aaaa
      };
      
      return createJsonResponse({ status: 'success', data: { frete: freteDetails } });
    }
  }

  return createJsonResponse({ status: 'error', message: 'Frete não encontrado.' });
}

/**
 * Ação: updateFrete (NOVA)
 * Atualiza campos específicos e adiciona novos abastecimentos/manutenções.
 */
function handleUpdateFrete(data) {
  const codigoFrete = data.codigoFrete;
  const abastecimentos = data.abastecimentos || [];
  const manutencoes = data.manutencoes || [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // 1. Atualizar Aba Fretes
  const fretesSheet = getSheetAndSetupHeader(ss, SHEET_FRETES, HEADER_FRETES);
  const dataRangeFretes = fretesSheet.getDataRange();
  const valuesFretes = dataRangeFretes.getValues();
  
  // Índices (base 0)
  const colIndexCodigoFrete = 1;   // Col B 
  const colIndexKmChegada = 11;    // Col L 
  const colIndexDataDescarga = 15; // Col P 

  let freteRowIndex = -1;
  // Loop a partir da linha 1 (índice 1) para pular o cabeçalho
  for (let i = 1; i < valuesFretes.length; i++) {
    if (valuesFretes[i][colIndexCodigoFrete] === codigoFrete) {
      freteRowIndex = i + 1; // +1 porque getValues é base 0, e getRange é base 1
      break;
    }
  }
  
  if (freteRowIndex === -1) {
    return createJsonResponse({ status: 'error', message: 'Frete não encontrado para atualizar.' });
  }
  
  // Atualiza os campos específicos (+1 para índice de coluna base 1)
  fretesSheet.getRange(freteRowIndex, colIndexKmChegada + 1).setValue(data.kmChegada);
  fretesSheet.getRange(freteRowIndex, colIndexDataDescarga + 1).setValue(data.dataDescarga);

  // 2. Adicionar Abastecimentos (igual ao addNewFrete) 
  const abastecimentosSheet = getSheetAndSetupHeader(ss, SHEET_ABASTECIMENTOS, HEADER_ABASTECIMENTOS);
  abastecimentos.forEach(abast => {
    const linkNota = saveFileToDrive(
      abast.foto.fileBase64, abast.foto.fileType, abast.foto.fileName,
      FOLDER_ID, codigoFrete
    ); 
    const abastRow = [
      new Date(), codigoFrete, abast.data, abast.valor, abast.local,
      abast.posto, abast.litros, abast.km, linkNota
    ]; 
    abastecimentosSheet.appendRow(abastRow);
  });

  // 3. Adicionar Manutenções (igual ao addNewFrete) 
  const manutencoesSheet = getSheetAndSetupHeader(ss, SHEET_MANUTENCOES, HEADER_MANUTENCOES);
  manutencoes.forEach(manut => {
    const linkNota = saveFileToDrive(
      manut.foto.fileBase64, manut.foto.fileType, manut.foto.fileName,
      FOLDER_ID, codigoFrete
    ); 
    const manutRow = [
      new Date(), codigoFrete, manut.data, manut.valor, manut.local,
      manut.servico, linkNota
    ]; 
    manutencoesSheet.appendRow(manutRow);
  });

  return createJsonResponse({ status: 'success', message: 'Frete atualizado.' });
}