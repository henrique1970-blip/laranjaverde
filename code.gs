// ID da sua pasta no Google Drive para salvar as fotos das notas fiscais.
const ID_PASTA_FOTOS = "1fKRyqP1-b34sflAxuWPs_zYCZrfslcvu";
// ID da sua planilha. O script pega automaticamente da planilha onde está contido.
const ID_PLANILHA = SpreadsheetApp.getActiveSpreadsheet().getId();

// Função que é executada quando o aplicativo envia dados (via POST)
function doPost(e) {
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
      new Date(), // Timestamp de quando o dado foi recebido
      dados.motorista,
      dados.placa,
      dados.origem,
      dados.destino,
      dados.transportadora,
      dados.produto,
      dados.dataSaida,
      dados.kmSaida,
      dados.kmChegada,
      dados.pesoSaida,
      dados.valorTonelada,
      dados.valorTotal,
      dados.dataDescarga,
      dados.abastecimentos.map(a => JSON.stringify(a)).join('; '), // Converte array de objetos para texto
      dados.manutencoes.map(m => JSON.stringify(m)).join('; '), // Converte array de objetos para texto
      urlFotoNfAbastecimento.join(', '), // URLs das fotos
      urlFotoNfManutencao.join(', ') // URLs das fotos
    ];

    aba.appendRow(novaLinha);

    // Retorna uma resposta de sucesso para o aplicativo
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Dados recebidos!" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Em caso de erro, retorna uma mensagem de erro
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Função para processar e salvar as fotos no Drive
function processarFotos(fotosArray, prefixo) {
  if (!fotosArray || fotosArray.length === 0) return [];
  
  const pasta = DriveApp.getFolderById(ID_PASTA_FOTOS);
  const urls = [];

  fotosArray.forEach((foto, index) => {
    const dadosImagem = Utilities.base64Decode(foto.split(',')[1]);
    const blob = Utilities.newBlob(dadosImagem, 'image/jpeg', `${prefixo}_${new Date().getTime()}_${index}.jpg`);
    const arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // Torna o arquivo visível por link
    urls.push(arquivo.getUrl());
  });

  return urls;
}

// Função para verificar e criar os cabeçalhos na planilha se não existirem
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