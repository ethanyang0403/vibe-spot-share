import { motion } from 'framer-motion';
import { CheckCheck, AlertCircle } from 'lucide-react';

interface Props {
  content: string;
  isMe: boolean;
  showSender: boolean;
  senderName?: string;
  senderInitial?: string;
  senderColor?: string;
  timeLabel?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
  onRetry?: () => void;
  system?: boolean;
}

export default function MessageBubble({
  content, isMe, showSender, senderName, senderInitial, senderColor,
  timeLabel, status, onRetry, system,
}: Props) {
  if (system) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/50">{content}</span>
      </div>
    );
  }

  return (
    <div className={`flex w-full gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-7 shrink-0">
          {showSender && senderInitial && (
            <div
              className="mt-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: senderColor || '#666' }}
            >
              {senderInitial}
            </div>
          )}
        </div>
      )}
      <div className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && showSender && senderName && (
          <span className="mb-0.5 ml-2 text-[11px] text-white/50">{senderName}</span>
        )}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug"
          style={
            isMe
              ? { backgroundColor: '#C2E9FF', color: '#0A0A0F', borderBottomRightRadius: 6 }
              : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderBottomLeftRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }
          }
        >
          {content}
        </motion.div>
        {(timeLabel || status) && (
          <div className={`mt-1 flex items-center gap-1 text-[10px] text-white/40 ${isMe ? 'flex-row-reverse' : ''}`}>
            {timeLabel && <span>{timeLabel}</span>}
            {isMe && status === 'sending' && <span>· sending…</span>}
            {isMe && status === 'sent' && <CheckCheck size={11} className="text-white/50" />}
            {isMe && status === 'failed' && (
              <button onClick={onRetry} className="flex items-center gap-1 text-red-400">
                <AlertCircle size={11} /> tap to retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
