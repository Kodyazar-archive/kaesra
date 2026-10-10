# Molecular Studio — Jüri Sunumu: Konuşma Metni + Operasyon Rehberi

Kodyazar CodeJam · ~8–10 dakika · Türkçe ana metin, sonda İngilizce ayna bölüm (English mirror).
Tüm düğme/ad etiketleri TR arayüzünden birebir alınmıştır; parantez içinde EN karşılığı vardır.

---

## 0. Ön Kontrol Listesi (sunumdan önce, sahne dışı)

- [ ] `npm install` bir kez çalıştırılmış, `npm run dev` ayakta (Vite; terminal çıktısındaki `http://localhost:5173` adresi açık).
- [ ] Tarayıcı penceresi **en az 1680×940**; tam ekran (F11) önerilir. Alt durum çubuğundaki kısayol ipucu yalnızca geniş ekranda (xl) görünür.
- [ ] **localStorage notu:** oturum otomatik kaydedilir (`molecular-studio:autosave:v1`, 800 ms debounce) ve açılışta geri yüklenir; ekranda "Otomatik kaydedilen oturum geri yüklendi" (Restored autosaved session) bildirimi belirir. Temiz başlangıç için üst çubuktan **"Yeni"** (New) → boş "Untitled" proje. Dil seçimi de kalıcıdır (`molecular-studio:lang:v1`); sunumdan önce araç çubuğundaki **TR / EN** anahtarının TR'de olduğunu doğrula.
- [ ] Varsayılan açılış molekülü sudur ("Water — H₂O"); tur ve ölçüm adımları bunun üzerinden çalışır. "Yeni" ile boşalttıysan turdan önce sol panelden **"Örnekler"** (Examples) → **"Su"** (Water) yükle (tur için ≥2 atom şart).
- [ ] Hoş geldin modalı ilk açılışta otomatik gelir; Esc ile de kapanır.
- [ ] Sahne öncesi son prova: "Canlı demo" bir kez baştan sona izlendi (~35 sn), fotoğraf modu kapatıldı, araç "Seç" durumunda.

---

## 1. Açılış (0:00–0:40)

**Ekranda:** Hoş geldin modalı — CodeJam logosu, "Kodyazar CodeJam" rozeti, başlık "Molecular Studio", alt başlık "3D molekül modelleme tezgâhı" (3D molecular modeling workbench).

**Söylenecekler:**

> "Molecular Studio, Kodyazar CodeJam için geliştirilmiş, tarayıcıda çalışan tamamen etkileşimli bir 3D molekül modelleme tezgâhı. React 19 + TypeScript + Vite + React Three Fiber + Zustand + Tailwind v4. Arayüz tamamen iki dilli: Türkçe varsayılan, araç çubuğundaki TR/EN anahtarıyla İngilizceye geçiyor ve seçim localStorage'da kalıcı."

- Modalın altındaki dürüstlük notunu oku (bir cümle): "Geometri geçerli koordinatlardan ölçülür; özellikler yayımlanmış sabitlerden türetilir — kuantum-kimya hesabı değildir."
- İki düğmeyi göster: **"Turu başlat"** (Take the tour) → rehberli turu başlatıp modalı kapatır; **"Stüdyoya gir"** (Enter the studio) → doğrudan stüdyo.
- **Aksiyon:** "Turu başlat"a bas (zaten 2. adım). Tur 4 özellik maddesini sayar: "Gerçek 3D geometri, canlı ölçüm" · "Bağ kurma ve VSEPR doğrulaması" · "Uzaklık ve açı ölçümü" · "Moleküler sahneler ve rehberli tur".

---

## 2. Rehberli Tur (0:40–2:00)

**Nasıl başlatılır:** Hoş geldin modalındaki "Turu başlat" ya da araç çubuğundaki klaket simgeli **"Rehberli tur"** (Guided tour) düğmesi (≥2 atom yoksa pasiftir). Kartın üstünde "REHBERLİ TUR · n/6" sayacı ve **"Turu bitir"** (End tour) düğmesi görünür; **Esc** turu anında bitirir.

**6 durak** (her durak ~4,2 sn, kamera uçuşu 1,5 sn; toplam ~25–30 sn — bu sırada konuş):

