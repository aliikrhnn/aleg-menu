# 🟢 AGENT STATUS WEB BADGE

Web tarafında **Agent durum göstergesi** + **akıllı koruma**.

Print Agent çalışıyorken panel/kasa sekmeleri **otomatik fark eder**,
yazıcıyı **agent'a bırakır**, çift fiş riskini sıfırlar.

**6 dosya · Migration yok.**

## ✨ Özellikler

### 1. AgentStatusBadge
Topbar'da küçük chip:
- 🟢 **AGENT AKTİF** — agent online (yeşil)
- 🟡 **AGENT KAPALI** — agent kayıtlı ama offline (sarı, çakışma uyarısı)
- ⚫ **AGENT YOK** — hiç agent kayıtlı değil (gri)

Mouse üzerine getirince popup:
> "Background print agent çalışıyor (1 cihaz). Yazıcı işlemleri agent
> tarafından yönetilir — bu kasa sekmesi yazdırma yapmaz. Çift fiş çıkmaz."

### 2. useAgentStatus Hook
- 30 saniyede bir DB check
- Realtime (printer_agents UPDATE event) ile heartbeat anlık görür
- 90 saniye threshold (agent.js heartbeat 30 sn'de bir → 3 misli marj)

### 3. PrintQueueListener Korumalı
Agent online ise sekme **HİÇ** yazdırmaya çalışmaz:

```typescript
async function processJob(jobId, isRetry = false) {
  // 🛡️ Agent online ise atla
  if (hasOnlineAgentRef.current) return;

  // ... claim, print
}
```

## 📦 Dosyalar (6)

```
lib/hooks/use-agent-status.ts          ✨ Yeni - agent online dinleme
components/panel/agent-status-badge.tsx ✨ Yeni - chip + tooltip
components/panel/print-queue-listener.tsx 🔄 agent koruması
components/panel/topbar.tsx            🔄 badge yerleşim
app/panel/(shell)/layout.tsx           🔄 businessId geç
app/kasa/kasa-board.tsx               🔄 kasa'ya da badge
```

## 🚀 Push

```powershell
Expand-Archive -Path agent-status-web.zip -DestinationPath . -Force

git add . && git commit -m "feat(printer): agent status badge + smart fallback" && git push
```

## 🧪 Test Senaryoları

### A) Agent v2 Kapalı + Panel Açık
1. Tray'den agent'ı kapat (🚪 Çıkış)
2. Panel'i aç
3. ✅ Topbar'da: 🟡 **AGENT KAPALI** (sarı)
4. Mouse üzerine: "Bu sekme Bluetooth ile yazdıracak..."
5. (Bluetooth yoksa zaten yazıcı çalışmaz)

### B) Agent v2 Açık + Panel Açık
1. Tray ikonu yeşil (online)
2. Panel'i aç
3. ✅ Topbar'da: 🟢 **AGENT AKTİF** (yeşil)
4. Mouse üzerine: "Background print agent çalışıyor..."
5. Sipariş ver → **sadece agent** yazdırır (sekme bypass)
6. ✅ TEK FİŞ

### C) Çoklu Sekme + Agent Açık
1. Agent açık (tray'de yeşil)
2. **2 panel sekmesi** + **1 kasa sekmesi** aç
3. Hepsinde topbar'da: 🟢 **AGENT AKTİF**
4. Sipariş ver → sadece agent yazdırır
5. ✅ TEK FİŞ (3 sekme bile olsa)

### D) Agent Kapanırsa
1. Agent açık → sipariş ver → ✅ tek fiş
2. Agent'ı tray'den kapat
3. Badge'ler 30 saniye içinde 🟡'ya döner
4. Sonraki sipariş → **sekme yazdırır** (Bluetooth varsa)

## 💡 Mantık

### Heartbeat Akışı
```
Agent v2 (her 30 sn)
  → printer_agents.last_seen_at = NOW()

useAgentStatus hook (her 30 sn + realtime)
  → SELECT WHERE last_seen_at > NOW() - 90s
  → Online sayısını state'e yazar

AgentStatusBadge → state.hasOnlineAgent
  → 🟢 / 🟡 / ⚫ icon ve renk

PrintQueueListener → hasOnlineAgentRef
  → if true: return (yazdırma!)
```

### Neden 90 saniye?
- Agent her 30 saniyede heartbeat
- Network gecikmesi + tray donması ihtimali için **3x marj**
- Agent gerçekten kapanınca 60-90 sn içinde sekme tekrar yazdırır

## 🗺️ Durum

| | |
|---|---|
| Hızlı Satış HesapPanel | ✅ |
| Agent v2.0 (Tray + Dashboard) | ✅ |
| **Web AgentStatusBadge** | **✅ TESLİM** |
| UX Paket 3 (Kod kalitesi) | 🔜 |
| Süper admin paneli | 🔜 |

---

Push → test et → çoklu sekme deneyimini gör 🎯

Test ipucu: Agent açıkken iki panel sekmesi aç, sipariş ver, fişin
SADECE BİR KEZ çıktığını gör. Bu artık yapısal olarak garanti altında.
