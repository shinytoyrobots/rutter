---
type: plan
status: proposed
created: 2026-10-19
updated: 2026-10-19
domain: design
---

# Alternative site vision: the field log

## Intent and scope

Make rutter feel like a personal instrument for finding a route through remembered work: an annotated field log, with a directory always within reach. Preserve the present dark palette, adding one warm sodium-lamp accent, and the existing content. Take the primary art direction from Static Drift, the author's own fiction setting and already credited in the site footer as an inspiration for this tool, with Neuromancer and Snow Crash as secondary influences. Change the composition, reading rhythm, and navigation enough that this is a different design direction, rather than a new skin on the same layout.

This is a planning document. Implementation would affect the hand-authored HTML and shared CSS on `gh-pages`; it does not require a framework migration or a new publishing service. Product behavior, claims, recorded examples, and setup commands remain governed by their Markdown sources. Earlier content plans remain relevant to accuracy; this proposal supplies a distinct visual direction.

Baseline reviewed: local `origin/gh-pages` at `137079a`, especially `style.css`, `index.html`, `docs.html`, and `memory-of-use.html`, plus the source documents on `main`. The live homepage could not be retrieved during this review, so these observations concern that branch snapshot, not a browser audit of the deployed site. Static Drift references are to the author's vault at `Fiction/StaticDrift/GlobalBible/`.

## The experience

Imagine a working log kept somewhere damp, on equipment that has outlived its warranty. The page has a strong left edge, a narrow directory, generous reading space, and plain records of where information came from. Most of the page is unlit. One signal marks where you are. The page feels inhabited because it contains dated evidence, references that have moved or gone missing, and precise instructions.

### Static Drift as the primary direction

Static Drift's mission statement is close to rutter's own: *"infrastructure remembers. History resists erasure."* Its archive note adds *"Who owns memory owns truth."* rutter is that idea built as a tool, a record kept in plain files the user owns. That line becomes the site's persistent brand subtitle (see "The brand line"). The site should look like that kind of record: an owned, worn, working log, not a corporate console.

Translate the setting's rules into design rules:

| Static Drift rule (source) | Design consequence |
| --- | --- |
| Technology is worn and mundane, "never gleaming or new" (`README.md`, Voice and tone guide) | No glow, gloss, or scanlines. Character comes from wear, density, and precise records. |
| Storm Grids work "selectively"; coverage is partial and patchy (`Storm Grids.md`, `AR Overlay.md`) | Ration the bright green. Only the current location is lit; everything else is unlit but fully legible. |
| Found-text modes: system codes as the spine, set in code (Voice and tone guide) | Recorded output and reference states form a distinct administrative layer, beside a warm human reading layer. |
| "The mythic as maybe"; phantom pings never resolved (Voice and tone guide, `Memory of the collective.md`) | An unresolved reference stays visibly unresolved. The design never implies a match. |
| Staccato declaratives, then rolling observation, then the door clicks shut (Voice and tone guide) | Page rhythm: a short title line, rolling prose, then a flat closing record. |
| Warm even in despair; rejects cyberpunk's "cool detachment" (Voice and tone guide) | Prose in the sans family at a generous measure; one warm sodium-lamp accent for the human layer; human-readable dates; the interface never sneers or performs menace. |
| Pockets of persistence: ordinary places that endure (`Pockets of persistence.md`) | The directory is plain, durable, and always there. Deliberately unspectacular. |

Neuromancer contributes depth and information met through an instrument; Snow Crash contributes competing information layers and sharp signage. Both are subordinate to Static Drift's worn, warm register. None of these are a requirement to reproduce fictional interfaces, and no fictional vocabulary enters the site's interface. The brand line is the single deliberate exception, and it's a plain English sentence, not a coined term. Ordinary labels remain ordinary: "Docs," "Get started," and "Known issues."

### The brand line

