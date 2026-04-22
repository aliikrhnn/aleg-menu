/**
 * ESC/POS Termal Yazıcı Komut Üretici
 *
 * Standart ESC/POS protokolü (Epson, Star, Bixolon, Rongta, XPrinter vs.)
 * 58mm (32 karakter/satır) veya 80mm (48 karakter/satır) kağıt
 *
 * Çıktı: Uint8Array - yazıcıya byte dizisi olarak gönderilir
 */

// ============================================================
// ESC/POS Command Bytes
// ============================================================

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Temel komutlar
const CMD = {
  INIT: [ESC, 0x40], // Printer init
  CUT_FULL: [GS, 0x56, 0x00], // Tam kesim
  CUT_PARTIAL: [GS, 0x56, 0x01], // Kısmi kesim
  FEED: (n: number) => [ESC, 0x64, n], // n satır feed
  BEEP: [ESC, 0x42, 0x02, 0x01], // 2 kısa bip

  // Hizalama
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Font boyutu (0-7, genişlik ve yükseklik)
  SIZE_NORMAL: [GS, 0x21, 0x00],
  SIZE_DOUBLE_H: [GS, 0x21, 0x01], // Çift yükseklik
  SIZE_DOUBLE_W: [GS, 0x21, 0x10], // Çift genişlik
  SIZE_DOUBLE: [GS, 0x21, 0x11], // Çift x çift

  // Kalınlık
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],

  // Altı çizgili
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],

  // Ters (siyah arka plan, beyaz yazı)
  REVERSE_ON: [GS, 0x42, 0x01],
  REVERSE_OFF: [GS, 0x42, 0x00],
};

// ============================================================
// Türkçe karakter desteği (CP857)
// ============================================================

// ESC/POS yazıcılar Türkçe için CP857 (Turkish MS-DOS) kullanır
const ESC_POS_TURKISH_CODEPAGE = [ESC, 0x74, 0x0d]; // Select codepage 13 (CP857)

function turkishEncode(text: string): number[] {
  const map: Record<string, number> = {
    // Türkçe karakterler CP857'de
    'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84,
    'à': 0x85, 'å': 0x86, 'ç': 0x87, 'ê': 0x88, 'ë': 0x89,
    'è': 0x8a, 'ï': 0x8b, 'î': 0x8c, 'ı': 0x8d, 'Ä': 0x8e,
    'Å': 0x8f, 'É': 0x90, 'æ': 0x91, 'Æ': 0x92, 'ô': 0x93,
    'ö': 0x94, 'ò': 0x95, 'û': 0x96, 'ù': 0x97, 'İ': 0x98,
    'Ö': 0x99, 'Ü': 0x9a, 'ø': 0x9b, '£': 0x9c, 'Ø': 0x9d,
    'Ş': 0x9e, 'ş': 0x9f,
    'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4,
    'Ñ': 0xa5, 'Ğ': 0xa6, 'ğ': 0xa7,
    '₺': 0xdd, // TL işareti (bazı yazıcılarda)
  };

  const bytes: number[] = [];
  for (const ch of text) {
    if (map[ch] !== undefined) {
      bytes.push(map[ch]);
    } else {
      // ASCII karakter
      const code = ch.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        bytes.push(0x3f); // ? yerine
      }
    }
  }
  return bytes;
}

// ============================================================
// Builder Class
// ============================================================

export class EscPosBuilder {
  private bytes: number[] = [];
  private paperWidth: number; // karakter/satır

  constructor(paperWidth: 32 | 48 = 48) {
    this.paperWidth = paperWidth;
    this.bytes.push(...CMD.INIT);
    this.bytes.push(...ESC_POS_TURKISH_CODEPAGE);
  }

  // Raw byte ekle
  raw(bytes: number[] | number): this {
    if (Array.isArray(bytes)) this.bytes.push(...bytes);
    else this.bytes.push(bytes);
    return this;
  }

  // Türkçe text ekle
  text(s: string): this {
    this.bytes.push(...turkishEncode(s));
    return this;
  }

  // Satır
  line(s: string = ''): this {
    this.text(s);
    this.bytes.push(LF);
    return this;
  }

  // Çift satır atla
  newline(): this {
    this.bytes.push(LF);
    return this;
  }

