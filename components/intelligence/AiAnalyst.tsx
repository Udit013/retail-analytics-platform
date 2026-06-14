'use client';
import { useEffect, useRef, useState } from 'react';
import { EXAMPLE_QUESTIONS } from '@/lib/ai/analyst';

interface Msg { role: 'user' | 'assistant'; text: string; source?: string }

export default function AiAnalyst() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/ai/analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { role: 'assistant', text: d.answer ?? d.error ?? 'No answer.', source: d.source }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[70vh]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800">Ask your data anything</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1 mb-5">
              Grounded in your forecasts, customers, inventory, and root-cause analysis. Runs on a
              local open-source model (Ollama) when available, with a deterministic analyst as fallback.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button key={q} onClick={() => ask(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              {m.source && <div className="text-[10px] text-gray-400 mt-1.5">{m.source}</div>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="border-t border-gray-200 p-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder="Ask about revenue, customers, inventory, pricing…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button type="submit" disabled={busy || !input.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          Ask
        </button>
      </form>
    </div>
  );
}
