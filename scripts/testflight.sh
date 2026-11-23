#!/usr/bin/env bash
# Floxi → TestFlight, en hızlı yol:
#   1) Bulut kuyruğu yok: iOS derlemesi bu Mac'te yapılır (eas build --local)
#   2) Sadece iOS derlenir (Android beklenmez)
#   3) ccache + sabit çalışma klasörü: ikinci derlemeden itibaren C/C++ derlemesi önbellekten gelir
#   4) Biten .ipa doğrudan App Store Connect'e yüklenir (eas submit)
# Kullanım: npm run testflight
set -euo pipefail
cd "$(dirname "$0")/.."

APP=Floxi
BUNDLE=com.floxi.game

need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ $1 yok → $2"; exit 1; }; }
need fastlane "brew install fastlane"
need pod "brew install cocoapods"
command -v ccache >/dev/null 2>&1 || echo "• İpucu: 'brew install ccache' ile sonraki derlemeler çok daha hızlı olur"

# Derleme en az ~15 GB boş alan ister
free_gb=$(df -g "$HOME" | awk 'NR==2{print $4}')
if [ "${free_gb:-0}" -lt 15 ]; then
  echo "✗ Diskte ${free_gb} GB boş, en az 15 GB gerekli → npm run clean-disk"
  exit 1
fi

# Yanlış uygulamayı göndermeye karşı son kontrol
node -e "const e=require('./app.json').expo;if(e.name!=='$APP'||e.ios.bundleIdentifier!=='$BUNDLE'){console.error('✗ app.json $APP/$BUNDLE değil');process.exit(1)}"

# Sabit klasör + ccache ayarları: yollar her seferinde aynı olunca önbellek tutar
export EAS_LOCAL_BUILD_WORKINGDIR="$HOME/.eas-build/$APP"
export CCACHE_DIR="$HOME/.ccache"
export CCACHE_BASEDIR="$EAS_LOCAL_BUILD_WORKINGDIR"
export CCACHE_SLOPPINESS="clang_index_store,file_stat_matches,include_file_ctime,include_file_mtime,ivfsoverlay,pch_defines,modules,system_headers,time_macros"
export EXPO_NO_TELEMETRY=1
rm -rf "$EAS_LOCAL_BUILD_WORKINGDIR"
mkdir -p build

IPA="build/$APP-$(date +%Y%m%d-%H%M).ipa"
SECONDS=0
npx --yes eas-cli@latest build -p ios --profile production --local --output "$IPA"
echo "✓ Derleme bitti ($((SECONDS / 60)) dk): $IPA"
npx --yes eas-cli@latest submit -p ios --path "$IPA"
echo "✓ App Store Connect'e yüklendi. İşlenince (10–20 dk) TestFlight'ta görünür."
