import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  MOCK_NOTIFICATIONS,
  type AppNotification,
  NOTIFICATION_FOCUS_FRIEND_EVENT,
  NOTIFICATION_FOCUS_BUSINESS_EVENT,
} from '@/lib/notificationsMock';
import { openPersonProfile } from '@/lib/profileBus';
import { useDemoMode } from '@/lib/demoMode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { stableColor, initialOf, relativeTime } from '@/lib/realProfileHelpers';

const TOAST_STYLE = {
  backgroundColor: '#141419',
  color: '#fff',
  border: '1px solid #2A2A35',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

type FriendRequestState = 'pending' | 'accepted' | 'declined';

export default function PingsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [demoMode] = useDemoMode();
  const [notifications, setNotifications] = useState<AppNotification[]>(demoMode ? MOCK_NOTIFICATIONS : []);
  const [expandedRecapId, setExpandedRecapId] = useState<string | null>(null);
  const [friendRequestStates, setFriendRequestStates] = useState<Record<string, FriendRequestState>>({});
  const [revealedRequests, setRevealedRequests] = useState<Set<string>>(new Set());

  const loadRealPings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pings')
      .select('id, message, read, created_at, latitude, longitude, sender_id, sender:profiles!pings_sender_id_fkey(id, username, display_name)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    const rows: AppNotification[] = (data ?? []).map((p: any) => {
      const name = p.sender?.display_name || p.sender?.username || 'Someone';
      return {
        id: p.id,
        type: 'ping',
        title: name,
        subtitle: p.message || 'pinged you 📍',
        timestamp: relativeTime(p.created_at),
        read: !!p.read,
        avatar: { initial: initialOf(name), color: stableColor(p.sender_id) },
        action:
          p.latitude != null && p.longitude != null
            ? { type: 'show_on_map', lat: p.latitude, lng: p.longitude }
            : { type: 'center_map' },
      } as AppNotification;
    });
    setNotifications(rows);
  }, [user]);

  useEffect(() => {
    if (demoMode) { setNotifications(MOCK_NOTIFICATIONS); return; }
    loadRealPings();
  }, [demoMode, loadRealPings]);

  useEffect(() => {
    if (demoMode || !user) return;
    const ch = supabase.channel('pings-feed')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pings', filter: `recipient_id=eq.${user.id}` },
        () => loadRealPings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [demoMode, user, loadRealPings]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast('All caught up ✓', { style: TOAST_STYLE, position: 'top-center', duration: 2000 });
  };

  const handleRowTap = (n: AppNotification) => {
    markAsRead(n.id);

    const goToMapAndFocus = (eventName: string, detail: Record<string, unknown>) => {
      navigate('/');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
      }, 50);
    };

    if (n.action.type === 'show_on_map' && n.action.lat && n.action.lng) {
      if (n.type === 'deal') {
        goToMapAndFocus(NOTIFICATION_FOCUS_BUSINESS_EVENT, {
          lat: n.action.lat,
          lng: n.action.lng,
        });
      } else {
        goToMapAndFocus(NOTIFICATION_FOCUS_FRIEND_EVENT, {
          lat: n.action.lat,
          lng: n.action.lng,
        });
      }
    } else if (n.action.type === 'center_map' && n.action.lat && n.action.lng) {
      goToMapAndFocus(NOTIFICATION_FOCUS_FRIEND_EVENT, {
        lat: n.action.lat,
        lng: n.action.lng,
      });
    } else if (n.action.type === 'show_business' && n.action.businessId) {
      goToMapAndFocus(NOTIFICATION_FOCUS_BUSINESS_EVENT, {
        businessId: n.action.businessId,
      });
    } else if (n.action.type === 'show_moment') {
      // Just route to map; surfacing a specific Moment isn't wired yet.
      navigate('/');
    } else if (n.action.type === 'show_recap') {
      setExpandedRecapId((prev) => (prev === n.id ? null : n.id));
    } else if (n.action.type === 'friend_request') {
      setRevealedRequests((prev) => {
        const next = new Set(prev);
        next.has(n.id) ? next.delete(n.id) : next.add(n.id);
        return next;
      });
    } else if (n.type === 'friend_accepted') {
      navigate('/friends');
    }
  };

  const acceptRequest = (n: AppNotification) => {
    setFriendRequestStates((prev) => ({ ...prev, [n.id]: 'accepted' }));
    const name = n.title.split(' wants')[0];
    toast(`You and ${name} are now friends! 🎉`, {
      style: TOAST_STYLE,
      position: 'top-center',
      duration: 2500,
    });
  };

  const declineRequest = (n: AppNotification) => {
    setFriendRequestStates((prev) => ({ ...prev, [n.id]: 'declined' }));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    }, 500);
  };

  const shareRecap = () => {
    toast('Link copied! 📋', { style: TOAST_STYLE, position: 'top-center', duration: 2000 });
  };

  return (
    <div
      className="flex flex-col h-[calc(100dvh-56px-env(safe-area-inset-bottom,8px))]"
      style={{ backgroundColor: '#0A0A0F' }}
    >
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,12px)+12px)] pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Activity</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[13px] transition-colors active:scale-[0.97]"
              style={{ color: '#8A8A9A' }}
            >
              Mark all read
            </button>
          )}
        </div>
        {unreadCount > 0 && (
          <span
            className="inline-flex items-center mt-1 glass-pill"
            style={{
              color: '#C2E9FF',
              backgroundColor: 'rgba(194, 233, 255, 0.1)',
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 px-8">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full mb-3"
              style={{ backgroundColor: '#2A2A35' }}
            >
              <span style={{ fontSize: 24 }}>🔔</span>
            </div>
            <p className="text-[16px]" style={{ color: '#8A8A9A' }}>No activity yet</p>
            <p className="text-[13px] mt-1 text-center" style={{ color: '#555566' }}>
              Pings, deals, and Moments will show up here
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((n) => {
              const requestState = friendRequestStates[n.id] ?? 'pending';
              const showRequestActions =
                n.type === 'friend_request' && revealedRequests.has(n.id);
              const showRecap = n.type === 'moment_expired' && expandedRecapId === n.id;

              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 1 }}
                  animate={{ opacity: requestState === 'declined' ? 0 : 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Row */}
                  <button
                    onClick={() => handleRowTap(n)}
                    className="w-full text-left transition-colors"
                    style={{
                      padding: '14px 16px',
                      backgroundColor: !n.read ? 'rgba(194, 233, 255, 0.04)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar (tappable for person notifications, soft for AI) */}
                      {n.avatar.isAI ? (
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: 'rgba(194, 233, 255, 0.1)',
                            border: '1px solid rgba(194, 233, 255, 0.2)',
                            fontSize: 18,
                            lineHeight: 1,
                          }}
                        >
                          {n.avatar.initial}
                        </div>
                      ) : n.avatar.color !== '#1C1C24' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const personName = n.title
                              .replace(/ pinged you.*$/, '')
                              .replace(/ accepted your request.*$/, '')
                              .replace(/ wants to be friends.*$/, '');
                            openPersonProfile({
                              name: personName,
                              initial: n.avatar.initial,
                              color: n.avatar.color,
                              degree: '1st',
                              mutualCount: 5,
                              isFriend: n.type !== 'friend_request',
                            });
                          }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95 transition-all"
                          style={{
                            backgroundColor: n.avatar.color,
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 700,
                          }}
                        >
                          {n.avatar.initial}
                        </button>
                      ) : (
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: n.avatar.color,
                            color: '#fff',
                            fontSize: 20,
                            fontWeight: 700,
                          }}
                        >
                          {n.avatar.initial}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{
                            fontSize: 15,
                            fontWeight: !n.read ? 700 : 500,
                            color: !n.read ? '#FFFFFF' : '#8A8A9A',
                          }}
                        >
                          {n.title}
                        </p>
                        <p
                          className="truncate mt-0.5"
                          style={{
                            fontSize: 13,
                            color: !n.read ? '#8A8A9A' : '#555566',
                            fontStyle: n.subtitle.startsWith('"') ? 'italic' : 'normal',
                          }}
                        >
                          {n.subtitle}
                        </p>
                        <p className="mt-1" style={{ fontSize: 12, color: '#555566' }}>
                          {n.timestamp}
                        </p>
                        {n.avatar.isAI && (
                          <p
                            style={{
                              fontSize: 10,
                              color: '#555566',
                              fontStyle: 'italic',
                              marginTop: 2,
                            }}
                          >
                            from Sera
                          </p>
                        )}
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div
                          className="shrink-0 self-center rounded-full"
                          style={{ width: 8, height: 8, backgroundColor: '#C2E9FF' }}
                        />
                      )}
                    </div>

                    {/* Inline friend request actions */}
                    <AnimatePresence>
                      {showRequestActions && requestState === 'pending' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 mt-3 ml-14">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptRequest(n);
                              }}
                              className="font-bold transition-all active:scale-[0.97]"
                              style={{
                                backgroundColor: '#C2E9FF',
                                color: '#0A0A0F',
                                fontSize: 12,
                                padding: '6px 18px',
                                borderRadius: 14,
                              }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                declineRequest(n);
                              }}
                              className="font-bold transition-all active:scale-[0.97] glass-pill"
                              style={{
                                color: '#555566',
                                fontSize: 12,
                                padding: '6px 18px',
                                borderRadius: 14,
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        </motion.div>
                      )}
                      {showRequestActions && requestState === 'accepted' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="ml-14 mt-2"
                          style={{ fontSize: 13, fontWeight: 600, color: '#34D399' }}
                        >
                          Friends now! ✓
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  {/* Moment recap inline expansion */}
                  <AnimatePresence>
                    {showRecap && n.recap && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="glass-card"
                          style={{
                            margin: '8px 8px 8px 8px',
                            padding: 16,
                            borderRadius: 14,
                          }}
                        >
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                            {n.title.replace(/^Moment ended:\s*|^Your Moment ended:\s*/, '')}
                          </p>

                          {/* Stats */}
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <span style={{ fontSize: 12, color: '#C2E9FF', fontWeight: 600 }}>
                              👥 {n.recap.attendeeCount} showed up
                            </span>
                            <span style={{ fontSize: 12, color: '#8A8A9A' }}>
                              ⏱ {n.recap.duration}
                            </span>
                            <span style={{ fontSize: 12, color: '#8A8A9A' }}>
                              by {n.recap.creator}
                            </span>
                          </div>

                          {/* Attendee avatars */}
                          <div className="flex items-center mt-3">
                            {n.recap.attendees.map((a, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-center rounded-full text-white font-bold"
                                style={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: a.color,
                                  fontSize: 10,
                                  marginLeft: i === 0 ? 0 : -6,
                                  border: '2px solid #141419',
                                  zIndex: n.recap!.attendees.length - i,
                                }}
                              >
                                {a.initial}
                              </div>
                            ))}
                            {n.recap.attendeeCount > n.recap.attendees.length && (
                              <div
                                className="flex items-center justify-center rounded-full"
                                style={{
                                  height: 24,
                                  paddingLeft: 8,
                                  paddingRight: 8,
                                  backgroundColor: '#1C1C24',
                                  color: '#8A8A9A',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  marginLeft: -6,
                                  border: '2px solid #141419',
                                }}
                              >
                                +{n.recap.attendeeCount - n.recap.attendees.length}
                              </div>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shareRecap();
                              }}
                              className="ml-auto transition-all active:scale-[0.97]"
                              style={{ fontSize: 13, color: '#C2E9FF', fontWeight: 600 }}
                            >
                              Share Recap →
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
