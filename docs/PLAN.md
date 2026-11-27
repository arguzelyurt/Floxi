# Floxi — Oyun Tasarımı ve Faz Planı

## Kısaca

Floxi, 2026'nın en çok kazandıran hybridcasual türü olan "flow / konveyör" bulmacası.
Tahtada piksel bir resim (mozaik) var. Resmin etrafında bir ray dönüyor. Alttaki şeritlerde
renkli boya damlaları (**flox**) sırada bekliyor. Her flox'un bir rengi ve bir **şarjı** (kaç piksel silebileceği) var.

1. Bir şeridin en öndeki flox'una dokunursun, flox raya çıkar ve resmin etrafında **bir tur** atar.
2. Raydaki her durakta, baktığı yöndeki **ilk görünür piksele** bakar. Renk tutarsa o pikseli siler ve şarjı 1 azalır.
3. Şarj biterse flox kaybolur (**temiz tur**). Tur bittiğinde şarjı kalmışsa **rıhtıma** park eder (5 yer).
4. Rıhtımdaki flox'a dokunup tekrar tura gönderebilirsin.
5. Rıhtım doluyken bir flox'un daha park etmesi gerekirse **tıkanırsın**.
6. Resmin tamamı silinince seviye biter.

Dış katmanlar silindikçe içerideki renkler görünür hâle gelir. Bütün strateji, hangi rengi hangi sırayla göndereceğine karar vermek.

## Rakiplerden farkımız (Pixel Flow, Colony Flow, Yarn Flow…)

| Fark | Neden önemli |
|---|---|
| **Sakin mod / sıra tabanlı:** her tur tamamen çözülür, refleks ya da zaman baskısı yok | Rakipler yarı gerçek zamanlı. Biz "düşünerek oynanan" tarafı sahipleniyoruz, geri al da adil kalıyor |
| **Önizleme:** flox'a basılı tutunca hangi pikselleri sileceğini ve kaç şarjın artacağını görürsün | Şansa değil düşünmeye dayalı oyun. Hiçbir rakipte yok |
| **Her seviye çözülebilir garanti:** üretici seviyeyi bir çözüm üzerinden kurar (testler ilk 60 seviyeyi çözücüyle de doğrular) | "İmkânsız seviye" şikâyeti olmaz, ipucu her zaman çalışır |
| **Temiz tur yıldızları:** rıhtıma hiç park etmeden bitirirsen 3 yıldız | Önizlemeyi kullanmaya teşvik eder, ustalık hedefi verir |
| **Günlük Mozaik + paylaşım:** herkese aynı günlük bulmaca, sunucusuz (tohumlu üretim) | Sıfır maliyetle her gün tekrar gelme sebebi |
| **Adil reklam:** oyun ortasında reklam yok, ilk seviyeler reklamsız | Kötü yorum almayı önler |
| **Renk körlüğü modu:** her renge sembol | Erişilebilirlik, mağaza öne çıkarmalarında artı |

## Teknik kısıtlar

- Sunucu ve işletme maliyeti yok. Her şey cihazda çalışıyor, seviyeler tohumla üretiliyor.
- Gelir: IAP + reklam (AdMob).
- Expo SDK 58 + React Native 0.88, TypeScript. Reklam, mağaza, bildirim ve Firebase katmanı hazır.
- Ses yok, sadece titreşim. İstenirse sonra eklenir.

## Fazlar

### Faz 1 — Oynanabilir prototip
- [x] Çekirdek kurallar: ray yolu, görünür piksel, tur simülasyonu, rıhtım, tıkanma
- [x] Üretici: rastgele simetrik piksel resimler + elle çizilmiş 6 resim, çözüm üzerinden flox üretimi
- [x] Çözücü (DFS) + ipucu, katmanlı resimlerle zorluk eğrisi, her 10. seviye "Zor" (rıhtımda bir yer eksik)
- [x] Testler (kurallar, üretici, ilk 60 seviyenin çözülebilirliği)
- [x] Oyun ekranı: tahta, ray animasyonu, şeritler, rıhtım, önizleme, geri al, ipucu, yeniden başla, yıldızlar
- [ ] Gerçek cihazda his testi: tur hızı, dokunma alanları, zorluk eğrisi
- [ ] 10 kişilik test

