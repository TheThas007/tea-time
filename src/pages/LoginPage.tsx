import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Lock, User, AlertCircle, ArrowLeft, Loader2, Store, Phone, CheckCircle2 } from "lucide-react";
import { platformApi } from "../lib/apiClient";
import { ForcePasswordChangeModal } from "../components/auth/ForcePasswordChangeModal";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { MenyoIcon, MenyoWordmark } from "../components/common/MenyoLogo";

interface LoginPageProps {
  initialTab?: "signin" | "signup";
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialTab = "signin" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active Tab: signin or signup
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(
    (searchParams.get("tab") as "signin" | "signup") || initialTab
  );

  // Sign In Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Sign Up Form State (2-Day Free Trial)
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Handle Standard Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await platformApi.loginWithIdentifier({
        identifier: identifier.trim(),
        password,
      });

      setUserRole(res.role);

      if (res.mustChangePassword) {
        setMustChangePassword(true);
      } else {
        if (res.role === "SUPER_ADMIN") {
          localStorage.setItem("menyo_auth_role", "SUPER_ADMIN");
          localStorage.setItem("menyo_auth_email", "admin@aevonix.lk");
          navigate("/super-admin");
        } else {
          localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      // Fallback for local dev or direct Firebase Auth
      try {
        const idTrimmed = identifier.trim();
        let targetEmail = idTrimmed;
        if (!idTrimmed.includes("@")) {
          if (idTrimmed.toLowerCase() === "admin" || idTrimmed.toLowerCase() === "aevonix") {
            targetEmail = "admin@aevonix.lk";
          } else if (idTrimmed.toLowerCase() === "teatime") {
            targetEmail = "admin@teatime.lk";
          }
        }

        const userCred = await signInWithEmailAndPassword(auth, targetEmail, password);
        const tokenResult = await userCred.user.getIdTokenResult();
        const isSuperAdmin =
          targetEmail.toLowerCase() === "admin@aevonix.lk" ||
          tokenResult.claims?.role === "SUPER_ADMIN";

        if (isSuperAdmin) {
          localStorage.setItem("menyo_auth_role", "SUPER_ADMIN");
          localStorage.setItem("menyo_auth_email", "admin@aevonix.lk");
          navigate("/super-admin");
        } else {
          localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
          if (targetEmail.toLowerCase() === "admin@teatime.lk") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }
        return;
      } catch (fallbackErr: any) {
        setError(err?.message || fallbackErr?.message || "Invalid username/email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle 2-Day Free Trial Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!restaurantName.trim()) {
      setError("Please enter your restaurant or café name.");
      setLoading(false);
      return;
    }
    if (!ownerName.trim()) {
      setError("Please enter your owner / manager name.");
      setLoading(false);
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      await platformApi.registerOwnerWithTrial({
        businessName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        phone: signupPhone.trim(),
        whatsapp: signupPhone.trim(),
      });

      // Redirect immediately to their new dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setError(null);
    setOauthLoading("google");
    try {
      const res = await platformApi.loginWithGoogleOAuth();
      if (res.role === "SUPER_ADMIN") {
        navigate("/super-admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.warn("Google sign-in notice:", err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Google sign-in failed. Please try again or use email.");
      }
    } finally {
      setOauthLoading(null);
    }
  };

  // Apple OAuth Login
  const handleAppleLogin = async () => {
    setError(null);
    setOauthLoading("apple");
    try {
      const res = await platformApi.loginWithAppleOAuth();
      if (res.role === "SUPER_ADMIN") {
        navigate("/super-admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.warn("Apple sign-in notice:", err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Apple sign-in failed. Please try again or use email.");
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false);
    if (userRole === "SUPER_ADMIN") {
      navigate("/super-admin");
    } else {
      navigate("/dashboard");
    }
  };

  const handleLogout = async () => {
    await signOut(auth).catch(() => {});
    setMustChangePassword(false);
    setUserRole(null);
  };

  return (
    <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative selection:bg-[#7BBBFF]/40 selection:text-[#050F2A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#050F2A]/60 hover:text-[#050F2A] transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Menyo Home</span>
        </Link>

        {/* Minimal pill header */}
        <div className="flex items-center gap-3 mb-2">
          <MenyoIcon size={36} />
          <MenyoWordmark variant="dark" height={26} />
          <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#050F2A]">
            Portal
          </span>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-[#050F2A] mt-2">
          {activeTab === "signin" ? "Sign In to Your Workspace" : "Create Restaurant Account"}
        </h1>
        <p className="text-xs text-[#050F2A]/60 mt-1">
          {activeTab === "signin"
            ? "Access your restaurant dashboard, live orders, menu items, and QR codes."
            : "Get started with full access for 2 days. No credit card required."}
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-white border border-[#050F2A]/10 rounded-2xl mt-4 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("signin");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "signin"
                ? "bg-[#050F2A] text-white shadow-sm"
                : "text-[#050F2A]/70 hover:text-[#050F2A]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("signup");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center ${
              activeTab === "signup"
                ? "bg-[#050F2A] text-white shadow-sm"
                : "text-[#050F2A]/70 hover:text-[#050F2A]"
            }`}
          >
            <span>2-Day Free Trial</span>
          </button>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Social Logins: Google & Apple */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={oauthLoading !== null || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-50 active:scale-[0.99] border border-zinc-300 text-zinc-800 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#7BBBFF]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={oauthLoading !== null || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-900 active:scale-[0.99] border border-black text-white font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
            >
              {oauthLoading === "apple" ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#050F2A]/10 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-[#050F2A]/40 uppercase tracking-wider shrink-0">
              Or with email
            </span>
          </div>

          {/* TAB 1: SIGN IN FORM */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1.5">
                  Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#050F2A]/40">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl pl-10 pr-4 py-2.5 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] focus:ring-2 focus:ring-[#7BBBFF]/20 text-sm transition-all"
                    placeholder="owner_username or email@domain.com"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#050F2A]/40">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl pl-10 pr-4 py-2.5 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] focus:ring-2 focus:ring-[#7BBBFF]/20 text-sm transition-all"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !identifier.trim() || !password}
                  className="w-full py-3 rounded-full bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#7BBBFF]" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP FOR 2-DAY FREE TRIAL */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              {/* Highlight Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-black block">48-Hour Full Access Free Trial</span>
                  <span className="text-[11px] text-emerald-800">
                    Test live QR menu ordering & themes with zero upfront payment.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1">
                  Restaurant / Café Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#050F2A]/40">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl pl-10 pr-4 py-2 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] text-sm"
                    placeholder="e.g. Ceylon Spices Café"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1">
                  Owner / Manager Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#050F2A]/40">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl pl-10 pr-4 py-2 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] text-sm"
                    placeholder="e.g. Kamal Perera"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] text-sm"
                    placeholder="cafe@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] text-sm"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]/70 mb-1">
                  WhatsApp Contact Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#050F2A]/40">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl pl-10 pr-4 py-2 text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] text-sm"
                    placeholder="e.g. 076 484 7081"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#7BBBFF]" />
                      <span>Creating Your Workspace...</span>
                    </>
                  ) : (
                    <span>Start 2-Day Free Trial</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="pt-3 border-t border-[#050F2A]/10 text-center">
            <p className="text-xs text-[#050F2A]/60">
              Need assistance or want to activate directly?{" "}
              <a
                href="https://wa.me/94764847081?text=Hi%20Menyo,%20I%20have%20a%20question%20about%20starting%20my%20digital%20menu."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#050F2A] hover:text-[#7BBBFF] font-bold underline transition-colors"
              >
                WhatsApp (076 484 7081)
              </a>
            </p>
          </div>
        </div>
      </div>

      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSuccess={handlePasswordChangeSuccess}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};
