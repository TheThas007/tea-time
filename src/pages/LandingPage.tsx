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

  const packages = [
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
        "Branded digital menu",
        "Table QR codes",
        "Order management",
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
        "Branded digital menu",
        "Table QR codes",
        "Order management",
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
        "Branded digital menu",
        "Table QR codes",
        "Order management",
      ],
    },
  ];

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
              <div className="relative z-10 bg-white border border-[#050F2A]/10 rounded-2xl p-2.5 shadow-sm shadow-[#050F2A]/5 flex flex-col items-center gap-1.5 transition-all hover:scale-105">
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
              </div>
            </div>

            {/* Mobile Divider & QR Badge (when devices are stacked vertically) */}
            <div className="flex lg:hidden items-center justify-center gap-3 my-1 select-none">
              <div className="h-px w-10 bg-[#7BBBFF]/50 border-t border-dashed border-[#7BBBFF]" />
              <div className="bg-white border border-[#050F2A]/10 rounded-2xl px-3 py-1.5 shadow-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#050F2A]" />
                <span className="text-[10px] font-extrabold text-[#050F2A]">
                  Table QR Scan
                </span>
              </div>
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

            <a
              href="https://wa.me/94764847081?text=Hi%20Menyo,%20I'm%20ready%20to%20get%20started%20with%20a%20digital%20menu."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>WhatsApp Sales</span>
            </a>
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
              <h3 className="text-lg font-bold text-[#050F2A] mb-2">Your Logo & Colours</h3>
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MenyoWordmark variant="light" height={22} />
          </div>

          <div className="flex items-center gap-6 text-xs text-[#F2FDFF]/70">
            <Link to="/login" className="hover:text-white transition-colors">
              Client Portal
            </Link>
            <a
              href="https://wa.me/94764847081"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              WhatsApp: 076 484 7081
            </a>
            <span className="text-[#F2FDFF]/30">|</span>
            <span className="text-xs uppercase tracking-widest text-[#F2FDFF]/50 font-semibold">
              by AEVONIX
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