  // Hizalama
  left(): this {
    this.bytes.push(...CMD.ALIGN_LEFT);
    return this;
  }
  center(): this {
    this.bytes.push(...CMD.ALIGN_CENTER);
    return this;
  }
  right(): this {
    this.bytes.push(...CMD.ALIGN_RIGHT);
    return this;
  }

  // Font
  normalSize(): this {
    this.bytes.push(...CMD.SIZE_NORMAL);
    return this;
  }
  bigText(): this {
    this.bytes.push(...CMD.SIZE_DOUBLE);
    return this;
  }
  tallText(): this {
    this.bytes.push(...CMD.SIZE_DOUBLE_H);
    return this;
  }
  wideText(): this {
    this.bytes.push(...CMD.SIZE_DOUBLE_W);
    return this;
  }

  // Bold
  bold(on: boolean = true): this {
    this.bytes.push(...(on ? CMD.BOLD_ON : CMD.BOLD_OFF));
    return this;
  }

  underline(on: boolean = true): this {
    this.bytes.push(...(on ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF));
    return this;
  }

  reverse(on: boolean = true): this {
    this.bytes.push(...(on ? CMD.REVERSE_ON : CMD.REVERSE_OFF));
    return this;
  }

  // Ayırıcı çizgi
  divider(char: string = '-'): this {
    this.line(char.repeat(this.paperWidth));
    return this;
  }

  // Kalın ayırıcı
  doubleDivider(): this {
    this.line('='.repeat(this.paperWidth));
    return this;
  }

  // Sol-sağ hizalanmış satır (ürün - fiyat gibi)
  twoCol(left: string, right: string): this {
    const spaces = Math.max(1, this.paperWidth - left.length - right.length);
    this.line(left + ' '.repeat(spaces) + right);
    return this;
  }

  // Feed & cut
  feed(n: number = 3): this {
    this.bytes.push(...CMD.FEED(n));
    return this;
  }

  cut(): this {
    this.bytes.push(...CMD.CUT_PARTIAL);
    return this;
  }

  /**
   * QR Code yazdır - ESC/POS GS ( k komutu (Model 2)
   * size: 1-16 (modul boyutu, 4-8 yaygın), errorCorrection: 48-51 (L/M/Q/H)
   */
  qrCode(data: string, size: number = 6, errorCorrection: number = 49): this {
    const dataBytes: number[] = [];
    for (const ch of data) {
      const code = ch.charCodeAt(0);
      dataBytes.push(code < 256 ? code : 0x3f);
    }

    // Model: GS ( k pL pH cn fn n1 n2 (Model 2 = 50)
    this.bytes.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // Module size: GS ( k pL pH cn fn n
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);

    // Error correction: GS ( k pL pH cn fn n
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, errorCorrection);

    // Store data: GS ( k pL pH cn fn m d1...dk
    const dataLen = dataBytes.length + 3;
    const pL = dataLen & 0xff;
    const pH = (dataLen >> 8) & 0xff;
    this.bytes.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...dataBytes);

    // Print: GS ( k pL pH cn fn m
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);

    this.bytes.push(LF);
    return this;
  }

  beep(): this {
    this.bytes.push(...CMD.BEEP);
    return this;
  }

  // Finalize
  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// ============================================================
// Hazır şablonlar
// ============================================================

export type ReceiptOptions = {
  paperWidth?: 32 | 48;
  businessName: string;
  businessTagline?: string;
  businessPhone?: string;
  businessAddress?: string;
  customHeader?: string;
  customFooter?: string;

  // Kasa fişi gösterim ayarları
  showLogo?: boolean;
  logoUrl?: string | null;
  showTagline?: boolean;
  showPhone?: boolean;
  showAddress?: boolean;

  // Değerlendirme QR
  reviewQrEnabled?: boolean;
  reviewQrUrl?: string;
  reviewQrText?: string; // "Deneyiminizi değerlendirin" gibi

  // Mutfak fişi özel ayarları
  kitchenBigFont?: boolean;
  kitchenShowPrices?: boolean;
  kitchenShowNoteHighlight?: boolean;
};

export type OrderForPrint = {
  order_no: string;
  created_at: string;
  order_type: 'dine_in' | 'pickup' | 'delivery';
  table_label?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  note?: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    note?: string | null;
    options?: Array<{
      preset_name: string;
      value_name: string;
      price_delta: number;
    }>;
  }>;
  subtotal: number;
  total: number;
};

