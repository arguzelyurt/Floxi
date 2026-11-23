#!/usr/bin/env bash
# Güvenli disk temizliği: SADECE yeniden oluşturulabilen önbellekleri siler.
# Projelerine, kodlarına, fotoğraflarına, belgelerine, Xcode arşivlerine (yüklenen sürümler) ve Çöp Kutusu'na DOKUNMAZ.
# Önce neyin ne kadar yer açacağını gösterir, sen "e" deyince siler.
# Kullanım: npm run clean-disk
set -uo pipefail

DEV="$HOME/Library/Developer"
CACHES="$HOME/Library/Caches"

# Silinebilecek önbellekler (yalnızca bu listedekiler silinir)
TARGETS=(
  "$DEV/Xcode/DerivedData|Xcode derleme artıkları (bir sonraki derlemede yeniden oluşur)"
  "$DEV/CoreSimulator/Caches|Simülatör önbelleği"
  "$CACHES/com.apple.dt.Xcode|Xcode önbelleği"
  "$CACHES/CocoaPods|CocoaPods indirme önbelleği"
  "$CACHES/org.swift.swiftpm|Swift paket önbelleği"
  "$CACHES/Homebrew|Homebrew indirme önbelleği"
  "$HOME/.npm/_cacache|npm indirme önbelleği"
  "$HOME/.eas-build|Eski yerel EAS derleme klasörleri"
  "$HOME/Floxi/_to_delete|Floxi web önizleme arşivleri"
  "$HOME/Floxi/ios/build|Floxi iOS derleme çıktısı"
)

size_kb() { du -sk "$1" 2>/dev/null | awk '{print $1}'; }
human() { awk -v k="$1" 'BEGIN{ if(k>1048576) printf "%.1f GB", k/1048576; else printf "%.0f MB", k/1024 }'; }

echo "Taranıyor…"
total=0
list=()
for t in "${TARGETS[@]}"; do
  p="${t%%|*}"; d="${t#*|}"
  [ -e "$p" ] || continue
  k=$(size_kb "$p"); k=${k:-0}
  [ "$k" -gt 1024 ] || continue
  total=$((total + k)); list+=("$p")
  printf "  %-10s %s\n" "$(human "$k")" "$d"
done

# Eski iOS cihaz destek dosyaları: en yenisi kalır (telefonun güncel iOS'u)
DS="$DEV/Xcode/iOS DeviceSupport"
old_ds=()
if [ -d "$DS" ]; then
  while IFS= read -r line; do old_ds+=("$line"); done < <(ls -1t "$DS" 2>/dev/null | tail -n +2)
  for n in "${old_ds[@]}"; do
    k=$(size_kb "$DS/$n"); k=${k:-0}; total=$((total + k))
    printf "  %-10s %s\n" "$(human "$k")" "Eski iOS cihaz destek dosyası: $n"
  done
fi

free_before=$(df -k "$HOME" | awk 'NR==2{print $4}')
echo
echo "Açılacak alan: $(human "$total")   (şu an boş: $(human "$free_before"))"
echo "Ayrıca: kullanılamayan simülatörler silinir. Projelerin, Xcode arşivlerin ve Çöp Kutusu'na dokunulmaz."
[ "$total" -gt 0 ] || { echo "Silinecek önbellek yok."; exit 0; }
read -r -p "Silinsin mi? (e/h) " ans
[ "$ans" = "e" ] || [ "$ans" = "E" ] || { echo "Vazgeçildi, hiçbir şey silinmedi."; exit 0; }

for p in "${list[@]}"; do rm -rf -- "$p"; done
for n in "${old_ds[@]}"; do rm -rf -- "$DS/$n"; done
xcrun simctl delete unavailable 2>/dev/null || true
command -v brew >/dev/null && brew cleanup -q >/dev/null 2>&1 || true
# ccache'i silmiyoruz (hızlı derlemenin kendisi), sadece 5 GB ile sınırlıyoruz
command -v ccache >/dev/null && ccache -M 5G >/dev/null 2>&1 || true

free_after=$(df -k "$HOME" | awk 'NR==2{print $4}')
echo "✓ Bitti. Boş alan: $(human "$free_before") → $(human "$free_after")"
[ "$free_after" -ge $((15 * 1048576)) ] && echo "Derleme için yeterli: npm run testflight" || echo "Hâlâ 15 GB'ın altında. Çöp Kutusu'nu boşaltmak ya da büyük dosyalara bakmak gerekebilir: du -sh ~/* 2>/dev/null | sort -h | tail"
