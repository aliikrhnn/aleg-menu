/**
 * İşletme paneli için sidebar navigasyon öğeleri.
 * Önem sırası: günlük kullanılacaklar üstte, yönetim altta.
 */

export type PanelNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  color?: string;
  badge?: string | number;
  comingSoon?: boolean;
  external?: boolean; // yeni sekmede aç
};

export type PanelNavGroup = {
  group: string;
  items: PanelNavItem[];
};

export const PANEL_NAV: PanelNavGroup[] = [
  {
    group: 'GÜNLÜK',
    items: [
      { id: 'dashboard', label: 'Ana Sayfa', href: '/', icon: '◇' },
      { id: 'pos', label: 'Sipariş Akışı', href: '/pos', icon: '◉' },
      {
        id: 'kasa',
        label: 'Kasa Uygulaması',
        href: '/kasa',
        icon: '₺',
        external: true,
      },
      {
        id: 'garson',
        label: 'Garson Uygulaması',
        href: '/garson',
        icon: '⌬',
        external: true,
      },
    ],
  },
  {
    group: 'MENÜ',
    items: [
      { id: 'menu', label: 'Menü', href: '/menu', icon: '⊟' },
      { id: 'variations', label: 'Varyasyonlar', href: '/menu/varyasyonlar', icon: '◇' },
    ],
  },
  {
    group: 'OPERASYON',
    items: [
      { id: 'tables', label: 'Masalar', href: '/masalar', icon: '◍' },
      { id: 'stations', label: 'İstasyonlar', href: '/istasyonlar', icon: '⊙' },
      { id: 'cashiers', label: 'Kasiyerler', href: '/kasiyerler', icon: '👤' },
      { id: 'cari', label: 'Cari Hesaplar', href: '/cari-hesaplar', icon: '📒' },
      { id: 'call_buttons', label: 'Çağrı Butonları', href: '/cagrilar', icon: '✆' },
      { id: 'team', label: 'Ekip', href: '/ekip', icon: '◐', comingSoon: true },
    ],
  },
  {
    group: 'İÇGÖRÜ',
    items: [
      { id: 'reports', label: 'Raporlar', href: '/raporlar', icon: '◌' },
      { id: 'reviews', label: 'Değerlendirmeler', href: '/degerlendirmeler', icon: '⭐' },
      { id: 'loyalty', label: 'Sadakat', href: '/sadakat', icon: '✩', comingSoon: true },
    ],
  },
  {
    group: 'AYARLAR',
    items: [
      { id: 'settings', label: 'İşletme Ayarları', href: '/ayarlar', icon: '⚙' },
      { id: 'printers', label: 'Yazıcılar & Fiş', href: '/yazicilar', icon: '🖨' },
      { id: 'billing', label: 'Abonelik', href: '/abonelik', icon: '◎', comingSoon: true },
    ],
  },
];
