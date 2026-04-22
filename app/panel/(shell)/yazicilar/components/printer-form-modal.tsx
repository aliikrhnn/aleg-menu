'use client';

import { useState } from 'react';
import {
  pairBluetoothPrinter,
  isWebBluetoothSupported,
} from '@/lib/printer/bluetooth-client';
import type { Printer, PrinterInput } from '@/lib/actions/printers';
import type { StationLite } from '../printers-manager';

export function PrinterFormModal({
  printer,
  stations,
  saving,
  onClose,
  onCreate,
  onUpdate,
}: {
  printer: Printer | null;
  stations: StationLite[];
  saving: boolean;
  onClose: () => void;
  onCreate: (input: PrinterInput) => void;
  onUpdate: (input: PrinterInput) => void;
}) {
  const isEdit = printer !== null;

  // Adım - yeni kayıt için: 1-rol, 2-bağlantı, 3-detay
  // Düzenleme için: direkt tüm alanlar
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 3 : 1);

  // Form state
  const [name, setName] = useState(printer?.name || '');
  const [role, setRole] = useState<'kitchen' | 'cashier'>(
    printer?.role || 'kitchen'
  );
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'network'>(
    printer?.connection_type || 'bluetooth'
  );
  const [bluetoothDeviceId, setBluetoothDeviceId] = useState<string | null>(
    printer?.bluetooth_device_id || null
  );
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(
    null
  );
  const [ipAddress, setIpAddress] = useState(printer?.ip_address || '');
  const [port, setPort] = useState(printer?.port || 9100);
  const [paperWidth, setPaperWidth] = useState<32 | 48>(
    (printer?.paper_width || 48) as 32 | 48
  );
  const [stationId, setStationId] = useState<string>(
    printer?.station_id || (stations[0]?.id ?? '')
  );
  const [copies, setCopies] = useState(printer?.copies || 1);
  const [autoPrintNew, setAutoPrintNew] = useState(
    printer?.auto_print_new_orders ?? true
  );
  const [autoPrintTakeaway, setAutoPrintTakeaway] = useState(
    printer?.auto_print_takeaway ?? true
  );
  const [isActive, setIsActive] = useState(printer?.is_active ?? true);
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

  // Edit modunda kaydet
  function handleSubmit() {
    if (!name.trim()) {
      alert('Yazıcı adı gerekli');
      return;
    }
    if (role === 'kitchen' && !stationId) {
      alert('Mutfak yazıcısı için istasyon seçmelisiniz');
      return;
    }
    if (connectionType === 'bluetooth' && !bluetoothDeviceId && !isEdit) {
      alert('Önce Bluetooth yazıcıyı eşleştirin');
      return;
    }
    if (connectionType === 'network' && !ipAddress.trim()) {
      alert('IP adresi gerekli');
      return;
    }

    const input: PrinterInput = {
      name: name.trim(),
      role,
      connection_type: connectionType,
      bluetooth_device_id:
        connectionType === 'bluetooth' ? bluetoothDeviceId : null,
      ip_address: connectionType === 'network' ? ipAddress.trim() : null,
      port,
      paper_width: paperWidth,
      station_id: role === 'kitchen' ? stationId : null,
      copies,
      auto_print_new_orders: autoPrintNew,
      auto_print_takeaway: autoPrintTakeaway,
      is_active: isActive,
    };

    if (isEdit) onUpdate(input);
    else onCreate(input);
  }

  async function handleBluetoothPair() {
    setPairing(true);
    setPairError(null);
    const r = await pairBluetoothPrinter();
    setPairing(false);
    if (!r.success) {
      setPairError(r.error || 'Eşleştirme başarısız');
      return;
    }
    setBluetoothDeviceId(r.deviceId || null);
    setBluetoothDeviceName(r.deviceName || null);
    // Ad boşsa otomatik set et
    if (!name.trim() && r.deviceName) {
      setName(r.deviceName);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[560px] max-h-[90vh] rounded-[var(--r)] overflow-hidden flex flex-col"
        style={{ background: 'var(--paper)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div
              className="uppercase mb-1"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                fontWeight: 700,
                color: 'var(--ink-3)',
              }}
            >
              {isEdit ? 'DÜZENLE' : `YENİ YAZICI · ${step}/3`}
            </div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 400,
              }}
            >
              {isEdit
                ? printer.name
                : step === 1
                  ? 'Yazıcı türü'
                  : step === 2
                    ? 'Bağlantı'
                    : 'Detaylar'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full hover:bg-[var(--paper-2)] text-ink-3 flex items-center justify-center flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ADIM 1: Rol */}
          {!isEdit && step === 1 && (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-2 mb-4">
                Bu yazıcı ne yazdıracak?
              </p>

              <RoleOption
                selected={role === 'kitchen'}
                onClick={() => setRole('kitchen')}
                icon="🍳"
                label="Mutfak / Bar yazıcısı"
                description="Bir istasyona bağlı. Sipariş gelince otomatik basar. Fiyat olmaz, büyük font."
              />
              <RoleOption
                selected={role === 'cashier'}
                onClick={() => setRole('cashier')}
                icon="💳"
                label="Kasa hesap yazıcısı"
                description="Müşteri hesap isteyince kasadan bastırılır. Tam detaylı, işletme başlığı, fiyatlar."
              />

              <div
                className="mt-6 p-3 rounded-[10px] text-[12px]"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
                  color: 'var(--ink-2)',
                }}
              >
                <strong>💡 İpucu:</strong>{' '}
                {role === 'kitchen'
                  ? 'Her istasyon için ayrı bir yazıcı ekleyebilirsin (Bar için bir, Mutfak için bir).'
                  : 'Kasa yazıcısı genelde işletmede 1 tane olur. Gel-al/paket siparişlerde otomatik basar.'}
              </div>
            </div>
          )}

          {/* ADIM 2: Bağlantı */}
          {!isEdit && step === 2 && (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-2 mb-4">
                Yazıcıya nasıl ulaşılsın?
              </p>

              <RoleOption
                selected={connectionType === 'bluetooth'}
                onClick={() => setConnectionType('bluetooth')}
                icon="📱"
                label="Bluetooth"
                description="Tabletten veya telefondan doğrudan. O cihazın tarayıcısı açık olmalı."
              />
              <RoleOption
                selected={connectionType === 'network'}
                onClick={() => setConnectionType('network')}
                icon="🌐"
                label="Network (Ethernet / Wi-Fi)"
                description="Yazıcının IP adresi. Aleg Agent gerekir (Windows PC'de çalışır)."
              />
            </div>
          )}

          {/* ADIM 3 veya EDIT: Detaylar */}
          {(isEdit || step === 3) && (
            <div className="space-y-5">
              {/* Bağlantı aksiyonu */}
              {connectionType === 'bluetooth' && (
                <div>
                  <Label>BLUETOOTH EŞLEŞTİRME</Label>
                  {bluetoothDeviceId ? (
                    <div
                      className="flex items-center gap-3 p-3 rounded-[10px]"
                      style={{
                        background:
                          'color-mix(in srgb, var(--ok, #6B8E4E) 10%, var(--card))',
                        border:
                          '1px solid color-mix(in srgb, var(--ok, #6B8E4E) 30%, var(--line))',
                      }}
                    >
                      <span style={{ color: 'var(--ok, #6B8E4E)', fontSize: 18 }}>
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate">
                          {bluetoothDeviceName || 'Yazıcı eşleşti'}
                        </div>
                        <div
                          className="text-[10px] truncate"
                          style={{
                            fontFamily: 'var(--f-mono)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          ID: {bluetoothDeviceId.slice(0, 8)}...
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setBluetoothDeviceId(null);
                          setBluetoothDeviceName(null);
                        }}
                        className="text-[11px] text-accent hover:underline"
                      >
                        Değiştir
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleBluetoothPair}
                        disabled={pairing || !isWebBluetoothSupported()}
                        className="w-full h-11 rounded-[10px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{
                          background: 'var(--accent)',
                          color: 'var(--paper)',
                        }}
                      >
                        {pairing ? 'Eşleştiriliyor…' : '📱 Yazıcıyı eşleştir'}
                      </button>
                      {!isWebBluetoothSupported() && (
                        <p
                          className="text-[11px] mt-2"
                          style={{ color: 'var(--danger, #C4553A)' }}
                        >
                          Tarayıcı Bluetooth desteklemiyor. Chrome, Edge veya Opera
                          kullanın.
                        </p>
                      )}
                      {pairError && (
                        <p
                          className="text-[11px] mt-2"
                          style={{ color: 'var(--danger, #C4553A)' }}
                        >
                          {pairError}
                        </p>
                      )}
                      <p className="text-[11px] text-ink-3 mt-2">
                        Yazıcıyı açık ve eşleştirilebilir modda tutun.
                      </p>
                    </>
                  )}
                </div>
              )}

              {connectionType === 'network' && (
                <>
                  <div className="grid grid-cols-[1fr_100px] gap-3">
                    <div>
                      <Label>IP ADRESİ</Label>
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="192.168.1.100"
                        className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      />
                    </div>
                    <div>
                      <Label>PORT</Label>
                      <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(parseInt(e.target.value) || 9100)}
                        className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--f-mono)',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-[10px] text-[11px]"
                    style={{
                      background: 'color-mix(in srgb, var(--gold) 10%, var(--card))',
                      border: '1px solid color-mix(in srgb, var(--gold) 20%, var(--line))',
                      color: 'var(--ink-2)',
                    }}
                  >
                    💡 <strong>Network yazıcı için Aleg Agent gereklidir.</strong>{' '}
                    Kafenizdeki bir Windows PC&apos;de arka planda çalışır ve yazıcı
                    işlerini ağ üzerinden iletir. Kurulum kılavuzu için Gelişmiş
                    sekmesine bakın.
                  </div>
                </>
              )}

              {/* Ad */}
              <div>
                <Label>YAZICI ADI</Label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    role === 'cashier' ? 'Kasa Yazıcısı' : 'Bar Yazıcısı'
                  }
                  maxLength={40}
                  className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                />
              </div>

              {/* İstasyon (sadece kitchen) */}
              {role === 'kitchen' && (
                <div>
                  <Label>İSTASYON</Label>
                  {stations.length === 0 ? (
                    <div
                      className="text-[12px] p-3 rounded-[10px]"
                      style={{
                        background: 'var(--paper-2)',
                        color: 'var(--danger, #C4553A)',
                      }}
                    >
                      Henüz istasyon yok. Önce /panel/istasyonlar sayfasından
                      oluştur.
                    </div>
                  ) : (
                    <>
                      <select
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {stations.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.icon} {s.name}
                          </option>
                        ))}
                      </select>
                      <p
                        className="text-[11px] mt-2"
                        style={{ color: 'var(--ink-3)', lineHeight: 1.45 }}
                      >
                        💡 Aynı yazıcıyı birden fazla istasyon için kullanacaksan,
                        her istasyon için ayrı kayıt ekle (aynı IP, aynı isim).
                        Sipariş gelince her istasyon için ayrı fiş basar.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Kağıt ve kopya */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>KAĞIT</Label>
                  <div className="flex gap-1">
                    <PaperBtn
                      selected={paperWidth === 48}
                      onClick={() => setPaperWidth(48)}
                      label="80mm"
                    />
                    <PaperBtn
                      selected={paperWidth === 32}
                      onClick={() => setPaperWidth(32)}
                      label="58mm"
                    />
                  </div>
                </div>
                <div>
                  <Label>KOPYA</Label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    className="w-full h-11 px-3 rounded-[10px] text-[14px]"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                    }}
                  />
                </div>
              </div>

              {/* Otomatik yazdır */}
              <div className="space-y-2">
                <ToggleRow
                  label="Yeni siparişleri otomatik bas"
                  desc={
                    role === 'kitchen'
                      ? 'Bu istasyona düşen yeni siparişleri otomatik basar'
                      : 'Yeni hesap fişlerini otomatik basar'
                  }
                  value={autoPrintNew}
                  onChange={setAutoPrintNew}
                />
                {role === 'cashier' && (
                  <ToggleRow
                    label="Gel-al / paket anında bas"
                    desc="Paket siparişler için anında hesap fişi basar"
                    value={autoPrintTakeaway}
                    onChange={setAutoPrintTakeaway}
                  />
                )}
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <ToggleRow
                    label="Aktif"
                    desc="Pasif yazıcı yazdırmaya katılmaz"
                    value={isActive}
                    onChange={setIsActive}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <div>
            {!isEdit && step > 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                disabled={saving}
                className="h-10 px-4 rounded-[12px] text-[13px] font-semibold text-ink-3 hover:bg-[var(--paper-2)]"
              >
                ← Geri
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-[12px] text-[13px] font-semibold text-ink-3 hover:bg-[var(--paper-2)]"
            >
              İptal
            </button>
            {!isEdit && step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                className="h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
              >
                Devam →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="h-10 px-5 rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--paper)' }}
              >
                {saving ? 'Kaydediliyor...' : isEdit ? 'Değişikliği kaydet' : 'Yazıcıyı ekle'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== Helper Components ======

function RoleOption({
  selected,
  onClick,
  icon,
  label,
  description,
  comingSoon,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <button
      onClick={comingSoon ? undefined : onClick}
      disabled={comingSoon}
      className="w-full text-left p-4 rounded-[12px] transition-colors flex items-start gap-3"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent) 8%, var(--card))'
          : 'var(--card)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
        opacity: comingSoon ? 0.5 : 1,
        cursor: comingSoon ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-[10px] flex items-center justify-center"
        style={{
          background: selected
            ? 'var(--accent)'
            : 'color-mix(in srgb, var(--accent) 10%, transparent)',
          color: selected ? 'var(--paper)' : 'var(--accent)',
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[15px] font-semibold text-ink">{label}</div>
          {comingSoon && (
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--paper-2)',
                color: 'var(--ink-3)',
                fontFamily: 'var(--f-mono)',
                letterSpacing: '0.06em',
              }}
            >
              YAKINDA
            </span>
          )}
        </div>
        <div className="text-[12px] text-ink-2 mt-1">{description}</div>
      </div>
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="uppercase block mb-2"
      style={{
        fontFamily: 'var(--f-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        fontWeight: 700,
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </label>
  );
}

function PaperBtn({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-11 rounded-[10px] text-[13px] font-semibold transition-colors"
      style={{
        background: selected ? 'var(--ink)' : 'var(--card)',
        color: selected ? 'var(--paper)' : 'var(--ink-2)',
        border: `1px solid ${selected ? 'var(--ink)' : 'var(--line)'}`,
      }}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 p-3 rounded-[10px]"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className="text-[11px] text-ink-3 mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 w-10 h-6 rounded-full relative transition-colors"
        style={{
          background: value ? 'var(--ok, #6B8E4E)' : 'var(--line)',
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{
            left: value ? 18 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}
