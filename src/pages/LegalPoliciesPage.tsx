import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, FileText, RefreshCw, Mail, Phone } from "lucide-react";
import { MenyoWordmark } from "../components/common/MenyoLogo";

export const LegalPoliciesPage: React.FC<{ initialSection?: "terms" | "privacy" | "refund" }> = ({
  initialSection = "terms",
}) => {
  const [activeTab, setActiveTab] = React.useState<"terms" | "privacy" | "refund">(initialSection);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col font-sans selection:bg-[#7BBBFF]/40">
      {/* Header */}
      <header className="border-b border-[#050F2A]/10 bg-white/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <MenyoWordmark height={26} />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#050F2A]/70 hover:text-[#050F2A] px-3.5 py-1.5 rounded-full hover:bg-[#050F2A]/5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-[#050F2A] text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#7BBBFF] block mb-2">
            Legal &amp; Compliance Center
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Terms, Privacy &amp; Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-2 max-w-xl mx-auto">
            Clear, transparent policies for Menyo Software-as-a-Service (SaaS) Platform operated by AEVONIX.
          </p>

          {/* Navigation Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setActiveTab("terms")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "terms"
                  ? "bg-[#7BBBFF] text-[#050F2A] shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms &amp; Conditions</span>
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "privacy"
                  ? "bg-[#7BBBFF] text-[#050F2A] shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => setActiveTab("refund")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "refund"
                  ? "bg-[#7BBBFF] text-[#050F2A] shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refund &amp; Cancellation Policy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-1">
        {/* TAB 1: TERMS & CONDITIONS */}
        {activeTab === "terms" && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#050F2A]/10 shadow-sm space-y-6 text-xs sm:text-sm text-[#050F2A]/80 leading-relaxed">
            <div className="border-b border-[#050F2A]/10 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#050F2A]">Terms and Conditions</h2>
              <p className="text-xs text-[#050F2A]/50 mt-1">Last Updated: November 15, 2026</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">1. Agreement to Terms</h3>
              <p>
                By accessing or using the Menyo platform (&ldquo;Service&rdquo;, &ldquo;Menyo&rdquo;, &ldquo;menyo.org&rdquo;), provided by AEVONIX (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">2. Description of Service</h3>
              <p>
                Menyo is a cloud-based Software-as-a-Service (SaaS) platform designed for restaurants, cafés, and hospitality venues. Services include interactive digital QR menus, kitchen display order tracking, cashier POS billing, branded photo studio tools, and customer loyalty rewards wallets.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">3. Subscriptions &amp; Billing</h3>
              <p>
                Our services are provided on a recurring or prepaid subscription basis (Monthly, 6 Months, or Yearly). By subscribing, you agree to pay the applicable fees indicated on the platform. All digital transactions are securely processed via certified payment gateways including PayHere and authorized banking channels.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">4. User Account &amp; Responsibilities</h3>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to provide accurate and complete business information during registration.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">5. Service Availability &amp; Uptime</h3>
              <p>
                We strive to maintain a 99.9% uptime for digital dining menus. However, we do not warrant that the Service will be completely uninterrupted, error-free, or free of temporary maintenance downtime.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">6. Contact Information</h3>
              <p>
                If you have any questions regarding these Terms, please contact us at:
              </p>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#050F2A]/10 space-y-1 text-xs">
                <p><strong>AEVONIX — Menyo Operations</strong></p>
                <p>Email: <a href="mailto:aevonixlk@gmail.com" className="text-[#0071E3] underline">aevonixlk@gmail.com</a></p>
                <p>Phone / WhatsApp: +94 76 484 7081</p>
                <p>Country: Sri Lanka</p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: PRIVACY POLICY */}
        {activeTab === "privacy" && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#050F2A]/10 shadow-sm space-y-6 text-xs sm:text-sm text-[#050F2A]/80 leading-relaxed">
            <div className="border-b border-[#050F2A]/10 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#050F2A]">Privacy Policy</h2>
              <p className="text-xs text-[#050F2A]/50 mt-1">Last Updated: November 15, 2026</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">1. Information We Collect</h3>
              <p>
                We collect personal information that you provide when registering an account, including your business name, contact name, phone number, email address, and menu product listings. Diners scanning QR codes may optionally provide their phone number and name for loyalty reward point tracking.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">2. Use of Information</h3>
              <p>
                We use collected information to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Provide, operate, and maintain your digital restaurant menus and cashier POS.</li>
                <li>Process payments and subscription renewals.</li>
                <li>Send order updates and important service notifications.</li>
                <li>Enable optional loyalty wallet point calculations and discounts.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">3. Data Protection &amp; Security</h3>
              <p>
                We implement industry-standard 256-bit SSL encryption to protect your sensitive data and credentials. We do not sell, rent, or trade your personal or customer business data to third-party advertisers.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">4. Third-Party Payment Processors</h3>
              <p>
                Payment information is handled by secure, PCI-DSS compliant third-party payment gateways (such as PayHere). We do not store full credit or debit card numbers on our servers.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">5. Contact Us</h3>
              <p>
                For questions regarding your privacy or data deletion requests, contact: <a href="mailto:aevonixlk@gmail.com" className="text-[#0071E3] underline">aevonixlk@gmail.com</a>.
              </p>
            </section>
          </div>
        )}

        {/* TAB 3: REFUND & CANCELLATION POLICY */}
        {activeTab === "refund" && (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#050F2A]/10 shadow-sm space-y-6 text-xs sm:text-sm text-[#050F2A]/80 leading-relaxed">
            <div className="border-b border-[#050F2A]/10 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-[#050F2A]">Refund &amp; Cancellation Policy</h2>
              <p className="text-xs text-[#050F2A]/50 mt-1">Official Policy for PayHere Merchant Compliance</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">1. Digital Software Service Delivery</h3>
              <p>
                Menyo is a cloud software service. Upon successful payment through our secure online payment gateway (PayHere / Card / Bank), subscription access is provisioned <strong>immediately and digitally</strong>. No physical goods are shipped.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">2. 7-Day Refund Guarantee</h3>
              <p>
                We offer a <strong>7-Day Money-Back Guarantee</strong> on new subscription activations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li>
                  If you encounter technical defects or are unable to use the Menyo QR ordering system and our support team cannot resolve the issue, you are entitled to a full refund within <strong>7 days</strong> of your initial purchase date.
                </li>
                <li>
                  To claim a refund, please email <a href="mailto:aevonixlk@gmail.com" className="text-[#0071E3] font-bold underline">aevonixlk@gmail.com</a> or message our WhatsApp Support at <strong>+94 76 484 7081</strong> with your business name, registered email, and payment receipt.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">3. Refund Processing Time</h3>
              <p>
                Once approved, refunds will be credited back to the <strong>original payment method (credit/debit card or bank account)</strong> used during purchase within <strong>3 to 5 business days</strong>, subject to your card issuer&rsquo;s standard processing timeline.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">4. Subscription Cancellation</h3>
              <p>
                You may cancel your subscription renewal at any time. When you cancel, your account remains active with full access until the end of your current paid billing period. No further charges will be incurred.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold text-[#050F2A]">5. Support &amp; Assistance</h3>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#050F2A]/10 space-y-1.5 text-xs">
                <p className="font-bold text-[#050F2A]">AEVONIX Customer Support</p>
                <div className="flex items-center gap-2 text-[#050F2A]/70">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>Email: <a href="mailto:aevonixlk@gmail.com" className="text-[#0071E3] underline">aevonixlk@gmail.com</a></span>
                </div>
                <div className="flex items-center gap-2 text-[#050F2A]/70">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>WhatsApp / Hotline: +94 76 484 7081</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#050F2A] text-[#F2FDFF]/70 py-8 px-6 text-xs text-center border-t border-[#050F2A]/20">
        <p>&copy; {new Date().getFullYear()} Menyo &mdash; by AEVONIX. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button onClick={() => setActiveTab("terms")} className="hover:text-white transition">Terms &amp; Conditions</button>
          <span>&bull;</span>
          <button onClick={() => setActiveTab("privacy")} className="hover:text-white transition">Privacy Policy</button>
          <span>&bull;</span>
          <button onClick={() => setActiveTab("refund")} className="hover:text-white transition">Refund Policy</button>
        </div>
      </footer>
    </div>
  );
};

