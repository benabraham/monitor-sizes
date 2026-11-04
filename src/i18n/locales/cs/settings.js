/**
 * Texty panelu nastavení (jmenný prostor `settings`, klíče `settings.*`): jednotky, jazyk,
 * předvolby měřítka, vlastní měřítka a pohodlné okno. Každá skupina má nápovědu.
 */
export default {
  help: {
    label: 'Nápověda: {topic}',
  },
  units: {
    title: 'Jednotky',
    help: 'Metrické jednotky ukazují centimetry a dm², imperiální palce a in². Hodnoty se ukládají v palcích, takže přepnutí nic neztratí.',
  },
  language: {
    title: 'Jazyk',
    help: 'Jazyk rozhraní. Podle něj se formátují i čísla, takže čeština používá desetinnou čárku.',
  },
  presets: {
    title: 'Předvolba měřítka',
    help: 'Operační systém zvětšuje text a aplikace v pevných krocích. Předvolba určuje, která měřítka matice nabídne. Na začátku se vybere podle systému, který používáte.',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux (Wayland)',
    windowsHint: '{min}–{max} po {step}.',
    macosHint:
      'Šířky „vypadá jako“ od {min} do {max}\u00a0px. Měřítko je nativní šířka ÷ šířka „vypadá jako“, od 1× do 2×.',
    linuxHint: 'Kroky: {scales}.',
  },
  customScales: {
    title: 'Vlastní měřítka',
    help: 'Přidejte měřítko, které váš systém nabízí, ale předvolba ne, například 133\u00a0% nebo 300\u00a0%. Zadat můžete 133, 133\u00a0%, 1.33 nebo 1,33. Povolený rozsah je 50–400\u00a0%.',
    empty: 'Zatím žádná vlastní měřítka.',
    inputLabel: 'Měřítko k přidání',
    placeholder: 'například 133\u00a0%',
    invalid: 'Zadejte měřítko od {min} do {max}, například 133\u00a0% nebo 1,33.',
    duplicate: 'Toto měřítko už v seznamu je.',
    remove: 'Odebrat {scale}',
  },
  comfort: {
    title: 'Pohodlné okno',
    help: 'Měřítko je pohodlné, když jeho efektivní PPI leží uvnitř okna a logická šířka je alespoň minimum. Pixely na stupeň navíc počítají se vzdáleností od displeje: Procházení používá vzdálenost referenčního displeje, Porovnání vlastní vzdálenost každého displeje.',
    rule: 'Pravidlo',
    mode: {
      ppi: 'PPI',
      ppd: 'Pixelů na stupeň',
    },
    minPpi: 'Minimální PPI',
    maxPpi: 'Maximální PPI',
    minPpd: 'Minimální px/°',
    maxPpd: 'Maximální px/°',
    ppdHint:
      'Procházení používá vzdálenost referenčního displeje, Porovnání vlastní vzdálenost každého displeje.',
    minWidth: 'Minimální logická šířka',
    rangeError: 'Minimum nesmí být vyšší než maximum.',
  },
}
