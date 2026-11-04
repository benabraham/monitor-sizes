/**
 * Úvodní nastavení při prvním spuštění (jmenný prostor `onboarding`, klíče
 * `onboarding.*`): výběr známých displejů, potom vzdálenost a měřítko, při kterém je
 * používáte.
 */
export default {
  stepOf: 'Krok {step} z {total}',
  step1Title: 'Které displeje znáte?',
  step2Title: 'Jak je používáte?',
  intro:
    'Vyberte displeje, které jste viděli nebo vlastníte. Každé srovnání se měří vůči nim, takže čím víc znáte, tím snáz posoudíte nový. Vyberte alespoň jeden. Nic není předvybráno.',
  units: 'Jednotky',
  search: 'Hledat displeje',
  searchEmpty: 'Žádný displej neodpovídá „{query}“.',
  selectedCount: 'Vybráno: {count}',
  groups: {
    laptops: 'Notebooky',
    monitors: 'Monitory',
    ultrawides: 'Ultrawide monitory',
  },
  displayLabel: '{name}, {diagonal}, {resolution}',
  addOwn: 'Přidat vlastní',
  addOwnTitle: 'Přidat vlastní displej',
  addOwnSubmit: 'Přidat a vybrat',
  baselineHint: 'Výchozí je první vybraný displej. Později ho můžete změnit.',
  noDisplays: 'Zatím tu nejsou žádné displeje. Přidejte vlastní a začněte.',
  pickAtLeastOne: 'Vyberte alespoň jeden displej',
  continue: 'Pokračovat',
  back: 'Zpět',
  finish: 'Dokončit',
}
