/**
 * WebBluetooth Client
 *
 * Bluetooth termal yazıcılar genelde SPP (Serial Port Profile) veya
 * BLE (Bluetooth Low Energy) protokolü kullanır.
 * 
 * Chrome'un WebBluetooth API'si sadece BLE destekler. ESC/POS yazıcıları
 * genelde SPP kullanır ama son yıllarda BLE + SPP çift desteği yaygın.
 * 
 * Kullanılan service UUID'leri (popüler yazıcılar için):
 * - 0000ff00-0000-1000-8000-00805f9b34fb (Nordic UART ve Xprinter)
 * - 000018f0-0000-1000-8000-00805f9b34fb (Generic SPP over GATT)
 * - 49535343-fe7d-4ae5-8fa9-9fafd205e455 (MicroChip transparent UART)
 */

// WebBluetooth API minimum tip tanımları (TypeScript lib henüz tam desteklemiyor)
/* eslint-disable @typescript-eslint/no-explicit-any */
type BluetoothDevice = any;
type BluetoothRemoteGATTCharacteristic = any;
type NavigatorBluetooth = {
  bluetooth: {
    requestDevice: (opts: object) => Promise<BluetoothDevice>;
    getDevices?: () => Promise<BluetoothDevice[]>;
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function getBluetoothNavigator(): NavigatorBluetooth | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as NavigatorBluetooth;
  if (!nav.bluetooth) return null;
  return nav;
}

// Yaygın yazıcı GATT service UUID'leri
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic
  '0000ff00-0000-1000-8000-00805f9b34fb', // Nordic/Xprinter
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // MicroChip
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',  // Bazı Epson modelleri
];

// Characteristic UUID'leri (yaygın yazma kanalları)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WRITE_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
];

type BluetoothPrinterDevice = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
};

// Cache aktif bağlantıları (device id → connected characteristic)
const connectionCache = new Map<string, BluetoothPrinterDevice>();

/**
 * Bluetooth yazıcı eşleştir (kullanıcıya seçim dialog'u açar)
 * Eşleştirilmiş cihazın id'sini döndürür — bu DB'ye kaydedilir
 */
export async function pairBluetoothPrinter(): Promise<{
  success: boolean;
  deviceId?: string;
  deviceName?: string;
  error?: string;
}> {
  try {
    const nav = getBluetoothNavigator();
    if (!nav) {
      return {
        success: false,
        error: 'Bu tarayıcı Bluetooth desteklemiyor. Chrome, Edge veya Opera kullanın.',
      };
    }

    const device: BluetoothDevice = await nav.bluetooth.requestDevice({
      // Tüm cihazları göster (ESC/POS yazıcılar çok farklı isimler kullanıyor)
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    return {
      success: true,
      deviceId: device.id,
      deviceName: device.name || 'Yazıcı',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Eşleştirme iptal edildi';
    // Kullanıcı iptal etti — hata değil
    if (msg.includes('cancel') || msg.includes('User cancel')) {
      return { success: false, error: 'Eşleştirme iptal edildi' };
    }
    return { success: false, error: msg };
  }
}

/**
 * Bluetooth cihazına bağlan ve yazma karakteristiğini bul
 */
async function connectToPrinter(deviceId: string): Promise<BluetoothPrinterDevice | null> {
  // Cache'te var mı ve hala bağlı mı?
  const cached = connectionCache.get(deviceId);
  if (cached && cached.device.gatt?.connected) {
    return cached;
  }

  // Device'ı getDevices ile bul (önceden eşleştirilmiş olmalı)
  // Not: Chrome henüz getDevices'ı tam desteklemiyor — kullanıcı her seferinde seçmeli
  // Bu yüzden eşleştirme diyaloğu her yazdırmada açılabilir
  let device: BluetoothDevice | null = null;

  const nav = getBluetoothNavigator();
  if (!nav) {
    throw new Error('Bu tarayıcı Bluetooth desteklemiyor');
  }

  try {
    if (nav.bluetooth.getDevices) {
      const devices = await nav.bluetooth.getDevices();
      device = devices.find((d: BluetoothDevice) => d.id === deviceId) || null;
    }
  } catch {
    // getDevices desteklenmiyor - ignore
  }

  if (!device) {
    // Re-pair zorunlu - user dialog açılacak
    device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });
  }

  if (!device || !device.gatt) {
    throw new Error('Yazıcı bulunamadı');
  }

  // GATT bağlantısı
  const server = await device.gatt.connect();

  // Uygun service ve characteristic'i bul
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  for (const serviceUuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();

      // Write-able karakteristikleri dene
      for (const ch of characteristics) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          characteristic = ch;
          break;
        }
      }
      if (characteristic) break;
    } catch {
      // bu service yok, sıradakini dene
    }
  }

  if (!characteristic) {
    throw new Error('Yazıcı yazma kanalı bulunamadı. Yazıcı tipi desteklenmiyor olabilir.');
  }

  const result = { device, characteristic };
  connectionCache.set(deviceId, result);
  return result;
}

/**
 * ESC/POS byte'larını Bluetooth üzerinden yazıcıya gönder
 *
 * Büyük veri için chunk'lara böl (BLE MTU limiti ~20-512 byte)
 */
export async function sendToBluetoothPrinter(
  deviceId: string,
  bytes: Uint8Array
): Promise<{ success: boolean; error?: string }> {
  try {
    const conn = await connectToPrinter(deviceId);
    if (!conn) return { success: false, error: 'Yazıcıya bağlanılamadı' };

    const { characteristic } = conn;
    const chunkSize = 180; // Güvenli BLE chunk boyutu

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      try {
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunk);
        } else {
          await characteristic.writeValue(chunk);
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Yazdırma hatası',
        };
      }

      // Küçük bekleme (yazıcı buffer'ı aşmasın)
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Yazıcı bağlantı hatası',
    };
  }
}

/**
 * Browser desteğini kontrol et
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}
