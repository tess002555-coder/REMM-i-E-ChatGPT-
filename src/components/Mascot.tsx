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
      title="Tarik mascot atau klik untuk membuka panel"
    >
      <img src="/mascot.png" alt="Remember ME mascot" draggable={false} />
    </div>
  );
}
