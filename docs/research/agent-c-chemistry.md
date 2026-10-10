# Agent C — Chemistry & Scientific Accuracy Review

Project: Molecular Studio (browser 3D molecular editor, React+TS, no WASM).
Hard rule honored throughout: **never present an approximation as a computed chemical truth.**

Scope: research only. Nothing in `src/` or configs was modified.

Evidence note: web search/fetch tooling returned no usable results in this session (search endpoint
returned empty result blocks; `WebFetch` failed with a model-availability error; npmjs.com HTML
returned 403). The RDKit.js size figures below are therefore **measured directly** from the npm
registry JSON and the package tarball (`curl`, downloaded and listed locally, 2026-10-10). All
chemistry constants are from standard primary literature (cited inline) and should be treated as
transcription, not as something re-derived at runtime.

---

## 1. RDKit.js (`@rdkit/rdkit`) — GO / NO-GO

### Measured facts (2026-10-10)

| Item | Value | Source |
|---|---|---|
| Latest version | `2026.9.1` | npm registry JSON |
| License | BSD-3-Clause | npm registry JSON |
| `dist.unpackedSize` | **7,500,381 B (7.15 MiB)** | npm registry JSON |
| `dist.fileCount` | 5 | npm registry JSON |
| Tarball download size | **2,449,562 B (2.34 MiB)** | measured `curl` download |
| `dist/RDKit_minimal.wasm` | **7,379,879 B (7.04 MiB)** | tarball listing |
| `dist/RDKit_minimal.js` | 106,667 B (104 KiB) | tarball listing |
| `dist/RDKit_minimal.d.ts` | 9,528 B | tarball listing |
| Entry point | `./dist/RDKit_minimal.js` | package.json `main`/`exports` |
| Wasm subpath export | `"./RDKit_minimal.wasm"` | package.json `exports` |

Key structural consequence: the wasm is a **separate ~7 MB asset that must be served**, not
inlined. Under Vite that means copying it to `public/` or importing with `?url` and pointing
`locateFile` at it — one more build-config step, and one more thing to get wrong offline.
Payload weight is ~7 MB over the wire (wasm compresses poorly relative to text; the 2.34 MB
tarball figure is gzip-of-everything and is *not* what the browser pays).

### Functional fit against this project's actual needs

What the app needs, and whether MinimalLib serves it:

1. **Formula (Hill) / molar mass from an atom list the user just built.** MinimalLib's route in is
   SMILES/MOLBLOCK → `Mol`. It does not take "an array of atoms + perceived bonds in 3D". You would
   have to serialize to MOLBLOCK on every edit and round-trip it. Descriptors come back as a nested
   JSON blob from the descriptor API rather than a clean `getFormula()` call. (Verify the exact
   shape at runtime — I could not fetch the API docs in this session, so I am **not** asserting
   key names.)
2. **Validity / valence.** MinimalLib's `get_mol()` returns **null on sanitization failure**; the
   reason lands as a message on the module's error stream. Turning that into the four distinct,
   human-readable messages this UI wants (over-valent / under-valent / isolated atom / disconnected
   fragments) means re-deriving them yourself anyway — the value-add is near zero.
3. **Bond lengths and angles from current coordinates.** Pure vector math. RDKit adds nothing.
4. **VSEPR labels.** Not an RDKit feature. Written by us regardless.
5. **Per-frame / per-drag interactivity.** A 7 MB async-instantiated wasm module with
   JS↔wasm string marshalling is the wrong tool for measuring a bond length at 60 fps on a
   30-atom molecule. Our own `O(n²)` distance loop is exact, synchronous, and free.

### Verdict: **NO-GO** (confirms the default expectation)

Reasons, in deadline order:

- ~7 MB self-hosted wasm asset + Vite asset wiring inside a 2-hour window.
- Async init means every consumer needs a loading state and a failure path before the app renders
  anything chemical — high integration risk, poor demo-failure mode.
- The two things it would genuinely help with (formula, mass) are a ~60-line table lookup we have to
  write anyway to display CPK colors and radii.
- The things that dominate this app (coordinate geometry, VSEPR, honest validation copy) are
  **not** RDKit features.

