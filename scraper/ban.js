const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// URL da página de bans
const url = 'https://miracle74.com/?subtopic=bans';

// Função para converter a data no formato "05 Jan 2025 13:57" para "YYYY-MM-DD"
function formatDate(bannedAt) {
  const months = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };

  // Dividindo a data em partes
  const [day, month, year] = bannedAt.split(' ').slice(0, 3);

  // Retornando a data no formato YYYY-MM-DD
  return `${year}-${months[month]}-${day.padStart(2, '0')}`;
}

// Função para obter a data atual no horário brasileiro (UTC-3)
function getBrazilianDate() {
  const now = new Date();
  // Ajustando para UTC-3 (horário do Brasil)
  now.setHours(now.getHours() - 3); // Subtrai 3 horas para ajustar para o horário brasileiro
  return now.toISOString().split('T')[0]; // Retorna a data no formato YYYY-MM-DD
}

// Função principal de scraping dos bans
async function scrapeBans() {
  try {
    // Obtendo a data atual no formato YYYY-MM-DD ajustada para o horário brasileiro
    const today = getBrazilianDate();

    // Fazendo requisição à página de bans
    const response = await axios.get(url);
    const html = response.data;

    // Carregando o HTML no cheerio
    const $ = cheerio.load(html);

    // Array para armazenar os dados filtrados
    const results = [];

    // Selecionando a tabela que contém os bans
    $('table').each((index, table) => {
      $(table)
        .find('tr')
        .each((i, row) => {
          const reason = $(row).find('td:contains("Breaking Rule 3c")').text().trim() ||
                         $(row).find('td:contains("Breaking Rule 3d")').text().trim() ||
                         $(row).find('td:contains("Breaking Rule 3e")').text().trim();

          // Se a razão for "Breaking Rule 3c", "Breaking Rule 3d" ou "Breaking Rule 3e"
          if (reason === 'Breaking Rule 3c' || reason === 'Breaking Rule 3d' || reason === 'Breaking Rule 3e') {
            const nameCell = $(row).find('td:nth-child(1)'); // Supondo que o campo "name" é a primeira coluna
            const player = nameCell.text().trim();
            const playerLink = "https://miracle74.com" + nameCell.find('a').attr('href') || null; // Captura o link se existir

            const date = $(row).find('td:nth-child(2)').text().trim();
            const duration = $(row).find('td:nth-child(3)').text().trim();
            const bannedAtRaw = $(row).find('td:nth-child(4)').text().trim(); // Supondo que "Banned At" é a 4ª coluna

            // Converte "bannedAtRaw" para "YYYY-MM-DD"
            const bannedAt = formatDate(bannedAtRaw);

            // Verifica se a data do "Banned At" é igual à data de hoje
            if (bannedAt === today) {
              results.push({ player, playerLink, date, duration, bannedAt, reason });
            }
          }
        });
    });

    // Verifica se encontrou algum resultado
    if (results.length === 0) {
      console.log('Nenhum ban encontrado com as razões "Breaking Rule 3c", "Breaking Rule 3d" ou "Breaking Rule 3e" na data de hoje.');
      return;
    }

    // Salvando os dados em um arquivo JSON
    fs.writeFileSync('bans_today.json', JSON.stringify(results, null, 2));
    console.log(`Dados salvos em bans_today.json (${results.length} registros encontrados)`);

    // Chama a função para verificar o campo "house"
    await checkForHouse(results);
  } catch (error) {
    console.error('Erro ao fazer o scraping:', error.message);
  }
}

// Função para verificar o campo "house"
async function checkForHouse(results) {
  try {
    const bansWithHouse = [];

    for (const ban of results) {
      if (!ban.playerLink) {
        console.log(`O jogador ${ban.player} não possui um link. Pulando...`);
        continue;
      }

      console.log(`Verificando o jogador: ${ban.player}...`);

      const response = await axios.get(ban.playerLink);
      const html = response.data;
      const $ = cheerio.load(html);

      // Ajustando o seletor para encontrar o nome da "house" do jogador
      const houseField = $('td:contains("House")').next().text().trim(); // Pega o texto ao lado do "House"

      // Substitui os espaços por underscores
      let houseNameFormatted = houseField.replace(/\s+/g, '_'); // Substitui todos os espaços por underscores

      // Remove qualquer coisa entre parênteses e os parênteses
      houseNameFormatted = houseNameFormatted.replace(/\(.*\)/, '').trim().slice(0, -1); // Remove a parte entre parênteses e os próprios parênteses

      if (houseNameFormatted) {
        console.log(`O jogador ${ban.player} pertence à casa: ${houseNameFormatted}.`);
        bansWithHouse.push({ ...ban, house: "https://tibia.fandom.com/wiki/"+houseNameFormatted });
      } else {
        console.log(`O jogador ${ban.player} não possui uma house definida.`);
      }
    }

    if (bansWithHouse.length > 0) {
      fs.writeFileSync('bans_with_house.json', JSON.stringify(bansWithHouse, null, 2));
      console.log(`Dados salvos em bans_with_house.json (${bansWithHouse.length} registros encontrados).`);
    } else {
      console.log('Nenhum jogador com o campo "house" foi encontrado.');
    }
  } catch (error) {
    console.error('Erro ao verificar o campo "house":', error.message);
  }
}

// Executa a função principal de scraping
scrapeBans();

