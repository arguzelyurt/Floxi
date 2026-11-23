# Floxi

Flow / konveyör türünde renk bulmacası. Renkli flox'ları resmin etrafındaki raya gönder, aynı renkteki
pikselleri sildir, resmi temizle. Tamamen çevrimdışı ve sunucusuz.
Tasarım, farklılaşma ve faz planı için `docs/PLAN.md`'ye bak.

## Çalıştırma

Faz 2'den itibaren reklam, mağaza ve MMKV yerel modül istediği için **Expo Go yetmez**, geliştirme derlemesi gerekir:

```bash
npm install
npx expo run:ios          # Mac'te Xcode ile (simülatör ya da bağlı iPhone)
npx expo run:android      # Android Studio / bağlı telefon
# ya da bulutta: npx eas-cli@latest build --profile development
npm test                  # çekirdek mantık + ekonomi testleri
npm run typecheck
```

Expo Go'da oyun yine açılır: reklam ve mağaza devre dışı kalır, kayıt AsyncStorage'a düşer,
geliştirme modunda ödüllü reklam 1 sn sonra "izlendi" sayılır (akışları test etmek için).

## Yayına çıkmadan önce doldurulacaklar

- `src/services/ads.ts` → `PROD_UNITS`: AdMob panelinden geçiş ve ödüllü reklam birim kimlikleri
- `app.json` → `react-native-google-mobile-ads` eklentisindeki `androidAppId` / `iosAppId` (şu an Google'ın test kimlikleri)
- App Store Connect ve Play Console'da ürünler: kimlikler `src/core/monetization.ts` → `PRODUCTS` (`floxi.*`)
- AdMob → Gizlilik ve mesajlaşma: AB için GDPR mesajı
- Gizlilik politikası + KVKK aydınlatma metni

## Nasıl oynanır

- Bir şeridin en öndeki flox'una **dokun**: flox raya çıkar ve tahtanın etrafında bir tur atar.
- Her durakta baktığı yöndeki **ilk görünür piksel** kendi rengindeyse onu siler (sayı = kalan şarj).
- Şarjı bitmezse **rıhtıma** park eder. Rıhtımdaki flox'a dokunup tekrar gönderebilirsin.
- Rıhtım dolarsa tıkanırsın: geri al, +1 rıhtım yeri ya da yeniden başla.
- **Basılı tut**: o flox'un hangi pikselleri sileceğini önceden gösterir.
- 3 yıldız = hiç park etmeden bitirmek.

## Engeller

- **Gizli piksel (16+):** "?" olarak görünür, rengi ancak raydan görünür hâle gelince açılır. Oyun kuralını değiştirmez, sadece bilgiyi saklar.
- **Kilitli şerit (26+, 46+'da iki tane):** üstündeki sayı kadar piksel silinince açılır. Üretici kilitli şeride yalnızca kilit açıldıktan sonra sıra gelen flox'ları koyar, böylece her seviye çözülebilir kalır.

## Market (coin ile)

Oyunda kazanılan coin'lerle alınır (gerçek para ile satış ayrı: Dükkan).

| Bölüm | Ürünler |
|---|---|
| Güçlendirici | 3 Geri al (80), 3 İpucu (130), 3 Öne al (200), 2 × +1 Yer (250), Karışık paket (450) |
| Tema | Gece (ücretsiz), Okyanus (600), Orman (800), Gün batımı (1.000), Neon (1.500) |
| Flox | Damla (ücretsiz), Parlak (500), Küp (700), Elmas (1.200) |
| Piksel | Klasik (ücretsiz), Boncuk (600), Karo (600), Şeker (900) |

Kozmetikler sadece görünümü değiştirir. Katalog `src/core/market.ts`, görünümler `src/game/skins.ts`.

## Ekranlar

Altta sabit sekme çubuğu: **Ana sayfa** (oyna, Günlük/Koleksiyon kartları, görevler) · **Günlük** (bugünün bulmacası, 7 günlük seri takvimi) · **Market** · **Koleksiyon** · **Ayarlar**. Oyun ekranında sekme çubuğu gizlenir; altta rozetli güçlendirici kartları vardır. Tasarım dili: lacivert palet, kartlar.

## Ayarlar

- **Flox hızı:** Yavaş / Normal / Hızlı (durak başına 70 / 48 / 28 ms). Tur sırasında tahtaya dokununca o tur hemen biter.
- **Renk körlüğü modu**
- **Dil:** Otomatik (telefon Türkçe ise Türkçe, değilse İngilizce) / Türkçe / English. Metinler `src/i18n/tr.ts` ve `en.ts`; yeni metin önce tr.ts'e eklenir, en.ts eksikse typecheck hata verir
- Geliştirme derlemesinde Ayarlar'ın altında seviye atlama ve +1000 coin düğmeleri (yayında görünmez)

## Ana menü ve tekrar gelme

- **Günlük Mozaik:** herkese aynı, tarih tohumlu Zor bulmaca (rıhtım 3, engelli). Günün ilk bitirişi 30 coin, her 7 günlük seride +100. Sonuç paylaşılabilir metin olarak gönderilir.
- **Koleksiyon:** elle çizilmiş 10 resim (5, 15, 25… 95. seviyeler) bitirilince albüme girer.
- **Günün görevleri:** tarih tohumlu 3 görev (herkese aynı), her biri coin verir; üçü bitince sandık (50 coin + 1 ipucu).
- **Yerel bildirimler:** günde en fazla bir; Günlük Mozaik hazır, seri bu gece bitiyor, görevler, kumbara doldu, 3 gün sonra geri dönüş. İzin, ilk Günlük Mozaik ya da 6. seviyeden sonra ana menüde bir kez sorulur.
- **Renk körlüğü modu:** hücrelere ve flox'lara renk sembolleri ekler.

## Güçlendiriciler ve ekonomi

| Güçlendirici | Ne yapar | Coin |
|---|---|---|
| Geri al | Son turu geri alır | 30 |
| İpucu | Çözücünün bulduğu sıradaki hamleyi parlatır (çözüm yoksa ücret alınmaz) | 50 |
| Öne al | Şeritte arkadaki bir flox'u sıradan önce gönderir | 80 |
| +1 Yer | Rıhtıma o seviye için bir yer ekler | 150 |

- Başlangıç envanteri: 5 geri al, 3 ipucu, 2 öne al, 1 yer, 100 coin
- Seviye ödülü: 10 + yıldız başına 5 coin (Zor seviyede 2 kat), ödüllü reklamla 2 kat
- Tıkanınca: günde 3 kez reklamla ücretsiz +1 rıhtım yeri
- Reklam kuralları: ilk oturumda ve ilk 10 seviyede geçiş reklamı yok, en az 3 seviye ve 3 dakika arayla, oyun ortasında asla
- Mağaza: reklamsız, destekçi, başlangıç paketi (15. seviyeden sonra 48 saat), kurtarma paketi, kumbara (30+), coin paketleri

## Yapı

- `src/core/` — saf oyun mantığı (UI'dan bağımsız, test edilir)
  - `rules.ts` ray yolu, görünür piksel, tur, rıhtım, tıkanma, yıldızlar
  - `generator.ts` tohumlu seviye üretici (katmanlı simetrik resimler, çözüm üzerinden flox dizisi), zorluk eğrisi, Günlük Mozaik
  - `pictures.ts` elle çizilmiş resimler (5, 15, 25… seviyeler)
  - `solver.ts` DFS çözücü + ipucu
  - `daily.ts` Günlük Mozaik serisi ve paylaşım metni
  - `missions.ts` günün görevleri, `notifyPlan.ts` bildirim planı
- `src/core/monetization.ts` — adil reklam kuralları, ekonomi, ürün kimlikleri
- `src/services/` — AdMob (`ads.ts`), mağaza (`iap.ts`), bildirimler, Firebase (`firebase.ts`: Analytics, Crashlytics, Remote Config; proje floxi-9517f), ölçüm olayları, uzaktan ayar; `.web.ts` dosyaları web için boş sürümler
- `src/game/` — palet, kayıt (MMKV, yoksa AsyncStorage), satın alma etkileri
- `src/ui/` — ana menü, oyun ekranı (tahta, ray animasyonu, şeritler, rıhtım, güçlendiriciler), koleksiyon, dükkan

## Zorluk eğrisi (ilk ayar)

| Seviye | Tahta | Renk | Şerit | Rıhtım | Not |
|---|---|---|---|---|---|
| 1–6 | 8–10 | 2–3 | 2–3 | 5 | Düz bölgeler, öğretici |
| 7–20 | 10 | 3–4 | 3–4 | 5 | Katmanlı resimler başlar |
| 21–40 | 12 | 5–6 | 4 | 4 | Gerçek zorluk, 16+ gizli piksel, 26+ kilitli şerit |
| 41+ | 13 | 6 | 5 | 4 | |
| Her 10. | | | | −1 | "Zor" seviye |

Rastgele oynayan bot 21. seviyeden sonra kabaca %55–85 kazanıyor. Asıl ayar gerçek cihazda yapılacak.
