import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { platformApi } from "../lib/apiClient";
import { getSupabase, updateUserPassword } from "../lib/supabase";
import { ForcePasswordChangeModal } from "../components/auth/ForcePasswordChangeModal";
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
  const [identifier, setIdentifier] = useState(() => {
    return localStorage.getItem("menyo_remembered_identifier") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Password Reset State
  const [resetMode, setResetMode] = useState<"none" | "request" | "recovery">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (hash.includes("type=recovery") || search.includes("mode=recovery")) {
        return "recovery";
      }
    }
    return "none";
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [showNewResetPassword, setShowNewResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Listen for Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    try {
      const sb = getSupabase();
      const { data: sub } = sb.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setResetMode("recovery");
          setError(null);
        }
      });
      return () => {
        sub.subscription.unsubscribe();
      };
    } catch { }
  }, []);

  // Auto-Redirect if user is already authenticated (unless in password recovery mode)
  useEffect(() => {
    if (resetMode !== "none") return;
    const existingRole = localStorage.getItem("menyo_auth_role");
    const existingSlug = localStorage.getItem("menyo_auth_businessSlug");
    const existingBizId = localStorage.getItem("menyo_auth_businessId");
    if (existingRole === "SUPER_ADMIN") {
      navigate("/super-admin");
    } else if (existingRole === "BUSINESS_OWNER") {
      const target = existingSlug || existingBizId;
      if (target && target !== "teatime") {
        navigate(`/${target}/admin`);
      } else {
        navigate("/admin");
      }
    }
  }, [navigate, resetMode]);

  // Sign Up Form State (2-Day Free Trial)
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [signupContact, setSignupContact] = useState(""); // Phone number or email
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupPhone, setSignupPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem("menyo_remembered_identifier", identifier.trim());
      } else {
        localStorage.removeItem("menyo_remembered_identifier");
      }

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
          localStorage.setItem("menyo_auth_email", identifier.trim());
          const targetSlug = (res as any)?.slug || res.businessId;
          if (targetSlug && targetSlug !== "teatime") {
            localStorage.setItem("menyo_auth_businessSlug", targetSlug);
            navigate(`/${targetSlug}/admin`);
          } else {
            navigate("/admin");
          }
        }
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      setErrorCode(err?.code || null);
      setError(err?.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setLoading(true);

    if (!restaurantName.trim()) {
      setError("Please enter your business name.");
      setLoading(false);
      return;
    }
    if (!ownerName.trim()) {
      setError("Please enter your owner / manager name.");
      setLoading(false);
      return;
    }

    const contactVal = signupContact.trim();
    const isEmail = contactVal.includes("@");
    const digitsOnly = contactVal.replace(/[^0-9]/g, "");
    const isPhone = digitsOnly.length >= 9;

    if (!isEmail && !isPhone) {
      setError("Please enter a valid Phone number (e.g. 0771234567) or Email.");
      setLoading(false);
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match. Please enter the same password twice.");
      setLoading(false);
      return;
    }

    try {
      const regRes = await platformApi.registerOwnerWithTrial({
        businessName: restaurantName.trim(),
        ownerName: ownerName.trim(),
        email: contactVal,
        password: signupPassword,
        phone: signupPhone.trim() || (isPhone ? contactVal : ""),
        whatsapp: signupPhone.trim() || (isPhone ? contactVal : ""),
      });

      localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
      localStorage.setItem("menyo_auth_email", contactVal);
      if (regRes.slug) {
        localStorage.setItem("menyo_auth_businessSlug", regRes.slug);
        navigate(`/${regRes.slug}/admin`);
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setErrorCode(err?.code || null);
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset Email Request
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMsg(null);
    const emailVal = resetEmail.trim().toLowerCase();
    if (!emailVal || !emailVal.includes("@")) {
      setError("Please enter a valid email address associated with your account.");
      return;
    }
    setLoading(true);
    try {
      const sb = getSupabase();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login?mode=recovery` : undefined;
      const { error: resetErr } = await sb.auth.resetPasswordForEmail(emailVal, {
        redirectTo,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
      setResetSuccessMsg("Password reset link sent! Please check your email inbox and click the link to set a new password.");
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Setting New Password after Recovery Link
  const handleUpdateRecoveredPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMsg(null);
    if (newResetPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setError("Passwords do not match. Please enter the same password twice.");
      return;
    }
    setLoading(true);
    try {
      await updateUserPassword(newResetPassword);
      setResetSuccessMsg("Your password has been updated successfully! You can now sign in.");
      setNewResetPassword("");
      setConfirmResetPassword("");
      setTimeout(() => {
        setResetMode("none");
        setResetSuccessMsg(null);
        setActiveTab("signin");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false);
    if (userRole === "SUPER_ADMIN") {
      navigate("/super-admin");
    } else {
      localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
      const storedSlug = localStorage.getItem("menyo_auth_businessSlug");
      if (storedSlug && storedSlug !== "teatime") {
        navigate(`/${storedSlug}/admin`);
      } else {
        navigate("/admin");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#050F2A] flex flex-col justify-between selection:bg-[#7BBBFF]/30 font-sans tracking-[-0.01em]">
      {/* 1. Clean Minimal Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <MenyoWordmark height={26} />
        </Link>
        <Link
          to="/"
          className="text-xs font-semibold text-[#050F2A] hover:text-[#0b1739] transition-colors"
        >
          Back to home
        </Link>
      </header>

      {/* 2. Main Authentication Card Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-10 shadow-sm">
          {/* Logo Brand Symbol: Original Menyo Logo */}
          <div className="flex justify-center mb-6">
            <MenyoIcon size={48} className="shadow-xs" />
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight">
              {resetMode === "request"
                ? "Reset your password."
                : resetMode === "recovery"
                ? "Set a new password."
                : activeTab === "signin"
                ? "Welcome to Menyo."
                : "Make it yours."}
            </h1>
            <p className="text-xs sm:text-[13px] text-gray-500 mt-1.5 font-normal">
              {resetMode === "request"
                ? "Enter your account email to receive a password reset link."
                : resetMode === "recovery"
                ? "Enter your new password twice below to update your account."
                : activeTab === "signin"
                ? "Everything for your restaurant. In one place."
                : "Try Menyo free for 2 days. No credit card required."}
            </p>
          </div>

          {/* Clean Segmented Tab Switcher (Underline style) */}
          {resetMode === "none" && (
            <div className="flex border-b border-gray-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                  setErrorCode(null);
                  setResetSuccessMsg(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all relative ${
                  activeTab === "signin"
                    ? "text-black border-b-2 border-black -mb-[1px]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setError(null);
                  setErrorCode(null);
                  setResetSuccessMsg(null);
                }}
                className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all relative ${
                  activeTab === "signup"
                    ? "text-black border-b-2 border-black -mb-[1px]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Create account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs leading-relaxed animate-fadeIn">
              <div>{error}</div>
              {errorCode === "auth/account-not-created" && (
                <div className="mt-2.5 pt-2.5 border-t border-red-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-red-600">
                    New to Menyo?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmedId = identifier.trim();
                      if (trimmedId && !signupContact) {
                        setSignupContact(trimmedId);
                      }
                      setError(null);
                      setErrorCode(null);
                      setResetMode("none");
                      setActiveTab("signup");
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
                  >
                    Create account →
                  </button>
                </div>
              )}
              {errorCode === "auth/account-already-exists" && (
                <div className="mt-2.5 pt-2.5 border-t border-red-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-red-600">
                    Already registered?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmedContact = signupContact.trim();
                      if (trimmedContact) {
                        setIdentifier(trimmedContact);
                      }
                      setError(null);
                      setErrorCode(null);
                      setResetMode("none");
                      setActiveTab("signin");
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-[11px] transition cursor-pointer shadow-2xs"
                  >
                    Sign in →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {resetSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs leading-relaxed flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* PASSWORD RESET REQUEST FORM */}
          {resetMode === "request" && (
            <form onSubmit={handleSendResetLink} className="space-y-3.5">
              <div>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : resetSent ? "Resend reset link" : "Send password reset link"}
              </button>

              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode("none");
                    setError(null);
                    setResetSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#050F2A] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>
              </div>
            </form>
          )}

          {/* PASSWORD RECOVERY (SET NEW PASSWORD) FORM */}
          {resetMode === "recovery" && (
            <form onSubmit={handleUpdateRecoveredPassword} className="space-y-3.5">
              <div className="relative">
                <input
                  type={showNewResetPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition pr-10"
                  placeholder="New password (min 8 characters)"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewResetPassword(!showNewResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNewResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmResetPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition pr-10"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Update password"}
              </button>

              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode("none");
                    setError(null);
                    setResetSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#050F2A] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. SIGN IN FORM */}
          {resetMode === "none" && activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="Email or username"
                  autoComplete="username"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition pr-10"
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot password button */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setResetSuccessMsg(null);
                    setResetSent(false);
                    if (identifier.includes("@")) {
                      setResetEmail(identifier.trim());
                    }
                    setResetMode("request");
                  }}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Solid Navy Blue Continue Button (Matching Menyo Brand Color) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Continue"}
              </button>

              {/* Bottom Switcher */}
              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">
                  New to Menyo?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("signup");
                      setError(null);
                    }}
                    className="font-bold text-[#050F2A] hover:underline cursor-pointer"
                  >
                    Try 2 days free
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 4. CREATE ACCOUNT FORM (Free Trial) */}
          {resetMode === "none" && activeTab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#050F2A] focus:ring-1 focus:ring-[#050F2A] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="Business name"
                />
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="Your name"
                />
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={signupContact}
                  onChange={(e) => setSignupContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="Email or phone number"
                />
              </div>

              <div className="relative">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showSignupConfirmPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition pr-10"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-xs text-gray-900 placeholder-gray-400 outline-none transition"
                  placeholder="WhatsApp number (optional)"
                />
              </div>

              {/* Solid Navy Blue Create Account Button (Matching Menyo Brand Color) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#050F2A] hover:bg-[#0b1739] active:scale-[0.99] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Create account"}
              </button>

              {/* Bottom Switcher */}
              <div className="text-center pt-4">
                <p className="text-xs text-gray-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("signin");
                      setError(null);
                    }}
                    className="font-bold text-[#050F2A] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* 5. Minimal Footer Links (Matching Design) */}
      <footer className="w-full py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-6">
        <a href="#" className="hover:text-gray-600 transition">
          Privacy
        </a>
        <a href="#" className="hover:text-gray-600 transition">
          Terms
        </a>
        <a
          href="https://wa.me/94764847081?text=Hi%20Menyo%20Support,%20I%20need%20help%20with%20my%20account."
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 transition"
        >
          Get help
        </a>
      </footer>

      {/* Temporary Password Reset Modal if required */}
      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSuccess={handlePasswordChangeSuccess}
          onLogout={() => {
            setMustChangePassword(false);
          }}
        />
      )}
    </div>
  );
};
