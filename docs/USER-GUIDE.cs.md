# Pixely a monitory: uživatelská příručka

Pixely a monitory vám pomůže vybrat displej tak, že ho porovná s obrazovkami, které už znáte.
Tato příručka srozumitelně vysvětluje, co aplikace zobrazuje a na jakých myšlenkách to stojí.
Vzorce najdete v [CALCULATIONS.md](CALCULATIONS.md) (anglicky). Anglická verze je v
[USER-GUIDE.md](USER-GUIDE.md).

Aplikaci otevřete na adrese <https://benabraham.github.io/monitor-sizes/>.

## Obsah

- [Na co aplikace odpoví](#na-co-aplikace-odpoví)
- [První spuštění](#první-spuštění)
- [Pojmy srozumitelně](#pojmy-srozumitelně)
- [Procházet](#procházet)
- [Porovnat](#porovnat)
- [Přidání, úpravy a skrývání displejů](#přidání-úpravy-a-skrývání-displejů)
- [Sdílení odkazů](#sdílení-odkazů)
- [Instalace a práce offline](#instalace-a-práce-offline)
- [Import a export JSON](#import-a-export-json)
- [Soukromí](#soukromí)
- [Časté otázky](#časté-otázky)

## Na co aplikace odpoví

Představte si, že vlastníte monitor 24″ Full HD a uvažujete o monitoru 32″ 4K. Aplikace vám
pomůže odpovědět třeba na tyto otázky:

- Jak ostrý je nový displej ve srovnání s mým?
- Jak velký se jeví a jak daleko se mám posadit, aby vypadal stejně velký jako můj?
- Jaké měřítko na něm nastavit, aby text působil stejně velký jako na mém stávajícím displeji?
- Který kandidát má měřítko, které vypadá dobře, a který ne?

Aplikace pracuje jen s čísly, která zadáte: úhlopříčka, rozlišení, pozorovací vzdálenost a
měřítko. Váš displej neměří a o ceně, typu panelu, obnovovací frekvenci ani barvách neví nic.
Všechny displeje bere jako ploché.

## První spuštění

Při prvním spuštění se aplikace zeptá, které displeje znáte.

1. **Vyberte displeje, které znáte.** Displeje jsou rozděleny do skupin Notebooky, Monitory a
   Ultrawide monitory. Hledání vám pomůže displej najít. Pokud váš displej chybí, vyberte
   **Přidat vlastní**, zadejte ho a hned se vybere. Musíte vybrat alespoň jeden displej. Nic není
   předvybráno.
2. **Nastavte, jak je používáte.** U každého displeje zadejte vzdálenost, ze které se na něj
   obvykle díváte, a měřítko, které v operačním systému používáte. Prvním vybraným displejem se
   stane **referenční displej**. Později ho můžete změnit.
3. **Zvolte jednotky.** Výchozí jsou metrické jednotky (centimetry a dm²). Imperiální používají
   palce a in². Úhlopříčky a PPI zůstávají v palcích v obou soustavách.

Jazyk aplikace odpovídá jazyku prohlížeče: pokud je prohlížeč v češtině, je aplikace česky, jinak
anglicky. Jazyk můžete kdykoli přepnout v Nastavení.

Výchozí pozorovací vzdálenost je 60 cm pro monitory a ultrawide monitory a 45 cm pro notebooky.
Výchozí měřítko je nejlepší pohodlné měřítko pro daný displej (vysvětleno níže). Obojí můžete
změnit.

## Pojmy srozumitelně

### Známé displeje a referenční displej

Displeje, které znáte, jsou vaše **známé displeje**. Označíte je hvězdičkou. V horní části
Procházet tvoří pruh. Právě jeden z nich je **referenční displej**, zvýrazněný akcentní barvou.
Všechny relativní údaje (sloupce v procentech a v rozdílech) se počítají vůči referenčnímu
displeji. Ostatní známé displeje zůstávají vidět jako doplňkové reference.

Jiný známý displej se stane referenčním jedním klepnutím na jeho štítek. Můžete tak snadno
porovnat „s mým notebookem“ i „s mým monitorem“, aniž byste cokoli znovu nastavovali.

### PPI: jak husté jsou pixely

PPI znamená pixely na palec. Je to počet pixelů na úhlopříčce dělený úhlopříčkou v palcích:

- 27″ 4K (3840 × 2160): úhlopříčka má √(3840² + 2160²) ≈ 4 406 pixelů a 4 406 ÷ 27 ≈
  **163 PPI**.
- 24″ Full HD (1920 × 1080): přibližně **92 PPI**.

Vyšší PPI znamená menší pixely, ostřejší obraz a méně viditelnou mřížku pixelů.

### Relativní velikost pixelu

Relativní velikost pixelu porovnává pixely displeje s pixely referenčního displeje:

> PPI referenčního displeje ÷ PPI displeje − 1

U 27″ 4K s referenčním 24″ Full HD vychází 92 ÷ 163 − 1 ≈ **−44 %**. Čteme to tak, že pixely
27″ 4K jsou o 44 % menší než pixely referenčního displeje.

- **Záporná** hodnota znamená menší pixely: hladší obraz s méně viditelnou mřížkou.
- **Kladná** hodnota znamená větší pixely, které jsou lépe vidět.
- **stejné** znamená, že hodnota se zaokrouhlí na nulu, takže pixely mají stejnou velikost.

### Fyzická velikost a plocha

Šířka displeje je počet vodorovných pixelů dělený PPI a výsledek se převede na centimetry
(jeden palec je 2,54 cm). Výška se počítá stejně.

- 27″ 4K: zhruba **60 cm** na šířku a **34 cm** na výšku.
- Plocha je šířka × výška: zhruba 2 010 cm², což se zobrazí jako **20 dm²**.

Oproti 24″ Full HD je 27″ 4K o 7 cm širší, o 4 cm vyšší a má o 27 % větší plochu.

Surové megapixely počítají nativní pixely a měřítko systému ignorují. 27″ 4K má 8,3 Mpix,
24″ Full HD má 2,1 Mpix, takže 27″ 4K má o 300 % více pixelů.

### Měřítko systému, logické rozlišení a efektivní PPI

Operační systém vykresluje text a ovládací prvky větší, než by odpovídalo nativním pixelům.
**Měřítko**, například 150 %, říká, kolik fyzických pixelů zabere jeden logický pixel.

- **Logické rozlišení** je nativní rozlišení dělené měřítkem. Je to velikost pracovní plochy,
  kterou skutečně máte.
- **Efektivní PPI** je PPI dělené měřítkem. Ukazuje, jak husté působí text a ovládací prvky.

27″ 4K při jednotlivých měřítkách ve Windows:

| Měřítko | Logické rozlišení | Efektivní PPI | Pohodlné okno |
| ------- | ----------------- | ------------- | ------------- |
| 100 %   | 3840 × 2160       | 163           | Ne, nad oknem |
| 125 %   | 3070 × 1730       | 131           | Ne, nad oknem |
| 150 %   | 2560 × 1440       | 109           | Ne, nad oknem |
| 175 %   | 2190 × 1230       | 93            | **Ano**       |
| 200 %   | 1920 × 1080       | 82            | Ne, pod oknem |

Aplikace zobrazuje logické rozlišení zaokrouhlené na desítky pixelů.

**Pohodlné okno.** Výchozí nastavení označí měřítko jako pohodlné, pokud platí obě tyto
podmínky:

- efektivní PPI je mezi 90 a 105, a
- logická šířka je alespoň 1024 px.

Při těchto výchozích hodnotách je pro 27″ 4K pohodlné jen 175 %. Procházet vypisuje jen
pohodlná měřítka. Porovnat ukazuje všechna měřítka z předvolby a pohodlná zvýrazňuje, takže
vidíte i alternativy. Okno můžete změnit v Nastavení v části **Pohodlné okno**.

**Pracovní plocha.** Pracovní plocha je logická plocha, která se vejde na obrazovku. Při 150 %
dává 27″ 4K rozlišení 2560 × 1440, což je 3,7 Mpix. Při každém kroku nahoru v měřítku se zobrazí
méně pixelů, protože se zmenší šířka i výška.

### Zorný úhel: zorné pole a pixely na stupeň

Fyzická velikost dává smysl až ve chvíli, kdy víte, jak daleko displej je. Aplikace proto ukazuje
i to, kolik z vašeho zorného pole displej zabírá.

- **Zorné pole** je úhel, pod kterým displej vidíte, vodorovně a svisle. Ze vzdálenosti 60 cm
  zabírá 24″ Full HD 47,8° na šířku a 28,0° na výšku. 27″ 4K zabírá 53,0° na šířku a 31,3° na
  výšku.
- **Pixely na stupeň (PPD)** je počet pixelů, které se vejdou do jednoho stupně vašeho pohledu.
  Je to PPI × vzdálenost v palcích × π ÷ 180. Ze vzdálenosti 60 cm dává 24″ Full HD 38 PPD a 27″ 4K
  67 PPD.
- **Logické PPD** je PPD dělené měřítkem. Při 150 % dává 27″ 4K 45 logických PPD.

Hodnota přibližně 60 PPD se často uvádí jako hranice normálního vidění 20/20. Za ní už jednotlivé
pixely těžko rozeznáte.

**Pravidlo PPD pro pohodlné okno.** V části **Pohodlné okno** můžete pravidlo přepnout z **PPI**
na **Pixely na stupeň**. Okno se pak měří v logických pixelech na stupeň. Výchozí rozmezí je 37 až
43, což je zhruba 90 až 105 PPI na vzdálenost 60 cm.

Na rozdíl od PPI závisí PPD na vzdálenosti. Vezměme 24″ Full HD, který sledujete ze vzdálenosti
90 cm:

- Pravidlo **PPI** označí 100 % za pohodlné, protože displej má 92 PPI.
- Pravidlo **Pixely na stupeň** dá při 90 cm u 100 % hodnotu 57 PPD, což je nad oknem. Při 150 %
  je to 38 PPD, což je uvnitř okna, takže toto pravidlo navrhne 150 %.

V Procházet pravidlo používá vzdálenost referenčního displeje. V Porovnat používá každý displej
vzdálenost, kterou pro něj nastavíte.

### Předvolby a vlastní měřítka

Každý operační systém nabízí vlastní kroky. Předvolbu vyberete v Nastavení v části **Předvolba
měřítka**. Aplikace začíná s předvolbou systému, který používáte.

- **Windows:** 100 %, 125 %, 150 %, 175 % a 200 %.
- **Linux (Wayland):** 100 %, 110 %, 125 %, 150 %, 175 % a 200 %. Krok 110 % je jen v této
  předvolbě.
- **macOS:** šířky „vypadá jako“: 1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560, 3008
  a 3200 px. Na macOS je měřítko displeje jeho nativní šířka dělená šířkou „vypadá jako“, a vypisují
  se jen měřítka od 1× do 2×.

U notebooku MacBook Pro 14″ se šířkou 3024 px dávají šířky „vypadá jako“ tato měřítka: 1512 px dává
200 %, 1728 px dává 175 %, 1920 px dává 158 % a 3008 px dává 101 %. Nastavení 3200 px by dalo 94,5 %,
což je pod 1×, takže se nevypíše.

Stejná šířka „vypadá jako“ dává na různých displejích různá měřítka. 27″ 4K (šířka 3840 px) na
„vypadá jako 2560“ běží na 150 %. 27″ 5K (šířka 5120 px) na stejné nastavení běží na 200 %.

**Vlastní měřítka.** Pokud váš systém nabízí měřítko, které předvolba nemá, přidejte ho v Nastavení
v části **Vlastní měřítka**, například 133 % nebo 300 %. Můžete zadat 133, 133 %, 1,33 nebo 1.33.
Rozsah je 50 % až 400 %.

### Ekvivalentní vzdálenosti

Větší displej může vypadat jako menší, pokud se díváte z větší dálky. Ekvivalentní vzdálenosti
říkají, jak daleko se máte posadit, aby kandidát odpovídal referenčnímu displeji jedním ze tří
způsobů:

- **Stejná velikost:** kandidát se jeví stejně vysoký jako referenční displej. Můžete porovnávat
  podle šířky nebo úhlopříčky. Vzdálenost je referenční vzdálenost × výška kandidáta ÷ výška
  referenčního displeje.
- **Stejná ostrost:** oba displeje ukazují stejný počet pixelů na stupeň. Vzdálenost je referenční
  vzdálenost × PPI referenčního displeje ÷ PPI kandidáta.
- **Stejná velikost textu:** text při zvoleném měřítku vypadá stejně velký jako u referenčního
  displeje. Vzdálenost je referenční vzdálenost × (PPI referenčního ÷ měřítko referenčního) ÷ (PPI
  kandidáta ÷ měřítko kandidáta).

**Příklad krok za krokem.** Referenční displej je 24″ Full HD (92 PPI) ze vzdálenosti 60 cm při
100 %. Kandidát je 32″ 4K (138 PPI) při 150 %.

1. **Výška.** Referenční displej je vysoký zhruba 30 cm. Kandidát je vysoký zhruba 40 cm. Kandidát
   je o třetinu vyšší (40 ÷ 30 ≈ 1,33).
2. **Stejná velikost: 80 cm.** Referenční vzdálenost vynásobte 1,33: 60 cm × 1,33 = 80 cm. Posadíte-li
   se o 20 cm dál, bude se kandidát jevit stejně vysoký jako váš referenční displej.
3. **Stejná ostrost: 40 cm.** Kandidát má 1,5násobné PPI. Ze vzdálenosti 40 cm vidíte jeho pixely pod
   stejným úhlem jako referenční pixely ze vzdálenosti 60 cm: 60 cm × 92 ÷ 138 = 40 cm. Ze stejné
   vzdálenosti je kandidát 1,5krát ostřejší.
4. **Stejná velikost textu: 60 cm.** Při 150 % má kandidát 138 ÷ 1,5 = 92 efektivních PPI. Referenční
   displej při 100 % má také 92. Texty se shodují na vzdálenosti, na kterou jste zvyklí, tedy na 60 cm.

Výsledek se v Porovnat zobrazí jako jedna věta pod každým kandidátem:

> Vypadá jako váš 24″ Full HD na 80 cm · stejně ostrý na 40 cm · stejně velký text na 60 cm (150 %)

V Porovnat klepněte na **Vyrovnat velikost**, **Vyrovnat ostrost** nebo **Vyrovnat velikost textu**.
Vzdálenost kandidáta se tak nastaví na odpovídající hodnotu.

## Procházet

Procházet zobrazuje všechny displeje v aplikaci. Známé displeje jsou připnuté v pruhu nahoře.

- **Na počítači** je Procházet tabulka, kterou lze řadit. Ukazuje název, úhlopříčku, PPI, relativní
  velikost pixelu, poměr stran, rozlišení, fyzickou šířku a výšku, rozdíl velikosti oproti referenčnímu
  displeji, plochu a její poměr k referenční, surové megapixely a jejich poměr a nejlepší pohodlné
  měřítko.
- **V telefonu** je každý displej karta. Ukazuje název, úhlopříčku, rozlišení, PPI a nejlepší pohodlné
  měřítko jako štítek, například „175 % → 2190 × 1230“.
- **Řazení.** Klepněte na nadpis libovolného sloupce. Výchozí je PPI sestupně. Displej bez hodnoty pro
  řadicí sloupec, například relativní velikost bez referenčního displeje, se řadí na konec.
- **Hledání** prohledává název, rozlišení (3840×2160 nebo 3840x2160) a úhlopříčku. Musí odpovídat každé
  zadané slovo.
- **Filtry** zužují seznam podle typu (Notebook, Monitor nebo Ultrawide), poměru stran a rozsahu
  úhlopříčky. Displej bez typu se počítá jako monitor.
- **Jen displeje s pohodlným měřítkem** skryje všechny displeje, které nemají žádné měřítko uvnitř
  pohodlného okna. Pokud displej pohodlné měřítko nemá, Procházet to řekne.
- **Hvězdičkou** označíte displej jako známý. Zaškrtnutím **Porovnat** ho přidáte do porovnání.

V záhlaví je vždy vidět aktivní pohodlné okno, například „Pohodlné: 90–105 PPI · ≥ 1024 px“.

## Porovnat

Porovnat ukazuje referenční displej, ostatní známé displeje (pokud je v Porovnat neskryjete) a všechny
displeje, které jste zaškrtli. Tlačítko nahoře ukazuje, kolik displejů se porovnává.

**Vizualizace je vždy na obrazovce.** Na široké obrazovce je v panelu vedle údajů. V telefonu je připnutá
nahoře a údaje se posouvají pod ní. Nelze ji sbalit.

- **Fyzicky** kreslí všechny obrysy v jednom měřítku délky, zarovnané na střed spodní hrany, jako
  monitory na stole. Hodí se k posouzení skutečných rozdílů velikosti.
- **Jak je vidět** kreslí každý obrys pod úhlem, pod kterým ho vidíte z jeho vzdálenosti. Větší displej,
  který je dál, může vypadat úplně stejně jako menší. Hodí se k posouzení toho, co skutečně vidíte.
- Známé displeje jsou kresleny čárkovaně, kandidáti plnou čarou a každý obrys má popisek. Pod obrázkem
  jsou vypsané velikosti.
- **Porovnat velikost podle** určuje, zda se pro shodnou velikost bere výška (výchozí), šířka, nebo
  úhlopříčka.

**Vzdálenost a měřítko.** U každého displeje je posuvník **Vzdálenost** a číselné pole, v centimetrech
nebo v palcích. Známý displej používá vzdálenost, kterou jste pro něj uložili. Kandidát začíná na
referenční vzdálenosti. Každý displej má také měřítko. Známý displej používá uložené měřítko. Kandidát
začíná na svém nejlepším pohodlném měřítku, které je v seznamu označeno ✓, a můžete ho změnit.

**Tlačítka vyrovnání.** Každý kandidát má tři tlačítka: **Vyrovnat velikost**, **Vyrovnat ostrost** a
**Vyrovnat velikost textu**. Každé nastaví vzdálenost kandidáta na odpovídající ekvivalentní vzdálenost.
Popis pod tlačítky ukazuje, na kterou vzdálenost se nastaví. Větu s ekvivalentními vzdálenostmi
vysvětluje část [Ekvivalentní vzdálenosti](#ekvivalentní-vzdálenosti).

**Tabulka údajů.** Referenční displej je v prvním sloupci. Řádky jsou seskupeny do **Metriky** a
**Měřítko**. Obsahují vzdálenost pozorování, měřítko, zorné pole, PPD a logické PPD. U každého řádku je
tlačítko „?“ s vysvětlením.

**Matice měřítek.** U každého displeje má matice jeden řádek pro každé měřítko z aktivní předvolby. Řádek
ukazuje logické rozlišení, efektivní PPI a pracovní plochu. Pohodlná měřítka jsou zvýrazněna a navíc nesou
slovo **Pohodlné**, takže barva není jediným signálem. Měřítka mimo okno nejsou zvýrazněna a jsou označena
**Mimo pohodlné rozmezí**. Používané měřítko je označeno **Používané** a doporučené **Doporučené**.

Známý displej můžete v Porovnat skrýt jeho přepínačem. Zůstane známý a v Procházet se dál zobrazuje.

## Přidání, úpravy a skrývání displejů

Tlačítko **Přidat displej** je vždy po ruce, v Procházet i v Porovnat. Formulář má čtyři pole:

- **Název**
- **Úhlopříčka** v palcích
- **Šířka** a **Výška** v pixelech, nativní rozlišení. Tlačítko **Časté rozlišení** vyplní hodnoty jedním
  klepnutím.

Náhled při psaní ukazuje PPI, poměr stran a fyzickou velikost. **Typ** (Notebook, Monitor nebo Ultrawide)
se navrhne podle velikosti a tvaru a můžete ho změnit.

Zaškrtnutím **Tento displej znám** přidáte displej k vašim známým displejům, se vzdáleností a měřítkem,
která používáte.

**Jako můj displej** doplní rozlišení a měřítko displeje, který právě používáte, podle prohlížeče. Zbývá
zadat jen úhlopříčku, protože ji prohlížeč nezná.

Vlastní displeje můžete upravit a smazat. Smazáním se displej odebere i z vašich známých displejů, z
porovnání a ze seznamu skrytých.

Vestavěné displeje se upravit nedají. Můžete je skrýt, a pak zmizí ze seznamů i z porovnání. Pokud byl
skrytý vestavěný displej známý, zůstane známý.

## Sdílení odkazů

**Kopírovat odkaz** zkopíruje adresu aktuálního zobrazení. Odkaz nese celé porovnání v části adresy za
znakem `#`:

- vaše známé displeje, s jejich vzdálenostmi a měřítky, a referenční displej;
- porovnávané displeje, s jejich vzdálenostmi a měřítky;
- vaše vlastní displeje jako vstupní údaje (název, úhlopříčku, šířku a výšku);
- jednotky, jazyk, předvolbu měřítka a vlastní měřítka, pohodlné okno, filtry, pořadí řazení a to, zda
  jste v Procházet, nebo v Porovnat.

Typický odkaz má několik stovek znaků. To je normální.

Když někdo otevře sdílený odkaz, objeví se pruh **Sdílené porovnání** s textem: „Prohlížíte sdílené
porovnání. Vaše vlastní displeje zůstávají beze změny.“ Pak můžete zvolit jednu ze dvou možností:

- **Ponechat** uloží sdílené známé displeje a porovnání jako vaše, včetně vlastních displejů z odkazu.
- **Zpět na moje** vás vrátí k vašim uloženým displejům a sdílené porovnání zruší.

Zatímco si prohlížíte sdílený odkaz, vaše jednotky, jazyk, předvolba měřítka a pohodlné okno se ukládají
do vašeho zařízení. Vaše známé a vlastní displeje se neuloží, dokud nezvolíte **Ponechat**.

## Instalace a práce offline

Jakmile se aplikace načte, funguje bez připojení k síti. Nová verze aplikace se projeví při příštím
spuštění.

- **Chrome, Edge a další prohlížeče založené na Chromu:** použijte ikonu instalace v adresním řádku, nebo
  položku pro instalaci v nabídce prohlížeče.
- **iPhone a iPad (Safari):** klepněte na Sdílet a pak na **Přidat na plochu**.
- **Android (Chrome):** nainstalujte aplikaci z nabídky prohlížeče, nebo potvrďte výzvu k instalaci.
- **Firefox na počítači:** aplikace se uloží jako webová stránka pro práci offline. Firefox ji ale
  nenainstaluje jako aplikaci.

## Import a export JSON

V části **Data** tlačítko **Exportovat JSON** uloží soubor s vašimi vlastními a známými displeji.
Vestavěné displeje se nezahrnují. Tlačítko **Importovat JSON** načte takový soubor zpět.

- Pokud je některá položka v souboru neplatná, soubor se celý odmítne. Zpráva pak řekne, že soubor není
  platný JSON, nebo že neobsahuje displeje v očekávaném formátu.
- Importované displeje a známé položky se sloučí s vašimi podle identifikátoru. Pokud identifikátor už
  existuje, platí hodnota ze souboru.
- Známé položky, které odkazují na neexistující displeje, se přeskočí.

## Soukromí

- Všechno, co zadáte, se ukládá jen ve vašem prohlížeči, do jeho úložiště IndexedDB.
- Nejsou potřeba účty, neexistuje analytika ani cookies a aplikace neposílá žádný síťový požadavek kromě
  načtení aplikace z jejího hostitele.
- Sdílený odkaz je jediný způsob, jak vaše údaje opustí zařízení, a to jen tehdy, když ho pošlete sami.
  Část adresy za znakem `#` se na server neposílá. Kdo má odkaz, může porovnání přečíst, včetně názvů
  vlastních displejů, které v něm jsou.
- Vymazání dat webu v prohlížeči odstraní vaše vlastní displeje, známé displeje a předvolby. Aplikace bude
  dál fungovat.

## Časté otázky

**Proč aplikace nemůže změřit můj displej?** Prohlížeč udává logickou velikost obrazovky a měřítko, ale ne
její fyzickou velikost. Úhlopříčku proto zadáváte sami. Pomocník **Jako můj displej** doplní zbytek.

**Proč aplikace chce úhlopříčku, a ne PPI?** Výrobci uvádějí úhlopříčku. PPI se z ní a z rozlišení
vypočítá.

**Jak aplikace zachází se zakřivenými displeji?** Jako s plochými. Zakřivení neopravuje, takže zadejte
úhlopříčku, kterou uvádí výrobce. Fyzická velikost silně zakřiveného displeje je jen přibližná.

**Proč macOS dává pro stejnou šířku „vypadá jako“ jiné měřítko?** Protože měřítko je nativní šířka dělená
šířkou „vypadá jako“. Displej o šířce 3840 px na „vypadá jako 2560“ běží na 150 %. Displej o šířce 5120 px
na stejné nastavení běží na 200 %. Viz [Předvolby a vlastní měřítka](#předvolby-a-vlastní-měřítka).

**Proč se pracovní megapixely liší od staré tabulky?** Tabulka dělila megapixely měřítkem. Škálování ale
zmenšuje šířku i výšku, takže počet logických pixelů klesá s druhou mocninou měřítka. U 42″ 4K při 110 %
tabulka ukazovala 7,5 Mpix. Aplikace ukazuje 6,9 Mpix, protože 8,29 ÷ 1,1² ≈ 6,85.

**Proč displej zmizel z Procházet?** Obvykle proto, že je zapnutý filtr **Jen displeje s pohodlným měřítkem**
a žádné měřítko displeje neleží v pohodlném okně. Displej může být také skrytý. Filtr vypněte, nebo v
Nastavení okno rozšiřte.

**Co znamená „Žádné pohodlné měřítko“?** Žádné měřítko z vaší předvolby neleží v pohodlném okně. Notebook
13,3″ s rozlišením 2560 × 1600 má 227 PPI. I při 200 % dává 113 efektivních PPI, což je nad výchozím
maximem 105.

**Co znamená „stejné“?** Obě hodnoty jsou shodné v zobrazené přesnosti. Rozdíl se zaokrouhlí na nulu.

**Proč můj displej v seznamu není?** Aplikace obsahuje 51 vestavěných displejů. Přidejte ho tlačítkem
**Přidat displej**. Potřebujete jeho úhlopříčku a nativní rozlišení, které najdete na většině technických
listů.
