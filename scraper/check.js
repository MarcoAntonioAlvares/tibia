const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkPremiumAccountStatus() {
    try {
        // Lê o arquivo JSON com os links
        const houses = JSON.parse(fs.readFileSync('houses_all_towns.json', 'utf-8'));

        // Itera sobre cada link e verifica o texto "Premium Account"
        for (const house of houses) {
            if (house.link) {
                console.log(`Verificando: ${house.link}`);
                try {
                    const response = await axios.get(house.link);
                    const $ = cheerio.load(response.data);

                    // Procura pelo texto "Premium Account"
                    const hasPremiumAccount = $('body').text().includes('Premium Account')
                        ? 'Sim'
                        : 'Não';

                    // Adiciona a informação ao objeto
                    house.premiumAccount = hasPremiumAccount;
                } catch (error) {
                    console.error(`Erro ao acessar ${house.link}:`, error.message);
                    house.premiumAccount = 'Erro ao acessar';
                }
            } else {
                house.premiumAccount = 'Sem link';
            }
        }

        // Filtra casas que não têm "Premium Account" ou possuem erros no acesso
        const nonPremiumHouses = houses.filter(
            (house) => house.premiumAccount === 'Não'
        );

        // Salva apenas os resultados filtrados em um novo arquivo
        fs.writeFileSync('houses_without_premium_status.json', JSON.stringify(nonPremiumHouses, null, 2), 'utf-8');
        console.log('Verificação concluída. Resultado salvo em houses_without_premium_status.json');
    } catch (error) {
        console.error('Erro geral:', error);
    }
}

checkPremiumAccountStatus();