**Where RDKit *would* have been right:** SMILES parsing, aromaticity perception, substructure
matching, 2D depiction, real descriptor suites (logP, TPSA), stereochemistry. If the project later
adds "paste a SMILES", revisit then — as a **lazy-loaded** optional extra behind a user action, not
a startup dependency. Keep the chemistry core behind an interface so that swap is possible.

---

## 2. Constants and rules — verification

### 2.1 Standard atomic weights (IUPAC 2021 abridged) — all correct as specified

Use these exact values (g/mol):

H 1.008 · C 12.011 · N 14.007 · O 15.999 · F 18.998 · Na 22.990 · Mg 24.305 · P 30.974 ·
S 32.06 · Cl 35.45 · K — · Ca 40.078 · Fe 55.845 · Cu 63.546 · Br 79.904 · I 126.904

Two honesty notes:
- Cl (35.45) and S (32.06) are elements whose standard atomic weight is an **interval** in nature
  (Cl [35.446, 35.457]); IUPAC publishes the conventional single value. Using it is correct, but
  the label should say *average atomic weight (natural isotopic abundance)*.
- Display molar mass to **2–3 decimals**, never more. Printing `18.0152843 g/mol` implies precision
  the inputs do not have.
- Do **not** label this "exact mass" — exact/monoisotopic mass is a different calculation using
  the mass of the most abundant isotope (H₂O: 18.0106 vs 18.015).

### 2.2 Covalent radii (Cordero et al., *Dalton Trans.* 2008, 37, 2832) — single-bond, Å

H 0.31 · C 0.76 · N 0.71 · O 0.66 · F 0.57 · Na 1.66 · Mg 1.41 · P 1.07 · S 1.05 · Cl 1.02 ·
K — · Ca 1.76 · Fe 1.32 · Cu 1.32 · Br 1.20 · I 1.39

Correct as planned. Two flags:
- **Fe is coordination-dependent** in the source (1.23 low-spin / 1.32 high-spin, CN 6). Use 1.32;
  it is the permissive choice and Fe only appears here in demo contexts.
- Pyykkö's radii differ slightly (P 1.11, S 1.03, Fe 1.16). That is fine — just **cite one set
  consistently** in the tooltip ("covalent radii: Cordero 2008") so the numbers are traceable and
  the bond cutoff is reproducible.

### 2.3 van der Waals radii — one correction needed: source mixing is unavoidable, label it

Bondi 1964 (*J. Phys. Chem.* 68, 441) covers main group only. Fe and Cu are **not in Bondi**;
take those from Alvarez 2013 (*Dalton Trans.* 42, 8617):

H 1.20 · C 1.70 · N 1.55 · O 1.52 · F 1.47 · P 1.80 · S 1.80 · Cl 1.75 · Br 1.85 · I 1.98 ·
Na 2.27 · Mg 1.73 · Ca 2.31 · **Fe 2.05 (Alvarez)** · **Cu 1.96 (Alvarez)**

Also note: if vdW radii drive sphere sizes in the 3D view, the result is space-filling-scale and
will look correct only if atoms are drawn at a fraction of r_vdW or bonds are hidden. Cosmetic, but
decide it deliberately.

### 2.4 CPK colors (Jmol convention) — correct, two legibility traps

H `#FFFFFF` · C `#909090` · N `#3050F8` · O `#FF0D0D` · F `#90E050` · Na `#AB5CF2` ·
Mg `#8AFF00` · P `#FF8000` · S `#FFFF30` · Cl `#1FF01F` · Ca `#3DFF00` · Fe `#E06633` ·
Cu `#C88033` · Br `#A62929` · I `#940094`

- **H white and S yellow both vanish on a white background.** Either fix the viewport background to
  a dark or mid-grey neutral, or give spheres a rim/dark outline. This is the single most likely
  "looks broken" screenshot in a demo.
- C `#909090` vs H `#FFFFFF` is low contrast on grey backgrounds; the standard fix is lighting plus
  a subtle specular, not a palette change. Keep CPK — it is what chemists expect.

