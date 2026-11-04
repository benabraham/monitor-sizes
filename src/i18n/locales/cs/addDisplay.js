/**
 * Formulář „Přidat displej“ a „Upravit displej“ (jmenný prostor `addDisplay`, klíče
 * `addDisplay.*`). Názvy polí, živý náhled, předvolby rozlišení, pomocník „Jako můj
 * displej“ a volba známého displeje.
 */
export default {
  title: 'Přidat displej',
  editTitle: 'Upravit displej',
  name: 'Název',
  diagonal: 'Úhlopříčka',
  width: 'Šířka',
  height: 'Výška',
  presets: 'Časté rozlišení',
  likeScreen: 'Jako můj displej',
  likeScreenHint:
    'Doplní rozlišení a měřítko tohoto displeje. Zbývá zadat jen úhlopříčku.',
  likeScreenNote: 'Nyní zadejte úhlopříčku.',
  tag: 'Typ',
  tagLaptop: 'Notebook',
  tagMonitor: 'Monitor',
  tagUltrawide: 'Ultrawide',
  tagSuggested: 'Navrženo podle velikosti a tvaru. Výběrem typu ho změníte.',
  preview: {
    title: 'Náhled',
    size: 'Velikost',
    empty: 'Zadejte úhlopříčku a rozlišení a uvidíte náhled.',
  },
  isFamiliar: 'Tento displej znám',
  isFamiliarHint:
    'Přidá ho k displejům, které znáte, se vzdáleností a měřítkem, která používáte.',
  hint: {
    incomplete: 'Pro pokračování vyplňte povinná pole.',
  },
  error: {
    nameRequired: 'Zadejte název.',
    diagonalRequired: 'Zadejte úhlopříčku.',
    diagonalRange: 'Zadejte úhlopříčku od {min} do {max}.',
    pixelsRequired: 'Zadejte počet pixelů.',
    pixelsRange: 'Zadejte celé číslo od {min} do {max}.',
    distanceRequired: 'Zadejte vzdálenost.',
    distanceRange: 'Zadejte vzdálenost od {min} do {max}.',
  },
}
