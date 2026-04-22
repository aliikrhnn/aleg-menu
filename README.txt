# LINT-FIX v6 - WebBluetooth tip eklendi

bluetooth-client.ts:
- BluetoothDevice ve BluetoothRemoteGATTCharacteristic
  any olarak tanımlandı (TS lib eksik)
- NavigatorBluetooth interface eklendi
- getBluetoothNavigator() helper
- @ts-expect-error directive'leri kaldırıldı
- (navigator as any).bluetooth artık güvenli

9 dosyayı üstüne yaz, push.
