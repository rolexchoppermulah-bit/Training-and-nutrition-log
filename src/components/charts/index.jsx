import { Component, lazy, Suspense } from 'react';

// Charts load on demand so the logging screens open fast at the gym.

class ChartBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <p className="small muted" style={{ margin: 0 }}>
          Couldn&apos;t load this chart.{' '}
          <button type="button" className="link-btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      );
    }
    return this.props.children;
  }
}

function withLoader(load, height) {
  const Impl = lazy(load);
  return function LazyChart(props) {
    return (
      <ChartBoundary>
        <Suspense fallback={<div style={{ height }} aria-busy="true" />}>
          <Impl {...props} />
        </Suspense>
      </ChartBoundary>
    );
  };
}

export const WeightChart = withLoader(() => import('./WeightChart.jsx'), 330);
export const E1rmChart = withLoader(() => import('./E1rmChart.jsx'), 230);
export const VolumeChart = withLoader(() => import('./VolumeChart.jsx'), 280);
export const CardioWeeksChart = withLoader(() => import('./CardioWeeksChart.jsx'), 200);
