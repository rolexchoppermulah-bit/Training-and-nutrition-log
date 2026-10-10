import { ChevronLeft, Settings } from 'lucide-react';
import { IconButton } from './ui.jsx';
import { navigate } from '../lib/router.js';

export default function TopBar({ title, back, actions, hideSettings }) {
  return (
    <header className="topbar">
      {back && (
        <IconButton label="Back" onClick={typeof back === 'function' ? back : () => navigate(back)}>
          <ChevronLeft size={24} />
        </IconButton>
      )}
      <h1>{title}</h1>
      {actions}
      {!hideSettings && (
        <IconButton label="Settings" onClick={() => navigate('/settings')}>
          <Settings size={22} />
        </IconButton>
      )}
    </header>
  );
}
