const { scrapeHouses } = require('./scraper/scraper');

// Chama a função de scraping
scrapeHouses()
  .then(() => console.log("Scraping concluído com sucesso!"))
  .catch(err => console.error("Erro durante o scraping:", err));