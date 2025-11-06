// EM: code.gs

// ############# CONFIGURAÇÃO #############
// COLE AQUI A URL DO SEU SITE NETLIFY (OPCIONAL, NÃO USADO NO CORS)
const NETLIFY_URL = "https://acertodefrete.netlify.app"; 
// #########################################

// ID da sua pasta no Google Drive para salvar as fotos das notas fiscais.
const ID_PASTA_FOTOS = "1fKRyqP1-b34sflAxuWPs_zYCZrfslcvu";
// ID da sua planilha. O script pega automaticamente da planilha onde está contido.
const ID_PLANILHA = SpreadsheetApp.getActiveSpreadsheet().getId();

// #########################################
// ### FUNÇÃO DE AJUDA PARA FORMATAR DATA ###
// #########################################
function formatarData(dataString) {
  if (!dataString) return "";
  try {
    const [ano, mes, dia] = dataString.split('-');
    if (dia && mes && ano) {
      return `${dia}/${mes}/${ano}`;
    }
    return dataString;
  } catch (e) {
    return dataString;
  }
}
// #########################################


// Função que é executada quando o aplicativo envia dados (via POST)
function doPost(e) {
  
  // Lógica para lidar com a verificação de CORS (Preflight)
  if (e.request && e.request.method === 'options') {
    return handleOptions();
  }

  try {
    const dados = JSON.parse(e.postData.contents);
    const planilha = SpreadsheetApp.openById(ID_PLANILHA);
    const aba = planilha.getSheetByName("controle") || planilha.insertSheet("controle");

    verificarCabecalhos(aba);
    
    // Processar fotos
    const urlFotoNfAbastecimento = processarFotos(dados.fotosAbastecimento, "nf_abastecimento");
    const urlFotoNfManutencao = processarFotos(dados.fotosManutencao, "nf_manutencao");
    
    // Montar a linha de dados para a planilha
    const novaLinha = [
      new Date(),
      dados.motorista,
      dados.placa,
      dados.origem,
      dados.destino,
      dados.transportadora,
      dados.produto,
      formatarData(dados.dataSaida),
      dados.kmSaida,
      dados.kmChegada,
      dados.pesoSaida,
      dados.valorTonelada,
      dados.valorTotal,
      formatarData(dados.dataDescarga),
      dados.abastecimentos.map(a => {
        if (a.data) a.data = formatarData(a.data);
        return JSON.stringify(a);
      }).join('; '),
      dados.manutencoes.map(m => {
        if (m.data) m.data = formatarData(m.data);
        return JSON.stringify(m);
      }).join('; '),
      urlFotoNfAbastecimento.join(', '),
      urlFotoNfManutencao.join(', ')
    ];
    
    aba.appendRow(novaLinha);

    return createJsonResponse({ status: "success", message: "Dados recebidos!" });
    
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

// Função para lidar com requisições OPTIONS (CORS Preflight)
function handleOptions() {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.TEXT);
  output.setContent("");
  output.setHeader("Access-Control-Allow-Origin", "*");
  output.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  output.setHeader("Access-Control-Allow-Headers", "Content-Type");
  output.setHeader("Access-Control-Max-Age", "86400");
  return output;
}

// Função auxiliar para criar respostas JSON com cabeçalhos CORS
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader("Access-Control-Allow-Origin", "*");
  output.setHeader("Access-Control-Allow-Methods", "POST");
  output.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return output;
}

// Função para processar e salvar as fotos no Drive
function processarFotos(fotosArray, prefixo) {
  if (!fotosArray || fotosArray.length === 0) return [];
  const pasta = DriveApp.getFolderById(ID_PASTA_FOTOS);
  const urls = [];

  fotosArray.forEach((foto, index) => {
    try {
      const dadosImagem = Utilities.base64Decode(foto.split(',')[1]);
      const blob = Utilities.newBlob(dadosImagem, 'image/jpeg', `${prefixo}_${new Date().getTime()}_${index}.jpg`);
      const arquivo = pasta.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push(arquivo.getUrl());
    } catch (e) {
      Logger.log('Erro ao decodificar ou salvar foto: ' + e);
      urls.push('ERRO_FOTO');
    }
  });
  return urls;
}

// Função para verificar cabeçalhos
function verificarCabecalhos(aba) {
  if (aba.getLastRow() === 0) {
    const cabecalhos = [
      "Timestamp", "Motorista", "Placa", "Origem", "Destino", "Transportadora", 
      "Produto Transportado", "Data de Saída", "KM Saída", "KM Chegada", "Peso de Saída (Ton)",
      "Valor por Tonelada (R$)", "Valor Total (R$)", "Data da Descarga", "Abastecimentos",
      "Manutenções", "Links NF Abastecimento", "Links NF Manutenção"
    ];
    aba.appendRow(cabecalhos);
  }
}