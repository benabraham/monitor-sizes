/**
 * Texty vizualizace porovnání a ovládání jednotlivých displejů (jmenný prostor
 * `compareVisual`, klíče `compareVisual.*`). Klíče jsou doslovné, aby šly najít
 * přes grep. Zástupné texty musí odpovídat anglickému souboru (test parity).
 */
export default {
  visualization: {
    title: 'Vizualizace',
    modeLabel: 'Způsob zobrazení',
    modePhysical: 'Fyzicky',
    modeSeen: 'Jak je vidět',
    svgTitlePhysical: 'Fyzická velikost porovnávaných displejů',
    svgTitleSeen: 'Zdánlivá velikost porovnávaných displejů',
    svgDescPhysical:
      'Porovnávané displeje ({count}) jsou nakresleny v jednom měřítku délky a zarovnány na střed spodní hrany. Velikosti jsou vypsány pod obrázkem.',
    svgDescSeen:
      'Porovnávané displeje ({count}) jsou nakresleny podle úhlu, pod kterým je vidíte ze své vzdálenosti, a zarovnány na střed spodní hrany. Úhly jsou vypsány pod obrázkem.',
    captionPhysical: 'Fyzicky: skutečná relativní velikost v jednom měřítku délky.',
    captionSeen:
      'Jak je vidět: každý obrys ukazuje svůj úhel z pozorovací vzdálenosti, takže stejný úhel vypadá stejně. Stejná velikost se hledá podle {sizeBy}.',
    sizesHeading: 'Velikosti',
    sizePhysical: '{width} × {height}',
    sizeSeen: '{horizontal} × {vertical}, ze vzdálenosti {distance}',
    empty: 'Vyberte alespoň jeden displej k porovnání.',
  },
  sizeBy: {
    label: 'Porovnat velikost podle',
    option: {
      height: 'Výška',
      width: 'Šířka',
      diagonal: 'Úhlopříčka',
    },
    of: {
      height: 'výšky',
      width: 'šířky',
      diagonal: 'úhlopříčky',
    },
  },
  list: {
    label: 'Porovnávané displeje',
  },
  badge: {
    baseline: 'Referenční',
    familiar: 'Známý',
    candidate: 'Porovnávaný',
  },
  distance: {
    label: 'Vzdálenost',
    exact: 'Přesná vzdálenost',
  },
  scale: {
    hint: '✓ označuje pohodlná měřítka',
    looksLike: 'vypadá jako {resolution}',
  },
  match: {
    heading: 'Vyrovnat s referenčním displejem',
    sameSize: 'Vyrovnat velikost',
    sameSharpness: 'Vyrovnat ostrost',
    sameTextSize: 'Vyrovnat velikost textu',
    description: 'Nastaví pozorovací vzdálenost na {distance}',
  },
  equivalence:
    'Vypadá jako váš {baseline} na {sameSize} · stejně ostrý na {sameSharpness} · stejně velký text na {sameTextSize} ({scale})',
}
