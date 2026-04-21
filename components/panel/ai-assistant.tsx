'use client';

import { useState, useRef, useEffect } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'İşletmem için pazarlama fikri ver',
  'Çalışma saatlerimi nasıl optimize edebilirim?',
  'Menü kategorisi önerisi ver',
  'Kahvem çekici nasıl görünür?',
];

interface Props {
  businessName?: string;
}

export function AiAssistant({ businessName }: Props = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Asistan adı: "Aleg Karaköy Asistanı" veya "Aleg Asistanı"
  const assistantName = businessName
    ? `${businessName} Asistanı`
    : 'Aleg Asistanı';

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // Açılınca input'a odaklan
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Hata oluştu');
      }

      if (!response.body) throw new Error('Yanıt okunamıyor');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantText += parsed.text;
              setStreamingText(assistantText);
            }
          } catch {
            // parse error ignore
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: assistantText }]);
      setStreamingText('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bir hata oluştu';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Üzgünüm, bir hata oluştu: ${errorMsg}` },
      ]);
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{
            background: 'var(--accent)',
            color: '#FAF5EA',
            boxShadow:
              '0 4px 10px rgba(196,85,58,0.3), 0 12px 30px -8px rgba(196,85,58,0.4)',
            animation: 'assistantPulse 3s ease-in-out infinite',
          }}
          title={assistantName}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.5 7h7.5l-6 4.5 2.5 7.5-6.5-5-6.5 5 2.5-7.5-6-4.5h7.5z" />
          </svg>

          <style jsx>{`
            @keyframes assistantPulse {
              0%, 100% {
                box-shadow: 0 4px 10px rgba(196,85,58,0.3), 0 12px 30px -8px rgba(196,85,58,0.4);
              }
              50% {
                box-shadow: 0 4px 14px rgba(196,85,58,0.5), 0 16px 40px -8px rgba(196,85,58,0.6);
              }
            }
          `}</style>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[900] flex flex-col w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-60px)] rounded-[18px] overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow:
              '0 4px 10px rgba(42,31,24,0.1), 0 20px 60px -10px rgba(42,31,24,0.3)',
            animation: 'assistantSlide 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #E08060)',
              color: '#FAF5EA',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full grid place-items-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.5 7h7.5l-6 4.5 2.5 7.5-6.5-5-6.5 5 2.5-7.5-6-4.5h7.5z" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {assistantName}
                </div>
                <div
                  className="flex items-center gap-1 text-[10px] uppercase"
                  style={{
                    fontFamily: 'var(--f-mono)',
                    letterSpacing: '0.1em',
                    opacity: 0.85,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  AI ASİSTAN · AKTİF
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full grid place-items-center hover:bg-white/20 transition-colors"
              title="Kapat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
            style={{ background: 'var(--paper-2)' }}
          >
            {messages.length === 0 && !streamingText && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
                <div
                  className="w-14 h-14 rounded-full grid place-items-center"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.5 7h7.5l-6 4.5 2.5 7.5-6.5-5-6.5 5 2.5-7.5-6-4.5h7.5z" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--f-serif)',
                      fontStyle: 'italic',
                      fontSize: 20,
                      fontWeight: 400,
                      color: 'var(--ink)',
                      lineHeight: 1.2,
                    }}
                  >
                    Merhaba{businessName ? <>,<br /><span className="text-accent">{businessName}</span></> : ''}
                    <br />
                    sana nasıl yardımcı olabilirim?
                  </h3>
                  <p className="text-ink-2 text-[13px] mt-2 max-w-[260px]">
                    Pazarlama, slogan, menü, operasyon — her konuda yardımcı olabilirim.
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-col gap-1.5 w-full mt-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-left text-[12px] px-3 py-2 rounded-[10px] transition-colors hover:bg-card"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        color: 'var(--ink-2)',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {/* Streaming response */}
            {streamingText && (
              <MessageBubble role="assistant" content={streamingText} streaming />
            )}

            {/* Loading indicator */}
            {loading && !streamingText && (
              <div className="flex items-center gap-1.5 ml-2">
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 flex items-end gap-2"
            style={{
              background: 'var(--card)',
              borderTop: '1px solid var(--line)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Bir şey sor..."
              rows={1}
              maxLength={500}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-[12px] text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none disabled:opacity-50"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
                maxHeight: 100,
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#FAF5EA' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>

          <style jsx>{`
            @keyframes assistantSlide {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-3.5 py-2.5 rounded-[14px] text-[13px]"
        style={{
          background: isUser ? 'var(--accent)' : 'var(--card)',
          color: isUser ? '#FAF5EA' : 'var(--ink)',
          border: isUser ? 'none' : '1px solid var(--line)',
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
        {streaming && (
          <span
            className="inline-block w-1 h-3.5 ml-0.5 align-middle"
            style={{
              background: 'var(--ink)',
              animation: 'blinkCursor 1s infinite',
            }}
          />
        )}
        <style jsx>{`
          @keyframes blinkCursor {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-ink-3"
      style={{
        animation: `dotBounce 1.4s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
      }}
    >
      <style jsx>{`
        @keyframes dotBounce {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </span>
  );
}