Pair the wordmark with a persistent subtitle on every page: **rutter_** *Who owns memory owns truth.* Together they form one brand lockup in the masthead. It is the site's thesis in the setting's voice: rutter keeps your record in files you own, so the account of what you decided stays yours.

- **Placement.** Directly after the wordmark, on the same baseline on wide screens and wrapping beneath it on narrow ones. It appears in the masthead of all nine pages and in print, and it never collapses into a menu or disappears at narrow widths.
- **Treatment.** Sans-serif italic in `--sodium` (8.96:1 on panel, 9.56:1 on page ground), at least 0.875rem. The setting sets slogans and refrains as single italic lines, and this follows that convention. The wordmark keeps the green, the instrument's signal; the subtitle takes the lamp, the human warmth behind it. The pairing of the two lights is the brand.
- **Semantics.** The wordmark remains the home link with the accessible name "rutter". The subtitle is ordinary text beside the link, outside it, so the link name stays short and the line is read once per page. It is not a heading, and it does not replace the existing homepage tagline, "One memory. Multiple agents. Yours." The brand line says why rutter exists; the tagline says what it does.
- **Attribution.** The line comes from the author's own setting, which the footer already credits ("Fiction at static-drift.com, an inspiration for this tool"). No further citation is needed in the masthead.
- **Unchanged.** Page `<title>` elements, meta descriptions, and `llms.txt` keep their descriptive wording. The brand line is visual identity, not a replacement for the information that tells a reader or a search result what each page contains.

### A lateral step at each default

| Familiar starting point | Proposed direction | Reader benefit |
| --- | --- | --- |
| Centered hero followed by equal feature cards | An asymmetric opening entry, followed by a continuous sequence of records | Establishes a reading route and gives evidence more presence |
| Separate client link row, call-to-action button, and comparison table | One client directory beside the introduction, replacing the existing link row and button | One place to choose; the detailed comparison stays later |
| Cyberpunk as glowing text and animated interference | Unlit surfaces, rationed signal color, worn texture, and shape-coded records | Character comes from the information itself |
| Dashboard full of status tiles | A field log whose metadata describes real records | Avoids suggesting that a static documentation site monitors the user's system |
| Documentation tree with many expandable levels | One flat, persistent directory of the site's small set of pages | Every sibling is immediately discoverable |
| Long essay with a second full sidebar of headings | A reading column with a compact local outline at its beginning | Gives orientation without enclosing the essay in interface chrome |
| Abstract graph as the central interaction | A visible sequence: capture, changed references, recall | Explains the existing example without demanding spatial exploration |
| Generic footer metadata | A closing provenance record on every page, in rutter's own reference format | The site demonstrates the product's idea on itself |

During review, identify what each familiar component helps a reader do, propose another composition that performs that job, then compare both using actual content. Keep conventional keyboard behavior, links, and semantics. Novelty belongs in the visual composition, not in the mechanics of operating the page.

## Signature devices

The design stands or falls on three named devices. Each restyles content that already exists, carries meaning through text and shape rather than color, and survives with all decoration removed. Step 3 of the implementation sequence tests them by name.

### 1. Partial coverage: one lit signal

Green (`--neon`) is rationed to three jobs: the wordmark, the current-page marker in the directory, and the vertical route rule in the homepage proof. Headings, which are green today, move to `--ink` at heavier weight. Everything else is unlit but keeps its full contrast; "unlit" never means dimmed below the ratios in the palette table.

The effect is a page where your location is the one powered node on a mostly dark grid. It is the clearest visual change from the current site and costs nothing in legibility. The current-page marker also carries a solid bar shape, heavier text, and `aria-current="page"`, so the light is never the only signal.

A second, warmer light answers it. `--sodium`, an amber like an old streetlamp, is equally rationed, to three human-layer jobs: the brand line, dates (the proof's recorded date and each closing record's date), and link hover. Today, hovering a link turns it green; under partial coverage that would light up nodes that aren't your location, so hover takes the lamp instead and the underline thickens, keeping the change from being color alone. The rule of thumb: green marks where you are; amber marks when, and who it belongs to.

