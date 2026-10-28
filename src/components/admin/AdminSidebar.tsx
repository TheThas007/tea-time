import React from "react";
import { Bell, UtensilsCrossed, LayoutGrid, Settings } from "lucide-react";

export type AdminTab = "orders" | "menu" | "tables" | "settings";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  newOrdersCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  newOrdersCount = 0,
}) => {
  const navItems: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: "orders", label: "Orders", icon: Bell, badge: newOrdersCount },
    { id: "menu", label: "Menu", icon: UtensilsCrossed },
    { id: "tables", label: "Tables", icon: LayoutGrid },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="w-56 shrink-0 bg-[#0A0A0A] text-[#FFFCF6] flex flex-col justify-between p-4 border-r border-white/10 hidden md:flex min-h-[calc(100vh-61px)]">
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-3 py-2">
            Operations
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
                  isActive
                    ? "bg-[#E8B64F] text-[#1A0F08] shadow-warm font-extrabold"
                    : "text-[#DFC9AC] hover:text-[#FFFCF6] hover:bg-[#1A1A1A]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#1A0F08]" : "text-[#DFC9AC]"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && item.badge > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-warm ${
                      isActive ? "bg-[#0A0A0A] text-[#E8B64F]" : "bg-[#E8B64F] text-[#1A0F08]"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Footer brand info */}
        <div className="p-3 bg-[#1A1A1A] rounded-xl border border-white/10 text-[11px] text-[#DFC9AC]">
          <p className="font-bold text-[#FFFCF6]">TEA TIME Kitchen</p>
          <p className="text-[10px] text-[#DFC9AC]/80 mt-0.5">Real-time Order System</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0A0A0A] border-t border-white/10 z-40 px-3 py-2 flex items-center justify-around shadow-warm-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
                isActive
                  ? "text-[#E8B64F]"
                  : "text-[#DFC9AC] hover:text-[#FFFCF6]"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-[#E8B64F] text-[#1A0F08] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