### 2.5 Valence sets — correct, with three required additions

Confirmed: H {1} · C {4} · N {3,5} · O {2} · F {1} · S {2,4,6} · P {3,5} · Fe {2,3}.

- **N {3,5} is right but the 5-valent cases are charge-separated in real Lewis structures**
  (nitro, N-oxides). Accepting 5 silently is defensible for a heuristic editor; do not present
  "N with 5 bonds" as a neutral-atom fact in a tooltip.
- **Cu {1,2}** — not specified in the plan; add it. Cu(II) is far more common; Cu(I) appears in
  cuprous salts. Na {1}, Mg {2}, Ca {2} as expected.
- **Cl {1,3,5,7}, Br {1,3,5}, I {1,3,5,7}** — chlorates/perchlorates and periodates are real. If
  you only allow {1} you will produce false errors on legitimate structures. F stays strictly {1}.

### 2.6 Bond-order inference is the plan's largest correctness gap ⚠️

Distance-based perception yields **connectivity only**. "Sum of bond orders vs valence set" needs
bond orders, and nothing in the plan assigns them. Consequences:

- CO₂ perceived as O–C–O single bonds → C sums to 2 → **false "under-valent" warning on a textbook
  molecule**. Same failure for benzene (every C would sum to 3 → all six carbons flagged), ethene,
  acetone, phosphate, sulfate.
- This will fire on four of the six example molecules. It is the most visible accuracy bug available
  to a judge.

Two acceptable fixes, pick one and label it:

**(A) Preferred for 2 hours — order from length, template-seeded.**
For the example molecules the bond orders are *known from the template*; set them explicitly and
label them "bond orders from the reference structure, not detected". For user-built atoms, infer
order from the reduced ratio `d / (r_cov_i + r_cov_j)`:

| ratio | order |
|---|---|
| > 1.05 | no bond |
| 0.90 – 1.05 | single |
| 0.78 – 0.90 | double |
| < 0.78 | triple |

Sanity-checked against real values: C–H 1.09/1.07 = 1.02 → single ✓. C–C 1.52/1.52 = 1.00 → single ✓.
C=C 1.33/1.52 = 0.875 → double ✓. C≡C 1.20/1.52 = 0.79 → double (boundary; acceptable, and it is
why this must be labeled a heuristic). C=O 1.21/1.42 = 0.85 → double ✓. C–O 1.43/1.42 = 1.01 →
single ✓. CO₂ C=O 1.16/1.42 = 0.82 → double ✓. Benzene C–C 1.39/1.52 = 0.914 → single (correct for
a Kekulé-free editor; see aromaticity note below).

**(B) Safer for accuracy claims — validate connectivity, not order.**
Message: *"Connectivity check only — bond orders are not assigned from geometry."* Then report
neighbor counts vs a coordination range instead of valence sums. Zero false errors, weaker feature.

**Aromaticity:** do not claim it. Geometry can find a planar 6-ring, but "aromatic" is an electronic
property. Wording: *"planar 6-membered ring detected"* — never *"aromatic ring"*.

### 2.7 Bond-perception threshold `d < r_cov(i) + r_cov(j) + 0.4 Å` — sane, needs two guards

0.4 Å matches common practice (OpenBabel ≈ 0.45, RDKit `DetermineBonds` ≈ 0.4). Verified against
real geometries:

| pair | cutoff (Å) | actual (Å) | result |
|---|---|---|---|
| C–H | 1.47 | 1.09 | bonded ✓ |
| O–H | 1.37 | 0.958 | bonded ✓ |
| C–C | 1.92 | 1.52 | bonded ✓ |
| C=C | 1.92 | 1.33 | bonded ✓ |
| C≡C | 1.92 | 1.20 | bonded ✓ |
| C=O (CO₂) | 1.82 | 1.16 | bonded ✓ |
| O–O (peroxide) | 1.72 | 1.47 | bonded ✓ |
| Fe–N (heme) | 2.43 | 1.98–2.05 | bonded ✓ |
| H···H (CH₄) | 1.02 | 1.776 | not bonded ✓ |
| H···H (H₂O) | 1.02 | 1.515 | not bonded ✓ |
| H···H (NH₃) | 1.02 | 1.624 | not bonded ✓ |
| C···C meta (benzene) | 1.96 | 2.41 | not bonded ✓ |
| O···H (H-bond) | 1.37 | 1.8–2.0 | not bonded ✓ |