1. **Atom** — "Oksijen (O) — atom numarası 8. Küre boyutu ve CPK rengi yayımlanmış sabitlerden gelir." (EN: "Oxygen (O) — atomic number 8. Sphere size and CPK color come from published constants.")
2. **Bağ** — "Bir bağ: ortaklanmış elektron çiftleri molekülü bir arada tutar. Ölçülen uzunluk 0.958 Å." (EN: "A bond: shared electron pairs hold the molecule together. Measured length 0.958 Å.")
3. **Açı** — "Bağ açısı koordinatlardan canlı ölçülür: 104.5°. VSEPR ideal biçimi öngörür." (EN: "Bond angle measured live from coordinates: 104.5°. VSEPR predicts the ideal shape.")
4. **Ölçüm** — "Ölçüm modu: uzaklık için iki atom seçin, üçüncüsü açıyı ekler." (EN: "Measure mode: pick two atoms for a distance, a third adds the angle.")
5. **Doğrulama** — "Her düzenleme canlı doğrulanır: aşırı valans hata, kopuk parçalar uyarı olur." (EN: "Every edit is validated live: over-valence becomes an error, fragments a warning.")
6. **Dışa aktarma** — "Projeyi JSON dışa aktarın, PNG anlık görüntü alın ya da sayfayı yenileyin — oturum otomatik kaydedilir." (EN: "Export the project as JSON, save a PNG snapshot, or reload — your session autosaves.")

**Vurgu cümlesi:** "Altyazılardaki sayılar sabit metin değil — tur, o anki molekülün gerçek koordinatlarından hesaplanan değerleri basıyor."

---

## 3. Canlı Demo (2:00–4:30)

**Nasıl başlatılır:** Araç çubuğundaki kıvılcım simgeli **"Canlı demo"** (Live demo; tam başlık: "Canlı demo: stüdyonun molekül inşa etmesini izle" — Live demo: watch the studio build a molecule). Karta "CANLI DEMO" etiketi ve **"Demoyu bitir"** (End demo) düğmesi gelir; Esc de bitirir. Demo kendi projesini sıfırdan kurar (`newProject`), yani autosave durumu etkilemez. Toplam ~35 sn; anlatımını altyazıların üstüne bindir.

**Gerçek demo adımları ve birebir altyazılar (sırayla, TR — EN):**

| # | Ekranda olan | Altyazı (TR) | Caption (EN) |
|---|---|---|---|
| 1 | Proje sıfırlanır, kamera çerçeveler | "Canlı demo — stüdyo suyu sıfırdan inşa ediyor" | "Live demo — the studio builds water from scratch" |
| 2 | Oksijen (0,0,0)'a eklenir | "Oksijen merkezde" | "Oxygen placed at the origin" |
| 3 | İlk H (0.757, 0.586, 0) | "İlk hidrojen, oksijenden 0.958 Å" | "First hydrogen, 0.958 Å from the oxygen" |
| 4 | İkinci H (−0.757, 0.586, 0); açı yayı belirir | "İkinci hidrojen — 104.5° açısı kendiliğinden belirir" | "Second hydrogen — the 104.5° angle appears on its own" |
| 5 | Bağ aracı: O–H1 bağı, kıvılcım FX | "Bağ kuruldu — kıvılcım ortak elektron çiftini işaretler" | "Bond formed — the spark marks the shared electron pair" |
| 6 | O–H2 bağı (altyazısız) | — | — |
| 7 | Ölçüm aracı: H1→O seçimi | "Ölçüm modu: O–H canlı koordinatlardan 0.958 Å" | "Measure mode: O–H reads 0.958 Å from live coordinates" |
| 8 | Üçüncü seçim H2; açı yayı | "Üçüncü seçim ortadaki atomda açıyı ekler: 104.5°, deneysel değer" | "A third pick adds the angle at the middle atom: 104.5°, the experimental value" |
| 9 | Oksijen seçilir, Inspector dolar | "Inspector: Z=8, VSEPR biçimi, ölçülen ve ideal açı" | "Inspector: Z=8, VSEPR shape, measured vs ideal angle" |
| 10 | Örnek kütüphanesinden benzen yüklenir | "Örnek kütüphanesi: benzen — düzlem aromatik halka, Kekulé bağları" | "Example library: benzene — planar aromatic ring, Kekulé bonds" |
| 11 | "Benzen rezonansı" sahnesi ~7 sn oynar | "Sahne: Kekulé rezonansı — mertebeler değişir, hibrit eşdeğer kalır" | "Scene: Kekulé resonance — orders swap, the hybrid stays equivalent" |
| 12 | Su + "Uzay dolgusu" görünümü | "Uzay dolgusu: gerçek ölçekte van der Waals yüzeyleri" | "Space-fill: van der Waals surfaces at true scale" |
| 13 | Fotoğraf modu: döner tabla | "Fotoğraf modu: stüdyo ışığında döner tabla" | "Photo mode: turntable under studio light" |
| 14 | Kapanış kartı | "Bitti — az önce gördüğünüz her şey etkileşimli. Sıra sizde." | "Done — everything you just saw is interactive. Your turn." |

