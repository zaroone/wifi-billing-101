import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  AlertTriangle,
  LogOut,
  Wifi,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true, testid: "nav-dashboard" },
  { to: "/psb", label: "Data PSB", icon: Users, testid: "nav-psb" },
  { to: "/payment", label: "Verifikasi Bayar", icon: CreditCard, testid: "nav-payment" },
  { to: "/stats", label: "Statistik", icon: BarChart3, testid: "nav-stats" },
  { to: "/monitor", label: "Monitoring", icon: AlertTriangle, testid: "nav-monitor" },
];

const PAGE_TITLES = {
  "/": "Dashboard",
  "/psb": "Data Pelanggan",
  "/payment": "Verifikasi Pembayaran",
  "/stats": "Statistik & Laporan",
  "/monitor": "Monitoring Tunggakan",
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const handleLogout = () => {
    logout();
    toast.success("Anda telah keluar");
    nav("/login");
  };

  const pageTitle = PAGE_TITLES[loc.pathname] || "Dashboard";

  return (
    <div className="h-full min-h-screen flex bg-[#F8F9FA]" data-testid="app-layout">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-64"
        } flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 sticky top-0 h-screen`}
        data-testid="sidebar"
      >
        <div className="h-16 px-4 flex items-center gap-3 border-b border-gray-200">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "#166534" }}
          >
            <Wifi className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-display font-bold text-sm text-[#1C1C1C] leading-tight">
                RT/RW Net
              </div>
              <div className="text-[10px] text-[#52525B] uppercase tracking-wider">
                Manager
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#166534]/8 text-[#166534]"
                      : "text-[#52525B] hover:bg-gray-50 hover:text-[#1C1C1C]"
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-200 space-y-1">
          {!collapsed && user && (
            <div className="px-3 py-2.5 mb-1">
              <div className="text-[10px] text-[#52525B] uppercase tracking-wider">
                Login sebagai
              </div>
              <div className="text-sm font-semibold text-[#1C1C1C] mt-0.5 capitalize">
                {user}
              </div>
            </div>
          )}
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[#B45309] hover:bg-[#FEF3C7] transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center px-6 md:px-8">
          <button
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            className="mr-4 p-2 -ml-2 rounded-md hover:bg-gray-100 text-[#52525B] hover:text-[#1C1C1C]"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
          <h1 className="text-display text-lg md:text-xl font-bold text-[#1C1C1C]" data-testid="page-title">
            {pageTitle}
          </h1>
          <div className="ml-auto flex items-center gap-3 text-xs text-[#52525B]">
            <span className="hidden sm:inline font-mono-display tracking-wider">
              MasterF4 v2.0
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Design by Idham @2026</span>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-x-auto" data-testid="main-content">
          <div className="animate-fade-in max-w-[1400px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