No false positives or negatives in any of the six examples. Add:

1. **A lower bound.** In an interactive editor a user *will* drag two atoms on top of each other.
   Require `d > 0.6 Å` (or `d > 0.7 × (r_i + r_j)`) or you get 0.0 Å "bonds" and NaN angles.
2. **A valence cap during perception.** If an atom exceeds its maximum valence from raw distances,
   keep the shortest bonds up to the cap and surface a single clear message
   (*"atoms overlap — 4 bonds detected on carbon"*) instead of silently drawing nonsense.
3. **Ionic caveat.** NaCl: cutoff 1.66+1.02+0.4 = 3.08 vs actual 2.36 → perceived as bonded, and
   valence passes. Geometrically defensible but chemically it is a formula unit, not a molecule.
   If Na/Mg/Ca appear near halides, say *"bonds detected geometrically; ionic compounds are shown
   as connected but are not covalent molecules."*

### 2.8 VSEPR — rule is right, four edge cases must be handled

Base rule as planned: steric number (SN) = neighbor count + lone pairs; multiple bonds count as
**one** region (already implied by using neighbor count — keep it that way).

Lone pairs from neutral valence: `LP = (V_e − Σ bond orders) / 2` where `V_e` = H 1, C 4, N 5,
O 6, F 7, P 5, S 6. Verified: H₂O O → (6−2)/2 = 2 ✓; NH₃ N → (5−3)/2 = 1 ✓; CH₄ C → 0 ✓;
F in HF → (7−1)/2 = 3 ✓; SF₆ S → (6−6)/2 = 0 → octahedral ✓.

1. **Non-integer lone pairs on cations.** NH₄⁺: (5−4)/2 = 0.5. H₃O⁺: (6−3)/2 = 1.5 (truth is 1).
   Use `LP = max(0, floor((V_e − ΣBO)/2))` **and** display the assumption: *"lone pairs assume
   neutral atoms — formal charges are not tracked."* Without that line the NH₄⁺/H₃O⁺ labels are
   quietly wrong and untraceable.
2. **Terminal atoms produce silly labels.** The O in CO₂ has SN 3 → "bent", which is technically
   defensible and pedagogically confusing on a two-atom-count terminal. Suppress shape labels when
   neighbor count < 2, or use *"terminal (2 lone pairs)"*.
3. **Transition metals: VSEPR does not apply.** Fe and Cu must print
   *"VSEPR not applicable to transition-metal centers"* — showing "tetrahedral" for a Cu complex
   from steric number is fabrication-by-omission. Same for Na⁺/Mg²⁺/Ca²⁺ in ionic environments:
   report **coordination number**, not a VSEPR shape.
4. **Ideal vs measured must stay visually separate.** Show *"idealized: tetrahedral (109.5°)"* and
   *"measured from current coordinates: 108.2°"* as two lines. Never merge them into one number, and
   never imply the measurement was predicted.

Reference table (SN, LP → shape): 2,0 linear · 3,0 trigonal planar · 3,1 bent (~120°) ·
4,0 tetrahedral · 4,1 trigonal pyramidal · 4,2 bent (~104.5°) · 5,0 trigonal bipyramidal ·
5,1 seesaw · 5,2 T-shaped · 5,3 linear · 6,0 octahedral · 6,1 square pyramidal ·
6,2 square planar.

---

## 3. Honest UI wording

### 3.1 Safe to show plainly (deterministic, traceable to a cited constant or to the user's own coordinates)

- Hill formula, atom counts, bond count.
- Molar mass — with units `g/mol`, ≤3 decimals, and an info tooltip: *"average atomic weights,
  IUPAC 2021"*.
- Bond lengths, angles, dihedrals, interatomic distances — **these are measurements of the current
  geometry, not predictions.** Header: *"Measured from current coordinates"*.
