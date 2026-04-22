# LINT FIX - react/no-unescaped-entities

## SORUN

JSX text içinde Türkçe metinlerde ' ve " karakterleri var:
  KDS'de → KDS&apos;de
  barista'ya → barista&apos;ya
  "Ürünleri ata" → &quot;Ürünleri ata&quot;

React'ın JSX kuralı: text içinde apostrof ve tırnak escape edilmeli.

## DOSYA (üstüne yaz)

app/panel/(shell)/istasyonlar/stations-manager.tsx

## KOMUT

git add .
git commit -m "Lint: JSX unescaped entities (apostrof/tırnak)"
git push

Bu sefer geçer.
