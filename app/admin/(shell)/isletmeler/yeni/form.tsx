'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBusiness, type CreateBusinessInput } from '@/lib/actions/businesses';
import { slugify } from '@/lib/utils';
import type { PlatformPlan } from '@/types/database';

interface Props {
  plans: PlatformPlan[];
}

const BUSINESS_TYPES = [
  { value: 'cafe', label: 'Kafe' },
  { value: 'restaurant', label: 'Restoran' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'specialty_coffee', label: 'Specialty Coffee' },
  { value: 'bar', label: 'Bar' },
  { value: 'pastry', label: 'Pastane' },
  { value: 'other', label: 'Diğer' },
];

const TR_CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Samsun', 'Trabzon', 'Erzurum',
  'Malatya', 'Şanlıurfa', 'Denizli', 'Sakarya', 'Hatay', 'Manisa', 'Kahramanmaraş',
  'Van', 'Aydın', 'Balıkesir', 'Tekirdağ', 'Muğla', 'Isparta', 'Çorum', 'Afyonkarahisar',
];

export function CreateBusinessForm({ plans }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    business_id?: string;
    temp_password?: string;
  } | null>(null);

  const [form, setForm] = useState<CreateBusinessInput>({
    business_name: '',
    business_slug: '',
    city: '',
    business_type: 'cafe',
    owner_full_name: '',
    owner_email: '',
    owner_phone: '',
    plan_id: '',
  });

  // Kullanıcı slug'ı elle değiştirdi mi? Eğer değiştirdiyse artık otomatik doldurmuyoruz
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const updateField = <K extends keyof CreateBusinessInput>(key: K, value: CreateBusinessInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Slug field'ı değiştiğinde - manuel edit flag'i set et
  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, business_slug: slugify(slug) }));
  };

  // İşletme adından otomatik slug üret
  // - Eğer kullanıcı slug'ı manuel değiştirmediyse, her karakterde otomatik günceller
  // - Manuel değiştirdiyse artık dokunmaz
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      business_name: name,
      business_slug: slugManuallyEdited ? f.business_slug : slugify(name),
    }));
  };

  // Adım validasyonu
  const isStep1Valid = form.business_name.length >= 2 && form.business_slug.length >= 2 && form.city;
  const isStep2Valid = form.owner_full_name.length >= 2 && form.owner_email.includes('@') && form.owner_phone.length >= 10;
  const isStep3Valid = !!form.plan_id;

  const handleSubmit = async () => {
    setLoading(true);
    const res = await createBusiness(form);
    setLoading(false);
    setResult(res);
    if (res.success) {
      setStep(5); // Success ekranı
    }
  };

  // Success ekranı
  if (step === 5 && result?.success) {
    return (
      <div className="bg-card border border-line rounded-[var(--r)] p-8">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-full bg-ok/10 text-ok flex items-center justify-center text-2xl flex-shrink-0"
          >
            ✓
          </div>
          <div>
            <h2
              style={{
                fontFamily: 'var(--f-serif)',
                fontStyle: 'italic',
                fontSize: 32,
                fontWeight: 400,
              }}
            >
              {form.business_name} oluşturuldu
            </h2>
            <p className="text-ink-2 mt-2">Hesap aktif. Şimdi sahibine giriş bilgilerini iletmen gerek.</p>
          </div>
        </div>

        <div className="bg-paper-2 rounded-[var(--r-sm)] p-5 mb-6 border border-line">
          <div
            className="text-ink-3 uppercase mb-3"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            GİRİŞ BİLGİLERİ
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-ink-3 mb-1">URL</div>
              <div
                className="text-sm bg-card px-3 py-2 rounded border border-line"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                https://panel.alegstudio.com
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-3 mb-1">E-posta</div>
              <div
                className="text-sm bg-card px-3 py-2 rounded border border-line"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                {form.owner_email}
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-3 mb-1">Geçici Şifre</div>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 text-sm bg-card px-3 py-2 rounded border border-line font-bold"
                  style={{ fontFamily: 'var(--f-mono)' }}
                >
                  {result.temp_password}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.temp_password || '');
                    alert('Şifre kopyalandı');
                  }}
                  className="h-9 px-3 rounded-[var(--r-sm)] bg-super text-card text-xs hover:opacity-90"
                  style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.06em' }}
                >
                  KOPYALA
                </button>
              </div>
              <div className="text-xs text-ink-3 mt-2">
                ⚠ Bu şifreyi şimdi kaydet — bir daha gösterilmeyecek.
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp gönderim mesajı */}
        <div className="bg-ok/5 border border-ok/20 rounded-[var(--r-sm)] p-5 mb-6">
          <div
            className="text-ok uppercase mb-2"
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
            }}
          >
            WHATSAPP MESAJI HAZIR
          </div>
          <div className="text-sm text-ink-2 mb-3 leading-relaxed">
            Aşağıdaki mesajı kopyalayıp {form.owner_phone} numarasına gönderebilirsin:
          </div>
          <pre
            className="bg-card border border-line rounded p-3 text-xs whitespace-pre-wrap text-ink-2"
            style={{ fontFamily: 'var(--f-sans)' }}
          >
{`Merhaba ${form.owner_full_name.split(' ')[0]},

${form.business_name} için Aleg hesabınız oluşturuldu! 🎉

🔗 Giriş: https://panel.alegstudio.com
📧 E-posta: ${form.owner_email}
🔑 Geçici şifre: ${result.temp_password}

İlk girişte şifrenizi değiştirmenizi öneririz.

Sorularınız için bize her zaman ulaşabilirsiniz.

— Aleg Ekibi`}
          </pre>
          <button
            onClick={() => {
              const msg = `Merhaba ${form.owner_full_name.split(' ')[0]},\n\n${form.business_name} için Aleg hesabınız oluşturuldu! 🎉\n\n🔗 Giriş: https://panel.alegstudio.com\n📧 E-posta: ${form.owner_email}\n🔑 Geçici şifre: ${result.temp_password}\n\nİlk girişte şifrenizi değiştirmenizi öneririz.\n\n— Aleg Ekibi`;
              navigator.clipboard.writeText(msg);
              alert('Mesaj kopyalandı! WhatsApp\'a yapıştırabilirsin.');
            }}
            className="mt-3 w-full h-10 rounded-[var(--r-sm)] bg-ok text-card font-medium text-sm hover:opacity-90"
          >
            Mesajı Kopyala
          </button>
        </div>

        <div className="flex gap-3">
          <Link
            href="/isletmeler"
            className="flex-1 h-11 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 hover:border-ink-3 transition-colors flex items-center justify-center text-sm font-medium"
          >
            İşletmeler Listesine Dön
          </Link>
          <button
            onClick={() => {
              setStep(1);
              setResult(null);
              setForm({
                business_name: '',
                business_slug: '',
                city: '',
                business_type: 'cafe',
                owner_full_name: '',
                owner_email: '',
                owner_phone: '',
                plan_id: '',
              });
            }}
            className="flex-1 h-11 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90"
          >
            Bir Tane Daha Ekle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stepper */}
      <Stepper currentStep={step} />

      {/* Form içeriği */}
      <div className="bg-card border border-line rounded-[var(--r)] p-8 mt-8">
        {step === 1 && (
          <Step1
            form={form}
            updateField={updateField}
            handleNameChange={handleNameChange}
            handleSlugChange={handleSlugChange}
          />
        )}
        {step === 2 && <Step2 form={form} updateField={updateField} />}
        {step === 3 && <Step3 form={form} updateField={updateField} plans={plans} />}
        {step === 4 && <Step4 form={form} plans={plans} />}

        {/* Hata göster */}
        {result?.error && (
          <div className="mt-6 p-3 rounded bg-danger/10 border border-danger/20 text-danger text-sm">
            {result.error}
          </div>
        )}

        {/* Adım kontrolleri */}
        <div className="flex justify-between mt-8 pt-6 border-t border-line">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
              className="h-11 px-5 rounded-[var(--r-sm)] text-ink-2 hover:bg-paper-2 transition-colors text-sm font-medium disabled:opacity-50"
            >
              ← Geri
            </button>
          ) : (
            <Link
              href="/isletmeler"
              className="h-11 px-5 rounded-[var(--r-sm)] text-ink-2 hover:bg-paper-2 transition-colors text-sm font-medium flex items-center"
            >
              ← Vazgeç
            </Link>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !isStep1Valid) ||
                (step === 2 && !isStep2Valid) ||
                (step === 3 && !isStep3Valid)
              }
              className="h-11 px-6 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Devam Et →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="h-11 px-6 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Oluşturuluyor...' : 'İşletmeyi Oluştur'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stepper
