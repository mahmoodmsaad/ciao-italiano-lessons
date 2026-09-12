import { DEMO } from '../api/client.js';
import { resetDemoData } from '../api/demoBackend.js';

/**
 * Demo build mein sab se upar ek patti - taake koi ye na samjhe ke ye asli
 * library ka data hai. Normal build mein ye kuch render nahi karta.
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
          Ye live demo hai - data sirf aapke browser mein save hota hai, kisi server par nahi.
        </span>
        <button type="button" onClick={reset} className="font-medium underline hover:no-underline">
          Reset karein
        </button>
      </div>
    </div>
  );
}
