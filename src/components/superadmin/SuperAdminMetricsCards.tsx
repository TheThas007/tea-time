import React from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { SuperAdminMetrics } from "../../types";

interface Props {
  metrics: SuperAdminMetrics;
}

export const SuperAdminMetricsCards: React.FC<Props> = ({ metrics }) => {
  const cards = [
    {
      label: "Total Businesses",
      value: metrics.totalBusinesses,
      icon: Building2,
      color: "text-[#050F2A]",
      bg: "bg-[#7BBBFF]/20 border-[#7BBBFF]/30",
    },
    {
      label: "Active Businesses",
      value: metrics.activeBusinesses,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-500/15 border-emerald-500/25",
    },
    {
      label: "Expired",
      value: metrics.expiredBusinesses,
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-500/15 border-amber-500/25",
    },
    {
      label: "Suspended",
      value: metrics.suspendedBusinesses,
      icon: AlertCircle,
      color: "text-rose-700",
      bg: "bg-rose-500/15 border-rose-500/25",
    },
    {
      label: "Expiring in 7 Days",
      value: metrics.expiringWithin7Days ?? 0,
      icon: AlertTriangle,
      color: (metrics.expiringWithin7Days ?? 0) > 0 ? "text-amber-800" : "text-[#050F2A]/60",
      bg: (metrics.expiringWithin7Days ?? 0) > 0 ? "bg-amber-500/20 border-amber-500/40" : "bg-[#050F2A]/5 border-[#050F2A]/10",
      alert: (metrics.expiringWithin7Days ?? 0) > 0,
    },
    {
      label: "Collected This Month",
      value: `Rs. ${(metrics.incomeThisMonthRupees ?? 0).toLocaleString()}`,
      icon: CreditCard,
      color: "text-[#050F2A]",
      bg: "bg-[#B8A9FF]/25 border-[#B8A9FF]/40",
      subtext: "Calculated from recorded payments",
    },
    {
      label: "Total Payments",
      value: `Rs. ${(metrics.incomeTotalRupees ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-800",
      bg: "bg-emerald-500/15 border-emerald-500/25",
      subtext: "All-time manual payments",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-white border transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
              card.alert
                ? "border-amber-400/70 ring-1 ring-amber-400/20"
                : "border-black/[0.06]"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#6E6E73] leading-tight">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${card.bg} ${card.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
              {card.value}
            </div>
            {card.subtext && (
              <p className="text-[11px] font-medium text-[#86868B] mt-1 truncate">
                {card.subtext}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
