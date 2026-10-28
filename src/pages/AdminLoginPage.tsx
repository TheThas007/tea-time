import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Lock, Mail, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/common/Logo";

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshAdminClaims } = useAuth();

  const [email, setEmail] = useState("admin@teatime.lk");
  const [password, setPassword] = useState("Admin@TeaTime2026!");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Refresh claims check
      await refreshAdminClaims();
      navigate("/admin");
    } catch (err: any) {
      console.error("Admin sign in failed:", err);
      if (err.code === "auth/configuration-not-found") {
        setErrorMessage(
          "Firebase Authentication is not activated yet! Go to Firebase Console > Authentication > Click 'Get started' and enable Email/Password & Anonymous."
        );
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setErrorMessage("Invalid email or password. Please verify your admin credentials.");
      } else {
        setErrorMessage(err.message || "Unable to sign in as administrator.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-center items-center p-4">
      {/* Return to menu link */}
      <div className="w-full max-w-sm mb-6 flex justify-between items-center text-xs">
        <button
          onClick={() => navigate("/menu")}
          className="text-[#8A6A53] hover:text-[#301C10] flex items-center gap-1.5 font-semibold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Customer Menu</span>
        </button>

        <span className="text-[#8A6A53] font-mono font-bold tracking-wider">STAFF PORTAL</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-[#FFFCF6] border border-[#DFC9AC] rounded-3xl overflow-hidden shadow-warm-xl">
        {/* Black Header Banner */}
        <div className="bg-[#0A0A0A] p-6 text-center space-y-2 border-b border-white/10">
          <Logo size="lg" theme="dark" orientation="vertical" />
          <h2 className="text-lg font-black text-[#FFFCF6] tracking-wide pt-2">
            Kitchen & Staff Portal
          </h2>
          <p className="text-xs text-[#DFC9AC]">
            Sign in to manage live orders, menu catalog, and tables.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#301C10] font-bold mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6A53]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@teatime.lk"
                  className="w-full bg-[#FAF7F0] border border-[#DFC9AC] text-[#301C10] rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 transition placeholder-[#8A6A53]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#301C10] font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A6A53]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAF7F0] border border-[#DFC9AC] text-[#301C10] rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 transition placeholder-[#8A6A53]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8B64F] hover:bg-[#d9a53d] disabled:opacity-60 text-[#1A0F08] font-extrabold py-3 px-4 rounded-xl shadow-warm-md transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] text-xs mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1A0F08]" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {/* Quick Helper Note */}
          <div className="pt-3 border-t border-[#DFC9AC] text-[11px] text-[#8A6A53] text-center">
            <p>Default admin credentials:</p>
            <code className="text-[#4A290F] font-bold font-mono text-[10px]">
              admin@teatime.lk / Admin@TeaTime2026!
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

