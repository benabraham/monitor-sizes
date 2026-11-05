/**
 * Texty shellu aplikace (jmenný prostor `app`, klíče `app.*`): odkaz na obsah, dialog
 * akcí displeje, správa porovnání (přidání, skrytí, odebrání) a skryté vestavěné displeje
 * v nastavení. Společná slova jsou v `common.*`, názvy metrik v `metrics.*`.
 */
export default {
  skipToContent: 'Přeskočit na obsah',
  actions: {
    markFamiliar: 'Označit jako známý displej',
    unmarkFamiliar: 'Odebrat ze známých displejů',
    setBaseline: 'Nastavit jako referenční displej',
    isBaseline: 'Toto je referenční displej. Všechna porovnání se měří vůči němu.',
    alwaysCompared: 'Referenční displej je v porovnání vždy.',
    addToCompare: 'Přidat do porovnání',
    removeFromCompare: 'Odebrat z porovnání',
    showInCompare: 'Zobrazit v porovnání',
    hideFromCompare: 'Skrýt z porovnání',
    customHint: 'Váš vlastní displej. Můžete ho upravit, nebo smazat.',
    deleteHint: 'Smazání ho odebere i ze známých displejů a z porovnání.',
    hideFromList: 'Skrýt ze seznamu',
    hideFromListHint:
      'Skryje tento vestavěný displej v Procházení a v porovnání. V nastavení ho můžete znovu zobrazit.',
  },
  compare: {
    empty: 'Vyberte displeje k porovnání v Procházení, nebo přidejte jeden tady.',
    goBrowse: 'Přejít na Procházení',
    manageHeading: 'Displeje v tomto porovnání',
    addLabel: 'Přidat displej do porovnání',
    addHint: 'Začněte psát a vyberte displej ze seznamu.',
    addSubmit: 'Přidat',
    addNotFound: 'Vyberte displej ze seznamu.',
    hide: 'Skrýt',
    hideName: 'Skrýt {name} z porovnání',
    show: 'Zobrazit',
    showName: 'Zobrazit {name} v porovnání',
    remove: 'Odebrat',
    removeName: 'Odebrat {name} z porovnání',
    setBaseline: 'Nastavit jako referenční',
    setBaselineName: 'Nastavit {name} jako referenční',
  },
  hidden: {
    title: 'Skryté vestavěné displeje',
    description: 'Vestavěné displeje skryté v Procházení a v porovnání.',
    empty: 'Žádné vestavěné displeje nejsou skryté.',
    show: 'Zobrazit',
    showName: 'Zobrazit {name}',
  },
}
