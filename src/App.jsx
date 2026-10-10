import { Component, useEffect } from 'react';
import { House, Dumbbell, HeartPulse, Utensils, Scale, ChartLine, Play, TriangleAlert } from 'lucide-react';
import { useRoute, navigate } from './lib/router.js';
import { useStore, lastSaveFailed } from './lib/store.js';
import Dashboard from './pages/Dashboard.jsx';
import Lift from './pages/Lift.jsx';
import Cardio from './pages/Cardio.jsx';
import Food from './pages/Food.jsx';
import Weight from './pages/Weight.jsx';
import Progress from './pages/Progress.jsx';
import Settings from './pages/Settings.jsx';

const TABS = [
  { path: '/', label: 'Home', Icon: House },
  { path: '/lift', label: 'Lift', Icon: Dumbbell },
  { path: '/cardio', label: 'Cardio', Icon: HeartPulse },
  { path: '/food', label: 'Food', Icon: Utensils },
  { path: '/weight', label: 'Weight', Icon: Scale },
  { path: '/progress', label: 'Charts', Icon: ChartLine },
];

/** If a screen crashes, show a way out instead of a blank page. Your data is untouched. */
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.route !== this.props.route && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="card stack">
          <h2>Something went wrong on this screen</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Your data is still saved. Try going back home. If it keeps happening, export a backup from Settings.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const route = useRoute();
  const { draft } = useStore();
  const [pathname, query = ''] = route.split('?');
  const parts = pathname.split('/').filter(Boolean);
  const section = `/${parts[0] || ''}`;
  const params = new URLSearchParams(query);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  let page;
  switch (section) {
    case '/lift':
      page = <Lift parts={parts.slice(1)} />;
      break;
    case '/cardio':
      page = <Cardio />;
      break;
    case '/food':
      page = <Food />;
      break;
    case '/weight':
      page = <Weight />;
      break;
    case '/progress':
      page = <Progress params={params} />;
      break;
    case '/settings':
      page = <Settings />;
      break;
    default:
      page = <Dashboard />;
  }

  // The logger fills the Lift tab whenever a workout is in progress (except
  // on the template editor and workout detail screens).
  const loggerVisible = section === '/lift' && !['edit', 'workout'].includes(parts[1]);
  const showResume = draft && !loggerVisible;

  return (
    <div className={`app ${showResume ? 'has-pill' : ''}`}>
      {lastSaveFailed() && (
        <button type="button" className="save-error" onClick={() => navigate('/settings')}>
          <TriangleAlert size={18} />
          <span>
            <strong>Couldn&apos;t save.</strong> Browser storage is full or blocked, so new entries may be lost when you close the app.
            Tap to export a backup.
          </span>
        </button>
      )}
      <main>
        <ErrorBoundary route={pathname}>{page}</ErrorBoundary>
      </main>
      {showResume && (
        <button type="button" className="resume-pill" onClick={() => navigate('/lift')}>
          <Play size={16} fill="currentColor" /> Resume {draft.editingId ? 'editing' : draft.name}
        </button>
      )}
      <nav className="bottomnav" aria-label="Main">
        <div className="bottomnav-inner">
          {TABS.map(({ path, label, Icon }) => {
            const active = section === path;
            return (
              <button
                key={path}
                type="button"
                className={`navbtn ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(path)}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {label}
                {path === '/lift' && draft && <span className="dot" aria-label="Workout in progress" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
