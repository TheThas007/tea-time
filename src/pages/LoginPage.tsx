import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { platformApi } from "../lib/apiClient";
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

  // Auto-Redirect if user is already authenticated
  useEffect(() => {
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
  }, [navigate]);

  // Sign Up Form State (2-Day Free Trial)
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [signupContact, setSignupContact] = useState(""); // Phone number or email
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupPhone, setSignupPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      setError(err?.message || "Invalid credentials. Please verify and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      if ((res as any)?.redirecting) return;
      if (res.role === "SUPER_ADMIN") {
        navigate("/super-admin");
      } else {
        localStorage.setItem("menyo_auth_role", "BUSINESS_OWNER");
        localStorage.setItem("menyo_auth_email", (res as any)?.email || "admin@teatime.lk");
        const storedSlug = localStorage.getItem("menyo_auth_businessSlug");
        if (storedSlug && storedSlug !== "teatime") {
          navigate(`/${storedSlug}/admin`);
        } else {
          navigate("/admin");
        }
      }
    } catch (err: any) {
      console.warn("Google sign-in notice:", err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Google sign-in is being enabled. Please use Phone / Email & password.");
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
              {activeTab === "signin" ? "Welcome to Menyo." : "Make it yours."}
            </h1>
            <p className="text-xs sm:text-[13px] text-gray-500 mt-1.5 font-normal">
              {activeTab === "signin"
                ? "Everything for your restaurant. In one place."
                : "Try Menyo free for 2 days. No credit card required."}
            </p>
          </div>

          {/* Clean Segmented Tab Switcher (Underline style) */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setError(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all relative ${activeTab === "signin"
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
              }}
              className={`flex-1 pb-2.5 text-xs font-bold text-center transition-all relative ${activeTab === "signup"
                  ? "text-black border-b-2 border-black -mb-[1px]"
                  : "text-gray-400 hover:text-gray-700"
                }`}
            >
              Create account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs leading-relaxed animate-fadeIn">
              {error}
            </div>
          )}

          {/* 3. SIGN IN FORM */}
          {activeTab === "signin" && (
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

              {/* Forgot password link */}
              <div className="flex justify-end pt-0.5">
                <a
                  href="https://wa.me/94764847081?text=Hi%20Menyo,%20I%20forgot%20my%20password%20for%20my%20restaurant%20account."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  Forgot password?
                </a>
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
          {activeTab === "signup" && (
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
