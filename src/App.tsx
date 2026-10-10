import { useEffect } from 'react';
import { useStore } from './store';
import Toolbar from './components/Toolbar';
import StatusBar from './components/StatusBar';
import LeftPanel from './components/LeftPanel';
import Viewport from './components/Viewport';
import Inspector from './components/Inspector';
import WelcomeModal from './components/WelcomeModal';

const TOAST_STYLE: Record<'info' | 'ok' | 'error', string> = {
  info: 'border-line2 text-t1',
  ok: 'border-ok/40 text-ok',
  error: 'border-err/40 text-err',
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export default function App() {
  const toast = useStore((s) => s.toast);

  // global keyboard shortcuts — read actions fresh from the store each event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.altKey) return;
      const s = useStore.getState();

      if (e.ctrlKey) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault();
          s.undo();
        } else if ((k === 'z' && e.shiftKey) || k === 'y') {
          e.preventDefault();
          s.redo();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          s.setTool('select');
          break;
        case 'm':
          s.setTool('move');
          break;
        case 'a':
          s.setTool('add');
          break;
        case 'b':
          s.setTool('bond');
          break;
        case 'd':
          s.setTool('delete');
          break;
        case 'e':
          s.setTool('measure');
          break;
        case '1':
          s.setBondOrder(1);
          break;
        case '2':
          s.setBondOrder(2);
          break;
        case '3':
          s.setBondOrder(3);
          break;
        case 'f':
          e.preventDefault();
          s.frame();
          break;
        case 'escape':
          if (s.demoActive) s.setDemoActive(false);
          else if (s.tourActive) s.setTourActive(false);
          else if (s.sceneActive) s.setSceneActive(null);
          s.select(null);
          s.setBondSource(null);
          s.clearMeasure();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-t1">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="relative min-w-0 flex-1">
          <Viewport />
        </main>
        <Inspector />
      </div>
      <StatusBar />
      <WelcomeModal />
      {toast && (
        <div
          key={toast.msg}
          role="status"
          className={`fade-in fixed bottom-9 left-1/2 z-50 -translate-x-1/2 rounded-btn border bg-raised px-3 py-1.5 text-[12px] ${TOAST_STYLE[toast.kind]}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
