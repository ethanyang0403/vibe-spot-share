import { Map, Radar, Compass, Users, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', icon: Map, label: 'Map' },
  { path: '/nearby', icon: Radar, label: 'Nearby' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-background pb-[env(safe-area-inset-bottom,8px)] pt-2"
      style={{
        height: 'calc(56px + env(safe-area-inset-bottom, 8px))',
        borderTop: '1px solid #1C1C24',
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        const color = active ? '#C2E9FF' : '#555566';
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 transition-all active:scale-[0.95]"
          >
            <Icon size={22} style={{ color }} />
            <span className="text-[10px]" style={{ color }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
