# Floxi — Yayın Kontrol Listesi

`npm run release-check` kod tarafında eksik kalanları listeler. Hepsi ✓ olunca derleme alınabilir.

## Hazır olanlar (kod tarafı)

- [x] Oyun, ekonomi, reklam/mağaza katmanı, bildirimler, Firebase (floxi-9517f)
- [x] Floxi ikonu, Android adaptif ikon, açılış ekranı (`scripts/make_icon.py` ile yeniden üretilebilir)
- [x] Sürüm 1.0.0; derleme numaraları EAS'ta otomatik artar (`eas.json` → production autoIncrement)
- [x] iOS şifreleme beyanı (`ITSAppUsesNonExemptEncryption = false`): ihracat uyumluluğu sorusu çıkmaz
- [x] Reklam içerik sınırı PG (4+ / Herkes yaş sınıfıyla uyumlu)
- [x] Gizlilik politikası + KVKK aydınlatma metni (taslak yayında, ad/e-posta eksik)
- [x] Ayarlar'da gizlilik politikası bağlantısı, satın alımları geri yükleme, reklam izin tercihleri
- [x] Mağaza metinleri, anahtar kelimeler, ürün listesi, gizlilik beyanları: `docs/STORE.md`
- [x] Ekran görüntüleri İngilizce + Türkçe: iOS 6,7" ×6, Android ×6, Play öne çıkan görseli, Play ikonu: `store/`
- [x] Türkçe + İngilizce arayüz (telefon diline göre otomatik, Ayarlar'dan değiştirilebilir), iOS izin metinleri iki dilde

## Senin yapacakların (sırayla)

### 1. AdMob (≈15 dk)
1. admob.google.com → Uygulamalar → Uygulama ekle → iOS → "Henüz yayınlanmadı" → ad: Floxi
2. Aynısını Android için yap
3. Her uygulamada iki reklam birimi aç: **Geçiş** ve **Ödüllü**
4. Bana dört reklam birimi kimliğini (`ca-app-pub-…/…`) ve iki uygulama kimliğini (`ca-app-pub-…~…`) gönder, ben `app.json` ve `src/services/ads.ts`'ye koyayım
5. Gizlilik ve mesajlaşma → GDPR → mesaj oluştur, iki uygulamayı seç, yayınla

### 2. Gizlilik politikası (≈5 dk)
1. Bana veri sorumlusu olarak yazılacak **ad soyad** ve **destek e-postası** gönder (politikaya ve uygulamaya koyacağım)
2. Politika sayfasını claude.ai'de aç → Paylaş → **herkese açık** yap. Mağazalar giriş istemeyen bir adres ister. İstersen kendi alan adında ya da GitHub Pages'ta da yayınlayabiliriz

### 3. Gerçek cihaz testi (≈30 dk)
1. `npx expo run:ios --device` ile telefona kur
2. App Store Connect → Kullanıcılar ve Erişim → Sandbox test kullanıcısı aç; telefonda Ayarlar → App Store → Sandbox hesabıyla giriş
3. Dükkan'dan bir coin paketi ve Reklamsız'ı sandbox'ta satın al, sonra uygulamayı silip "Satın alımları geri yükle" dene
4. 11. seviyeden sonra geçiş reklamı, tıkanınca ödüllü reklam çıkıyor mu bak (geliştirme derlemesinde test reklamları)

### 4. App Store Connect (Apple geliştirici hesabı onaylanınca)
1. Uygulamalar → + → Yeni uygulama → iOS, ad "Floxi: Color Puzzle", ana dil English (U.S.), paket kimliği `com.floxi.game`, SKU `floxi`; sonra Türkçe dilini ekleyip "Floxi: Renk Bulmacası" metinlerini gir
2. Uygulama içi satın almalar → `docs/STORE.md`'deki 9 ürünü aynı kimliklerle aç
3. Uygulama Gizliliği → `docs/STORE.md`'deki tabloyu gir; gizlilik politikası URL'si
4. Yaş sınırı anketi → beklenen 4+
5. Metinler: İngilizce için `store/ios-6.7-en`, Türkçe için `store/ios-6.7` görselleri
6. Fiyat: Ücretsiz; Kullanılabilirlik: bütün ülkeler

### 5. Google Play Console
1. Uygulama oluştur → Oyun, Ücretsiz, varsayılan dil English (US)
2. Mağaza girişi: İngilizce `store/android-en`, Türkçe çeviri `store/android` görselleri
3. Uygulama içeriği: gizlilik politikası, reklam var, veri güvenliği, içerik derecelendirmesi (IARC), hedef kitle 13+
4. Para kazanma → Ürünler → 9 ürün
5. **Önemli:** Kişisel geliştirici hesabı 2023 Kasım'dan sonra açıldıysa üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün kapalı test** zorunlu. Erkenden başlat

### 6. Derleme ve gönderme

**TestFlight (en hızlı yol, tek komut):**
```bash
npm run testflight
```
Bu Mac'te yerel derler (bulut kuyruğu yok), sadece iOS, ccache ile ikinci derlemeden itibaren çok daha hızlı; bitince .ipa'yı App Store Connect'e yükler. İlk seferde Apple hesabıyla giriş ve sertifika oluşturma soruları gelir, sonra gelmez. Gerekenler: `brew install fastlane cocoapods ccache`, en az 15 GB boş disk.

**Android (Play kapalı test):**
```bash
npx eas-cli@latest build -p android --profile production --local --output build/Floxi.aab && npx eas-cli@latest submit -p android --path build/Floxi.aab
```

## Önerilen sonraki adımlar
- Sonraki diller (gelir potansiyeline göre): Almanca, İspanyolca, Portekizce (Brezilya), Japonca. Yeni dil = `src/i18n/` altına bir dosya
- **app-ads.txt:** AdMob reklam gelirini korumak için geliştirici web sitesinde `app-ads.txt` dosyası önerilir (mağaza sayfasındaki web sitesi alanına o alan adı yazılır)
- 100. seviyeden sonra yeni koleksiyon resimleri
