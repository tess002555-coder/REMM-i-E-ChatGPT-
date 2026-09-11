import { useState } from 'react';

interface MascotProps {
  onBeginDrag: () => void;
  onEndDrag: () => void;
}

export function Mascot({ onBeginDrag, onEndDrag }: MascotProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="mascot-hitbox"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(event) => {
        if (event.button === 0) onBeginDrag();
      }}
      onMouseUp={(event) => {
        if (event.button === 0) onEndDrag();
      }}
      title="Drag mascot atau klik untuk membuka panel"
    >
      {hovered && <div className="mascot-hint">Drag me</div>}
      <img src="/mascot.png" alt="Remember ME mascot" draggable={false} />
    </div>
  );
}
