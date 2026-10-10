import TopBar from '../components/TopBar.jsx';
import { Card } from '../components/ui.jsx';

export default function Progress() {
  return (
    <>
      <TopBar title="Progress" />
      <div className="page">
        <Card>
          <p className="muted">Charts are coming in the next stage.</p>
        </Card>
      </div>
    </>
  );
}