### 2. Dead zone: reference states with shape

The product's central distinction is whether a recorded reference still resolves. Give the three states that appear in existing output distinct shapes, keeping their literal wording:

| State | Existing text | Treatment |
| --- | --- | --- |
| Resolved | `path@sha256:…` | Solid left rule |
| Renamed | `(renamed to …)` | Solid left rule, with the new path on its own wrapped line |
| Unresolved | `[UNRESOLVED -- candidates: none]` | Dashed border and a faint diagonal hatch, like an uncovered district |

Implement by wrapping each reference line inside the existing `<pre>` in a `span` with a `data-state` attribute. Copied text stays byte-identical. Keep the hatch at or below 7% opacity and verify `--code-ink` contrast over the hatched surface. In forced-colors mode the background drops and the dashed border survives; in print the hatch is removed and the border stays. Where the word "unresolved" appears in prose as a literal state on `design.html` and `memory-of-use.html`, set it in the same monospace tag style without changing its case or wording.

The unresolved state is never styled as a failure alarm or a successful match. It stays what the fiction calls a phantom ping: visibly present, honestly unexplained.

### 3. The ref line: every page closes on its own record

The footer already reads "Built from main@4a49913 · source hashes" and links `sources.json`. Extend it into a closing record on each page that gives the page's source document and content hash in rutter's own reference format:

```text
docs/memory-of-use.md@sha256:93a1a2922326 · built from main@4a49913 · 19 October 2026
```

The values come only from `sources.json` and the build commit. Show a 12-character hash prefix, as git does, and link the full manifest. Pages with no manifest entry show the build line alone. Set it in monospace as the last line of `main`'s reading flow, before the site footer: the flat closing record that clicks the door shut.

This is the boldest device. The site makes the same move a session record makes, and a reader who has learned the reference format on the homepage meets it again on every page. Its risk is drift: a hand-edited hash that disagrees with the manifest would be a fabricated record. Step 5 verifies every closing record against `sources.json`.

### Supporting devices

Use these where they fit; none is load-bearing.

- **Timetable leaders.** Lay out the client directory as departure-board rows: client name, a dotted leader, then the destination. Use an empty generated flex item for the leader, and let rows wrap at narrow widths so the leader disappears. Apply the same treatment to the proof's version line.
- **Ruled log paper.** Behind the proof sequence only, draw faint rules on the text baseline with `repeating-linear-gradient` sized in `lh` units, so the rules follow text-spacing overrides and zoom. Use no rules where `lh` is unsupported. Drop them in forced-colors mode and print.
- **Margin notes.** On wide screens, existing callouts and caveat paragraphs may move into an annotation column beside the passage they qualify, marked with a double left rule and a visible label. Supply is small: there is one `.callout` on the site today, plus the caveat paragraphs around the proof. Annotations are existing text, moved; they never introduce copy that has no Markdown source. They follow their passage in DOM order and fall back inline at narrow widths.
- **Masthead texture.** Keep the existing dead-channel strip as the only texture, in the masthead.
- **Print as the paper log.** White ground, every component recolored, external link targets printed after links, the directory printed as a contents list, hatches replaced by dashed borders.

### Considered and rejected

- **Scanlines, glitch text, chromatic aberration, or a blinking cursor.** Generic cyberpunk, which Static Drift explicitly is not. They also degrade legibility and break under text-spacing overrides.
- **Redaction bars or hover-to-reveal caveats.** A strong reading of the setting's surveillance motifs, but it hides real content from keyboard, touch, screen-reader, and print users.
- **Visited links as worn "desire lines."** Browsers allow only color changes on `:visited`, so the device would convey its meaning by color alone.
- **A toggleable overlay layer.** Competing overlays are central to the setting, but a toggle conceals content by default.
- **CSS-counter entry numbers.** They would invent sequence numbers that the content does not contain.
- **Amber everywhere.** Once the lamp exists, it is tempting to use it for headings, callouts, or warnings. That would turn a rationed light into a second theme color and make amber read as an alert, which the setting's warmth is not.

