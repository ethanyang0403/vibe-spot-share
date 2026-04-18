interface Props {
  icon: string;
  onClick: () => void;
}

// Subtle inactive business pin (glass treatment).
export default function BusinessPin({ icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="glass-pill flex items-center justify-center transition-opacity"
      style={{
        width: 28,
        height: 28,
        borderRadius: "9999px",
        fontSize: 14,
        lineHeight: 1,
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
        opacity: 0.85,
      }}
      aria-label="Business pin"
    >
      <span style={{ pointerEvents: "none" }}>{icon}</span>
    </button>
  );
}
