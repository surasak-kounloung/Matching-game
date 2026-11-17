import { useEffect, useState, type ReactNode } from 'react';
import { fitStage } from './fitStage';

const fitWindow = () => fitStage(window.innerWidth, window.innerHeight);

export function Stage({ children }: { children?: ReactNode }) {
  const [fit, setFit] = useState(fitWindow);

  useEffect(() => {
    const onResize = () => setFit(fitWindow());
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div
      className="stage"
      data-testid="stage"
      style={{ transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` }}
    >
      {children}
    </div>
  );
}