## Visual language

### Keep the palette, add one lamp, and assign clearer jobs

Retain the current color values and add one token, `--sodium` (`#f2a65a`). Use green for the document's identity and current location only, as described under partial coverage. Use amber for the brand line, dates, and link hover. Use cyan for destinations, and magenta for annotations and explicitly labeled limitations. Body copy and headings stay pale blue-gray. A color never supplies a state or meaning by itself.

The amber is deliberately desaturated toward a worn sodium lamp rather than a bright orange, so it reads as warmth and not as a warning. It sits close to green in lightness, and for some color-vision deficiencies the two may look alike. That is acceptable only because neither color carries meaning on its own; keep that rule absolute.

The contrast figures below are calculated from opaque sRGB values against `--bg-panel`, the lightest of the three dark surfaces. They are planning evidence, not certification of rendered components.

| Existing token | Value | Proposed role | Contrast on panel |
| --- | --- | --- | --- |
| `--bg` | `#0a0e14` | Page ground | — |
| `--bg-panel` | `#0f1622` | Directory and occasional inset | — |
| `--bg-code` | `#0d1420` | Recorded output and commands | — |
| `--ink` | `#c8d3e0` | Reading text and headings | 11.96:1 |
| `--ink-muted` | `#8fa3ba` | Metadata and supporting text | 7.01:1 |
| `--neon` | `#34f5a4` | Wordmark, current page, proof route rule | 12.73:1 |
| `--cyan` | `#63d8ff` | Underlined links and focus outline | 11.05:1 |
| `--magenta` | `#ff5fd2` | Labeled annotations and limits | 6.75:1 |
| `--sodium` (new) | `#f2a65a` | Brand line, dates, link hover | 8.96:1 |
| `--code-ink` | `#a9ecd0` | Code and output | 13.47:1 |
| `--line` | `#223047` | Decorative dividers only | 1.37:1 |

The present `--line` is too subtle to carry a necessary control boundary or state by itself. Use an existing brighter token where a visible boundary is required; the dead-zone border uses `currentColor`. Validate text at 4.5:1 for normal sizes and 3:1 for qualifying large text; validate every rendered state, including amber hover, focus, and text over the hatch and ruled backgrounds. Amber hover and the cyan focus outline must stay distinguishable when a link is both hovered and focused; the outline's shape does that work. [W3C: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Keep surfaces flat and mostly unboxed. Reserve a filled panel for a meaningful change of material, such as moving from an explanation into captured output. Remove the full-viewport scanline overlay, heading glow, and the repeating `//` decoration. Make the wordmark cursor stationary: remove the blink animation, which currently runs whenever reduced motion is not requested. No typewriter effect, parallax, or boot sequence.

### Type and space

Use the existing system sans-serif family for prose and large titles: the warm human layer. Use the existing monospace stack for navigation, commands, dates, reference states, and the closing record: the system layer. This makes a meaningful distinction between reading and locating information. No new font dependency is necessary.

Start with body text at 1.0625–1.125rem and line height around 1.65. Keep the reading measure near 62–70 characters. Titles may grow to roughly 2.5–3.5rem on wide screens and wrap naturally on phones. Keep secondary labels at least 0.875rem as a project design choice; metadata must remain comfortable to read. Use `font-variant-numeric: tabular-nums` for dates and versions.

Use an outer composition up to roughly 86rem, with a 15rem directory, a flexible reading column, and optional annotation space. Break the uniform vertical rhythm deliberately, following the setting's prose rhythm: a short, broad opening; rolling, closely grouped entries; a larger pause before evidence or limits; a flat closing record. Do not turn every section into a bordered rectangle.

