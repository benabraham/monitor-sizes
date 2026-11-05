# Pixely a monitory: user guide

Pixely a monitory helps you choose a display by comparing it with the screens you already
know. This guide explains what the app shows and the ideas behind it, in plain terms. For the
formulas, see [CALCULATIONS.md](CALCULATIONS.md). A Czech version is in
[USER-GUIDE.cs.md](USER-GUIDE.cs.md).

Open the app at <https://benabraham.github.io/monitor-sizes/>.

## Contents

- [What the app answers](#what-the-app-answers)
- [First run](#first-run)
- [Concepts explained simply](#concepts-explained-simply)
- [Browse](#browse)
- [Compare](#compare)
- [Adding, editing and hiding displays](#adding-editing-and-hiding-displays)
- [Sharing links](#sharing-links)
- [Install and offline](#install-and-offline)
- [Import and export JSON](#import-and-export-json)
- [Privacy](#privacy)
- [FAQ](#faq)

## What the app answers

Suppose you own a 24″ Full HD monitor and are thinking about a 32″ 4K monitor. The app helps
you answer questions such as these:

- How sharp is the new screen compared with mine?
- How big does it look, and how far back should I sit so it looks as big as mine?
- Which scale should I set on it, so that text feels as large as on my current screen?
- Which candidates have a scale that feels right, and which do not?

The app works only from the numbers you enter: diagonal, resolution, viewing distance and
scale. It does not measure your screen, and it knows nothing about price, panel type, refresh
rate or colour. Every screen is treated as flat.

## First run

On the first launch, the app asks which displays you know.

1. **Pick the displays you know.** Displays are grouped as Laptops, Monitors and Ultrawides.
   Use the search box to find one. If your display is missing, choose **Add your own**, enter
   it, and it is selected straight away. You must pick at least one display. Nothing is
   selected in advance.
2. **Set how you use them.** For each display, set the distance you usually sit from it and
   the scale you use in your operating system. The first display you picked becomes the
   **baseline**. You can change it later.
3. **Choose units.** Metric (centimetres and dm²) is the default. Imperial uses inches and
   in². Diagonals and PPI stay in inches in both systems.

The app uses the language of your browser: Czech if your browser is set to Czech, and English
otherwise. You can switch the language at any time in Settings.

The default viewing distance is 60 cm for monitors and ultrawides, and 45 cm for laptops. The
default scale is the best comfortable scale for the display (explained below). You can change
both.

## Concepts explained simply

### Familiar displays and the baseline

The displays you know are your **familiar displays**. The familiar displays are shown in a strip
at the top of Browse, and each one has a star. Exactly one of them is the **baseline**, shown in
the accent colour. Every relative figure (the percentage and difference columns) is measured
against the baseline. The other familiar displays stay visible as secondary references.

To make a different familiar display the baseline, tap its chip. Switching takes one tap, so you
can ask "compared with my laptop?" and "compared with my monitor?" without setting anything up
again.

### PPI: how dense the pixels are

PPI means pixels per inch. It is the diagonal pixel count divided by the diagonal in inches:

- 27″ 4K (3840 × 2160): the diagonal is √(3840² + 2160²) ≈ 4,406 pixels, and 4,406 ÷ 27 ≈
  **163 PPI**.
- 24″ Full HD (1920 × 1080): about **92 PPI**.

A higher PPI means smaller pixels, a sharper picture and a less visible pixel grid.

### Relative pixel size

Relative pixel size compares the pixels of a display with those of the baseline:

> baseline PPI ÷ display PPI − 1

Take the 27″ 4K with a 24″ Full HD baseline: 92 ÷ 163 − 1 ≈ **−44 %**. Read it as "the 27″ 4K's
pixels are 44 % smaller than the baseline's".

- A **negative** value means smaller pixels: a smoother picture, with a less visible grid.
- A **positive** value means larger pixels, which are easier to see.
- **same** means the value rounds to zero, so the pixels are the same size.

### Physical size and area

A screen's width is its horizontal pixel count divided by its PPI, and the result is converted
to centimetres (one inch is 2.54 cm). The height works the same way.

- 27″ 4K: about **60 cm** wide and **34 cm** high.
- Area is width × height: about 2,010 cm², which is shown as **20 dm²**.

Compared with the 24″ Full HD, the 27″ 4K is 7 cm wider, 4 cm taller and 27 % larger in area.

Raw megapixels count the native pixels and ignore scaling. The 27″ 4K has 8.3 Mpix and the
24″ Full HD has 2.1 Mpix, so the 27″ 4K has 300 % more.

### OS scaling, logical resolution and effective PPI

Your operating system draws text and controls larger than the native pixels would suggest. The
**scale**, such as 150 %, is the number of physical pixels that one logical pixel takes.

- **Logical resolution** is the native resolution divided by the scale. It is the size of the
  workspace you actually get.
- **Effective PPI** is the PPI divided by the scale. It tells you how dense text and controls
  look.

The 27″ 4K at each Windows scale:

| Scale | Logical resolution | Effective PPI | Comfort window       |
| ----- | ------------------ | ------------- | -------------------- |
| 100 % | 3840 × 2160        | 163           | No, above the window |
| 125 % | 3070 × 1730        | 131           | No, above the window |
| 150 % | 2560 × 1440        | 109           | No, above the window |
| 175 % | 2190 × 1230        | 93            | **Yes**              |
| 200 % | 1920 × 1080        | 82            | No, below the window |

The app shows logical resolutions rounded to the nearest 10 pixels.

**The comfort window.** By default, a scale is comfortable when both of these are true:

- its effective PPI is between 90 and 105, and
- its logical width is at least 1024 px.

With these defaults only 175 % is comfortable for the 27″ 4K. Browse lists only the comfortable
scales. Compare lists every scale in the preset and highlights the comfortable ones, so you can
see the alternatives too. You can change the window in Settings, under **Comfort window**.

**Workspace.** The workspace is the logical area that fits on screen. At 150 % the 27″ 4K gives
2560 × 1440, which is 3.7 Mpix. Each step up in scale shows fewer pixels, because both the width
and the height shrink.

### Viewing angle: field of view and pixels per degree

Physical size only means something once you know how far away the screen is. The app therefore
also shows how much of your view each screen fills.

- **Field of view** is the angle the screen covers, horizontally and vertically. At 60 cm the
  24″ Full HD covers 47.8° across and 28.0° high. The 27″ 4K covers 53.0° across and 31.3° high.
- **Pixels per degree (PPD)** is how many pixels fit into one degree of your view. It is PPI ×
  distance in inches × π ÷ 180. At 60 cm, the 24″ Full HD gives 38 PPD and the 27″ 4K gives
  67 PPD.
- **Logical PPD** is PPD ÷ scale. At 150 %, the 27″ 4K gives 45 logical PPD.

A figure of about 60 PPD is often quoted as the limit of normal 20/20 vision. Beyond it, single
pixels are hard to see.

**The PPD comfort rule.** Under **Comfort window**, you can switch the rule from **PPI** to
**Pixels per degree**. The window is then measured in logical pixels per degree. The default
range is 37 to 43, which is about 90 to 105 PPI at 60 cm.

Unlike PPI, PPD depends on the distance. Take the 24″ Full HD sitting at 90 cm:

- With the **PPI** rule, 100 % is comfortable, because the screen has 92 PPI.
- With the **Pixels per degree** rule, 100 % gives 57 PPD at 90 cm, which is above the window.
  150 % gives 38 PPD, which is inside it, so this rule suggests 150 %.

In Browse, the rule uses the baseline's distance. In Compare, each display uses the distance you
set for it.

### Presets and custom scales

Each operating system offers its own steps. Choose a preset with the **Windows / macOS / Linux**
switch in the header, in Browse and in Compare. The same choice is under **Scale preset** in
Settings, where the Linux preset is called **Linux (Wayland)**. The app starts with the preset for
the system you are using.

- **Windows:** 100 %, 125 %, 150 %, 175 % and 200 %.
- **Linux (Wayland):** 100 %, 110 %, 125 %, 150 %, 175 % and 200 %. The 110 % step appears only in
  this preset.
- **macOS:** Apple's "looks like" widths: 1280, 1440, 1512, 1680, 1728, 1920, 2048, 2304, 2560,
  3008 and 3200 px. On macOS, a display's scale is its native width divided by the "looks like"
  width, and only scales from 1× to 2× are listed.

For a 3024 px wide MacBook Pro 14″, the "looks like" widths give these scales: 1512 px gives
200 %, 1728 px gives 175 %, 1920 px gives 158 % and 3008 px gives 101 %. The 3200 px setting would
give 94.5 %, which is below 1×, so it is not listed.

The same "looks like" width gives different scales on different displays. A 27″ 4K (3840 px wide)
at "looks like 2560" runs at 150 %. A 27″ 5K (5120 px wide) at the same setting runs at 200 %.

**Custom scales.** If your system offers a scale that the preset lacks, add it under **Custom
scales** in Settings, for example 133 % or 300 %. You can type 133, 133 %, 1.33 or 1,33. The range
is 50 % to 400 %.

### Equivalent distances

A bigger screen can look like a smaller one if you sit further from it. Equivalent distances tell
you how far to sit so that a candidate matches the baseline in one of three ways:

- **Same size:** the candidate looks as tall as the baseline (you can match by width or diagonal
  instead). The distance is the baseline distance × the candidate's height ÷ the baseline's height.
- **Same sharpness:** both show the same number of pixels per degree. The distance is the
  baseline distance × the baseline's PPI ÷ the candidate's PPI.
- **Same text size:** text at the chosen scale looks as large as on the baseline. The distance is
  the baseline distance × (baseline PPI ÷ baseline scale) ÷ (candidate PPI ÷ candidate scale).

**A worked example, step by step.** The baseline is a 24″ Full HD (92 PPI) at 60 cm and 100 %. The
candidate is a 32″ 4K (138 PPI) at 150 %.

1. **Height.** The baseline is about 30 cm high. The candidate is about 40 cm high. The candidate is
   a third taller (40 ÷ 30 ≈ 1.33).
2. **Same size: 80 cm.** Multiply the baseline distance by 1.33: 60 cm × 1.33 = 80 cm. Sit 20 cm
   further back, and the candidate looks as tall as your baseline.
3. **Same sharpness: 40 cm.** The candidate has 1.5 times the PPI of the baseline. At 40 cm, its
   pixels subtend the same angle as the baseline's pixels do at 60 cm: 60 cm × 92 ÷ 138 = 40 cm.
   At equal distances, the candidate is 1.5 times sharper.
4. **Same text size: 60 cm.** At 150 %, the candidate has 138 ÷ 1.5 = 92 effective PPI. The
   baseline at 100 % also has 92. The texts match at the distance you already sit at, 60 cm.

The result appears in Compare as one sentence under each candidate:

> Looks like your 24″ Full HD at 80 cm · as sharp at 40 cm · same text size at 60 cm (150 %)

In Compare, tap **Match size**, **Match sharpness** or **Match text size** to set the candidate's
distance to one of these values.

## Browse

Browse lists every display in the app. The familiar displays are pinned in a strip at the top.

- **On a desktop,** Browse is a sortable table. It shows the name, diagonal, PPI, relative pixel
  size, aspect ratio, resolution, physical width and height, the size difference against the
  baseline, area and its ratio to the baseline, raw megapixels and their ratio, and the best
  comfortable scale.
- **On a phone,** each display is a card. It shows the name, diagonal, resolution, PPI and the best
  comfortable scale as a chip, for example "175 % → 2190 × 1230".
- **Sorting.** Choose any column heading. The default is PPI, highest first. A display with no value
  for the sort column, such as a relative size when there is no baseline, is listed last.
- **Search** matches the name, the resolution (3840×2160 or 3840x2160) and the diagonal. Each word
  you type must match.
- **Filters** narrow the list by type (Laptop, Monitor or Ultrawide), by aspect ratio and by diagonal
  range. A display with no type counts as a monitor.
- **Only displays with a comfortable scale** hides every display that has no scale inside the comfort
  window. When a display has no comfortable scale, Browse says so.
- **Star** a display to mark it as familiar. Tick the **Compare** box to add it to the comparison.

The header always shows the active comfort window, for example "Comfortable: 90–105 PPI · ≥ 1024 px".

## Compare

Compare shows the baseline, the other familiar displays (unless you have hidden them in Compare), and
every display you have ticked. The button at the top shows how many displays are compared.

**The visualization is always on screen.** On a wide screen it sits in a panel beside the metrics. On
a phone it is pinned at the top, and the metrics scroll underneath. It cannot be collapsed.

- **Physical** draws every outline to one length scale, aligned at the bottom centre, like monitors
  on a desk. Use it to judge real size differences.
- **As seen** draws each outline at the angle it covers from its own viewing distance. A bigger screen
  that is further back can look identical to a smaller one. Use it to judge what your eyes see.
- Familiar displays are drawn with dashed outlines and candidates with solid ones. Every outline has a
  label, and the sizes are listed below the drawing.
- **Match size by** chooses the measure used for the same-size match: height (the default), width or
  diagonal.

**Distance and scale.** Each display has a **Distance** slider and a number field, in centimetres or
inches. A familiar display uses the distance you saved for it. A candidate starts at the baseline's
distance. Each display also has a scale. A familiar display uses the scale you saved. A candidate
starts at its best comfortable scale, which is marked with ✓ in the list, and you can change it.

**Match buttons.** Each candidate has three buttons: **Match size**, **Match sharpness** and **Match
text size**. Each one sets the candidate's distance to the matching equivalent distance, and the
description under the buttons shows the distance it will set. The equivalence sentence is explained in
[Equivalent distances](#equivalent-distances).

**Metric grid.** The baseline is the first column. The rows are grouped into **Metrics** and
**Scaling**. They include the viewing distance, the scale, the field of view, PPD and logical PPD. Every
row has a "?" button that explains the metric.

**Scaling matrix.** For each display, the matrix has one row per scale in the active preset. Each row
shows the logical resolution, the effective PPI and the workspace. Comfortable scales are highlighted
and also carry the word **Comfortable**, so colour is not the only signal. Scales outside the window are
shown without the highlight, and marked **Outside the comfort window**. The scale in use is marked
**In use**, and the recommended scale is marked **Recommended**.

You can hide a familiar display in Compare with its toggle. It stays familiar, and it is still shown in
Browse.

## Adding, editing and hiding displays

The **Add display** button is always one tap away, in Browse and in Compare. The form has four fields:

- **Name.**
- **Diagonal** in inches.
- **Width** and **Height** in pixels, using the native resolution. **Common resolutions** fills these in
  with one tap.

A preview shows the PPI, the aspect ratio and the physical size while you type. The **Type** (Laptop,
Monitor or Ultrawide) is suggested from the size and the shape, and you can change it.

Tick **I know this one** to add the display to your familiar displays, with a distance and a scale.

**Like my screen** fills in the resolution and the scale of the screen you are using, from your browser.
You only need to type the diagonal, because a browser cannot report it.

Your own displays can be edited and deleted. Deleting one also removes it from your familiar displays,
from Compare and from the hidden list.

Built-in displays cannot be edited. You can hide them, which removes them from the lists and from
Compare. If a hidden built-in display was familiar, it stays familiar.

## Sharing links

**Copy link** copies the address of the current view. The link carries the whole comparison in the part
of the address after the `#`:

- your familiar displays, with their distances and scales, and the baseline;
- the displays you have compared, with their distances and scales;
- your custom displays, as their inputs (name, diagonal, width and height);
- the units, the language, the scale preset and custom scales, the comfort window, the filters, the sort
  order and whether you are in Browse or Compare.

A typical link is a few hundred characters long. That is normal.

When someone opens a shared link, a **Shared comparison** banner appears: "You're viewing a shared
comparison. Your own displays are untouched." Then choose one of two options:

- **Keep it** saves the shared familiar displays and comparison as your own, together with the custom displays
  from the link.
- **Back to mine** returns to your own saved displays and drops the shared comparison.

While you view a shared link, your units, language, scale preset and comfort window are saved on your
device. Your familiar and custom displays are not saved until you choose **Keep it**.

## Install and offline

Once the app has loaded, it works without a network connection. A new version of the app takes effect the
next time you launch it.

- **Chrome, Edge and other Chromium browsers:** use the install icon in the address bar, or the **Install**
  item in the browser menu.
- **iPhone and iPad (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** install the app from the browser menu, or accept the install prompt.
- **Firefox on desktop:** the app is kept as a website for offline use. Firefox does not install it as an
  app.

## Import and export JSON

In the **Data** section, **Export JSON** saves a file with your custom displays and your familiar displays.
Built-in displays are not included. **Import JSON** reads such a file back.

- If any item in the file is invalid, the whole file is refused. The message then says either that the
  file is not valid JSON, or that it does not contain displays in the expected format.
- Imported displays and familiar entries are merged with yours by their id. When an id is already present,
  the value from the file wins.
- Familiar entries that refer to displays which do not exist are skipped.

## Privacy

- Everything you enter is stored in your browser only, in its IndexedDB storage.
- There is no account, no analytics, no cookies, and no network request beyond loading the app from its host.
- A share link is the only way your data leaves your device, and only when you send it yourself. The part of
  the address after the `#` is not sent to the server. Anyone who has the link can read the comparison,
  including the names of any custom displays in it.
- Clearing the site's data in your browser removes your custom displays, familiar displays and preferences.
  The app still works.

## FAQ

**Why can't the app measure my screen?** A browser reports the logical size of a screen and its scale, but
not its physical size. The diagonal is the one number you type yourself. **Like my screen** fills in the rest.

**Why does the app ask for the diagonal and not for the PPI?** Manufacturers quote the diagonal. The PPI is
calculated from the diagonal and the resolution.

**How are curved screens treated?** As flat. The app does not correct for curvature, so enter the diagonal
the manufacturer quotes. The physical size of a strongly curved screen is an approximation.

**Why does macOS give a different scale for the same "looks like" width?** Because the scale is the native
width divided by the "looks like" width. A 3840 px display at "looks like 2560" runs at 150 %. A 5120 px
display at the same setting runs at 200 %. See [Presets and custom scales](#presets-and-custom-scales).

**Why do the workspace megapixels differ from the old spreadsheet?** The sheet divided the megapixels by
the scale. Scaling shrinks both the width and the height, so the number of logical pixels falls with the
square of the scale. A 42″ 4K at 110 % showed 7.5 Mpix in the sheet. The app shows 6.9 Mpix, because
8.29 ÷ 1.1² ≈ 6.85.

**Why has a display disappeared from Browse?** Usually because **Only displays with a comfortable scale** is
switched on and none of the display's scales falls inside the comfort window. The display may also be hidden.
Switch the filter off to see it again, or widen the window in Settings.

**What does "No comfortable scale" mean?** No scale in your preset falls inside the comfort window. A 13.3″
2560 × 1600 laptop has 227 PPI. Even at 200 % it gives 113 effective PPI, which is above the default maximum
of 105.

**What does "same" mean?** The two values are equal at the precision shown. The difference rounds to zero.

**Why is my display not in the list?** The app ships with 51 built-in displays. Add yours with **Add display**.
You need its diagonal and its native resolution, which are on most spec sheets.