- Idealized VSEPR shape name for main-group neutral atoms.

### 3.2 Must carry a visible approximation label

| Descriptor | Required label |
|---|---|
| Perceived bonds | *"Bonds detected geometrically from interatomic distance (cutoff r_cov + 0.4 Å); no bond file was read."* |
| Bond orders | *"Bond orders inferred from bond length — heuristic, not from electronic structure."* (or, if option B: *"not assigned"*) |
| Lone pairs / VSEPR | *"Idealized VSEPR; lone pairs assume neutral atoms."* |
| Valence validation | *"Heuristic Lewis-structure check."* |
| Hybridization | *"Inferred from connectivity"* (sp/sp²/sp³ from SN only) |
| Anything electrostatic (dipole, partial charge, EN difference) | *"Crude estimate from electronegativity differences — not a quantum-chemical calculation."* Prefer not to ship it at all in 2 h. |

### 3.3 Never show

Energy, ΔG, pKa, logP, HOMO/LUMO, orbital diagrams, aromaticity, "stable molecule", "correct
structure". No source for any of them here, and each would be a fabrication.

### 3.4 Validation message copy (severity-tagged, non-judgmental)

Frame as *checks*, never as truth about chemistry. A valid-but-unusual structure must not be told
it is wrong.

- Over-valent (error): **"Carbon has 5 bonds — expected 4 for a neutral carbon. This check assumes
  neutral atoms; formal charges are not tracked."**
- Under-valent (warning): **"Nitrogen has 2 bonds — neutral nitrogen usually has 3. This may be a
  radical, an ion, or an unfinished structure."**
- Isolated atom (warning): **"1 atom is not bonded to anything. Distance-based detection found no
  neighbor within 1.47 Å."**
- Disconnected fragments (warning): **"2 separate fragments detected. This may be intended (a salt,
  a complex, or a mixture)."**
- Overlapping atoms (error): **"2 atoms are within 0.4 Å of each other — geometry is not physical."**
- Transition metal center: **"VSEPR is not applicable to Fe/Cu centers."**
- Ionic pair: **"Bonds here were detected geometrically; ionic compounds are formula units, not
  molecules."**

All-clear state should also be hedged, not triumphant:
**"No valence issues found by the heuristic Lewis check."** — not *"Molecule is valid."*

### 3.5 One global line, in the panel footer

> *Geometry is measured from your current 3D coordinates. Properties shown are derived from
> published reference constants and heuristic rules — this is not a quantum-chemical calculation.*

That single sentence discharges the honesty requirement for the whole panel and costs one line.

---

## 4. Example molecules — z-matrix / geometry audit

### Verified experimental values

| molecule | given | experimental | verdict |
|---|---|---|---|
| H₂O | r(OH) 0.958, ∠HOH 104.5 | 0.9578 Å, 104.478° | ✓ correct |
| CH₄ | r(CH) 1.087, ∠HCH 109.47 | 1.087 Å, 109.471° | ✓ correct |
| NH₃ | r(NH) 1.012, ∠HNH 106.7 | 1.012 Å, 106.7° | ✓ correct |
| CO₂ | r(CO) 1.160, ∠OCO 180 | 1.1600 Å, 180° | ✓ correct |
| C₆H₆ | r(CC) 1.39, ∠CCC 120, r(CH) 1.09 | 1.3915 Å, 120°, 1.084 Å | ✓ correct (C–H best value 1.084; 1.09 is fine, see note) |
| C₂H₅OH | CC 1.52, CO 1.43, OH 0.96, CH 1.09, ~109.5 | 1.512, 1.431, 0.971, 1.09; **∠CCC 112.7°, ∠CCO 108.5°** | ⚠️ lengths ✓; the blanket "~109.5°" is not the experimental geometry |

### Corrections and build risks