## Homepage: an opening entry

Keep the headline and all substantive content. The first screen presents the purpose, ownership, and setup action together.

The client directory replaces two existing elements: the `works-with` link row in the hero and the "Choose your client" button. It is labeled "Choose your client" and lists the six clients with their names written in full, as ordinary links to the existing setup anchors, ending with a link to `getting-started.html#choose-your-path`. The "Why is it built this way?" link remains in the introduction. On wide screens the directory sits beside the introduction; on narrow screens it follows it. Keep the detailed compatibility table later in the page, including the distinctions about what hooks read and which versions were verified. The page should list the clients once as a choice and once as a comparison, not three times.

Suggested reading order:

1. Existing title, tagline, and explanation, including the capture conditions.
2. Client directory ("Choose your client"), then "One memory. Multiple agents."
3. Detailed client comparison and verification caveats.
4. "A record, not a summary" and "Inspectable by design," presented as two connected entries.
5. The real proof sequence, with its date, limitations, and version line visible.
6. Honest fit and limits, then the existing onward links, then the closing record.

The proof section supplies the visual centerpiece. Promote its three existing step labels, now `<strong>` text in paragraphs, to `h3` headings: "Captured in Claude Code," "One note renamed, one edited and renamed," and "Recalled in Codex." Place them on one vertical route marked by the green rule, as an ordered list whose items are those headed sections. Render the recorded output in full, with wrapping where appropriate and the dead-zone treatment on its reference lines. Decorative connectors are hidden from assistive technology.

Keep every existing qualification visible: the date in its current form ("9 October 2026"), "The two notes are fictional," "unedited," and the version line ("captured with Claude Code 2.1.296 and recalled with Codex 0.162.0, against rutter 0.5.0"). The version line is the run's provenance, and it is the best candidate for timetable-leader treatment. No invented uptime, live counters, activity indicators, or simulated terminal sessions. Keep the original output bytes when copied, even where visual wrapping changes their presentation.

Conceptual wide-screen composition; the labels below describe layout rather than new site copy:

```text
rutter_ Who owns memory owns truth.    Home  Get started  Docs  GitHub
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
 A personal memory layer                 Choose your client
 for AI agents                           Claude Code ······ setup
                                         Codex ············ setup
 Existing introduction and conditions    Grok ············· setup
                                         …
                                         Compare all clients →

 One memory. Multiple agents.
 Existing explanation and client comparison

 Proof                                   recorded 9 October 2026
 ┃ Captured in Claude Code
 ┃ [original captured line]
 ┃ One note renamed, one edited and renamed
 ┃ │ [resolved reference, renamed]
 ┃ ┆ [unresolved reference, dashed and hatched]
 ┃ Recalled in Codex
   [original answer]
   [existing version line, timetable leaders]

 Honest fit and limits
 Existing boundaries and onward links

 docs/…@sha256:… · built from main@… · date
```

At narrow widths this becomes one continuous document in the same meaningful order. There is no horizontal carousel or hidden second reading route.

## Docs: a persistent directory

The current `.docs-nav` sits after article content. Replace that as the primary way to reach siblings with a directory present on every documentation page, including Get started and the Docs index.

Use this fixed order and preserve existing URLs:

| Label | Destination |
| --- | --- |
| All docs | `docs.html` |
| Get started | `getting-started.html` |
| Why is it built this way? | `design.html` |
| How it works | `memory-of-use.html` |
| FAQ | `faq.html` |
| From source | `from-source.html` |
| Manage and privacy | `manage-and-privacy.html` |
| Known issues | `known-issues.html` |

### Wide screens

Place a sticky directory to the left of the article. It remains visible while reading, with all eight entries exposed. Identify the current page using `aria-current="page"`, heavier text, and a solid bar marker as well as green. Long labels wrap; do not truncate them.

