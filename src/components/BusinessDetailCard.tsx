import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Business, CROWD_LEVELS, CROWD_LABEL } from "@/lib/businessesMock";

interface Props {
  business: Business | null;
  onClose: () => void;
}

const TOAST_STYLE = {
  backgroundColor: "#141419",
  color: "#fff",
  border: "1px solid #2A2A35",
  borderRadius: 12,
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
};

export default function BusinessDetailCard({ business, onClose }: Props) {
  const [going, setGoing] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);

  // Reset interactive state whenever a different business is opened.
  useEffect(() => {
    setGoing(false);
    setPeopleCount(business?.promotedMoment.peopleSaid ?? 0);
  }, [business?.id]);

  const handleGoing = () => {
    if (!business) return;
    setGoing(true);
    setPeopleCount((c) => c + 1);
    toast(`See you at ${business.name}! 🎉`, {
      style: TOAST_STYLE,
      position: "top-center",
      duration: 2500,
    });
  };

  const openDirections = () => {
    if (!business) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareDeal = () => {
    toast("Link copied! 📋", {
      style: TOAST_STYLE,
      position: "top-center",
      duration: 2000,
    });
  };

  return (
    <AnimatePresence>
      {business && (
        <motion.div
          initial={{ y: 400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="absolute bottom-0 left-0 right-0 z-30"
          style={{
            backgroundColor: "#141419",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.5)",
            padding: 24,
            paddingBottom: "calc(24px + env(safe-area-inset-bottom, 8px))",
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: "#2A2A35",
              margin: "0 auto 16px",
            }}
          />

          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 48,
                height: 48,
                borderRadius: "9999px",
                backgroundColor: "#1C1C24",
                border: "1px solid #2A2A35",
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              {business.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[20px] font-bold text-white truncate">{business.name}</p>
              <p className="text-[13px]" style={{ color: "#8A8A9A" }}>
                {business.type[0].toUpperCase() + business.type.slice(1)} · ⭐ {business.rating}
              </p>
              <p className="text-[12px]" style={{ color: "#555566" }}>
                {business.hours}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-sm"
              style={{ color: "#8A8A9A" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Crowd indicator */}
          <div className="mt-4">
            <p className="text-[12px] mb-1.5" style={{ color: "#8A8A9A" }}>
              Right now:
            </p>
            <div className="flex gap-1.5">
              {CROWD_LEVELS.map((lvl) => {
                const active = lvl === business.crowdLevel;
                return (
                  <span
                    key={lvl}
                    className="text-[11px]"
                    style={{
                      padding: "4px 12px",
                      borderRadius: 12,
                      color: active ? "#C2E9FF" : "#555566",
                      backgroundColor: active
                        ? "rgba(194, 233, 255, 0.15)"
                        : "#1C1C24",
                      border: active
                        ? "1px solid rgba(194, 233, 255, 0.3)"
                        : "1px solid transparent",
                    }}
                  >
                    {CROWD_LABEL[lvl]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Live deal block */}
          {business.promotedMoment.active && (
            <div
              className="mt-4"
              style={{
                backgroundColor: "rgba(194, 233, 255, 0.06)",
                border: "1px solid rgba(194, 233, 255, 0.15)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <p
                className="text-[10px] font-bold uppercase"
                style={{ color: "#C2E9FF", letterSpacing: 1.5 }}
              >
                Live Deal
              </p>
              <p className="text-[16px] font-bold text-white mt-1">
                {business.promotedMoment.title}
              </p>
              <p className="text-[13px] font-bold mt-1" style={{ color: "#C2E9FF" }}>
                Ends in {business.promotedMoment.expiresInMinutes} min
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "#8A8A9A" }}>
                {peopleCount} people said they're going
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2.5">
            {business.promotedMoment.active ? (
              <>
                <button
                  onClick={going ? undefined : handleGoing}
                  disabled={going}
                  className="w-full font-bold transition-all active:scale-[0.97]"
                  style={{
                    height: 46,
                    borderRadius: 14,
                    fontSize: 15,
                    backgroundColor: going ? "#34D399" : "#C2E9FF",
                    color: "#0A0A0F",
                  }}
                >
                  {going ? "You're in! ✓" : "I'm Going 🙋"}
                </button>
                <button
                  onClick={openDirections}
                  className="w-full font-bold transition-all active:scale-[0.97]"
                  style={{
                    height: 46,
                    borderRadius: 14,
                    fontSize: 15,
                    backgroundColor: "transparent",
                    border: "1.5px solid #C2E9FF",
                    color: "#C2E9FF",
                  }}
                >
                  Get Directions
                </button>
                <button
                  onClick={shareDeal}
                  className="w-full text-[13px] py-1"
                  style={{ color: "#8A8A9A" }}
                >
                  Share this deal →
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={openDirections}
                  className="w-full font-bold transition-all active:scale-[0.97]"
                  style={{
                    height: 46,
                    borderRadius: 14,
                    fontSize: 15,
                    backgroundColor: "#C2E9FF",
                    color: "#0A0A0F",
                  }}
                >
                  Get Directions
                </button>
                <button
                  onClick={shareDeal}
                  className="w-full text-[13px] py-1"
                  style={{ color: "#8A8A9A" }}
                >
                  Share →
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
