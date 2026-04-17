interface Props {
  icon: string;
  onClick: () => void;
}

// Small subtle pin for businesses with NO active Promoted Moment.
// Sits quietly on the map landscape — doesn't compete with friends or Moments.
export default function BusinessPin({ icon, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center transition-opacity"
      style={{
        width: 24,
        height: 24,
        borderRadius: "9999px",
        backgroundColor: "rgba(28, 28, 36, 0.7)",
        border: "1px solid #2A2A35",
        opacity: 0.6,
        fontSize: 13,
        lineHeight: 1,
        // Expand tap target without changing visual size
        padding: 0,
      }}
      aria-label="Business pin"
    >
      <span style={{ pointerEvents: "none" }}>{icon}</span>
    </button>
  );
}