The directory looks like a book's exposed index edge, and like a pocket of persistence: plain, durable, always there. It has a single vertical rule, generous link rows, a clear "Documentation" label, and no enclosing stack of cards. The article owns most of the space. The global header scrolls away, avoiding two competing sticky navigation layers.

Inside the article, place a breadcrumb, H1, introduction, and an "On this page" list linking to its major headings. Keep that local outline in normal flow, distinct from the persistent sibling directory. For Get started, include the client paths; for How it works, include its major mechanics sections. Short pages can omit the local outline. Each article ends with its closing record.

```text
rutter_ Who owns memory owns truth.    Home  Get started  Docs  GitHub
──────────────────────────────────────────────────────────────
 Documentation       Docs / How it works
 │ All docs
 │ Get started       Memory-of-use: the mechanics in full
 │ Why is it built   Existing introduction
 │   this way?
 ┃ How it works      On this page: [major section links]
 │ FAQ
 │ From source       Article text, examples, and callouts
 │ Manage and        continue in a comfortable measure.
 │   privacy
 │ Known issues      Optional margin notes sit beside the
                     passage they qualify on wide screens.

                     docs/memory-of-use.md@sha256:93a1a2922326 · built from main@…
```

### Phones, zoom, and short windows

Switch to a single column when the directory and readable article no longer fit; start prototyping around 64rem, then adjust using content. A compact sticky disclosure labeled "Docs · How it works" gives persistent access to the same list. It expands in document flow, pushes the article downward, and never becomes a modal overlay. Keep a visible disclosure indicator and an accessible expanded state.

Use one navigation instance: a native `details`/`summary` disclosure that ships with the `open` attribute in the HTML. On narrow screens, a small script removes `open` on load, so the list starts collapsed. Without JavaScript, the directory is therefore open at every width: fully exposed on wide screens, and expanded in flow on narrow screens, where it remains collapsible. Ordinary anchors continue to work.

A closed native `details` keeps its contents hidden whatever CSS does to the summary, so the disclosure state must follow the breakpoint in both directions:

- **CSS.** On wide screens, hide the summary only when the disclosure is open (`details[open] > summary`). A closed disclosure keeps its summary visible at every width, so there is always a way to expand it.
- **Script.** Listen for breakpoint changes with `matchMedia`, not only on load. Crossing to wide sets `open`, so the list is exposed again; crossing to narrow removes it, matching the load behavior.
- **Without JavaScript.** A reader who closes the disclosure on a narrow screen and then widens the window still sees the summary, as the CSS rule above requires, and can reopen the list. Nothing else restores it, and that is acceptable because the control stays visible.
- **Focus.** Never strand focus in hidden content. Widening hides the summary, so if it has focus, move focus to the current-page link. Narrowing hides the list, so if a directory link has focus, move focus to the summary before removing `open`.

When expanded, release the disclosure from sticky positioning so a long list can scroll naturally. In very short windows, or where enlarged text makes the closed control occupy too much height, disable stickiness entirely and retain a "Docs navigation" jump link near the article's end. Persistence means reliable access on every page; it must not cost the reader their usable viewport.

Selecting a page follows a normal link. Selecting a local heading updates the fragment. Browser Back, direct URLs, find-in-page, and text selection retain their native behavior. Do not auto-close navigation on focus loss, add arrow-key menu behavior, or intercept scrolling.

### Shared semantics and content

Use separately named navigation landmarks: "Site," "Documentation," and "On this page." Put the H1 inside `main`; the current hero sits outside it. Offer "Skip to content" and "Skip to documentation" links.

On documentation child pages, mark Docs as the current section in global navigation with `aria-current="true"` and a visible underline marker. Reserve `aria-current="page"` for an exact destination match. On Get started, the global "Get started" link and the directory entry both take `aria-current="page"`, because both point to the current page.

