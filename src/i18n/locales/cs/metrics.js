/**
 * Záhlaví sloupců metrik a nápověda v rozhraní (jmenný prostor `metrics`, klíče
 * `metrics.<metrika>.label` a `metrics.<metrika>.help`).
 *
 * - `label` je krátké záhlaví sloupce. Neobsahuje jednotku: tu doplní volající
 *   podle aktivní soustavy jednotek, například `cm` nebo `in`.
 * - `help` je jedna až tři věty pro nápovědu (F20). Nahrazuje starý list „halp“.
 */
export default {
  diagonal: {
    label: 'Úhlopříčka',
    help: 'Velikost displeje měřená z rohu do rohu v palcích, tak jak ji uvádějí výrobci. Spolu s rozlišením určuje PPI.',
  },
  ppi: {
    label: 'PPI',
    help: 'Pixely na palec: kolik pixelů se vejde na jeden palec displeje. Vyšší PPI znamená menší pixely, ostřejší obraz a méně viditelnou mřížku pixelů.',
  },
  relativePixelSize: {
    label: 'Relativní velikost pixelu',
    help: 'Jak velké jsou pixely ve srovnání s referenčním displejem, podle poměru PPI. Záporná hodnota znamená menší pixely, tedy hladší a méně viditelný obraz. Kladná hodnota znamená větší pixely, které jsou lépe vidět.',
  },
  aspect: {
    label: 'Poměr stran',
    help: 'Tvar displeje jako poměr šířky k výšce, uvedený běžným názvem, například 16:9 nebo 21:9. Název v uvozovkách je přibližný. Pokud se žádný název nehodí, zobrazí se přímý poměr stran.',
  },
  resolution: {
    label: 'Rozlišení',
    help: 'Počet nativních pixelů, šířka × výška. Jsou to pixely, které panel fyzicky má, před jakýmkoli přepočtem měřítka systémem.',
  },
  width: {
    label: 'Šířka',
    help: 'Fyzická šířka displeje, vypočtená z počtu vodorovných pixelů a PPI. Zobrazuje se v centimetrech, nebo v palcích při imperiálních jednotkách.',
  },
  height: {
    label: 'Výška',
    help: 'Fyzická výška displeje, vypočtená z počtu svislých pixelů a PPI. Zobrazuje se v centimetrech, nebo v palcích při imperiálních jednotkách.',
  },
  widthDiff: {
    label: 'Rozdíl šířky',
    help: 'O kolik je displej širší (kladná hodnota) nebo užší (záporná hodnota) než referenční displej, jako absolutní délka. Nula znamená stejnou šířku.',
  },
  heightDiff: {
    label: 'Rozdíl výšky',
    help: 'O kolik je displej vyšší (kladná hodnota) nebo nižší (záporná hodnota) než referenční displej, jako absolutní délka. Nula znamená stejnou výšku.',
  },
  area: {
    label: 'Plocha',
    help: 'Fyzická plocha viditelné části displeje, šířka krát výška. Ukazuje, kolik plochy displej skutečně nabízí.',
  },
  areaRatio: {
    label: 'Plocha oproti referenčnímu',
    help: 'O kolik procent je plocha displeje větší (kladná hodnota) nebo menší (záporná hodnota) než u referenčního displeje.',
  },
  megapixels: {
    label: 'Megapixely',
    help: 'Celkový počet nativních pixelů v milionech, šířka krát výška. Nezohledňuje měřítko systému, porovnává tedy samotné panely.',
  },
  megapixelRatio: {
    label: 'Megapixely oproti referenčnímu',
    help: 'O kolik procent má panel víc (kladná hodnota) nebo méně (záporná hodnota) nativních pixelů než referenční displej.',
  },
  logicalResolution: {
    label: 'Logické rozlišení',
    help: 'Pracovní prostor, který systém zobrazuje při zvoleném měřítku: nativní rozlišení dělené měřítkem. 4K panel při 200 % dá pracovní prostor 1920 × 1080.',
  },
  effectivePpi: {
    label: 'Efektivní PPI',
    help: 'Jak husté se jeví text a rozhraní při zvoleném měřítku: PPI dělené měřítkem. Pohodlný rozsah bývá kolem 90 až 105.',
  },
  workspace: {
    label: 'Pracovní prostor',
    help: 'Kolik pixelů pracovního prostoru se při zvoleném měřítku vejde na displej, v milionech. S každým krokem měřítka se jich vejde méně, protože se zmenšuje šířka i výška.',
  },
  comfortable: {
    label: 'Pohodlné',
    help: 'Zda se toto měřítko vejde do pohodlného okna: efektivní PPI (nebo logické PPD v režimu PPD) v nastaveném rozsahu a logická šířka alespoň na nastavené minimum. Pohodlná měřítka jsou zvýrazněna.',
  },
  horizontalFov: {
    label: 'Vodorovné zorné pole',
    help: 'Úhel ve stupních, pod kterým se šířka displeje jeví v zorném poli při dané pozorovací vzdálenosti. Větší úhel znamená, že displej vyplní více zorného pole.',
  },
  verticalFov: {
    label: 'Svislé zorné pole',
    help: 'Úhel ve stupních, pod kterým se výška displeje jeví v zorném poli při dané pozorovací vzdálenosti. Větší úhel znamená, že displej vyplní více zorného pole ve svislém směru.',
  },
  ppd: {
    label: 'PPD',
    help: 'Pixely na stupeň: kolik pixelů se vejde do jednoho stupně zorného pole. Hodnota kolem 60 se často uvádí jako hranice běžného vidění 20/20, za kterou už jednotlivé pixely nejsou vidět.',
  },
  logicalPpd: {
    label: 'Logické PPD',
    help: 'Pixely na stupeň při zvoleném měřítku: PPD dělené měřítkem. Tuto míru používá pohodlné okno, když je nastaveno na PPD.',
  },
  sameSize: {
    label: 'Stejná velikost ve vzdálenosti',
    help: 'Pozorovací vzdálenost, ze které se tento displej jeví stejně velký jako referenční displej. Porovnává se podle výšky, pokud není zvolena šířka nebo úhlopříčka. Na této vzdálenosti je zdánlivá velikost stejná.',
  },
  sameSharpness: {
    label: 'Stejná ostrost ve vzdálenosti',
    help: 'Vzdálenost, na které má tento displej stejný počet pixelů na stupeň jako referenční displej ve své vzdálenosti. Na této vzdálenosti je stejně ostrý. Hustší displej lze sledovat z větší dálky.',
  },
  sameTextSize: {
    label: 'Stejná velikost textu ve vzdálenosti',
    help: 'Vzdálenost, na které má text na tomto displeji při zvoleném měřítku stejnou velikost jako text na referenčním displeji ve své vzdálenosti a měřítku. Hodí se pro zachování stejné velikosti čtení.',
  },
}
