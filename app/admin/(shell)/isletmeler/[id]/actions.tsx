'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateBusinessStatus, deleteBusiness } from '@/lib/actions/businesses';

interface Props {
  businessId: string;
  businessName: string;
  currentStatus: string;
}

export function BusinessActions({ businessId, businessName, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'cancelled') => {
    if (!confirm(`Abonelik durumunu "${newStatus}" olarak değiştirmek istediğine emin misin?`)) {
      return;
    }
    setLoading(newStatus);
    const res = await updateBusinessStatus(businessId, newStatus);
    setLoading(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(`Hata: ${res.error}`);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== businessName) {
      alert(`İşletme adını tam olarak yaz: "${businessName}"`);
      return;
    }
    setLoading('delete');
    const res = await deleteBusiness(businessId);
    setLoading(null);
    if (res.success) {
      router.push('/isletmeler');
    } else {
      alert(`Hata: ${res.error}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Durum değiştirme butonları */}
      <div className="flex flex-wrap gap-2">
        {currentStatus !== 'active' && (
          <button
            onClick={() => handleStatusChange('active')}
            disabled={loading !== null}
            className="h-10 px-4 rounded-[var(--r-sm)] bg-ok text-card font-medium text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'active' ? 'İşleniyor...' : '✓ Aktifleştir'}
          </button>
        )}
        {currentStatus !== 'suspended' && (
          <button
            onClick={() => handleStatusChange('suspended')}
            disabled={loading !== null}
            className="h-10 px-4 rounded-[var(--r-sm)] bg-warn text-card font-medium text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading === 'suspended' ? 'İşleniyor...' : '⏸ Askıya Al'}
          </button>
        )}
        {currentStatus !== 'cancelled' && (
          <button
            onClick={() => handleStatusChange('cancelled')}
            disabled={loading !== null}
            className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-line-2 font-medium text-sm disabled:opacity-50"
          >
            {loading === 'cancelled' ? 'İşleniyor...' : '✕ İptal Et'}
          </button>
        )}
      </div>

      {/* Tehlikeli zone — Sil */}
      <div className="mt-6 pt-6 border-t border-line">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-danger mb-1">Tehlikeli İşlem</h3>
            <p className="text-sm text-ink-2">
              İşletmeyi kalıcı olarak sil. Tüm kullanıcılar, ürünler, masalar ve siparişler
              <strong className="text-ink"> geri alınamaz şekilde</strong> silinir.
            </p>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-10 px-4 rounded-[var(--r-sm)] border border-danger text-danger hover:bg-danger/10 font-medium text-sm transition-colors"
            >
              Sil
            </button>
          ) : null}
        </div>

        {/* Silme onay formu */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-[var(--r-sm)] bg-danger/5 border border-danger/20">
            <p className="text-sm text-ink mb-3">
              Silmeyi onaylamak için işletme adını yaz:{' '}
              <strong>{businessName}</strong>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder={businessName}
                className="flex-1 h-10 px-3 rounded-[var(--r-sm)] bg-card border border-line text-sm focus:outline-none focus:border-danger"
                style={{ fontFamily: 'var(--f-mono)' }}
              />
              <button
                onClick={handleDelete}
                disabled={loading === 'delete' || deleteText !== businessName}
                className="h-10 px-4 rounded-[var(--r-sm)] bg-danger text-card font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading === 'delete' ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                }}
                disabled={loading === 'delete'}
                className="h-10 px-4 rounded-[var(--r-sm)] text-ink-2 hover:bg-paper-2 font-medium text-sm"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
