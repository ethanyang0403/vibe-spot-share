import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AI_SUGGESTIONS, type AISuggestion } from '@/lib/aiSuggestions';

interface Props {
  hidden: boolean; // true when a sheet/card is open
  onAction: (action: AISuggestion['action']) => void;
}

const MAX_APPEARANCES = 3;
const ROTATE_MS = 20000;
const REAPPEAR_MS = 60000;

export default function AISuggestionCard({ hidden, onAction }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showReason, setShowReason] = useState(false);
  const appearances = useRef(1);
  const reappearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotate suggestions while visible
  useEffect(() => {
    if (!visible || hidden) return;
    const id = setInterval(() => {
      setShowReason(false);
      setIndex((i) => (i + 1) % AI_SUGGESTIONS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [visible, hidden]);

  const dismiss = () => {
    setVisible(false);
    setShowReason(false);
    if (appearances.current >= MAX_APPEARANCES) return;
    reappearTimer.current = setTimeout(() => {
      appearances.current += 1;
      setIndex((i) => (i + 1) % AI_SUGGESTIONS.length);
      setVisible(true);
    }, REAPPEAR_MS);
  };

  useEffect(() => {
    return () => {
      if (reappearTimer.current) clearTimeout(reappearTimer.current);
    };
  }, []);

  const s = AI_SUGGESTIONS[index];
  const shouldShow = visible && !hidden;

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key="ai-card-wrap"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          className="absolute left-1/2 z-10 -translate-x-1/2"
          style={{ bottom: 100, width: '85%', maxWidth: 360 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={s.text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card"
              style={{
                borderLeft: '3px solid #C2E9FF',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              {/* Top label row */}
              <div className="flex items-center justify-between mb-2" style={{ position: 'relative', zIndex: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    color: '#555566',
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                    fontWeight: 600,
                  }}
                >
                  Suggested for you
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss();
                  }}
                  aria-label="Dismiss suggestion"
                  style={{ color: '#555566', fontSize: 16, lineHeight: 1, padding: 4 }}
                >
                  ×
                </button>
              </div>

              {/* Main content */}
              <button
                onClick={() => {
                  setShowReason((v) => !v);
                  // Trigger main action with a slight delay so reason can flash
                  setTimeout(() => onAction(s.action), 600);
                }}
                className="w-full text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '9999px',
                      backgroundColor: '#1C1C24',
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        lineHeight: 1.3,
                      }}
                    >
                      {s.text}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#8A8A9A',
                        marginTop: 2,
                        lineHeight: 1.35,
                      }}
                    >
                      {s.context}
                    </p>
                    <AnimatePresence>
                      {showReason && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            fontSize: 10,
                            color: '#555566',
                            fontStyle: 'italic',
                            marginTop: 4,
                          }}
                        >
                          Why this? · {s.reason}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>

              <div className="flex justify-end mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(s.action);
                  }}
                  style={{ fontSize: 12, color: '#C2E9FF', fontWeight: 600 }}
                  className="active:scale-[0.97] transition-transform"
                >
                  See more →
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
