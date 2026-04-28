'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Eyebrow,
  SerifTitle,
  Stepper,
  LogoTile,
  Money,
  Pill,
} from '@/components/admin/primitives';
import { createBusiness } from '@/lib/actions/businesses';
import { slugify } from '@/lib/utils';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  description: string | null;
  features: string[] | null;
};

type Module = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  required?: boolean;
};

const STEPS = ['İşletme', 'Sahip', 'Plan', 'Modüller', 'Özet'];

const BUSINESS_TYPES = [
  { id: 'cafe', label: 'Kafe', icon: '☕' },
  { id: 'restaurant', label: 'Restoran', icon: '🍽' },
  { id: 'bar', label: 'Bar / Pub', icon: '🍻' },
  { id: 'bakery', label: 'Fırın / Pastane', icon: '🥐' },
  { id: 'fast_food', label: 'Fast Food', icon: '🍔' },
  { id: 'other', label: 'Diğer', icon: '◌' },
];

const DEFAULT_MODULES: Module[] = [
  { id: 'menu', label: 'QR Menü', description: 'Müşteriye dijital menü', enabled: true, required: true },
  { id: 'pos', label: 'POS', description: 'Kasiyerin sipariş ekranı', enabled: true },
  { id: 'kds', label: 'Mutfak Ekranı (KDS)', description: 'Mutfak istasyonları', enabled: true },
  { id: 'tables', label: 'Masa Yönetimi', description: 'Bölge ve masa düzeni', enabled: true },
  { id: 'reports', label: 'Raporlar', description: 'Z-rapor, istatistikler', enabled: true },
  { id: 'reviews', label: 'Değerlendirmeler', description: 'Müşteri yorumları', enabled: false },
  { id: 'loyalty', label: 'Sadakat', description: 'Puan ve kampanyalar', enabled: false },
  { id: 'cari', label: 'Cari Hesap', description: 'Müşteri açık hesap', enabled: false },
];

