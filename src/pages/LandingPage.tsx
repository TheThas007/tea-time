import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  QrCode,
  UtensilsCrossed,
  Clock,
  Zap,
  Layers,
  Palette,
  Menu as MenuIcon,
  X,
  CreditCard,
  Gift,
  Camera,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  HeartHandshake,
  DollarSign,
  Smartphone,
  CheckCircle2,
  Mail,
  Coffee,
  Building2,
  Store,
  Pizza,
  Wine,
  Flame,
} from "lucide-react";
import { MenyoWordmark } from "../components/common/MenyoLogo";

export const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure autoplay works reliably on mobile and desktop by strictly setting muted before play
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Hero video autoplay notice:", err);
        });
      }
    }
  }, []);

  const defaultPackages = [
    {
      id: "monthly",
      name: "Monthly",
      price: "Rs. 2,000",
      priceUsd: "$7",
      period: "/ month",
      upfront: "Rs. 2,000 paid monthly",
      description: "Ideal for new cafés testing digital QR ordering.",
      badge: null,
      isPopular: false,
      features: [
        "Branded digital menu & QR codes",
        "Live Kitchen & Order management",
        "Smart POS & Cashier Billing system",
        "Thermal Bill Printing",
        "Customer Loyalty & Rewards wallet",
        "Branded Memory Studio (1080×1350)",
        "Custom Logo, Colors & Themes",
      ],
    },
    {
      id: "6_months",
      name: "6 Months",
      price: "Rs. 10,000",
      priceUsd: "$33",
      period: "/ 6 months",
      upfront: "Rs. 10,000 upfront",
      description: "Our most popular package for active dining rooms.",
      badge: "Save Rs. 2,000",
      isPopular: true,
      features: [
        "Branded digital menu & QR codes",
        "Live Kitchen & Order management",
        "Smart POS & Cashier Billing system",
        "Thermal Bill Printing",
        "Customer Loyalty & Rewards wallet",
        "Branded Memory Studio (1080×1350)",
        "Custom Logo, Colors & Themes",
      ],
    },
    {
      id: "yearly",
      name: "Yearly",
      price: "Rs. 18,000",
      priceUsd: "$60",
      period: "/ year",
      upfront: "Rs. 18,000 upfront",
      description: "Best continuous annual value for established venues.",
      badge: "Save Rs. 6,000",
      isPopular: false,
      features: [
        "Branded digital menu & QR codes",
        "Live Kitchen & Order management",
        "Smart POS & Cashier Billing system",
        "Thermal Bill Printing",
        "Customer Loyalty & Rewards wallet",
        "Branded Memory Studio (1080×1350)",
        "Custom Logo, Colors & Themes",
      ],
    },
  ];

  const packages = React.useMemo(() => {
    if (typeof window === "undefined") return defaultPackages;
    try {
      const raw = localStorage.getItem("menyo_platform_packages");
      if (!raw) return defaultPackages;
      const saved = JSON.parse(raw) as any[];
      if (!Array.isArray(saved) || saved.length === 0) return defaultPackages;
      return defaultPackages.map((dp) => {
        const match = saved.find((s) => s.id === dp.id);
        if (!match) return dp;
        const rupees = Number(match.priceRupees ?? 0);
        const usd = match.priceUsd ?? Math.max(1, Math.round(rupees / 300));
        return {
          ...dp,
          name: match.name || dp.name,
          price: rupees > 0 ? `Rs. ${rupees.toLocaleString()}` : dp.price,
          priceUsd: `$${usd}`,
        };
      });
    } catch {
      return defaultPackages;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col font-sans selection:bg-[#7BBBFF]/40 selection:text-[#050F2A]">
      {/* 1. FLOATING INSET PILL NAVIGATION (Opal Reference Style) */}
      <div className="sticky top-4 z-50 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <header className="bg-white/95 backdrop-blur-md border border-[#050F2A]/10 rounded-full px-5 py-2.5 shadow-sm shadow-[#050F2A]/5 flex items-center justify-between transition-all">
          {/* Brand Wordmark Logo linking to Home */}
          <Link
            to="/"
            className="flex items-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBBFF] rounded-lg transition-transform active:scale-95"
            aria-label="Menyo Home"
          >
            <img
              src="/assets/menyo-wordmark.png"
              alt="Menyo"
              width={683}
              height={205}
              className="h-[26px] sm:h-[32px] w-auto object-contain object-left select-none block"
              loading="eager"
            />
          </Link>

          {/* Nav links in the middle */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#050F2A]/70">
            <a href="#features" className="hover:text-[#050F2A] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#050F2A] transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-[#050F2A] transition-colors">
              Pricing
            </a>
            <Link
              to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#050F2A] font-bold hover:text-[#7BBBFF] transition-colors flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Demo</span>
            </Link>
          </nav>

          {/* Login and Get Started on the right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-xs font-bold text-[#050F2A]/80 hover:text-[#050F2A] px-3 py-1.5 transition-colors hidden sm:inline-block"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-[#050F2A] hover:bg-[#0b1739] text-white text-xs font-bold rounded-full px-4 sm:px-5 py-2 transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              <span>Start Free Trial</span>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-full text-[#050F2A] hover:bg-[#050F2A]/5 md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile dropdown sheet */}
        {mobileMenuOpen && (
          <div className="mt-2 p-4 bg-white/95 backdrop-blur-md border border-[#050F2A]/10 rounded-3xl shadow-xl space-y-3 md:hidden animate-fadeIn">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-bold text-[#050F2A] hover:bg-[#F2FDFF] rounded-xl"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-bold text-[#050F2A] hover:bg-[#F2FDFF] rounded-xl"
            >
              How it works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-bold text-[#050F2A] hover:bg-[#F2FDFF] rounded-xl"
            >
              Pricing
            </a>
            <Link
              to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-bold text-[#050F2A] hover:bg-[#F2FDFF] rounded-xl"
            >
              Live Demo (Tea Time)
            </Link>
            <div className="pt-2 border-t border-[#050F2A]/10 flex items-center justify-between">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-[#050F2A] px-3 py-2"
              >
                Sign In
              </Link>
              <a
                href="https://wa.me/94764847081"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#050F2A] text-white text-xs font-bold rounded-full px-4 py-2"
              >
                Contact Sales
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 2. HERO SECTION WITH IPAD DASHBOARD & SMARTPHONE DEMONSTRATION */}
      <section className="pt-8 sm:pt-14 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Device Showcase Area */}
        <div className="relative mb-12 sm:mb-14">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-6xl mx-auto">
            
            {/* Left: Transparent iPad Mockup directly displaying the Admin Menu Management Dashboard */}
            <div className="flex-1 w-full max-w-[640px] lg:max-w-[680px] xl:max-w-[720px] flex items-center justify-center relative">
              <img
                src="/assets/hero-ipad-mockup.png"
                alt="Menyo Restaurant Menu Management Dashboard displayed on iPad"
                width={1024}
                height={485}
                className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-sm"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            {/* Central Connector: Desktop curved dashed SVG wire + QR code card */}
            <div className="hidden lg:flex flex-col items-center justify-center relative w-20 shrink-0 select-none">
              {/* Connecting curved path */}
              <svg
                className="absolute w-32 h-16 -top-4 text-[#7BBBFF]/60 pointer-events-none"
                viewBox="0 0 120 60"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M 0 35 C 30 10, 90 10, 120 30"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Central QR Code Card */}
              <Link
                to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
                target="_blank"
                rel="noopener noreferrer"
                title="Click to open Live Demo"
                className="relative z-10 bg-white border border-[#050F2A]/10 rounded-2xl p-2.5 shadow-sm shadow-[#050F2A]/5 flex flex-col items-center gap-1.5 transition-all hover:scale-105 hover:border-[#7BBBFF] cursor-pointer"
              >
                <QrCode className="w-8 h-8 text-[#050F2A]" />
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#050F2A] whitespace-nowrap">
                  Live demo
                </span>

                {/* Radiating signal lines */}
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs text-[#7BBBFF] select-none">
                  ((
                </span>
                <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-xs text-[#7BBBFF] select-none">
                  ))
                </span>
              </Link>
            </div>

            {/* Mobile Divider & QR Badge (when devices are stacked vertically) */}
            <div className="flex lg:hidden items-center justify-center gap-3 my-1 select-none">
              <div className="h-px w-10 bg-[#7BBBFF]/50 border-t border-dashed border-[#7BBBFF]" />
              <Link
                to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-[#050F2A]/10 hover:border-[#7BBBFF] rounded-2xl px-3 py-1.5 shadow-sm flex items-center gap-2"
              >
                <QrCode className="w-4 h-4 text-[#050F2A]" />
                <span className="text-[10px] font-extrabold text-[#050F2A]">
                  Live Demo • Scan QR
                </span>
              </Link>
              <div className="h-px w-10 bg-[#7BBBFF]/50 border-t border-dashed border-[#7BBBFF]" />
            </div>

            {/* Right: Tea Time Live Mobile Video Demonstration */}
            <div className="w-[280px] sm:w-[310px] shrink-0 relative transition-all select-none flex items-center justify-center">
              <div className="w-full rounded-[36px] sm:rounded-[44px] overflow-hidden shadow-[0_20px_50px_-12px_rgba(5,15,42,0.22),0_8px_16px_-4px_rgba(5,15,42,0.12)] ring-1 ring-black/10 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  disablePictureInPicture
                  disableRemotePlayback
                  poster="/assets/hero-phone-poster.jpg"
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                  style={{ objectFit: "contain" }}
                >
                  <source src="/assets/hero-phone-video.mp4" type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>
            </div>

          </div>
        </div>

        {/* Centered Headline, Subtitle and Pill Actions (Below Demonstration) */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#050F2A] tracking-tight leading-[1.08]">
            Your menu. Every table.<br />
            One scan.
          </h1>

          <p className="text-base sm:text-lg text-[#050F2A]/70 max-w-xl mx-auto font-medium">
            A beautiful digital menu for your café or restaurant.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center"
            >
              <span>Start 2-Day Free Trial</span>
            </Link>

            <Link
              to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/30 text-[#050F2A] text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <span>View Live Demo</span>
            </Link>
          </div>

          <div className="pt-2 text-[11px] font-bold uppercase tracking-widest text-[#050F2A]/40">
            by AEVONIX
          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION (Spacious Gallery Cards) */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full border-t border-[#050F2A]/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-[#050F2A] tracking-tight">
            Everything your café needs.
          </h2>
          <p className="text-sm text-[#050F2A]/70 mt-2">
            Engineered for fast table service, zero app downloads, and complete menu control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Digital Menu */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7BBBFF]/20 flex items-center justify-center text-[#050F2A] mb-5">
                <UtensilsCrossed className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Digital Menu</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Create a beautiful menu, add photos, edit anytime. Changes appear instantly on every table.
              </p>
            </div>
          </div>

          {/* Card 2: Table QR Codes */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#B8A9FF]/25 flex items-center justify-center text-[#050F2A] mb-5">
                <QrCode className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Table QR Codes</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Unique QR codes for every table. No app needed — customers just scan with their camera to order.
              </p>
            </div>
          </div>

          {/* Card 3: Live Orders */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7BBBFF]/20 flex items-center justify-center text-[#050F2A] mb-5">
                <Clock className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Live Orders</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Receive orders in real time and keep your kitchen service smooth, organized, and efficient.
              </p>
            </div>
          </div>

          {/* Card 4: Your Logo & Colours */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#B8A9FF]/25 flex items-center justify-center text-[#050F2A] mb-5">
                <Palette className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Change your color theme and logo</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Custom branding for your restaurant. Upload your logo and set your own colors, fonts, and theme.
              </p>
            </div>
          </div>

          {/* Card 5: Easy Menu Updates */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7BBBFF]/20 flex items-center justify-center text-[#050F2A] mb-5">
                <Zap className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Easy Menu Updates</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Change prices, mark sold-out items, or add new specials in seconds from your mobile or laptop.
              </p>
            </div>
          </div>

          {/* Card 6: Business Dashboard */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#B8A9FF]/25 flex items-center justify-center text-[#050F2A] mb-5">
                <Layers className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Business Dashboard</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Dedicated management portal to print QR tent cards, review order history, and track tables.
              </p>
            </div>
          </div>

          {/* Card 7: Complete Cashier & POS Billing System */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7BBBFF]/20 flex items-center justify-center text-[#050F2A] mb-5">
                <CreditCard className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Smart POS &amp; Cashier Billing</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Fast barcode scanning, Cash/Card/QR/Credit payments, thermal bill printing, stock control, and daily sales reports.
              </p>
            </div>
          </div>

          {/* Card 8: Customer Loyalty & Rewards Wallet */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#B8A9FF]/25 flex items-center justify-center text-[#050F2A] mb-5">
                <Gift className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Customer Reward Wallet</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Reward points on every order, wallet balance tracking via phone number, and automated discounts on repeat visits.
              </p>
            </div>
          </div>

          {/* Card 9: Memory Studio & Branded Photo Frame */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7BBBFF]/20 flex items-center justify-center text-[#050F2A] mb-5">
                <Camera className="w-6 h-6 text-[#050F2A]" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Branded Memory Studio</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Customers take 1080×1350 photos with your custom logo overlay &amp; trendy filters, save to gallery, and share on social media!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3.5. BENEFITS SECTION — Why Restaurant Owners Choose Menyo */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full border-t border-[#050F2A]/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7BBBFF] block mb-1">
            Proven Results
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#050F2A] tracking-tight">
            Why cafés &amp; restaurants choose Menyo.
          </h2>
          <p className="text-sm text-[#050F2A]/70 mt-2">
            Built to boost revenue, speed up order turnaround, and keep customers returning again and again.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Benefit 1 */}
          <div className="bg-gradient-to-br from-white to-[#F8FAFC] rounded-3xl p-6 border border-[#050F2A]/10 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#050F2A] mb-1.5">
                Up to +30% Order Value
              </h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Appetizing food photos and seamless add-ons prompt customers to order extra drinks, sides, and desserts effortlessly.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#050F2A]/10 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Higher table average</span>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="bg-gradient-to-br from-white to-[#F8FAFC] rounded-3xl p-6 border border-[#050F2A]/10 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#050F2A] mb-1.5">
                Zero Waiter Delays
              </h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Customers scan the table QR code and send orders immediately to your kitchen without waving or waiting for a paper menu.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#050F2A]/10 flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Faster table turnover</span>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="bg-gradient-to-br from-white to-[#F8FAFC] rounded-3xl p-6 border border-[#050F2A]/10 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#050F2A] mb-1.5">
                Zero Printing Costs
              </h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                No more re-printing laminated cards when prices or stock change. Update any dish, special, or price in 5 seconds.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#050F2A]/10 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>100% digital &amp; eco-friendly</span>
            </div>
          </div>

          {/* Benefit 4 */}
          <div className="bg-gradient-to-br from-white to-[#F8FAFC] rounded-3xl p-6 border border-[#050F2A]/10 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-700 flex items-center justify-center mb-4">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#050F2A] mb-1.5">
                Repeat Customer Loyalty
              </h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Reward points wallet and social photo studio create memorable dining experiences that turn one-time visitors into regulars.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#050F2A]/10 flex items-center gap-1.5 text-[11px] font-bold text-purple-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Viral social sharing</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3.6. WHO CAN USE MENYO — Industry Fit Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full border-t border-[#050F2A]/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7BBBFF] block mb-1">
            Universal Compatibility
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#050F2A] tracking-tight">
            Built for every hospitality business.
          </h2>
          <p className="text-sm text-[#050F2A]/70 mt-2">
            Whether you run a fast-paced espresso bar, a fine-dining hotel restaurant, or a bustling cloud kitchen — Menyo fits your workflow seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Cafés & Coffee Shops */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#E8B64F]/20 text-[#9A6B12] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Cafés &amp; Coffee Shops</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Handle busy morning rushes with instant table-side and counter QR ordering. Sugar customizations, beverage add-ons, and quick thermal bills.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Barista &amp; Bakery Ready</span>
            </div>
          </div>

          {/* 2. Restaurants & Diners */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Dine-in Restaurants</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Turn tables 40% faster. Multi-course ordering, live kitchen preparation status for guests, and contactless cashier billing.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Full Dining Room POS</span>
            </div>
          </div>

          {/* 3. Hotels & Resorts */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Hotels &amp; Resorts</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Room service, poolside loungers, and rooftop dining. Guests scan a dedicated room or bed QR code for instant delivery.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>Room Service &amp; Poolside</span>
            </div>
          </div>

          {/* 4. Bars, Pubs & Lounges */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wine className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Bars &amp; Resto-Lounges</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Eliminate crowded counter queues. Guests re-order cocktails, appetizers, and mocktails right from their booth with one tap.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Fast Drink Re-orders</span>
            </div>
          </div>

          {/* 5. Food Trucks & Popups */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Pizza className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Food Trucks &amp; Pizzerias</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Stand out with digital ordering on a single banner QR code. Customers view delicious photos while queuing and pay in seconds.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Grab &amp; Go Ordering</span>
            </div>
          </div>

          {/* 6. Cloud Kitchens & Takeaway */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Cloud Kitchens &amp; Takeaway</h3>
              <p className="text-xs text-[#050F2A]/70 leading-relaxed">
                Publish your live menu link on Instagram bio, WhatsApp, and Google Maps. Receive takeaway orders directly into your kitchen screen.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-[#050F2A]/10 text-[11px] font-semibold text-[#050F2A]/60 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Direct Link &amp; Social Orders</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 Clear Steps) */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full border-t border-[#050F2A]/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7BBBFF] block mb-1">
            Simple 3-Step Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#050F2A] tracking-tight">
            How Menyo works for your café.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm text-center relative">
            <div className="w-10 h-10 rounded-full bg-[#050F2A] text-white font-black text-sm flex items-center justify-center mx-auto mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-[#050F2A] mb-2">Set up your business</h3>
            <p className="text-xs text-[#050F2A]/70 leading-relaxed">
              We create your restaurant profile and set up your logo and brand colors on your unique URL.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm text-center relative">
            <div className="w-10 h-10 rounded-full bg-[#050F2A] text-white font-black text-sm flex items-center justify-center mx-auto mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-[#050F2A] mb-2">Add menu & print QRs</h3>
            <p className="text-xs text-[#050F2A]/70 leading-relaxed">
              Add your dishes, categories, and prices. Print our ready-to-use table QR cards for every seat.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-7 border border-[#050F2A]/10 shadow-sm text-center relative">
            <div className="w-10 h-10 rounded-full bg-[#050F2A] text-white font-black text-sm flex items-center justify-center mx-auto mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-[#050F2A] mb-2">Share & manage orders</h3>
            <p className="text-xs text-[#050F2A]/70 leading-relaxed">
              Guests scan to browse and order. Your kitchen receives orders instantly on your live screen.
            </p>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION (3 Equal-Quality Cards, Soft Pastel Accents) */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full border-t border-[#050F2A]/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-[#050F2A] tracking-tight">
            Simple plans. Same powerful features.
          </h2>
          <p className="text-sm text-[#050F2A]/70 mt-2">
            Transparent pricing in Sri Lankan Rupees. All plans include the full platform suite.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-3xl p-7 flex flex-col justify-between transition-all bg-white relative ${
                pkg.isPopular
                  ? "border-2 border-[#B8A9FF] shadow-lg shadow-[#B8A9FF]/15"
                  : "border border-[#050F2A]/10 shadow-sm"
              }`}
            >
              {/* Popular Badge */}
              {pkg.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#B8A9FF] text-[#050F2A] font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <span className="text-sm font-bold text-[#050F2A] block">{pkg.name}</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#050F2A] tracking-tight">
                    {pkg.price}
                  </span>
                  <span className="text-xs text-[#050F2A]/60 font-semibold">{pkg.period}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#050F2A]/5 text-[#050F2A]/70">
                    ≈ {pkg.priceUsd} USD
                  </span>
                  <span className="text-[11px] text-[#050F2A]/50 font-medium">{pkg.period}</span>
                </div>

                {/* Savings Badge */}
                {pkg.badge && (
                  <div className="mt-2.5">
                    <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#050F2A]">
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-[#050F2A]/10 space-y-3 text-xs text-[#050F2A]/80 font-medium">
                  {pkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[#7BBBFF]/20 text-[#050F2A] flex items-center justify-center shrink-0 text-[10px] font-bold">
                        ✓
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <a
                  href={`https://wa.me/94764847081?text=Hi%20Menyo,%20I%20would%20like%20to%20subscribe%20to%20the%20${encodeURIComponent(
                    pkg.name
                  )}%20package.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 text-center block shadow-sm"
                >
                  Choose Plan
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Clear Subtext */}
        <div className="mt-8 text-center text-xs text-[#050F2A]/50">
          One business · One branch · Manual renewal
        </div>
      </section>

      {/* 6. FINAL SPACIOUS CTA SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center border-t border-[#050F2A]/10">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#050F2A] tracking-tight">
          Ready to put your menu on every table?
        </h2>
        <p className="text-sm text-[#050F2A]/70 mt-3 max-w-md mx-auto">
          Join modern restaurants using Menyo for seamless QR ordering.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://wa.me/94764847081?text=Hi%20Menyo,%20I'm%20ready%20to%20get%20started."
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            Get Started with Menyo
          </a>
          <Link
            to="/teatime/menu?table=tbl_07_k8j3m&demo=true"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/20 text-[#050F2A] text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            Explore Tea Time Live Menu
          </Link>
        </div>
      </section>

      {/* 7. MINIMAL NAVY FOOTER (Matching Mockup) */}
      <footer className="mt-auto bg-[#050F2A] text-[#F2FDFF] py-8 px-6 border-t border-[#050F2A]/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <MenyoWordmark variant="light" height={24} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-[#F2FDFF]/80">
            <Link to="/login" className="hover:text-white transition-colors">
              Client Portal
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">
              Refund Policy
            </Link>
            <a
              href="https://wa.me/94764847081"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-emerald-400 shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>WhatsApp: 076 484 7081</span>
            </a>
            <a
              href="mailto:aevonixlk@gmail.com"
              className="hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>aevonixlk@gmail.com</span>
            </a>
            <span className="hidden md:inline text-[#F2FDFF]/30">|</span>
            <span className="text-xs uppercase tracking-widest text-[#F2FDFF]/60 font-semibold w-full md:w-auto mt-1 md:mt-0">
              by AEVONIX
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
