# Aleg Süper Admin Paneli — Paket 4

Destek talepleri, duyurular, admin ekibi yönetimi, audit log, sistem durumu, platform ayarları + ⌘K komut menüsü.

## ✓ Zaten yapılan (Supabase MCP üzerinden)

- Migration `0034_paket4_support_notifications_settings` Supabase'e **uygulandı**
- 4 yeni tablo: `support_tickets`, `support_ticket_messages`, `platform_announcements`, `platform_settings`
- 6 yeni view: `v_admin_support_tickets_list`, `v_admin_support_metrics`, `v_admin_announcements_list`, `v_admin_audit_logs_full`, `v_admin_super_admins_list`, `v_admin_system_health`
- 5 örnek support ticket + 3 örnek duyuru seed olarak yüklendi
- 10 default platform setting yüklendi
- Tüm tablolarda RLS açık, sadece `super_admins` erişebiliyor

## 📂 Dosya yapısı

```
app/(admin)/
├── destek/
│   ├── page.tsx                # Ticket listesi + metrikler
│   └── [id]/page.tsx           # Ticket detay + mesajlaşma
├── bildirimler/page.tsx        # Duyurular CRUD
├── kullanicilar/page.tsx       # Süper admin ekibi
├── audit/page.tsx              # Audit log timeline
├── sistem/page.tsx             # Sistem health
└── ayarlar/page.tsx            # Platform settings

lib/actions/
├── admin-support.ts            # listSupportTickets, replySupportTicket, ...
├── admin-notifications.ts      # listAnnouncements, createAnnouncement, ...
├── admin-users.ts              # listAdminTeam, inviteSuperAdmin, removeSuperAdmin
├── admin-audit.ts              # listAuditLogs, listAuditActionTypes
├── admin-system.ts             # getSystemHealth, getRecentSystemActivity
└── admin-settings.ts           # listPlatformSettings, updatePlatformSetting

components/admin/
├── support-list-client.tsx
├── support-detail-client.tsx
├── notifications-client.tsx
├── admin-users-client.tsx
├── audit-client.tsx
├── system-client.tsx
├── settings-client.tsx
├── command-palette.tsx         # ⌘K menü
└── command-palette-mount.tsx   # Layout için server component

migrations/
└── 0034_paket4_support_notifications_settings.sql  # Saklı kopya
```

## 🔌 Sidebar entegrasyonu

`app/(admin)/layout.tsx` veya sidebar componentine yeni linkler ekle:

```tsx
const NAV = [
  // ... mevcut linkler
  { href: '/destek', label: 'Destek' },
  { href: '/bildirimler', label: 'Duyurular' },
  { href: '/kullanicilar', label: 'Ekip' },
  { href: '/audit', label: 'Hareket kaydı' },
  { href: '/sistem', label: 'Sistem' },
  { href: '/ayarlar', label: 'Ayarlar' },
]
```

## 🎹 ⌘K Command Palette mount

Admin layout'unun sonuna ekle (genelde `</body>` öncesi):

```tsx
import { CommandPaletteMount } from '@/components/admin/command-palette-mount'

export default async function AdminLayout({ children }) {
  return (
    <html>
      <body>
        {/* mevcut içerik */}
        {children}
        <CommandPaletteMount />
      </body>
    </html>
  )
}
```

## ⚠️ Bağımlılıklar

Bu paket aşağıdaki Paket 1 bileşenlerini kullanır — varlıklarını doğrula:

- `@/lib/supabase/server` → `createClient()` (Supabase server client)
- `@/lib/auth/super-admin` → `getSuperAdminUser(): Promise<{ user_id, email, full_name } | null>`
- `@/lib/admin/audit` → `logAdminAction({ action, target_type?, target_id?, target_label?, tone?, meta? })`
- `@/components/admin/primitives` → `Eyebrow, SerifTitle, SerifNum, Pill, StatusDot, FilterChip, SearchInput, Money`

`inviteSuperAdmin` ayrıca `lookup_user_by_email` adlı RPC fonksiyonuna ihtiyaç duyuyor. Eğer yoksa, şu SQL ile ekleyebilirsin:

```sql
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(p_email text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO authenticated;
```

## 🧪 Test

Supabase'e seed verisiyle aşağıdaki örnekleri kontrol edebilirsin:
- `/destek` → 5 ticket, 1'i acil/açık (Karaköy yazıcı sorunu)
- `/bildirimler` → 2 yayında, 1 taslak duyuru
- `/audit` → Paket 1-3'te yapılan kayıtların timeline'ı
- `/sistem` → Karaköy'deki 82 sipariş, 96 print job vb. yansır
- `/ayarlar` → 10 platform ayarı (4 kategoride)

## ✅ Lint/build durumu

- `any` kullanımı: yok
- Kullanılmayan import: yok
- TypeScript strict: temiz (lib/actions ve components izole olarak çalıştırıldı)
- `console.log`: yok
- `'use client'` direktifleri: tüm hook kullanan dosyalarda mevcut