1. **Ethanol angles.** ∠CCC = 112.7° and ∠CCO = 108.5° experimentally (the C–C–O angle opens/closes
   relative to ideal tetrahedral because of the oxygen lone pairs). Decide one of:
   - use 112.7 / 108.5 / 109.5 → label *"experimental gas-phase geometry"*; or
   - use 109.5 everywhere → label *"idealized tetrahedral geometry"*.
   Mixing them and calling the result "ethanol's geometry" is the inaccuracy to avoid. Also **state
   the conformer**: the anti (trans) O–C–C–H dihedral of 180° is the global minimum.
   Benzene C–H: 1.09 vs 1.084 is a 0.006 Å difference — irrelevant; if you want the "experimental"
   label to be strictly true, use 1.084.
2. **Methane must not be built planar.** With H₁ on +z and the other three at ∠HCH = 109.47° and
   dihedrals 120° / 240°, you get the correct tetrahedron. Self-check the built model:
   **H···H = 1.776 Å**. If you measure 1.53 Å the dihedral set is wrong (a common failure).
3. **Ammonia must be pyramidal.** If three H are placed symmetrically about the C₃ axis, the angle α
   between each N–H and the axis satisfies `cos(106.7°) = cos²α − ½ sin²α` → **α = 67.9°**,
   H at r = 1.012 Å, azimuths 0/120/240°. A z-matrix with a 180° dihedral gives planar NH₃, which
   is wrong and would also make VSEPR report the wrong shape. Self-check: **H···H = 1.624 Å**
   (= 2 × 1.012 × sin 53.35°).
4. **Benzene: build from Cartesian coordinates, not a sequential z-matrix.** A ring closed through
   a chain of internal coordinates accumulates error and may not close exactly; explicit coordinates
   guarantee closure and planarity. Place six C on a circle of radius 1.39 Å in the xy-plane at
   azimuths 0/60/…/300, and six H on radius **2.48 Å** (= 1.39 + 1.09) at the same azimuths.
   Self-checks: C···C(adjacent) 1.39, C···C(meta) 2.41, ring closure error < 0.001 Å,
   all z = 0 (planar). Note ∠CCC comes out exactly 120° from this construction automatically.
5. **CO₂ will trip the valence check** unless bond orders are handled (§2.6). With single-bond
   perception, C sums to 2 and both O to 1 → two spurious warnings on the simplest linear molecule
   in the demo set. Fix per §2.6(A) or (B) before the examples are wired up.
6. **Water's H···H = 1.515 Å** (2 × 0.958 × sin 52.25°) — a cheap regression test for the builder,
   and it confirms the H–H perception cutoff (1.02 Å) does not create a phantom H–H bond.
7. **Round-trip test to keep in the demo path:** build each example, run perception, and assert
   bond count and formula. Expected: H₂O → 2 bonds, HO... (Hill: H₂O); CH₄ → 4 bonds, CH₄;
   NH₃ → 3 bonds, H₃N; CO₂ → 2 bonds, CO₂; C₆H₆ → 12 bonds, C₆H₆; C₂H₅OH → 8 bonds, C₂H₆O.
   These six assertions catch builder, perception, and Hill-ordering bugs at once.

### Hill-system reminder (bites on the ionic examples)

C first, H second, then all remaining symbols alphabetically; if no carbon, everything alphabetical
**including H**. So: methane CH₄, ethanol C₂H₆O, water H₂O, ammonia **H₃N** (not NH₃), and
sodium chloride **ClNa** (not NaCl). The last two are correct Hill and look wrong to a chemist
reading the screen — worth a tooltip: *"Hill notation: C, then H, then alphabetical."* Render
counts as subscripts, not inline digits.

---

## 5. Priority list for the main agent

1. **Bond orders (§2.6)** — decide (A) infer-from-length or (B) connectivity-only, and label it.
   Blocks CO₂/benzene from showing false errors. Highest value per minute.
2. **VSEPR guards (§2.8)** — transition metals, terminal atoms, floor() on lone pairs. Three `if`s.
3. **Perception lower bound (§2.7)** — prevents NaN angles the moment a user drags atoms together.
4. **Panel footer sentence (§3.5)** — one line, discharges the honesty rule globally.
5. **NH₃ pyramidal / CH₄ tetrahedral / benzene Cartesian (§4.2–4.4)** — with the H···H self-checks.
6. **Ethanol angle decision (§4.1)** — pick experimental or idealized, then label consistently.
