import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, User, ChevronDown, LogOut } from "lucide-react";
import { Logo } from "../common/Logo";
import { soundManager } from "../../lib/audio";
import { formatOrderDateTime } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

export const AdminHeader: React.FC = () => {
  const { user, signOutAdmin } = useAuth();
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [currentTime, setCurrentTime] = useState(formatOrderDateTime());
  const [showDropdown, setShowDropdown] = useState(false);

  // Live clock updating every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatOrderDateTime());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playNewOrderChime();
    }
  };

  return (
    <header className="bg-[#050F2A] text-white border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Left: Brand Logo + / Admin */}
      <div className="flex items-center gap-2.5">
        <Logo size="md" theme="dark" />
        <span className="text-white/40 font-bold text-sm select-none translate-y-0.5">/</span>
        <span className="text-[#7BBBFF] font-bold text-sm tracking-wide translate-y-0.5">
          Admin
        </span>
      </div>

      {/* Center: Live indicator & Real-time clock */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0b1739] border border-[#7BBBFF]/40 text-[#7BBBFF] font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#7BBBFF] animate-ping" />
          <span>Live Orders Active</span>
        </div>

        <span className="text-white/70 font-medium">
          {currentTime}
        </span>
      </div>

      {/* Right: Sound toggle & Staff Account */}
      <div className="flex items-center gap-3">
        {/* Sound toggle button */}
        <button
          onClick={handleToggleSound}
          title={isMuted ? "Unmute order chime" : "Mute order chime"}
          className={`p-2 px-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-extrabold focus:outline-none ${
            isMuted
              ? "bg-[#0b1739] text-white/60 hover:bg-[#122354] border border-white/10"
              : "bg-[#7BBBFF] text-[#050F2A] hover:bg-[#68aaff] shadow-sm"
          }`}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Sound On</span>
            </>
          )}
        </button>

        {/* Staff dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b1739] hover:bg-[#122354] border border-white/15 text-white text-xs font-semibold transition"
          >
            <div className="w-6 h-6 rounded-full bg-[#050F2A] flex items-center justify-center text-[#7BBBFF]">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline">
              {user?.email?.split("@")[0] || (typeof window !== "undefined" && localStorage.getItem("menyo_auth_email")?.split("@")[0]) || "admin"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-white/60" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1 text-xs text-[#050F2A] z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] text-gray-500">Signed in as</p>
                <p className="font-bold truncate text-[#050F2A]">
                  {user?.email || (typeof window !== "undefined" && localStorage.getItem("menyo_auth_email")) || "admin@teatime.lk"}
                </p>
              </div>

              <button
                onClick={async () => {
                  setShowDropdown(false);
                  localStorage.removeItem("menyo_auth_role");
                  localStorage.removeItem("menyo_auth_email");
                  await signOutAdmin();
                  window.location.href = "/admin/login";
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#FAF7F0] text-red-700 font-semibold flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
