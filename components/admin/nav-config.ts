/**
 * Süper admin paneli sidebar navigasyon konfigürasyonu.
 * Tasarımdaki data.jsx'ten uyarlandı.
 */

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  badgeTone?: 'default' | 'warn' | 'danger';
};

export type NavGroup = {
  group: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavGroup[] = [
  {
    group: 'GENEL',
    items: [
      { id: 'dashboard', label: 'Gösterge Paneli', href: '/', icon: '◇' },
      { id: 'analytics', label: 'Platform İstatistikleri', href: '/istatistikler', icon: '◈' },
    ],
  },
  {
    group: 'İŞLETMELER',
    items: [
      { id: 'businesses', label: 'Tüm İşletmeler', href: '/isletmeler', icon: '◉' },
      { id: 'business-new', label: 'Yeni İşletme', href: '/isletmeler/yeni', icon: '+' },
      { id: 'pending', label: 'Onay Bekleyenler', href: '/isletmeler/bekleyen', icon: '⏱', badge: 0 },
    ],
  },
  {
    group: 'ABONELİK',
    items: [
      { id: 'plans', label: 'Planlar', href: '/planlar', icon: '◍' },
      { id: 'invoices', label: 'Faturalar', href: '/faturalar', icon: '⊟' },
      { id: 'pending-payments', label: 'Bekleyen Ödemeler', href: '/odemeler', icon: '◎', badge: 0, badgeTone: 'warn' },
    ],
  },
  {
    group: 'DESTEK',
    items: [
      { id: 'support', label: 'Destek Talepleri', href: '/destek', icon: '✆' },
      { id: 'notifications', label: 'Bildirimler', href: '/bildirimler', icon: '◌' },
    ],
  },
  {
    group: 'SİSTEM',
    items: [
      { id: 'users', label: 'Kullanıcılar', href: '/kullanicilar', icon: '◐' },
      { id: 'audit', label: 'Audit Log', href: '/audit', icon: '◑' },
      { id: 'system', label: 'Sistem Durumu', href: '/sistem', icon: '◒' },
      { id: 'settings', label: 'Ayarlar', href: '/ayarlar', icon: '⚙' },
    ],
  },
];
