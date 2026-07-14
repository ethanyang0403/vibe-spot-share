import { Map, Radar, Compass, Users, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadTotal } from '@/lib/messaging/hooks';
import { useDemoMode } from '@/lib/demoMode';

const tabs = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/nearby', icon: Radar, label: 'Nearby' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

function isActive(tabPath: string, pathname: string) {
  if (tabPath === '/') return pathname === '/';
  return pathname === tabPath || pathname.startsWith(tabPath + '/');
}

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoMode] = useDemoMode();
  const unread = useUnreadTotal(demoMode ? null : user?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; top: number; height: number } | null>(null);

  const activeIndex = tabs.findIndex((t) => isActive(t.path, location.pathname));

  useLayoutEffect(() => {
    const container = containerRef.current;
    const btn = btnRefs.current[activeIndex];
    if (!container || !btn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPillStyle({
      left: bRect.left - cRect.left,
      top: bRect.top - cRect.top,
      width: bRect.width,
      height: bRect.height,
    });
  }, [activeIndex, location.pathname]);

  return (
    <div
      ref={containerRef}
      className="glass fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around pb-[env(safe-area-inset-bottom,8px)] pt-2"
      style={{
        height: 'calc(56px + env(safe-area-inset-bottom, 8px))',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Animated active pill — sits behind icons */}
      {pillStyle && (
        <motion.div
          initial={false}
          animate={{
            left: pillStyle.left,
            top: pillStyle.top,
            width: pillStyle.width,
            height: pillStyle.height,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="pointer-events-none absolute"
          style={{
            backgroundColor: 'rgba(194, 233, 255, 0.1)',
            borderRadius: 14,
            zIndex: 1,
          }}
        />
      )}

      {tabs.map(({ path, icon: Icon, label }, i) => {
        const active = isActive(path, location.pathname);
        const color = active ? '#C2E9FF' : '#555566';
        const showBadge = path === '/messages' && unread > 0;
        return (
          <button
            key={path}
            ref={(el) => (btnRefs.current[i] = el)}
            onClick={() => navigate(path)}
            className="relative z-10 flex flex-col items-center gap-0.5 transition-all active:scale-[0.95]"
            style={{ paddingLeft: 10, paddingRight: 10 }}
          >
            <div className="relative">
              <Icon size={20} style={{ color }} />
              {showBadge && (
                <span
                  className="absolute -right-1.5 -top-1 min-w-[16px] rounded-full px-1 text-center text-[9px] font-semibold leading-[16px]"
                  style={{ backgroundColor: '#C2E9FF', color: '#0A0A0F' }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </div>
            <span className="text-[10px]" style={{ color }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
