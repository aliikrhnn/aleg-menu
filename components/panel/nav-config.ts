/**
 * İşletme paneli için sidebar navigasyon öğeleri.
 * Önem sırası: günlük kullanılacaklar üstte, yönetim altta.
 */

export type PanelNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  comingSoon?: boolean;
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
      { id: 'pos', label: 'Sipariş & Masa', href: '/pos', icon: '◉' },
      { id: 'kds', label: 'Mutfak Ekranı', href: '/kds', icon: '◈' },
    ],
  },
  {
    group: 'YÖNETİM',
    items: [
      { id: 'menu', label: 'Menü', href: '/menu', icon: '⊟' },
      { id: 'variations', label: 'Varyasyonlar', href: '/menu/varyasyonlar', icon: '◇' },
      { id: 'tables', label: 'Masalar', href: '/masalar', icon: '◍' },
      { id: 'team', label: 'Ekip', href: '/ekip', icon: '◐', comingSoon: true },
    ],
  },
  {
    group: 'İÇGÖRÜ',
    items: [
      { id: 'reports', label: 'Raporlar', href: '/raporlar', icon: '◌' },
      { id: 'loyalty', label: 'Sadakat', href: '/sadakat', icon: '✆', comingSoon: true },
    ],
  },
  {
    group: 'AYARLAR',
    items: [
      { id: 'settings', label: 'İşletme Ayarları', href: '/ayarlar', icon: '⚙' },
      { id: 'billing', label: 'Abonelik', href: '/abonelik', icon: '◎', comingSoon: true },
    ],
  },
];
