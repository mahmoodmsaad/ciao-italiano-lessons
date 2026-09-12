import { DEMO } from '../api/client.js';
import { resetDemoData } from '../api/demoBackend.js';

/**
 * A strip at the top of demo builds so nobody mistakes the sample data for a
 * real library. Renders nothing in a normal build.
 */
export default function DemoBanner() {
  if (!DEMO) return null;

  const reset = () => {
    resetDemoData();
    window.location.hash = '#/login';
    window.location.reload();
  };

  return (
    <div className="bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs">
        <span className="rounded bg-amber-200 px-1.5 py-0.5 font-semibold uppercase tracking-wide">
          Demo
        </span>
        <span className="flex-1">
          This is a live demo - your data is saved in this browser only, never on a server.
        </span>
        <button type="button" onClick={reset} className="font-medium underline hover:no-underline">
          Reset data
        </button>
      </div>
    </div>
  );
}
