import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getTimeAwareWelcome } from '@/lib/aiSuggestions';

export default function MapWelcomeBanner() {
  const [visible, setVisible] = useState(true);
  const welcome = getTimeAwareWelcome();

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Render text with highlighted numbers
  const parts = welcome.text.split(/\{(\d)\}/g);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="absolute left-4 right-4 z-10"
          style={{
            top: 'calc(env(safe-area-inset-top, 12px) + 60px)',
            backgroundColor: '#141419',
            border: '1px solid #2A2A35',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <p style={{ fontSize: 13, color: '#fff', flex: 1, lineHeight: 1.3 }}>
            {parts.map((part, i) => {
              if (/^\d$/.test(part)) {
                return (
                  <span key={i} style={{ color: '#C2E9FF', fontWeight: 700 }}>
                    {welcome.highlights[Number(part)]}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss welcome"
            style={{ color: '#555566', fontSize: 16, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