function formatMoney(n: number): string {
  return `${n.toFixed(2)} TL`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function orderTypeLabel(t: 'dine_in' | 'pickup' | 'delivery'): string {
  return t === 'dine_in' ? 'MASA' : t === 'pickup' ? 'GEL-AL' : 'PAKET';
}

/**
 * MUTFAK FIŞI - Mutfak/bar istasyonu için (fiyatsız, büyük font)
 * Sadece istasyonun item'larını filtreler
 */
export function buildKitchenTicket(
  order: OrderForPrint,
  opts: ReceiptOptions,
  stationName?: string
): Uint8Array {
  const b = new EscPosBuilder(opts.paperWidth || 48);

  // Ayar varsayılanları
  const bigFont = opts.kitchenBigFont !== false; // default true
  const showPrices = opts.kitchenShowPrices === true; // default false
  const noteHighlight = opts.kitchenShowNoteHighlight !== false; // default true

  // Üst başlık - istasyon adı (büyük font ayarına göre)
  b.center();
  if (bigFont) b.bigText();
  else b.tallText();
  b.bold();
  b.line(stationName?.toUpperCase() || 'MUTFAK');
  b.bold(false).normalSize();
  b.newline();

  // Sipariş numarası - her zaman büyük (kritik bilgi)
  b.center().bigText().bold();
  b.line(`#${order.order_no}`);
  b.bold(false).normalSize();
  b.newline();

  // Masa / Gel-al / Paket
  b.center().tallText().bold();
  if (order.order_type === 'dine_in' && order.table_label) {
    b.line(`MASA: ${order.table_label}`);
  } else {
    b.line(orderTypeLabel(order.order_type));
  }
  if (order.customer_name) {
    b.line(order.customer_name.toUpperCase());
  }
  b.bold(false).normalSize();

  // Tarih
  b.center();
  b.line(formatDateTime(order.created_at));
  b.divider();

  // Ürünler
  b.left();
  order.items.forEach((item, i) => {
    if (bigFont) b.tallText();
    b.bold();

    if (showPrices) {
      const lineTotal = item.quantity * item.unit_price;
      b.twoCol(
        `${item.quantity}x ${item.product_name.toUpperCase()}`,
        formatMoney(lineTotal)
      );
    } else {
      b.line(`${item.quantity}x ${item.product_name.toUpperCase()}`);
    }

    b.bold(false).normalSize();

    // Varyasyonlar
    if (item.options && item.options.length > 0) {
      item.options.forEach((opt) => {
        b.text('  * ').line(opt.value_name);
      });
    }

    // Ürün notu - vurgu ayarına göre
    if (item.note) {
      if (noteHighlight) {
        b.bold().tallText();
        b.line(`  >> ${item.note}`);
        b.bold(false).normalSize();
      } else {
        b.line(`  Not: ${item.note}`);
      }
    }

    if (i < order.items.length - 1) b.newline();
  });

  // Sipariş notu (müşterinin geneli için)
  if (order.note) {
    b.newline().divider();
    if (noteHighlight) {
      b.bold().tallText().line('MÜŞTERİ NOTU:').normalSize();
      b.bold(false);
      b.line(order.note);
    } else {
      b.bold().line('MÜŞTERİ NOTU:').bold(false);
      b.line(order.note);
    }
  }

  // Alt boşluk + kes
  b.feed(4).cut();

  return b.build();
}

/**
 * KASIYER FİŞİ - Tam detaylı, fiyatlı
 */
export function buildCashierReceipt(
  order: OrderForPrint,
  opts: ReceiptOptions
): Uint8Array {
  const b = new EscPosBuilder(opts.paperWidth || 48);

  // Toggle varsayılanları
  const showLogo = opts.showLogo !== false;
  const showTagline = opts.showTagline !== false;
  const showPhone = opts.showPhone !== false;
  const showAddress = opts.showAddress !== false;

  // Logo raster image agent tarafında prepend edilir (logo-raster.js)
  // Burada placeholder basmıyoruz
  // (Bluetooth yazıcılarda logo henüz desteklenmiyor - sonra eklenecek)

  // İşletme adı
  b.center().bigText().bold();
  b.line(opts.businessName.toUpperCase());
  b.bold(false).normalSize();

  // Tagline (toggle açık VE değer varsa)
  if (showTagline && opts.businessTagline) {
    b.center();
    b.line(opts.businessTagline);
  }

  // Adres
  if (showAddress && opts.businessAddress) {
    b.center();
    b.line(opts.businessAddress);
  }

  // Telefon
  if (showPhone && opts.businessPhone) {
    b.center();
    b.line(`Tel: ${opts.businessPhone}`);
  }

  // Üst yazı (özel)
  if (opts.customHeader && opts.customHeader.trim()) {
    b.newline().center();
    b.line(opts.customHeader);
  }

  b.doubleDivider();

  // Sipariş bilgisi
  b.left();
  b.twoCol('Sipariş No:', `#${order.order_no}`);
  b.twoCol('Tarih:', formatDateTime(order.created_at));
  b.twoCol('Tip:', orderTypeLabel(order.order_type));

  if (order.order_type === 'dine_in' && order.table_label) {
    b.twoCol('Masa:', order.table_label);
  }
  if (order.customer_name) {
    b.twoCol('Musteri:', order.customer_name);
  }
  if (order.customer_phone) {
    b.twoCol('Telefon:', order.customer_phone);
  }

  b.divider();

  // Ürünler
  order.items.forEach((item) => {
    const lineTotal = item.quantity * item.unit_price;
    b.bold();
    b.twoCol(
      `${item.quantity}x ${item.product_name}`,
      formatMoney(lineTotal)
    );
    b.bold(false);

    if (item.options && item.options.length > 0) {
      item.options.forEach((opt) => {
        const deltaStr =
          opt.price_delta !== 0
            ? ` (${opt.price_delta > 0 ? '+' : ''}${opt.price_delta}TL)`
            : '';
        b.line(`  + ${opt.value_name}${deltaStr}`);
      });
    }

    if (item.note) {
      b.line(`  Not: ${item.note}`);
    }
  });

  b.divider();

  // Toplam
  b.twoCol('Ara toplam:', formatMoney(order.subtotal));
  b.bold().bigText();
  b.twoCol('TOPLAM:', formatMoney(order.total));
  b.bold(false).normalSize();

  // Alt yazı
  if (opts.customFooter && opts.customFooter.trim()) {
    b.newline().center();
    b.line(opts.customFooter);
  }

  // ===== DEĞERLENDİRME QR (opsiyonel) =====
  if (opts.reviewQrEnabled && opts.reviewQrUrl) {
    b.newline();
    b.divider();
    b.center();
    if (opts.reviewQrText) {
      b.bold().line(opts.reviewQrText).bold(false);
    } else {
      b.bold().line('Deneyiminizi degerlendirin').bold(false);
    }
    b.newline();
    b.qrCode(opts.reviewQrUrl, 6, 49);
    b.center();
    b.line('Karekodu okutun');
  }

  b.newline().center();
  b.line('Aleg POS');

  // Alt boşluk + kes
  b.feed(4).cut();

  return b.build();
}

/**
 * TEST FİŞİ - Yazıcı ayarlarını doğrulamak için
 */
export function buildTestReceipt(paperWidth: 32 | 48 = 48): Uint8Array {
  const b = new EscPosBuilder(paperWidth);

  b.center().bigText().bold();
  b.line('ALEG TEST');
  b.bold(false).normalSize();

  b.doubleDivider();

  b.left();
  b.line(`Kağıt: ${paperWidth === 48 ? '80mm' : '58mm'}`);
  b.line(`Tarih: ${formatDateTime(new Date().toISOString())}`);
  b.divider();

  b.line('Normal metin');
  b.bold().line('Bold metin').bold(false);
  b.underline().line('Altı çizgili').underline(false);
  b.tallText().line('Uzun metin').normalSize();
  b.wideText().line('Geniş metin').normalSize();
  b.bigText().line('Büyük metin').normalSize();

  b.divider();

  b.line('Türkçe karakterler:');
  b.line('ş Ş ğ Ğ ü Ü ı İ ö Ö ç Ç');

  b.divider();

  b.twoCol('Latte (Büyük)', '95.00 TL');
  b.twoCol('Cappuccino', '85.00 TL');
  b.divider();
  b.bold().twoCol('TOPLAM:', '180.00 TL').bold(false);

  b.newline().center();
  b.line('Yazıcı çalışıyor!');

  b.feed(4).cut();
  return b.build();
}
