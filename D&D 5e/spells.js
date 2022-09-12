const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');

(async () => {
  // Ir até a página
  // Esperar carregar conteúdo inicial
  // Selecionar o input "Por Página", adicionar o valor 319 e dar submit
  // Esperar todas as magias carregarem
  // Mapear todas magias e organizar em um JSON

  // const browser = await puppeteer.launch({ headless: false });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://dnd5spells.rpgist.net/pt-BR/spells');

  const input = '[class="form-control ng-pristine ng-untouched ng-not-empty ng-valid-min ng-valid ng-valid-max"]';

  await page.waitForSelector(input);

  const value = await page.evaluate(() => {
    return document.querySelector('[translate="PAGINATION_INDICATOR"]').innerHTML.split(' ').last();
  });

  await page.click(input, { clickCount: 3 });
  await page.type(input, value);
  await page.keyboard.press('Enter');

  await page.waitForSelector('[class="pagination-last ng-scope disabled"]');
  await page.waitForSelector('spell-casters-names > span > a');

  const spells = await page.evaluate(() => {
    const nodeList = document.querySelectorAll('#spells_list spell');
    let arraySpells = [];

    nodeList.forEach((spell, i) => {
      const name = spell.querySelector('div .panel-heading h3.title > span');
      const originalName = spell.querySelector('div .panel-heading h3.title > small span');
      const type = spell.querySelector('div .panel-heading p span span');

      const classes = spell.querySelectorAll('spell-casters-names > span > a');

      const castingTime = spell.querySelector('.panel-body p span[ng-bind="spell.castingTime"]');
      const castingTimeUnity = spell.querySelector('.panel-body p span[ng-bind="spell.castingTimeUnit"]');

      const spellRange = spell.querySelector('.panel-body p span[ng-bind="spell.range"]');
      const spellRangeUnity = spell.querySelector('.panel-body p span[ng-bind="spell.rangeUnit"]');

      const verbalComponent = spell.querySelector('.panel-body p span[ng-if="spell.doesHaveVerbalComponent"]');
      const somaticComponent = spell.querySelector('.panel-body p span[ng-if="spell.doesHaveSomaticComponent"]');
      const materialComponent = spell.querySelector('.panel-body p span[ng-bind="spell.materialComponent"]');
      const materialCost = spell.querySelector('.panel-body p span[ng-bind="spell.materialComponentCost"]');
      const materialIsConsumed = spell.querySelector('.panel-body p span[ng-bind="spell.isMaterialComponentConsumed"]');

      const duration = spell.querySelector('.panel-body p span[ng-bind="spell.duration"]');
      const durationUnit = spell.querySelector('.panel-body p span[ng-bind="spell.durationUnit"]');
      const needConcentration = spell.querySelector('.panel-body p span[ng-if="spell.doesNeedConcentration"]');

      const description = spell.querySelectorAll('.panel-body div.description');

      let body = {
        description: []
      };

      [...description].forEach(part => {
        [...part.childNodes].forEach(element => {
          if (element.localName === 'p') {
            const variable = element.querySelector('b');
            if (variable) {
              if (variable.innerText === 'Em Níveis Superiores' || variable.innerText === 'Em Níveis Superiores.') {
                body.higherLevels = element.innerText;
              } else {
                body.description.push({
                  type: 'option',
                  value: variable.innerText,
                  description: element.innerText
                });
              }
            } else {
              body.description.push({
                type: 'default',
                description: element.innerText
              });
            }
          }
          if (element.localName === 'ul') {
            body.description.push({
              type: 'list',
              items: [...element.childNodes].map(item => item.innerText)
            });
          }

          if (element.localName === 'table') {
            const title = element.querySelector('caption');
            const tableRows = element.querySelectorAll('tr');
            let tableContent = [...tableRows].map(row => {
              let rows = [...row.childNodes].map(td => td.innerText);
              return rows;
            });
            const tableHeader = tableContent.shift();

            body.description.push({
              type: 'table',
              caption: title ? title.innerText : null,
              header: tableHeader,
              content: tableContent
            });
          }
        });
      });

      const fontReference = spell.querySelector('.panel-footer li em');
      const fontPage = spell.querySelector('.panel-footer li span[ng-bind="reference.page"]');

      // O sistema de mapeamento deixa uma spell vazia, caso o número total seja impar, é necessário validar;
      if (name && originalName && type && classes) {
        const spellObject = {
          name: name.innerText,
          originalName: originalName.innerText,
          type: type.innerText,
          classes: [...classes].map(uniqueClass => uniqueClass.innerText),
          casting: {
            time: castingTime ? castingTime.innerText : null,
            unit: castingTimeUnity.innerText
          },
          range: {
            value: spellRange ? spellRange.innerText : null,
            unit: spellRangeUnity.innerText
          },
          components: {
            isVerbal: verbalComponent ? true : false,
            isSomatic: somaticComponent ? true : false,
            isMaterial: materialComponent ? true : false,
            material: {
              description: materialComponent ? materialComponent.innerText : null,
              cost: materialCost ? materialCost : null,
              isConsumed: materialIsConsumed ? true : false
            }
          },
          duration: {
            value: duration ? duration.innerHTML : 0,
            unit: durationUnit ? durationUnit.innerText : null,
            concentration: needConcentration ? true : false
          },
          body,
          font: {
            reference: fontReference.innerText,
            page: fontPage.innerText
          }
        };

        arraySpells.push(spellObject);
      }
    });

    return arraySpells;
  });

  try {
    writeFileSync('./spells.json', JSON.stringify(spells, null, 2), 'utf-8');
    console.log('Sucesso!');
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
})();
