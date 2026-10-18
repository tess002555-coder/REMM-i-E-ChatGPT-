import { getCurrentWindow } from '@tauri-apps/api/window';
import { Mascot } from './components/Mascot';
import { SimplePanel } from './components/SimplePanel';
import { useMascotWindow } from './hooks/useMascotWindow';

export default function App() {
  const isPanel = new URLSearchParams(window.location.search).get('window') === 'panel';

  if (isPanel) {
    return <SimplePanel onClose={() => void getCurrentWindow().close()} />;
  }

  const { beginDrag, openPanel } = useMascotWindow();
  return <Mascot onBeginDrag={beginDrag} onOpen={openPanel} />;
}
