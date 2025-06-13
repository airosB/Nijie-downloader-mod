![icon](/public/icon.png)

# Nijie Downloader Mod

Browsers extension for download images in nijie.info.

![screenshot](/screenshot.png)

## Build

`npm i && npm run build`

## Fork版の独自要素（オリジナル版からの変更点）
- Chrome Extension Manifest v3 対応
- ニジエの仕様変更に追従し、複数画像をすべてフルサイズ取得できるように修正
- ページ番号を常に3桁でゼロ埋めする `${padPage}` オプションを追加
- ダウンロードボタンを適当に目立たせる
- アイコンも適当に変える
