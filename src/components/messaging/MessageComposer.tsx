import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageComposer({ onSend, disabled, placeholder = 'Message…' }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !disabled && !sending;

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await onSend(t);
      setText('');
      if (ref.current) ref.current.style.height = 'auto';
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="glass flex items-end gap-2 border-t px-3 py-2"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        className="max-h-[120px] flex-1 resize-none rounded-2xl bg-white/5 px-3.5 py-2 text-[15px] text-white placeholder:text-white/35 outline-none"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      />
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={submit}
        disabled={!canSend}
        className="flex h-9 w-9 items-center justify-center rounded-full transition"
        style={{
          backgroundColor: canSend ? '#C2E9FF' : 'rgba(255,255,255,0.08)',
          color: canSend ? '#0A0A0F' : 'rgba(255,255,255,0.35)',
        }}
        aria-label="Send"
      >
        <Send size={16} />
      </motion.button>
    </div>
  );
}