// ============================================================

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ['İşletme', 'Sahibi', 'Plan', 'Onay'];

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const done = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-3" style={{ opacity: done || active ? 1 : 0.5 }}>
              <div
                className={`w-8 h-8 rounded-full border-[1.5px] flex items-center justify-center ${
                  done
                    ? 'bg-super border-super text-card'
                    : active
                      ? 'border-super text-super bg-super/15'
                      : 'border-line-2 text-ink-3'
                }`}
                style={{ fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 700 }}
              >
                {done ? '✓' : stepNum}
              </div>
              <div className="grid">
                <span
                  className="text-ink-3 uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                  }}
                >
                  Adım {stepNum}
                </span>
                <span
                  className={`text-sm ${active ? 'text-ink font-semibold' : 'text-ink-2'}`}
                >
                  {s}
                </span>
              </div>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-line mx-4" />}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Adım 1 — İşletme Bilgileri
// ============================================================

function Step1({
  form,
  updateField,
  handleNameChange,
  handleSlugChange,
}: {
  form: CreateBusinessInput;
  updateField: <K extends keyof CreateBusinessInput>(key: K, value: CreateBusinessInput[K]) => void;
  handleNameChange: (name: string) => void;
  handleSlugChange: (slug: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
          }}
          className="mb-2"
        >
          İşletmeyi tanıyalım
        </h2>
        <p className="text-ink-2 text-sm">Müşterilerinize görünecek bilgileri gir.</p>
      </div>

      <Field label="İşletme Adı" required>
        <input
          type="text"
          value={form.business_name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Aleg Karaköy"
          className="form-input"
        />
      </Field>

      <Field label="URL Adı (subdomain)" required hint="Bu kısa ad alegstudio.com'dan önce gelecek. Örn: karakoy.alegstudio.com">
        <div className="flex items-center">
          <input
            type="text"
            value={form.business_slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="karakoy"
            className="form-input rounded-r-none border-r-0"
          />
          <div
            className="h-11 px-3 bg-paper-2 border border-line rounded-r-[10px] flex items-center text-sm text-ink-3"
            style={{ fontFamily: 'var(--f-mono)' }}
          >
            .alegstudio.com
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Şehir" required>
          <select
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            className="form-input"
          >
            <option value="">Seç...</option>
            {TR_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="İşletme Tipi">
          <select
            value={form.business_type}
            onChange={(e) => updateField('business_type', e.target.value)}
            className="form-input"
          >
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FormStyles />
    </div>
  );
}

// ============================================================
// Adım 2 — Sahibi Bilgileri
// ============================================================

function Step2({
  form,
  updateField,
}: {
  form: CreateBusinessInput;
  updateField: <K extends keyof CreateBusinessInput>(key: K, value: CreateBusinessInput[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
          }}
          className="mb-2"
        >
          İşletme sahibi kim?
        </h2>
        <p className="text-ink-2 text-sm">Bu kişi panele giriş bilgisi alacak ve hesabın sahibi olacak.</p>
      </div>

      <Field label="Ad Soyad" required>
        <input
          type="text"
          value={form.owner_full_name}
          onChange={(e) => updateField('owner_full_name', e.target.value)}
          placeholder="Mehmet Demir"
          className="form-input"
        />
      </Field>

      <Field label="E-posta" required hint="Giriş yaparken kullanacağı adres">
        <input
          type="email"
          value={form.owner_email}
          onChange={(e) => updateField('owner_email', e.target.value)}
          placeholder="mehmet@karakoy.com"
          className="form-input"
        />
      </Field>

      <Field label="Telefon (WhatsApp)" required hint="Geçici şifreyi WhatsApp'tan göndermek için">
        <input
          type="tel"
          value={form.owner_phone}
          onChange={(e) => updateField('owner_phone', e.target.value)}
          placeholder="+90 555 123 45 67"
          className="form-input"
        />
      </Field>

      <FormStyles />
    </div>
  );
}

// ============================================================
// Adım 3 — Plan Seçimi
// ============================================================

function Step3({
  form,
  updateField,
  plans,
}: {
  form: CreateBusinessInput;
  updateField: <K extends keyof CreateBusinessInput>(key: K, value: CreateBusinessInput[K]) => void;
  plans: PlatformPlan[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
          }}
          className="mb-2"
        >
          Hangi planla başlasın?
        </h2>
        <p className="text-ink-2 text-sm">İlk 30 gün ücretsiz deneme. Sonradan değiştirebilirsin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const selected = form.plan_id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => updateField('plan_id', p.id)}
              className={`text-left p-5 rounded-[var(--r)] border-2 transition-all ${
                selected
                  ? 'border-super bg-super/5'
                  : 'border-line bg-card hover:border-line-2'
              }`}
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 22,
                    fontWeight: 400,
                  }}
                >
                  {p.name}
                </h3>
                {selected && <span className="text-super text-lg">✓</span>}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-serif)',
                  fontStyle: 'italic',
                  fontSize: 36,
                  fontWeight: 400,
                  lineHeight: 1,
                }}
                className="mb-1"
              >
                ₺{p.price_monthly}
              </div>
              <div className="text-xs text-ink-3 mb-4">aylık</div>
              <div className="text-sm text-ink-2 leading-relaxed">{p.description}</div>
              <div
                className="mt-4 pt-4 border-t border-line text-xs text-ink-3 grid gap-1"
                style={{ fontFamily: 'var(--f-mono)' }}
              >
                <div>{p.max_branches === 999 ? '∞' : p.max_branches} şube</div>
                <div>{p.max_products === 9999 ? '∞' : p.max_products} ürün</div>
                <div>{p.max_team_members === 50 ? '∞' : p.max_team_members} ekip üyesi</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Adım 4 — Onay
