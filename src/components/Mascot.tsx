interface MascotProps {
  onBeginDrag: () => void;
  onOpen: () => void;
}

export function Mascot({ onBeginDrag, onOpen }: MascotProps) {
  return (
    <div
      className="mascot-hitbox"
      onMouseDown={(event) => {
        if (event.button === 0) void onBeginDrag();
      }}
      onClick={() => void onOpen()}
      title="Drag maskot untuk memindahkan atau klik untuk membuka REMM(i)"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') void onOpen();
      }}
    >
      <img src="./mascot.png" alt="Remember ME mascot" draggable={false} />
    </div>
  );
}
