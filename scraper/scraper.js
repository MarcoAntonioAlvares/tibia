const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeHouses() {
    try {
        const towns = Array.from({ length: 8 }, (_, i) => i + 2); // Gera a lista [2, 3, ..., 9]
        const allHouses = [];

        for (const town of towns) {
            const url = `https://miracle74.com/?subtopic=houses&town=${town}&owner=2&order=name`;
            console.log(`Acessando: ${url}`);

            try {
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);

                // Extrai os dados da tabela
                $('table.TableContent tr').each((index, element) => {
                    if (index === 0) return; // Ignora o cabeçalho da tabela
                    const columns = $(element).find('td');

                    // Captura os dados e o link do campo necessário
                    const linkElement = $(columns[1]).find('a');
                    const house = {
                        town: town, // Adiciona o identificador da cidade
                        name: $(columns[0]).text().trim(),
                        size: $(columns[1]).text().trim(),
                        link: linkElement.attr('href') ? `https://miracle74.com${linkElement.attr('href')}` : null,
                        beds: $(columns[2]).text().trim(),
                        price: $(columns[3]).text().trim(),
                        status: $(columns[4]).text().trim(),
                    };
                    allHouses.push(house);
                });
            } catch (error) {
                console.error(`Erro ao acessar ${url}:`, error.message);
            }
        }

        // Salva todos os resultados em um arquivo JSON
        fs.writeFileSync('houses_all_towns.json', JSON.stringify(allHouses, null, 2), 'utf-8');
        console.log('Scraping concluído e salvo no arquivo houses_all_towns.json');
    } catch (error) {
        console.error('Erro geral:', error);
    }
}

scrapeHouses();