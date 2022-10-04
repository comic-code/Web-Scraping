const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://pokemon.fandom.com/pt-br/wiki/Pok%C3%A9dex_Nacional');

  const pokemons = await page.evaluate(() => {
    const ul = document.querySelector('div#toc').querySelectorAll('ul ul > li span.toctext');
    let generations = [];
    let pokemonsArray = [];
    ul.forEach(li => generations.push(li.innerHTML)); 
    
    generations.forEach((generation, index) => {
      const table = document.querySelector(`h3 span#${generation.replace(' ', '_')}`).parentElement.nextElementSibling;
      const generationRows = table.querySelectorAll('table[cellpadding="6"] > tbody > tr');
      let rows = [...generationRows];
      rows.shift();
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const imgCell = cells[1].querySelector('img');
        const typesNodes = cells[3].querySelectorAll('font');
        let types = [];

        const imgUrl = cells[1].querySelector('img')
          ? imgCell.getAttribute('data-src')
          : false

        const name = cells[2].querySelector('a')
          ? cells[2].querySelector('a').innerText
          : cells[2].querySelector('span').innerText

        typesNodes.forEach(type => types.push(type.innerText));
        
        pokemonsArray.push({
          number: parseInt(cells[0].innerText.replace('Nº ', '')),
          generation: index + 1,
          generationText: generation,
          name,
          imgUrl,
          types,
        })
      });
    });
    return pokemonsArray;
  });

  try {
    writeFileSync('./pokedex.json', JSON.stringify(pokemons, null, 2), 'utf-8');
    console.log('Sucesso!');
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
})();
