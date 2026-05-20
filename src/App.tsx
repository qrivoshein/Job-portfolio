import { useCallback, useState } from 'react';
import { Cloud } from './components/Cloud';
import { Hero } from './components/Hero';
import { Experience } from './components/Experience';
import { Messenger } from './components/Messenger';
import { NeOrbit } from './components/NeOrbit';
import { Loader } from './components/Loader';
import { ProgressRail } from './components/ProgressRail';
import { useWheelNavigation } from './hooks/useWheelNavigation';

const SECTIONS_COUNT = 4;

function Shell({ onActiveChange }: { onActiveChange: (idx: number) => void }) {
  useWheelNavigation({ count: SECTIONS_COUNT, onActiveChange });
  return (
    <>
      <ProgressRail />
      <div className="section-panel" data-section-index="0">
        <Hero />
      </div>
      <div className="section-panel" data-section-index="1">
        <Experience />
      </div>
      <div className="section-panel" data-section-index="2">
        <Messenger />
      </div>
      <div className="section-panel" data-section-index="3">
        <NeOrbit />
      </div>
    </>
  );
}

export function App() {
  const [loading, setLoading] = useState(true);
  const [, setActiveIdx] = useState(0);

  const onActiveChange = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  return (
    <>
      <Cloud />
      {loading && <Loader onDone={() => setLoading(false)} />}
      <div className={`shell ${loading ? 'shell-hidden' : 'shell-visible'}`}>
        {!loading && <Shell onActiveChange={onActiveChange} />}
      </div>
    </>
  );
}