The Docs index remains a useful annotated directory with the existing page descriptions. FAQ answers stay searchable in the document. Setup instructions remain visible rather than concealed in client tabs. Essential caveats stay beside the steps or claims they qualify, including after responsive stacking. Any margin note follows its related passage in DOM order.

## Accessibility is a release condition

The target is WCAG 2.2 Level AA across all pages and interactions. Review every applicable A and AA criterion and record evidence or a justified non-applicability finding. The checks below target this design's main risks; they are not the complete conformance checklist. Automated scans alone do not establish conformance. [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/).

| Area | Implementation and acceptance requirement |
| --- | --- |
| Meaning and structure | Preserve headings, lists, table headers, meaningful reading order, document language, and descriptive page titles. Decorative marks, leaders, hatches, and rules convey nothing independently; generated decoration uses empty alternative text (`content: "…" / ""`) or is hidden from assistive technology. |
| Keyboard | Every link, disclosure, and optional copy control works without a pointer. No traps, positive tabindex, hover-only instructions, or unexpected navigation on focus. |
| Focus | Use a solid visible outline, with at least 3:1 contrast against adjacent surfaces as a project requirement. Keep the whole focused control visible, exceeding AA's minimum obscuration requirement. |
| Color and controls | Underline prose links. Pair current-page, reference-state, and limitation colors with text or shape. Necessary control boundaries and state indicators meet 3:1 contrast. |
| Text adaptation | Support 200% text resizing and user text-spacing overrides without clipping or missing controls. Test 1.5 line height, 2em paragraph spacing, 0.12em letter spacing, and 0.16em word spacing. Ruled backgrounds must follow the overridden line height or disappear. |
| Motion | Ship a static design. Respect reduced-motion preferences if optional transitions are introduced later. No automatic blinking or flashing. |
| Robust interaction | Prefer native HTML. Any added copy button has a meaningful name, announces success or failure, and leaves selectable text available. |

