/**
 * Export a import vlastních displejů a sady známých displejů do JSON (jmenný prostor
 * `dataTransfer`, klíče `dataTransfer.*`, PRD F18).
 */
export default {
  title: 'Data',
  description:
    'Vlastní displeje a sadu známých displejů můžete exportovat do souboru JSON, nebo ze souboru importovat. Vestavěné displeje se nezahrnují.',
  export: 'Exportovat JSON',
  import: 'Importovat JSON',
  importSuccess: 'Displeje byly importovány.',
  error: {
    invalidJson: 'Soubor není platný JSON.',
    invalidFormat: 'Soubor neobsahuje displeje v očekávaném formátu.',
    unknown: 'Soubor se nepodařilo importovat.',
  },
}