### Faz 2 — Gelir ve kalıcılık
- [x] AdMob + izin formu + ATT, adil reklam kuralları, ödüllü reklam, mağaza (reklamsız, destekçi, başlangıç, kurtarma, kumbara, coin paketleri, geri yükleme), MMKV kayıt
- [x] Coin ekonomisi, seviye ödülü, reklamla 2 kat coin
- [x] Güçlendiriciler: geri al, ipucu, **öne al** (şeritte arkadaki flox'u gönder), **+1 rıhtım yeri**; tıkanınca reklamla kurtarma (günde 3)
- [x] Engeller: gizli piksel (16+, rengi görünür olunca açılır), kilitli şerit (26+, çözülebilirlik korunarak)
- [ ] Çift renkli flox (ertelendi: şarj dengesini iki renge bölmek üreticiyi karmaşıklaştırıyor, oyuncu testinden sonra karar)
- [x] Firebase (proje: floxi-9517f): Analytics, Crashlytics, Remote Config bağlandı. İlk veriler telefonda geliştirme derlemesi çalışınca görünür
- [ ] Gerçek cihazda reklam + sandbox satın alma testi

Not: İlk planda "Süper Flox" (bir rengi tek turda temizle) vardı. Çıkarıldı, çünkü o renkteki diğer flox'ların şarjı boşa düşer ve rıhtım kilitlenir. Yerine "Öne al" geldi; şarj dengesini bozmuyor.

### Faz 3 — Meta ve tekrar gelme
- [x] Ana menü
- [x] Günlük Mozaik + seri + paylaşım metni
- [x] Koleksiyon albümü (elle çizilmiş 10 resim: ilk 100 seviye)
- [x] Renk körlüğü modu
- [x] Yerel bildirimler (günde en fazla bir: günlük hazır, seri tehlikede, görevler, kumbara, geri dönüş)
- [x] Günlük görevler + sandık
- [ ] 100. seviyeden sonrası için yeni resimler (şu an 10 resim döngüyle tekrar ediyor)

### Faz 3.5 — İlk deneme sonrası (kullanıcı geri bildirimi)
- [x] Flox hızı ayarı (Yavaş/Normal/Hızlı, varsayılan eskisinden yavaş) + tahtaya dokununca turu bitir
- [x] Görsel: kabartmalı pikseller, silinen pikselde patlama, flox'un arkasında iz, ray durak noktaları
- [x] Coin marketi: güçlendirici paketleri, 5 tema, 4 flox görünümü, 4 piksel stili
- [x] Tutarlı tasarım dili: lacivert palet, kartlar, oyunda alttaki rozetli araç kartları
- [x] Alt sekme çubuğu: Ana sayfa · Günlük · Market · Koleksiyon · Ayarlar (Günlük sekmesinde haftalık seri takvimi; Ayarlar'da geliştirme derlemesine özel seviye atlama)

### Faz 4.5 — Hareketli harita: Ray Adaları
- [x] Genel harita: her harita gökyüzünde inip kalkan bir ada, adalar rayla bağlı; flox'lar raydan bulunduğun adaya akar. Adanın üstünde haritanın ilk koleksiyon resmi (bulunduğun adada ilerleme kadar renkli). Biten ada ✓, bulunduğun ada parlar (halka, bayrak, sandık, "Gir"), sıradaki kilitli ada bulut altında kilit titrer, uzaktakiler soluk; piksel kuşlar ve yıldızlar
- [x] Harita içi: seviyeler büyük adada yılan gibi kıvrılan ray üzerinde duraklar (biten yeşil + yıldız, bulunduğun sarı + "Buradasın", kalan gri, Zor seviyede "!", resim seviyesi resim çerçevesi), rayın sonunda harita ödülü sandığı, altta "Sıradaki · Oyna"
- [x] Seviye kartı: durağa dokununca; tahta önizlemesi etrafında dönen flox'lar, yıldızlar, en fazla coin, harita ödülüne kalan seviye, sıradaki resim. Biten seviye tekrar oynanabilir (yalnız yıldız rekoru güncellenir, coin yok)
- [x] Yerleşim hesapları `src/core/mapLayout.ts` (testli), animasyonlar Animated + native driver, yeni yerel paket yok. "Hareketi azalt" açıksa animasyonlar durur
- [ ] Telefonda his testi: animasyon akıcılığı, 45 seviyelik haritalarda kaydırma

### Faz 4 — Yayın (şu an) · ayrıntı: docs/RELEASE.md
- [x] Floxi ikonu, adaptif ikon, açılış ekranı
- [x] Gizlilik politikası + KVKK taslağı (ad/e-posta eksik, herkese açık yapılmalı)
- [x] Mağaza metinleri, ürün listesi, gizlilik beyanları (docs/STORE.md), ekran görüntüleri (store/)
- [x] Yayın ayarları (1.0.0, şifreleme beyanı, reklam içerik sınırı) + `npm run release-check`
- [ ] AdMob uygulama ve reklam birimi kimlikleri
- [ ] Gerçek cihazda reklam + sandbox satın alma testi
- [ ] App Store Connect ve Play Console kurulumu, Play kapalı testi (12 kişi / 14 gün)
- [ ] EAS production derlemesi ve gönderim
- [x] İngilizce arayüz (otomatik dil algılama + Ayarlar'da seçim), İngilizce mağaza metinleri ve görselleri; yayın bütün ülkelere açılabilir