For sticky elements, test focus travel in both directions and fragment jumps. Reserve space with appropriate scroll padding and heading scroll margins, accounting for wrapped navigation text rather than assuming a fixed header height. The AA requirement is that author-created content does not entirely hide the focused component; this design deliberately requires full visibility. [W3C: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

Design navigation rows and disclosure controls for at least 44 CSS pixels of target height. Check every target against the AA 24-by-24 CSS pixel minimum or a valid criterion exception; inline prose links have their own exception. The 44-pixel choice is additional project guidance, not the AA threshold. [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

At 320 CSS pixels, and at 400% zoom from a 1280-pixel-wide viewport, ordinary content must reflow without horizontal page scrolling. Wrap prose output, long references, hashes, and closing records (`overflow-wrap: anywhere`). Timetable rows wrap and drop their leaders. Use local horizontal scrolling only where two-dimensional layout is needed, such as a comparison table or indentation-dependent code. Make those regions keyboard-operable and clearly named when they need a focusable wrapper. Individual table cells still wrap. [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

In forced-colors mode, preserve native link and focus distinctions, use system colors where needed, and keep the current-page bar and reference-state borders visible without their background fills. Print styles expand navigation disclosures, remove sticky positioning and decorative surfaces, and explicitly recolor headings, links, code, callouts, and reference states for white paper. The current print rule only changes body colors; inherited bright component colors need their own treatment.

## Implementation sequence

1. **Inventory and baseline.** Refresh the `gh-pages` snapshot before implementation. Record every page, heading ID, cross-page fragment, page-to-source mapping, and existing content discrepancy. Capture desktop and phone screenshots. Keep existing links, canonical URLs, sitemap entries, and source provenance intact.
2. **Prototype three representative pages.** Build the homepage, Get started, and How it works in a separate `gh-pages` worktree. These exercise the introduction, dense client paths, long reference content, and all three signature devices. Use actual text and the original proof output. Establish typography, palette roles, and both navigation layouts before polishing decoration.
3. **Review the direction.** Compare the prototype with the current site at desktop and phone sizes. Run a written task script with three to five readers who have not seen the site, timing each task: identify rutter's purpose, choose a client, reach a sibling doc from halfway through an article, locate a subsection, find a limitation, and say whether a given reference in the proof still resolves. Revise if the visual metaphor slows any task. Then judge each signature device by name with all texture disabled: do partial coverage (both lights), the dead zone, the closing record, and the brand lockup each still read as Static Drift rather than a generic dark docs theme? Cut any that do not.
4. **Apply the shared shell.** Port the navigation and layout to all nine HTML pages. Keep the homepage composition distinct while sharing masthead, type, colors, and focus behavior. A small checked build-time template may prevent navigation drift; it must emit ordinary HTML and preserve the existing source mapping. A runtime application shell is unnecessary.
5. **Verify content and accessibility.** Diff visible content against the Markdown sources, confirm that recorded output copies byte-identically, check every closing record's path and hash prefix against `sources.json`, check all URLs and fragment targets, and test the matrix below. Review all applicable WCAG 2.2 A/AA criteria. Resolve failures before release.
6. **Prepare publication separately.** Record the tested site revision and browser/assistive-technology results. Preserve valid `sources.json` hashes for unchanged source content; update provenance, including closing records, only when the underlying content changes. Run `npm run site-drift` against the candidate worktree's manifest, remembering that this checks hashes, not HTML fidelity. Today the script cannot do this: `scripts/site-drift.mjs` always reads `sources.json` from `origin/gh-pages`, falling back to `gh-pages`, so a passing run would validate the currently published site, not the proposed one. As an implementation prerequisite, add an explicit option that selects the manifest, either a file path (`--manifest <path>`) or a git revision (`--ref <rev>`), and have the script print which manifest it read. Run it with that option pointed at the candidate. Publish through the repository and verify the live pages as a later implementation task.

### Review matrix and definition of done

| Review | Required coverage |
| --- | --- |
| Layout | All nine pages at 320, 390, 768, 1024, and 1440 CSS pixels; short landscape windows; long navigation labels; brand lockup wraps cleanly beside or beneath the wordmark without crowding the site navigation |
| Enlargement | 200% text sizing, 400% browser zoom, and text-spacing overrides on all page types |
| Keyboard | Complete navigation and setup-reading journeys; backwards tabbing; skip links; expanded and collapsed disclosure; fragment jumps; overflow regions |
| Breakpoint changes | Collapse the directory at narrow width, then widen past the breakpoint: the full list is exposed. Repeat with JavaScript disabled after manually closing it: the summary stays visible and reopens the list. Widen with focus on the summary: focus moves to the current-page link. Narrow with focus on a directory link: focus moves to the summary. Focus never lands in hidden content |
| Assistive technology | VoiceOver with Safari is required. NVDA with Firefox needs a Windows machine; if none is available, record it as a known gap in the release notes, not a silent pass. Verify landmarks, current location, disclosure state, table relationships, heading order, and that reference states are announced by their wording |
| Preferences | Reduced motion, forced colors, stylesheet/JavaScript failure (directory open at every width), and printed output |
| Automated checks | Accessibility scan on every page and disclosure state, contrast checks including hatched and ruled surfaces, HTML validation, internal-link/anchor checks, and closing-record hashes against `sources.json` |
| Content | All original claims, caveats, commands, version qualifications, and proof output retained; no fabricated telemetry; no margin-note text without a Markdown source; brand line present and identical on every page |

The implementation is ready when readers can move between documentation siblings from deep within an article, navigation remains usable under zoom, all applicable AA requirements pass with recorded evidence, and the field-log composition is recognizable across both wide and narrow layouts. The design must earn its distinctiveness through the arrangement of real information: one lit signal, references that honestly show where they lead or do not, and a record at the end of every page.