export function NewBusinessWizard({ plans }: { plans: Plan[] }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    business_id?: string;
    temp_password?: string;
  } | null>(null);

  const [form, setForm] = useState({
    business_name: '',
    business_slug: '',
    city: '',
    business_type: 'cafe',

    owner_full_name: '',
    owner_email: '',
    owner_phone: '',

    plan_id: '',
  });

  const [modules, setModules] = useState<Module[]>(DEFAULT_MODULES);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      business_name: name,
      business_slug: slugManuallyEdited ? f.business_slug : slugify(name),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, business_slug: slugify(slug) }));
  };

  const toggleModule = (id: string) => {
    setModules((ms) =>
      ms.map((m) =>
        m.id === id && !m.required ? { ...m, enabled: !m.enabled } : m,
      ),
    );
  };

  // Validation
  const isStep1Valid =
    form.business_name.length >= 2 &&
    form.business_slug.length >= 2 &&
    form.city.length > 0 &&
    !!form.business_type;
  const isStep2Valid =
    form.owner_full_name.length >= 2 &&
    form.owner_email.includes('@') &&
    form.owner_phone.length >= 10;
  const isStep3Valid = !!form.plan_id;
  const isStep4Valid = true; // Modüller her zaman geçerli (default'lar var)

  const stepValidations = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid, true];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await createBusiness({
        business_name: form.business_name,
        business_slug: form.business_slug,
        city: form.city,
        business_type: form.business_type,
        owner_full_name: form.owner_full_name,
        owner_email: form.owner_email,
        owner_phone: form.owner_phone,
        plan_id: form.plan_id,
      });

      if (r.success) {
        setResult({
          business_id: r.business_id,
          temp_password: r.temp_password,
        });
        setStep(5); // Success
      } else {
        setError(r.error || 'Bir hata oluştu');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== SUCCESS SCREEN =====
  if (step === 5 && result) {
    return (
      <div className="px-8 py-12 max-w-[700px] mx-auto">
        <div className="bg-card border-2 rounded-[var(--r)] p-8"
          style={{ borderColor: 'var(--ok)' }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--ok)', color: 'var(--card)', fontSize: 32 }}
            >
              ✓
            </div>
            <Eyebrow tone="ok">İŞLETME OLUŞTURULDU</Eyebrow>
            <SerifTitle size={36} className="mt-2">
              {form.business_name}
            </SerifTitle>
            <p className="text-ink-2 text-sm mt-3">
              14 günlük trial başladı. Sahibine giriş bilgileri aşağıda.
            </p>
          </div>

          <div className="mt-6 p-5 rounded-[var(--r-sm)] bg-paper-2">
            <Eyebrow>SAHİBİNE GÖNDERİLECEK BİLGİLER</Eyebrow>
            <div className="grid gap-3 mt-3">
              <KvRow label="E-posta" value={form.owner_email} mono />
              <KvRow
                label="Geçici şifre"
                value={result.temp_password || '—'}
                mono
                highlight
              />
              <KvRow
                label="Panel adresi"
                value="https://panel.alegstudio.com"
                mono
              />
              <KvRow
                label="Menü adresi"
                value={`https://${form.business_slug}.alegstudio.com`}
                mono
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-center">
            <Link
              href={`/isletmeler/${result.business_id}`}
              className="h-10 px-4 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90 flex items-center"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              İşletmeyi gör →
            </Link>
            <Link
              href="/isletmeler"
              className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium hover:border-line-2 flex items-center"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Listeye dön
            </Link>
            <button
              onClick={() => {
                setStep(0);
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
                setSlugManuallyEdited(false);
                setModules(DEFAULT_MODULES);
              }}
              className="h-10 px-4 rounded-[var(--r-sm)] text-ink-3 text-sm font-medium hover:text-ink"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              Yeni ekle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-[1300px] mx-auto grid gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/isletmeler"
          className="text-ink-3 hover:text-super"
          style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}
        >
          ← İŞLETMELER
        </Link>
      </div>

      <div>
        <Eyebrow>YENİ İŞLETME</Eyebrow>
        <SerifTitle size={42} className="mt-2">
          Yeni işletme ekle
        </SerifTitle>
        <p className="text-ink-2 text-base mt-3 max-w-[640px]">
          5 adımda yeni bir işletme oluştur. Bilgileri doldurdukça sağdaki
          önizleme paneli güncellenir.
        </p>
      </div>

      {/* Stepper */}
      <div className="bg-card border border-line rounded-[var(--r)] p-5">
        <Stepper steps={STEPS} current={step} />
      </div>

      {/* === ANA İÇERİK + ÖNİZLEME (2 sütun) === */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* SOL — STEP CONTENT */}
        <div className="bg-card border border-line rounded-[var(--r)] p-6">
          {step === 0 && (
            <Step1Business
              form={form}
              updateField={updateField}
              onNameChange={handleNameChange}
              onSlugChange={handleSlugChange}
            />
          )}
          {step === 1 && <Step2Owner form={form} updateField={updateField} />}
          {step === 2 && (
            <Step3Plan form={form} updateField={updateField} plans={plans} />
          )}
          {step === 3 && (
            <Step4Modules modules={modules} toggleModule={toggleModule} />
          )}
          {step === 4 && <Step5Summary form={form} plans={plans} modules={modules} />}

          {error && (
            <div
              className="mt-4 p-3 rounded-[var(--r-sm)] text-sm"
              style={{
                background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
              }}
            >
              {error}
            </div>
          )}

          {/* Nav */}
          <div className="flex justify-between mt-6 pt-5 border-t border-line">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="h-10 px-4 rounded-[var(--r-sm)] border border-line bg-card text-ink-2 text-sm font-medium disabled:opacity-30"
              style={{ fontFamily: 'var(--f-sans)' }}
            >
              ← Geri
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValidations[step]}
                className="h-10 px-5 rounded-[var(--r-sm)] bg-super text-card font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: 'var(--f-sans)' }}
              >
                Devam →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-10 px-5 rounded-[var(--r-sm)] text-card font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--ok)', fontFamily: 'var(--f-sans)' }}
              >
                {submitting ? 'Oluşturuluyor…' : '✓ Oluştur'}
              </button>
            )}
          </div>
        </div>

        {/* SAĞ — CANLI ÖNİZLEME */}
        <LivePreview form={form} plans={plans} modules={modules} />
      </div>
    </div>
  );
}

