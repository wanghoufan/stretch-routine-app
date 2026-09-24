#!/bin/bash
# verify-install.sh —— 多机联调铁律的脚本版（经验一句话 2026-09-24）。
# 人会忘，脚本不会：逐台核对型号+版本+截图，不拿 A 机的证据交 B 机的差。
#
# 用法：
#   ./scripts/qa/verify-install.sh <expectVersionName> [serial...]
#   不给 serial 则检查所有在线设备。
# 例：
#   ./scripts/qa/verify-install.sh 1.2.0
#   ./scripts/qa/verify-install.sh 1.2.0 192.168.31.31:5555
#
# 退出码：全部通过为 0，任一失败为 1。

set -u
PKG="com.stretchroutine.v1"
EXPECTED="${1:?用法: $0 <期望版本号> [设备serial...]}"
shift
OUTDIR="/tmp/verify-install-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTDIR"

if [ "$#" -eq 0 ]; then
  DEVICES="$(adb devices | awk '$2=="device"{print $1}')"
else
  DEVICES="$*"
fi

if [ -z "$DEVICES" ]; then
  echo "FAIL: 没有在线设备"
  exit 1
fi

FAIL=0
for D in $DEVICES; do
  MODEL="$(adb -s "$D" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
  VER="$(adb -s "$D" shell dumpsys package "$PKG" 2>/dev/null | grep -m1 versionName | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
  echo "== $D (model=$MODEL): version=$VER (期望 $EXPECTED)"
  if [ "$VER" != "$EXPECTED" ]; then
    echo "   FAIL: 版本不对或未安装"
    FAIL=1
    continue
  fi
  SHOT="$OUTDIR/$D.png"
  adb -s "$D" shell screencap -p /sdcard/verify.png > /dev/null 2>&1
  adb -s "$D" pull /sdcard/verify.png "$SHOT" > /dev/null 2>&1
  if [ -f "$SHOT" ]; then
    echo "   PASS: 截图 ${SHOT}，人工看一眼确认界面"
  else
    echo "   FAIL: 截图失败"
    FAIL=1
  fi
done

echo "证据目录: $OUTDIR"
[ "$FAIL" -eq 0 ] && echo "ALL PASS" || echo "HAS FAIL"
exit "$FAIL"
