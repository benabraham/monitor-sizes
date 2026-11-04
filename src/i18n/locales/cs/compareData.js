/**
 * Texty datové části zobrazení Porovnání: mřížka metrik a matice měřítek
 * (jmenný prostor `compareData`, klíče `compareData.*`).
 *
 * Názvy metrik a texty nápovědy jsou ve jmenném prostoru `metrics`. Tento soubor
 * obsahuje jen to, co patří k Porovnání: nadpisy sekcí, štítky sloupců, dva řádky
 * bez záznamu v metrikách (vzdálenost a měřítko) a značky v matici.
 */
export default {
  sections: {
    metrics: 'Metriky',
    scaling: 'Měřítko',
  },
  metricColumn: 'Metrika',
  help: 'Nápověda: {name}',
  caption: {
    metrics: 'Metriky pro každý porovnávaný displej',
    matrix: 'Možnosti měřítka pro {name}',
  },
  badge: {
    baseline: 'Referenční',
    familiar: 'Známý',
    candidate: 'Kandidát',
  },
  rows: {
    distance: {
      label: 'Vzdálenost od displeje',
      help: 'Jak daleko jsou oči od displeje. Kandidát začíná na vzdálenosti referenčního displeje. Posunutí dál zdánlivě zmenší displej, přiblížení ho zvětší.',
    },
    scale: {
      label: 'Měřítko',
      help: 'Měřítko systému použité na tomto displeji v porovnání. Známé displeje používají uložené měřítko. Kandidát začíná na svém nejlepším pohodlném měřítku, které lze změnit.',
    },
  },
  matrix: {
    looksLike: 'vypadá jako {size}',
    comfortable: 'Pohodlné',
    notComfortable: 'Mimo pohodlné rozmezí',
    inUse: 'Používané',
    recommended: 'Doporučené',
  },
  noComfortable: 'Žádné pohodlné měřítko',
  comfortable: {
    label: 'Pohodlná měřítka',
    more: 'Další: {count}',
  },
}
