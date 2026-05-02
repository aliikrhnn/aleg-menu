// ============================================================
// VARDİYA & PERSONEL SABİTLERİ
// ============================================================
// 'use server' yönergesi BULUNMUYOR — bu dosyadan senkron fonksiyon
// ve sabit export'lanabilir, hem client hem server tarafından kullanılabilir.

export type StaffRole = 'manager' | 'barista' | 'server' | 'kitchen';

// Brutalist Spice rol renkleri
export const ROLE_COLORS: Record<StaffRole, string> = {
  manager: '#C4553A',
  barista: '#6B7A4B',
  server: '#2E5B7A',
  kitchen: '#B08A3E',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  manager: 'Müdür',
  barista: 'Barista',
  server: 'Garson',
  kitchen: 'Mutfak',
};

export const ROLE_KEYS: StaffRole[] = ['manager', 'barista', 'server', 'kitchen'];

export function getRoleColor(role: StaffRole | null | undefined): string {
  if (!role) return '#8C7A69';
  return ROLE_COLORS[role] || '#8C7A69';
}

// Vardiya türleri
export type ShiftTemplateKey = 'morning' | 'mid' | 'evening';
export type ShiftCellValue = ShiftTemplateKey | 'off';

export const SHIFT_COLORS: Record<ShiftTemplateKey | 'off', string> = {
  morning: '#B08A3E',
  mid: '#C4553A',
  evening: '#6B7A4B',
  off: '#C5B79C',
};

export const SHIFT_LABELS: Record<ShiftTemplateKey | 'off', string> = {
  morning: 'Sabah',
  mid: 'Öğle',
  evening: 'Akşam',
  off: 'İzinli',
};
