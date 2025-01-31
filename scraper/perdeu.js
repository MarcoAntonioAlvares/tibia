const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const notifier = require('node-notifier')
const player = require('play-sound')()
const randomTime = Math.floor(Math.random() * (50000 - 20000 + 1)) + 20000

// Contador em memória para casas pequenas (reset ao reiniciar o script)
const smallHouseAlarmCount = new Map()

async function scrapeHouses() {
  try {
    const towns = Array.from({ length: 8 }, (_, i) => i + 2) // Gera a lista [2, 3, ..., 9]
    let allHouses = []

    for (const town of towns) {
      const url = `https://miracle74.com/?subtopic=houses&town=${town}&owner=0&order=name`
      console.log(`Acessando: ${url}`)

      try {
        const response = await axios.get(url)
        const $ = cheerio.load(response.data)

        // Extrai os dados da tabela
        $('table.TableContent tr').each((index, element) => {
          if (index === 0) return // Ignora o cabeçalho da tabela

          const columns = $(element).find('td')

          // Captura os dados e o link do campo necessário
          const linkElement = $(columns[1]).find('a')
          if (
            $(columns[0]).text().trim() ===
              'No houses with selected parameters.' ||
            $(columns[2]).text().trim() === 'Sort by' ||
            $(columns[2]).text().trim() === 'NameSize'
          ) {
            return
          }

          const houseName = $(columns[0]).text().trim()
          let houseNameFormatted = houseName
            .replace(/\s+/g, '_') // Substitui espaços por underscores
            .replace(/\(.*\)/, '')
            .trim() // Remove texto entre parênteses

          const houseSize = parseInt($(columns[2]).text().trim(), 10) || 0 // Tenta converter o tamanho em número

          const house = {
            town: town, // Adiciona o identificador da cidade
            name: houseName,
            status: $(columns[1]).text().trim(),
            link: linkElement.attr('href')
              ? `https://miracle74.com${linkElement.attr('href')}`
              : null,
            size: houseSize,
            houseLink: houseNameFormatted
              ? `https://tibia.fandom.com/wiki/${houseNameFormatted}`
              : null, // Adiciona o link do fandom formatado, se possível
          }

          allHouses.push(house)
        })
      } catch (error) {
        console.error(`Erro ao acessar ${url}:`, error.message)
      }
    }

    // Salva todos os resultados em um arquivo JSON
    fs.writeFileSync(
      'available_houses.json',
      JSON.stringify(allHouses, null, 2),
      'utf-8'
    )

    // Lógica para alertar com limite para casas pequenas
    const newHouses = allHouses.filter((house) => {
      if (!house.size || house.size >= 25) return true // Casas grandes ou sem tamanho definido notificam normalmente

      // Para casas pequenas (< 25 sqm), gerencia o contador
      const currentCount = smallHouseAlarmCount.get(house.link) || 0
      if (currentCount < 3) {
        smallHouseAlarmCount.set(house.link, currentCount + 1)
        return true // Permite alertar até 3 vezes
      }

      return false // Não alerta mais para esta casa
    })

    // Verifica se há novas casas disponíveis e dispara um alerta sonoro
    if (newHouses.length > 0) {
      notifier.notify({
        title: 'Alerta de casas',
        message: `${newHouses.length} novas casas disponíveis!`,
        sound: true,
      })

      player.play('./alarme.mp3', (err) => {
        if (err) {
          console.error('Erro ao reproduzir o som:', err)
        } else {
          console.log('Som reproduzido com sucesso!')
        }
      })

      console.log(
        'Novas casas notificadas:',
        newHouses.map((house) => house.name)
      )
    } else {
      console.log('Nenhuma nova casa encontrada.')
    }

    console.log('Scraping concluído e salvo no arquivo available_houses.json')
  } catch (error) {
    console.error('Erro geral:', error.message)
  }
}

// Executa a função a cada 1 minuto
scrapeHouses()
setInterval(scrapeHouses, randomTime)
