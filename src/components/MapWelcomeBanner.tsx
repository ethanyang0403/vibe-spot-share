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

  const parts = welcome.text.split(/\{(\d)\}/g);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="glass-card absolute z-10 flex items-center gap-2"
          style={{
            top: 'calc(env(safe-area-inset-top, 12px) + 110px)',
            left: 16,
            right: 16,
            borderRadius: 14,
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 13, color: '#fff', flex: 1, lineHeight: 1.3, position: 'relative', zIndex: 2 }}>
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
            style={{ color: '#555566', fontSize: 16, lineHeight: 1, padding: 4, position: 'relative', zIndex: 2 }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