// ============================================================
// STEP 1: İşletme bilgileri
// ============================================================
function Step1Business({
  form,
  updateField,
  onNameChange,
  onSlugChange,
}: {
  form: { business_name: string; business_slug: string; city: string; business_type: string };
  updateField: (k: 'city' | 'business_type', v: string) => void;
  onNameChange: (n: string) => void;
  onSlugChange: (s: string) => void;
}) {
  return (
    <div>
      <Eyebrow>ADIM 1 / 5</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        İşletme bilgileri
      </h2>

      <div className="grid gap-4 mt-5">
        <Field label="İşletme adı" required>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Örn: Karaköy Kahve Evi"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
        </Field>

        <Field
          label="Slug (alt domain)"
          required
          help={`Menü adresi: ${form.business_slug || 'isletme'}.alegstudio.com`}
        >
          <input
            type="text"
            value={form.business_slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="karakoy-kahve"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-mono)' }}
          />
        </Field>

        <Field label="İşletme tipi" required>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateField('business_type', t.id)}
                className="h-12 rounded-[var(--r-sm)] border text-sm font-medium flex items-center gap-2 px-3 transition-colors"
                style={{
                  background:
                    form.business_type === t.id
                      ? 'var(--super-soft)'
                      : 'var(--card)',
                  borderColor:
                    form.business_type === t.id ? 'var(--super)' : 'var(--line)',
                  color: form.business_type === t.id ? 'var(--super)' : 'var(--ink)',
                  fontFamily: 'var(--f-sans)',
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Şehir" required>
          <input
            type="text"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="Örn: İstanbul"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Sahibi bilgileri
// ============================================================
function Step2Owner({
  form,
  updateField,
}: {
  form: { owner_full_name: string; owner_email: string; owner_phone: string };
  updateField: (k: 'owner_full_name' | 'owner_email' | 'owner_phone', v: string) => void;
}) {
  return (
    <div>
      <Eyebrow>ADIM 2 / 5</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        İşletme sahibi
      </h2>
      <p className="text-ink-2 text-sm mt-2">
        Bu kişi panele giriş yapacak ve işletmeyi yönetecek. Geçici şifre üretilir,
        oluşturma sonrası ekranda gösterilir.
      </p>

      <div className="grid gap-4 mt-5">
        <Field label="Ad soyad" required>
          <input
            type="text"
            value={form.owner_full_name}
            onChange={(e) => updateField('owner_full_name', e.target.value)}
            placeholder="Mehmet Yılmaz"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-sans)' }}
          />
        </Field>
        <Field label="E-posta" required help="Giriş için kullanılacak">
          <input
            type="email"
            value={form.owner_email}
            onChange={(e) => updateField('owner_email', e.target.value)}
            placeholder="mehmet@karakoy-kahve.com"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-mono)' }}
          />
        </Field>
        <Field label="Telefon" required help="En az 10 hane">
          <input
            type="tel"
            value={form.owner_phone}
            onChange={(e) => updateField('owner_phone', e.target.value)}
            placeholder="0532 xxx xx xx"
            className="w-full h-11 px-3 rounded-[var(--r-sm)] bg-paper-2 border border-line text-base focus:outline-none focus:border-super"
            style={{ fontFamily: 'var(--f-mono)' }}
          />
        </Field>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: Plan
// ============================================================
function Step3Plan({
  form,
  updateField,
  plans,
}: {
  form: { plan_id: string };
  updateField: (k: 'plan_id', v: string) => void;
  plans: Plan[];
}) {
  return (
    <div>
      <Eyebrow>ADIM 3 / 5</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        Plan seç
      </h2>
      <p className="text-ink-2 text-sm mt-2">
        Tüm planlar 14 gün ücretsiz trial ile başlar. Trial bitiminde otomatik
        olarak ücretli aboneliğe geçer.
      </p>

      {plans.length === 0 ? (
        <div className="mt-5 p-5 rounded-[var(--r-sm)] bg-paper-2 text-ink-3 text-sm text-center">
          Henüz plan tanımlı değil. Önce <code>platform_plans</code> tablosuna plan ekleyin.
        </div>
      ) : (
        <div className="grid gap-2 mt-5">
          {plans.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-3 p-4 rounded-[var(--r-sm)] border cursor-pointer transition-colors"
              style={{
                borderColor: form.plan_id === p.id ? 'var(--super)' : 'var(--line)',
                background: form.plan_id === p.id ? 'var(--super-soft)' : 'transparent',
              }}
            >
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={form.plan_id === p.id}
                onChange={(e) => updateField('plan_id', e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold text-base">{p.name}</div>
                  <Money amount={p.price_monthly} size={20} />
                </div>
                {p.description && (
                  <p className="text-sm text-ink-2 mt-1">{p.description}</p>
                )}
                {p.features && p.features.length > 0 && (
                  <ul className="grid gap-1 mt-2">
                    {p.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="text-xs text-ink-3 flex items-start gap-1.5">
                        <span style={{ color: 'var(--ok)' }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 4: Modüller
// ============================================================
function Step4Modules({
  modules,
  toggleModule,
}: {
  modules: Module[];
  toggleModule: (id: string) => void;
}) {
  return (
    <div>
      <Eyebrow>ADIM 4 / 5</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        Modüller
      </h2>
      <p className="text-ink-2 text-sm mt-2">
        Hangi modüller etkin olsun? Sonradan değiştirebilirsiniz.
      </p>

      <div className="grid gap-2 mt-5">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggleModule(m.id)}
            disabled={m.required}
            className="flex items-center gap-3 p-4 rounded-[var(--r-sm)] border text-left transition-colors disabled:cursor-not-allowed"
            style={{
              borderColor: m.enabled ? 'var(--super)' : 'var(--line)',
              background: m.enabled ? 'var(--super-soft)' : 'var(--card)',
            }}
          >
            <div
              className="w-10 h-6 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: m.enabled ? 'var(--super)' : 'var(--line-2)' }}
            >
              <div
                className="absolute top-1 bg-card rounded-full transition-all"
                style={{
                  width: 16,
                  height: 16,
                  left: m.enabled ? 18 : 2,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {m.label}
                {m.required && (
                  <span
                    className="ml-2 text-xs"
                    style={{
                      fontFamily: 'var(--f-mono)',
                      color: 'var(--ink-3)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    ZORUNLU
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-3 mt-0.5">{m.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Özet
// ============================================================
type WizardForm = {
  business_name: string;
  business_slug: string;
  city: string;
  business_type: string;
  owner_full_name: string;
  owner_email: string;
  owner_phone: string;
  plan_id: string;
};

function Step5Summary({
  form,
  plans,
  modules,
}: {
  form: WizardForm;
  plans: Plan[];
  modules: Module[];
}) {
  const plan = plans.find((p) => p.id === form.plan_id);
  const enabledModules = modules.filter((m) => m.enabled);

  return (
    <div>
      <Eyebrow>ADIM 5 / 5</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 24,
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        Onay
      </h2>
      <p className="text-ink-2 text-sm mt-2">
        Aşağıdaki bilgilerle işletme oluşturulacak. Onay verdiğinizde sahibe
        e-posta gönderilir ve panele giriş yapabilir.
      </p>

      <div className="grid gap-4 mt-5">
        <SummarySection title="İşletme">
          <KvRow label="Ad" value={form.business_name} />
          <KvRow label="Slug" value={form.business_slug} mono />
          <KvRow
            label="Tip"
            value={
              BUSINESS_TYPES.find((t) => t.id === form.business_type)?.label || '—'
            }
          />
          <KvRow label="Şehir" value={form.city} />
        </SummarySection>

        <SummarySection title="Sahibi">
          <KvRow label="Ad soyad" value={form.owner_full_name} />
          <KvRow label="E-posta" value={form.owner_email} mono />
          <KvRow label="Telefon" value={form.owner_phone} mono />
        </SummarySection>

        <SummarySection title="Plan">
          <div className="flex items-baseline justify-between py-2">
            <div className="font-semibold text-base">
              {plan?.name || '—'}
            </div>
            {plan && <Money amount={plan.price_monthly} size={22} />}
          </div>
          <div className="text-xs text-ink-3 pt-2 border-t border-line">
            14 gün ücretsiz trial → Sonra otomatik ücretli aboneliğe geçer
          </div>
        </SummarySection>

        <SummarySection title="Modüller">
          <div className="flex flex-wrap gap-2 py-1">
            {enabledModules.map((m) => (
              <Pill key={m.id} tone="super">
                {m.label}
              </Pill>
            ))}
          </div>
        </SummarySection>
      </div>
    </div>
  );
}

// ============================================================
// Canlı önizleme
// ============================================================
function LivePreview({
  form,
  plans,
  modules,
}: {
  form: {
    business_name: string;
    business_slug: string;
    city: string;
    business_type: string;
    owner_full_name: string;
    owner_email: string;
    owner_phone: string;
    plan_id: string;
  };
  plans: Plan[];
  modules: Module[];
}) {
  const plan = plans.find((p) => p.id === form.plan_id);
  const logo = (form.business_name || '?')
    .replace(/[^a-zA-ZığüşöçĞÜŞÖÇ]/g, '')
    .slice(0, 2)
    .toUpperCase() || '?';
  const enabledCount = modules.filter((m) => m.enabled).length;
  const typeLabel = BUSINESS_TYPES.find((t) => t.id === form.business_type)?.label || '—';

  return (
    <div className="bg-card border border-line rounded-[var(--r)] p-5 lg:sticky lg:top-5 self-start">
      <Eyebrow tone="super">ÖNİZLEME · CANLI</Eyebrow>
      <div
        style={{
          fontFamily: 'var(--f-serif)',
          fontStyle: 'italic',
          fontSize: 18,
          fontWeight: 400,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        İşletme kartı
      </div>

      {/* Card preview */}
      <div className="border border-line rounded-[var(--r)] p-4 bg-paper-2">
        <div className="flex items-start gap-3 mb-3">
          <LogoTile logo={logo} tint="var(--super)" size={48} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] text-ink truncate">
              {form.business_name || 'İşletme adı'}
            </div>
            <div
              className="text-xs text-ink-3 truncate"
              style={{ fontFamily: 'var(--f-mono)' }}
            >
              {form.business_slug || 'slug'}.alegstudio.com
            </div>
          </div>
          <Pill tone="gold">YENİ</Pill>
        </div>

        <div className="grid gap-2 pt-3 border-t border-line">
          <PreviewRow label="TİP" value={typeLabel} />
          <PreviewRow label="ŞEHİR" value={form.city || '—'} />
          <PreviewRow
            label="SAHİBİ"
            value={form.owner_full_name || '—'}
          />
          <PreviewRow
            label="PLAN"
            value={
              plan
                ? `${plan.name} · ₺${plan.price_monthly.toLocaleString('tr-TR')}/ay`
                : 'Seçilmedi'
            }
          />
          <PreviewRow label="MODÜL" value={`${enabledCount} aktif`} />
        </div>
      </div>

      <div className="mt-4 p-3 rounded-[var(--r-sm)] bg-paper-2 text-xs text-ink-3 leading-relaxed">
        <strong className="text-ink-2">İşlem akışı:</strong>
        <ol className="grid gap-1 mt-2 ml-4 list-decimal">
          <li>Auth kullanıcısı oluşturulur (geçici şifre ile)</li>
          <li>İşletme kaydı eklenir, trial başlar</li>
          <li>Sahibi rolü ve member kaydı oluşturulur</li>
          <li>Ana şube otomatik açılır</li>
          <li>Sahibe ekranda geçici şifre gösterilir</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================
// Yardımcılar
// ============================================================
function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block mb-1.5"
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--ink-3)',
          textTransform: 'uppercase',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </label>
      {children}
      {help && (
        <div
          className="text-xs text-ink-3 mt-1"
          style={{ fontFamily: 'var(--f-mono)' }}
        >
          {help}
        </div>
      )}
    </div>
  );
}

function KvRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-3 py-1.5"
      style={{ gridTemplateColumns: '120px 1fr' }}
    >
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        className="text-sm truncate"
        style={{
          fontFamily: mono ? 'var(--f-mono)' : 'var(--f-sans)',
          color: highlight ? 'var(--accent)' : 'var(--ink)',
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: '60px 1fr' }}>
      <span
        style={{
          fontFamily: 'var(--f-mono)',
          fontSize: 9,
          color: 'var(--ink-3)',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span className="text-xs text-ink-2 truncate">{value}</span>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line rounded-[var(--r-sm)] p-4">
      <Eyebrow>{title.toUpperCase()}</Eyebrow>
      <div className="mt-2">{children}</div>
    </div>
  );
}
