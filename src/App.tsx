import { Mascot } from './components/Mascot';
import { SimplePanel } from './components/SimplePanel';
import { useMascotWindow } from './hooks/useMascotWindow';

export default function App() {
  const { mode, beginDrag, openPanel, closePanel } = useMascotWindow();

  if (mode === 'panel') {
    return <SimplePanel onClose={closePanel} />;
  }

  return <Mascot onBeginDrag={beginDrag} onOpen={openPanel} />;
}