**Dürüst uyarılar canlı görünür — bunu özellikle söyle:** Adım 2–4 arasında, atomlar henüz bağlanmadığı için araç çubuğundaki doğrulama hapı sarıya döner ve "N uyarı" gösterir: izole atom ("…hiçbir şeye bağlı değil") ve kopuk parça ("Yapıda N ayrık parça var") uyarıları. Bağlar kurulunca hap yeşile ("yapısal hata yok") döner. Mesaj: "Uygulama inşa sırasında bile yalan söylemiyor — yarım yapıyı geçerli gibi göstermiyor."

---

## 4. Elle İnşa (4:30–6:30)

Sahne sende. Sıra:

1. **Atom ekleme** — **"Atom Ekle"** (Add Atom) aracı, kısayol **A**. Sol paneldeki **"Element"** paletinden (15 element: H, C, N, O, S, P, F, Cl, Br, I, Na, Mg, Ca, Fe, Cu; CPK rengi + atom numarasıyla) elementi seç; ızgara düzlemine tıklayınca atom (x, 0, z)'ye yerleşir. İpucu kartı: "Seçili elementi yerleştirmek için ızgara düzlemine tıklayın". Boş projede ortada "Boş proje — A tuşuna basıp düzleme tıklayarak atom ekleyin ya da sol panelden bir örnek yükleyin." kartı görünür.
2. **Sürükle-bağla jesti** — **"Bağ"** (Bond) aracı, kısayol **B**. Bir atoma **basılı tutup** ikinci atoma **sürükle ve bırak** → bağ kurulur, bağ orta noktasında camgöbeği kıvılcım halkası patlar. Sürüklerken kesikli önizleme çizgisi kaynağı hedefe bağlar; kaynak atom seçiliyken nabız gibi atar. **Yedek akış (click-click):** birinci atoma tıkla (kaynak olur, nabız başlar), ikinci atoma tıkla → bağ. İpucu kartı: "Bir atomdan diğerine sürükleyerek bağ kurun · ya da iki atoma tıklayın · bağa tıklamak mertebesini döndürür".
3. **Bağ mertebesi 1→2→3** — Zaten bağlı iki atom arasında bağ jestini tekrarla → mertebe döner (tek → çift → üçlü; silindir 1/2/3 şerit olarak çizilir). Alternatif: bağa tıklayıp seç, **1 / 2 / 3** tuşlarına bas ya da Inspector'daki "Bağ" kartındaki 1-2-3 düğmelerini / sol paneldeki **"Bağ mertebesi"** (Bond order) bölümünü kullan ("yeni bağlara uygulanır; bir bağı seçip tıklayınca mertebesini ayarlar").
4. **Silme + çözünme efekti** — **"Sil"** (Delete) aracı, kısayol **D**. Atoma tıkla → atom ve ona bağlı tüm bağlar silinir, atom CPK renginde parçalara ayrılıp çözünür (dissolve FX). Bağa tıkla → yalnız bağ silinir (kıvılcım FX). Efektler geçicidir, geçmişe yazılmaz (küçük bir event bus üzerinden: `src/lib/bus.ts`).
5. **Geri al / yinele** — **Ctrl+Z** / **Ctrl+Shift+Z** (Ctrl+Y de yinele). Araç çubuğundaki **"Geri al"** (Undo) ve **"Yinele"** (Redo) düğmeleri; geçmiş 60 adım. Atom taşıma sürüklemesi bırakınca tek geçmiş kaydı olur.
6. **Valans dürüstlüğü anı (bilinçli olarak hata yap):** Bir su yükle ya da O + 3 bağ kur; oksijene **üçüncü** bağı ekle (O'nun desteklediği azami valans 2). Doğrulama hapı anında kırmızıya döner: "1 hata"; Inspector'daki Molekül kartında hata satırı: "…3 bağa sahip ama … nötr bir yapıda en fazla 2 destekler." (EN: "…has 3 bonds but … supports at most 2 in a neutral structure."). Sonra Ctrl+Z ile geri al, hapın yeşile dönüşünü göster.
   **Söylenecek cümle:** "Doğrulayıcı, nötr atomlar için sezgisel valans kurallarıdır ve arayüzde 'idealleştirilmiş' diye etiketlenir — kuantum hesabı değil, ama uydurmuyor da: neyi kontrol ettiğini açık söylüyor."

---

## 5. Sahneler (6:30–8:00)

Sol paneldeki **"Sahneler"** (Scenes) bölümü. Dört sahne, deterministik (zamanın saf fonksiyonu; `Math.random` yok), döngüsel; alt kartta ilerleme çubuğu, "Ns / Ms" sayacı ve canlı altyazı var.

| Sahne (TR) | (EN) | Alt başlık TR | Süre |
|---|---|---|---|
| "Su titreşim modları" | Water vibrational modes | "ν₁ gerilme · ν₂ bükülme · ν₃ gerilme" | 12 sn |
| "Suyun oluşumu" | Formation of water | "2 H₂ + O₂ → 2 H₂O" | 10 sn |
| "Buz → su → buhar" | Ice → water → vapor | "Fazlar boyunca hidrojen bağı ağı" | 12 sn |
| "Benzen rezonansı" | Benzene resonance | "Kekulé yapıları A ⇌ B" | 10 sn |

**Öneri akış:** "Buz → su → buhar"ı başlat (faz altyazıları: buzda O···O ≈ 2.75 Å altıgen örgü → sıvıda geçici H-bağı ağı → buharda serbest moleküller), sonra "Benzen rezonansı" (mertebeler A⇌B arasında **adım fonksiyonuyla** değişir, asla ara değer almaz; altyazı: "gerçek molekül rezonans hibrididir, bağlar eşdeğerdir (1.39 Å)").

**İki kritik not:**

- Bölümün altındaki dipnotu sesli oku: **"Şematik animasyon — kuantum simülasyonu değildir"** (Schematic animation — not a quantum simulation). Aynı dipnot sahne kartında da görünür. Suyun oluşumu altyazısı bile dürüst: "şematik koreografi; gerçek tepkime radikaller üzerinden yürür".
- **Herhangi bir yapısal düzenleme aktif sahneyi anında iptal eder** ve kontrolü kullanıcıya geri verir (store'daki her `mutate` çağrısı `sceneActive: null` yapar). Sahnede atom ekleyip bunu canlı gösterebilirsin.

---

## 6. Ölçüm ve İnceleme (8:00–9:00)

1. **"Ölç"** (Measure) aracı, kısayol **E**. İpucu kartı: "Uzaklık için 2 atom seçin · 3.sü açıyı ekler · Esc temizler".
2. **2 atom** → aralarında kesikli altın çizgi + uzaklık etiketi, 3 ondalık Å (ör. "0.958 Å"). **3. atom** → açı **ORTADAKİ (ikinci seçilen) atomda** ölçülür ve yay + etiket (1 ondalık°) çizilir. Aynı atoma tekrar tıklayınca seçimden çıkar; Esc tüm ölçümleri temizler.
3. Bir atom seç → sağdaki Inspector'da **"Seçili Atom"** (Selected Atom) kartı: atom numarası, atom kütlesi, değerlik elektronları, bağ mertebesi toplamı / valans, bağlı atomlar (tıklanabilir), van der Waals ve kovalent yarıçap, CPK rengi; **Geometri** alt bloğunda **VSEPR biçimi** ("idealleştirilmiş; nötr atomlar varsayar" etiketiyle), **ölçülen açı (koordinatlardan)** ve **ideal açı (VSEPR)** yan yana. Sudaki O için: "Açılı" (Bent), ölçülen 104.5° vs ideal 104.5°. Fe/Cu için VSEPR "geçerli değil" (not applicable) döner — çünkü geçiş metallerinde bu model uygulanmaz.
4. Bağ seç → **"Bağ"** kartı: mertebe düğmeleri (1/2/3), **"Uzunluk (ölçülen)"** ve referans olarak **"Σ kovalent yarıçap (ref)"**.
5. **Molekül kartı:** Hill formülü, **"Molar kütle"** (üzerine gelince: "IUPAC 2021 ortalama atom ağırlıkları — tam kütle değil"), atom/bağ/**"Parçalar"** (fragments) sayıları, doğrulama listesi.

**Vurgu:** "Hiçbir sayı veri tabanından ezberlenmiyor — uzunluklar ve açılar her karede sizin 3B koordinatlarınızdan ölçülüyor."

---

## 7. Dosyalar ve Kapanış (9:00–10:00)

1. **Dışa aktarma** — araç çubuğundaki **"Dışa aktar"** (Export): belgelenmiş `.molstudio.json` formatında indirir (dosya adı proje adından türer). Format: `{ app: "molecular-studio", version: 1, name, molecule: { atoms: [{id, element, position:[x,y,z] Å}], bonds: [{id, a, b, order: 1|2|3}] } }`. Atom id'leri kararlı dizelerdir; bağlar id'lere referans verir.
2. **İçe aktarma** — **"Aç"** (Open): sıkı doğrulayıcı her alanı kontrol eder; bilinmeyen element, sarkan bağ referansı, kendine bağ, geçersiz mertebe/konum, yinelenen id → "Invalid file: …" hatasıyla reddedilir. Bozuk dosya uygulamayı asla çökertmez.
3. **PNG anlık görüntü** — viewport'un sağ üstündeki kamera düğmesi ("PNG anlık görüntü kaydet" — Save PNG snapshot): `molecular-studio.png` indirir.
4. **Fotoğraf modu** — diyafram düğmesi ("Fotoğraf modu: döner tabla + stüdyo ışığı" — Photo mode: turntable + studio light): ızgara/gizmo/aracı ipuçları gizlenir, stüdyo ışığında döner tabla (turntable) başlar. Kapanış görseli için ideal.
5. **Kapanış cümlesi önerisi:**
   > "Molecular Studio bir hesap makinesi değil, dürüst bir tezgâh: ölçtüğünü ölçüyor, bilmediğini 'şematik' ve 'idealleştirilmiş' diye etiketliyor, her adımınızı geri alınabilir tutuyor ve tüm arayüzü iki dilde. Kodyazar CodeJam için yaptık — sıra sizde, deneyin."

---

## Klavye Kısayol Tablosu (App.tsx — birebir)

| Tuş | İşlev (TR) | (EN) |
|---|---|---|
| **V** | Seç aracı | Select tool |
| **M** | Taşı aracı | Move tool |
| **A** | Atom Ekle aracı | Add Atom tool |
| **B** | Bağ aracı | Bond tool |
| **D** | Sil aracı | Delete tool |
| **E** | Ölç aracı | Measure tool |
| **1 / 2 / 3** | Bağ mertebesi (bağ seçiliyse uygular) | Bond order (applies to selected bond) |
| **Ctrl+Z** | Geri al | Undo |
| **Ctrl+Shift+Z** (veya **Ctrl+Y**) | Yinele | Redo |
| **F** | Molekülü çerçevele | Frame molecule |
| **Esc** | Seçim + ölçüm temizler; sırayla demoyu / turu / sahneyi bitirir | Clears selection & measure picks; ends demo / tour / scene (in that order) |

Not: Kısayollar input/textarea içinde tetiklenmez; Meta/Alt kombinasyonları yok sayılır. Viewport HUD düğmeleri: sağ üstte çerçevele / PNG / fotoğraf modu; sol altta "Atom etiketleri", "Koordinat ızgarası", "Bağ açısı açıklamaları", perspektif⇄ortografik geçişi.

## Bir Şey Ters Giderse (Yedek Plan)

- **Esc her şeyi sakinleştirir:** aktif demoyu/turu/sahneyi bitirir, seçimi ve ölçüm seçimlerini temizler. Panik düğmesi Esc.
- **Yanlış mı tıkladın?** Ctrl+Z (60 adımlık geçmiş). Araç çubuğundaki "Geri al"/"Yinele" düğmeleri de aynı iş.
- **Sayfa çöktü / yanlışlıkla yenilendi?** Sorun değil — autosave localStorage'dan geri yüklenir; sunuma kaldığın yerden devam et ("Otomatik kaydedilen oturum geri yüklendi" bildirimi bunu doğrular).
- **Molekül ekran dışında mı?** F (çerçevele).
- **Tur düğmesi soluk/pasifse:** molekülde ≥2 atom yoktur — "Örnekler" → "Su" yükle.
- **Demo sıkışırsa:** "Demoyu bitir" veya Esc, sonra "Canlı demo"ya tekrar bas (demo her seferinde sıfırdan, deterministik başlar).
- **Aktif sahne elle düzenlemeyi yutuyor mu?** Düzenleme zaten sahneyi iptal eder; ayrıca sahne düğmesine tekrar tıklayıp durdurabilirsin.
- **Son çare:** "Yeni" + "Örnekler" → "Su" ile bilinen iyi duruma 10 saniyede dön; gerekiyorsa sayfayı yenile (autosave korur).
- Sunumda aksayan bir adım olursa atla: bölümler bağımsızdır (tur/demo/sahneler/ölçüm birbirine bağımlı değil).

## Soru-Cevap Cephanesi (Sert Gerçekler)

- **Formül sistemi:** Hill gösterimi — C önce, H sonra, kalanlar alfabetik (ör. etanol C2H6O). `molecularFormula()` her render'da atom listesinden hesaplanır.
- **Parçalar (fragments):** bağlar üzerinden bağlı bileşenler (DFS); >1 atomlu yapıda 1'den fazla parça varsa uyarı üretilir; Inspector'da "Parçalar" satırında sayı görünür.
- **Doğrulama kuralları (`chemistry.ts::validate`), tam liste:**
  - **HATA:** bağ mertebesi toplamı > elementin azami valansı → "… has N bonds but X supports at most M in a neutral structure." (nötr yapıda imkânsız).
  - **UYARI:** valans toplamı 0 → izole atom ("… is not bonded to anything.").
  - **UYARI:** toplam, elementin yaygın valans listesinde yok → "Possible radical or charge." (olası radikal veya yük).
  - **UYARI:** >1 kopuk parça → "Structure has N disconnected fragments."
  - Valanslar element tablosunda sabit: H [1], C [4], N [3,5], O [2], F [1], P [3,5], S [2,4,6], Cl [1,3,5,7], Br [1,3,5], I [1,3,5,7], Na [1], Mg [2], Ca [2], Fe [2,3], Cu [1,2].
- **VSEPR:** sterik sayı = komşu + yalnız çift (yalnız çiftler nötr atomun değerlik elektronlarından defter tutulur). Eşlemeler: 2-0 Doğrusal (180°), 3-0 Üçgen düzlem (120°), 2-1 ve 2-2 Açılı (104.5°), 4-0 Dört yüzlü (109.5°), 3-1 Üçgen piramit (107°). UI'da "idealleştirilmiş; nötr atomlar varsayar" etiketi; Fe/Cu → "geçerli değil".
- **Klavye kısayolları:** yukarıdaki tablo, `src/App.tsx`'te tek global dinleyicide.
- **JSON formatı (`.molstudio.json`):** `app: "molecular-studio"`, `version: 1`, `name`, `molecule.atoms[{id, element, position:[x,y,z] (Å, sağ el, y-yukarı)}]`, `molecule.bonds[{id, a, b, order:1|2|3}]`. İçe aktarmada sıkı doğrulama: yinelenen id, bilinmeyen element, sonlu olmayan/3'lü olmayan konum, eksik atoma referans, kendine bağ, geçersiz mertebe → ret + hata mesajı.
- **Kalıcılık:** molekül + proje adı localStorage'a debounce'lu (800 ms) otomatik kaydedilir; dil tercihi ayrı anahtarda; FX ve sahne durumu asla kaydedilmez.
- **Nesnel veriler:** molar kütle IUPAC 2021 ortalama atom ağırlıkları (H 1.008, C 12.011, O 15.999 g/mol → su 18.015); kovalent yarıçaplar Cordero; vdW yarıçaplar Bondi (Fe/Cu Alvarez 2013); CPK/Jmol renkleri; su geometrisi deneysel 0.958 Å / 104.5°; buz O···O ≈ 2.75 Å; benzen C–C 1.39 Å, C–H 1.09 Å.
- **Yaşayan sahne detayları:** bağlı olmayan atom çiftleri 2.2–3.4 Å aralığındaysa soluk, nabızlı kesikli H-bağı parıltısı çizilir; derinlik partikülleri deterministik hash gürültüsüyle yerleştirilir.
- **İDDİA EDİLMEYENLER (dürüstlük sınırımız):** kuantum-kimyasal enerji, orbital, pKa, reaksiyon enerjisi HESAPLANMAZ ve gösterilmez; sahneler şematiktir; valans/VSEPR nötr-atom sezgiselidir. Uygulamanın hiçbir yerinde hesaplanmış gibi sunulan sayı yoktur — ölçülen geometri + yayımlanmış sabitler.

---
---

# English Mirror (condensed script — same flow)

## 0. Pre-flight

- [ ] `npm install` done once; `npm run dev` running (Vite, `http://localhost:5173`).
- [ ] Browser at **1680×940 or larger**, fullscreen recommended (status-bar shortcut hint only shows on xl screens).
- [ ] **localStorage:** the session autosaves (`molecular-studio:autosave:v1`, 800 ms debounce) and is restored on launch with a "Restored autosaved session" toast. For a clean start press **"Yeni"** (New) → empty "Untitled" project. Language persists too (`molecular-studio:lang:v1`); confirm the toolbar **TR / EN** switch before presenting.
- [ ] Default molecule at first launch is water ("Water — H₂O"); tour and measure steps use it. If you reset with New, load **"Örnekler"** (Examples) → **"Su"** (Water) first — the tour needs ≥2 atoms.
- [ ] Rehearse the **"Canlı demo"** (Live demo) once end-to-end (~35 s); leave photo mode off, tool on Select.

## 1. Opening (0:00–0:40)

Welcome modal shows the CodeJam logo, the "Kodyazar CodeJam" badge, title "Molecular Studio", subtitle "3D molecular modeling workbench".

> "Molecular Studio is a fully interactive 3D molecular modeling workbench built for the Kodyazar CodeJam. React 19 + TypeScript + Vite + React Three Fiber + Zustand + Tailwind v4. The UI is fully bilingual — Turkish by default, switchable to English from the toolbar, persisted to localStorage."

Read the modal's honesty footnote: "Geometry is measured from the current coordinates; properties derive from published constants — not a quantum-chemical calculation." Two buttons: **"Turu başlat"** (Take the tour) and **"Stüdyoya gir"** (Enter the studio). Click Take the tour.

## 2. Guided tour (0:40–2:00)

Start via the modal button or the toolbar clapperboard **"Rehberli tur"** (Guided tour; disabled below 2 atoms). Card shows "GUIDED TOUR · n/6" and an **"End tour"** button; **Esc** ends it. Six stops (~4.2 s each, ~25–30 s total): 1 atom (CPK color/size from published constants), 2 bond (measured length 0.958 Å), 3 angle (measured live: 104.5°, VSEPR predicts the ideal shape), 4 measure mode (two picks = distance, third adds the angle), 5 validation (over-valence = error, fragments = warning), 6 export (JSON, PNG snapshot, autosave on reload). Key line: "The numbers in the captions are not hard-coded — the tour computes them from the live molecule."

## 3. Live demo (2:00–4:30)

Toolbar Sparkles button **"Canlı demo"** (Live demo). Card: "LIVE DEMO" + **"Demoyu bitir"** (End demo); Esc also stops it. The demo resets the project itself, ~35 s, fully deterministic. Beats with real captions (EN — TR):

1. Reset + frame — "Live demo — the studio builds water from scratch" (Canlı demo — stüdyo suyu sıfırdan inşa ediyor)
2. O at origin — "Oxygen placed at the origin" (Oksijen merkezde)
3. First H — "First hydrogen, 0.958 Å from the oxygen" (İlk hidrojen, oksijenden 0.958 Å)
4. Second H — "Second hydrogen — the 104.5° angle appears on its own" (İkinci hidrojen — 104.5° açısı kendiliğinden belirir)
5. O–H bond + spark FX — "Bond formed — the spark marks the shared electron pair" (Bağ kuruldu — kıvılcım ortak elektron çiftini işaretler)
6. Second bond (no caption)
7. Measure H→O — "Measure mode: O–H reads 0.958 Å from live coordinates" (Ölçüm modu: O–H canlı koordinatlardan 0.958 Å)
8. Third pick — "A third pick adds the angle at the middle atom: 104.5°, the experimental value" (Üçüncü seçim ortadaki atomda açıyı ekler: 104.5°, deneysel değer)
9. Select O — "Inspector: Z=8, VSEPR shape, measured vs ideal angle" (Inspector: Z=8, VSEPR biçimi, ölçülen ve ideal açı)
10. Benzene — "Example library: benzene — planar aromatic ring, Kekulé bonds" (Örnek kütüphanesi: benzen — düzlem aromatik halka, Kekulé bağları)
11. Resonance scene ~7 s — "Scene: Kekulé resonance — orders swap, the hybrid stays equivalent" (Sahne: Kekulé rezonansı — mertebeler değişir, hibrit eşdeğer kalır)
12. Space-fill water — "Space-fill: van der Waals surfaces at true scale" (Uzay dolgusu: gerçek ölçekte van der Waals yüzeyleri)
13. Turntable — "Photo mode: turntable under studio light" (Fotoğraf modu: stüdyo ışığında döner tabla)
14. Close — "Done — everything you just saw is interactive. Your turn." (Bitti — az önce gördüğünüz her şey etkileşimli. Sıra sizde.)

Point out the honest mid-build warnings: between beats 2–5 the validation pill goes amber ("N warnings": isolated atoms, disconnected fragments) and returns to green ("no structural errors") once bonds exist. The app never pretends a half-built molecule is valid.

## 4. Hands-on build (4:30–6:30)

1. **Add** — **"Atom Ekle"** (Add Atom), key **A**; pick from the 15-element palette (CPK colors + atomic numbers); click the grid plane to place at (x, 0, z).
2. **Drag-to-bond** — **"Bağ"** (Bond), key **B**: press an atom, drag onto another, release → bond + cyan spark ring at the midpoint, dashed preview while dragging, source atom pulses. Click-click fallback: click atom one (becomes source), click atom two.
3. **Bond order cycling** — repeat the bond gesture between already-bonded atoms to cycle 1→2→3 (drawn as 1/2/3 strands); or select a bond and press **1/2/3**, or use the Inspector bond card / **"Bağ mertebesi"** (Bond order) panel.
4. **Delete + dissolve FX** — **"Sil"** (Delete), key **D**: click an atom → it and its bonds dissolve into CPK-colored shards; click a bond → removed with a spark. FX are transient, never stored in history (event bus `src/lib/bus.ts`).
5. **Undo/redo** — Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y); toolbar **"Geri al"** (Undo) / **"Yinele"** (Redo); 60-step history; a drag commits as one entry on release.
6. **Valence honesty moment** — give oxygen a **third** bond (O max valence = 2). The pill turns red ("1 errors") and the Inspector reads "…has 3 bonds but … supports at most 2 in a neutral structure." Undo, show it go green. Say: "The validator is heuristic rules for neutral atoms, labeled 'idealized' in the UI — not quantum chemistry, and it doesn't pretend to be."

## 5. Scenes (6:30–8:00)

Left panel **"Sahneler"** (Scenes). Four deterministic captioned choreographies (pure function of time, no `Math.random`), looping, with progress bar + second counter:

| Scene (EN) | (TR) | Subtitle | Duration |
|---|---|---|---|
| Water vibrational modes | "Su titreşim modları" | ν₁ stretch · ν₂ bend · ν₃ stretch | 12 s |
| Formation of water | "Suyun oluşumu" | 2 H₂ + O₂ → 2 H₂O | 10 s |
| Ice → water → vapor | "Buz → su → buhar" | Hydrogen-bond network across phases | 12 s |
| Benzene resonance | "Benzen rezonansı" | Kekulé structures A ⇌ B | 10 s |

Both critical notes: the footnote "Schematic animation — not a quantum simulation" ("Şematik animasyon — kuantum simülasyonu değildir") is printed on the panel and the scene card; and **any structural edit instantly cancels the active scene** and hands control back (every `mutate` sets `sceneActive: null`). Resonance flips orders as a step function, never interpolated; formation's own caption admits "the real reaction proceeds via radicals".

## 6. Measure & inspect (8:00–9:00)

**"Ölç"** (Measure), key **E**: 2 picks = dashed gold line + distance chip (3 decimals, Å); a 3rd pick adds the angle **at the MIDDLE (second-picked) atom** (arc + chip, 1 decimal). Re-click an atom to unpick; Esc clears. Selected atom → Inspector: atomic number, mass, valence electrons, bond-order sum, clickable neighbors, vdW/covalent radii, CPK color; Geometry block: VSEPR shape (labeled "idealized; assumes neutral atoms"), measured angle from coordinates vs ideal VSEPR angle. For water's O: Bent, 104.5° vs 104.5°. Fe/Cu → "not applicable". Selected bond → order buttons, measured length, Σ covalent radii reference. Molecule card: Hill formula, molar mass (tooltip: "IUPAC 2021 average atomic weights — not exact mass"), atom/bond/fragment counts, validation list. Punchline: "Nothing is looked up per molecule — lengths and angles are measured from your coordinates every frame."

## 7. Files & close (9:00–10:00)

**"Dışa aktar"** (Export) → documented `.molstudio.json`: `{ app, version: 1, name, molecule: { atoms:[{id, element, position:[x,y,z] Å}], bonds:[{id, a, b, order:1|2|3}] } }`, stable string ids. **"Aç"** (Open) → strict parser rejects unknown elements, dangling bond refs, self-bonds, bad orders/positions, duplicate ids ("Invalid file: …"); a broken file can never crash the app. Camera HUD button → `molecular-studio.png` snapshot. Aperture button → photo mode (turntable + studio light, HUD hidden). Closing line: "Molecular Studio isn't a calculator, it's an honest workbench: it measures what it can measure, labels everything heuristic as 'schematic' or 'idealized', keeps every step undoable, and speaks two languages. Built for the Kodyazar CodeJam — your turn."

## Keyboard cheat sheet & fallbacks

Keys: V select · M move · A add · B bond · D delete · E measure · 1/2/3 bond order · Ctrl+Z undo · Ctrl+Shift+Z (or Ctrl+Y) redo · F frame · Esc clear selection/measure and end demo/tour/scene. Fallbacks: Esc calms everything; Ctrl+Z (60 steps) fixes misclicks; a reload restores the autosave; F re-frames; a dimmed tour button means <2 atoms (load the Water example); a stuck demo → End demo/Esc → restart (deterministic); last resort → New + Water example, or reload the page.

## Q&A hard facts

Hill formula (C, H, then alphabetical); fragments = connected components over bonds; validation = 1 error rule (bond-order sum > max valence) + 3 warning rules (isolated atom, unusual valence sum → "possible radical or charge", disconnected fragments); per-element valence tables (H [1], C [4], N [3,5], O [2], F [1], P [3,5], S [2,4,6], Cl [1,3,5,7], Br [1,3,5], I [1,3,5,7], Na [1], Mg [2], Ca [2], Fe [2,3], Cu [1,2]); VSEPR map 2-0 Linear 180°, 3-0 Trigonal planar 120°, 2-1/2-2 Bent 104.5°, 4-0 Tetrahedral 109.5°, 3-1 Trigonal pyramidal 107°; JSON format + strict importer as above; autosave debounced 800 ms; IUPAC 2021 weights (water 18.015 g/mol), Cordero covalent radii, Bondi vdW (Alvarez 2013 for Fe/Cu), CPK/Jmol colors, experimental water 0.958 Å / 104.5°, ice O···O ≈ 2.75 Å, benzene C–C 1.39 Å / C–H 1.09 Å; H-bond glints for unbonded pairs at 2.2–3.4 Å. **NOT claimed:** no QM energies, no orbitals, no pKa, no reaction energetics — measured geometry + published constants only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