// ============================================================

function Step4({ form, plans }: { form: CreateBusinessInput; plans: PlatformPlan[] }) {
  const selectedPlan = plans.find((p) => p.id === form.plan_id);

  return (
    <div className="space-y-5">
      <div>
        <h2
          style={{
            fontFamily: 'var(--f-serif)',
            fontStyle: 'italic',
            fontSize: 28,
            fontWeight: 400,
          }}
          className="mb-2"
        >
          Son kontrol
        </h2>
        <p className="text-ink-2 text-sm">Aşağıdaki bilgilerle işletme oluşturulacak.</p>
      </div>

      <div className="bg-paper-2 rounded-[var(--r-sm)] p-5 border border-line space-y-4">
        <SummarySection title="İŞLETME">
          <SummaryRow label="Ad" value={form.business_name} />
          <SummaryRow label="URL" value={`${form.business_slug}.alegstudio.com`} mono />
          <SummaryRow label="Şehir" value={form.city} />
          <SummaryRow
            label="Tip"
            value={BUSINESS_TYPES.find((t) => t.value === form.business_type)?.label || form.business_type}
          />
        </SummarySection>

        <SummarySection title="SAHİBİ">
          <SummaryRow label="Ad" value={form.owner_full_name} />
          <SummaryRow label="E-posta" value={form.owner_email} mono />
          <SummaryRow label="Telefon" value={form.owner_phone} mono />
        </SummarySection>

        <SummarySection title="PLAN">
          <SummaryRow label="Seçilen" value={selectedPlan?.name || '—'} />
          <SummaryRow label="Aylık" value={`₺${selectedPlan?.price_monthly}`} />
          <SummaryRow label="Deneme" value="30 gün ücretsiz" />
        </SummarySection>
      </div>

      <div className="bg-super/5 border border-super/20 rounded-[var(--r-sm)] p-4 text-sm text-ink-2">
        <strong className="text-super">Oluştur&apos;a basınca:</strong> Otomatik bir geçici şifre üretilecek,
        sahibinin hesabı aktif olacak ve giriş bilgileri ekrana çıkacak. Onları WhatsApp&apos;tan iletebileceksin.
      </div>
    </div>
  );
}

// ============================================================
// Yardımcı Bileşenler
// ============================================================

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-2 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <div className="text-xs text-ink-3 mt-1.5">{hint}</div>}
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-ink-3 uppercase mb-2"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em',
        }}
      >
        {title}
      </div>
      <div className="space-y-1.5 pl-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="text-ink-3 w-20 flex-shrink-0">{label}</span>
      <span
        className="text-ink-2"
        style={mono ? { fontFamily: 'var(--f-mono)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// Form input'ları için ortak stil — globals.css'te de tanımlanabilir ama burada inline kalsın
function FormStyles() {
  return (
    <style jsx global>{`
      .form-input {
        width: 100%;
        height: 44px;
        padding: 0 14px;
        border-radius: 10px;
        background: var(--card);
        border: 1px solid var(--line);
        color: var(--ink);
        font-family: var(--f-sans);
        font-size: 14px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .form-input:focus {
        outline: none;
        border-color: var(--super);
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--super) 20%, transparent);
      }
      .form-input::placeholder {
        color: var(--ink-3);
      }
    `}</style>
  );
}