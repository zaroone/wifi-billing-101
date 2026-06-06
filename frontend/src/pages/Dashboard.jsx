import { useEffect, useState } from "react";
import { Users, Banknote, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import { getStats } from "@/lib/api";
import { fmtRp, currentPeriod, formatPeriodLabel } from "@/lib/format";
import { useNavigate } from "react-router-dom";

const StatCard = ({ label, value, icon: Icon, accent, testid }) => (
  <div
    data-testid={testid}
    className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4 transition-shadow hover:shadow-sm"
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold tracking-wider text-[#52525B] uppercase">
        {label}
      </span>
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center"
        style={{ background: accent + "12", color: accent }}
      >
        <Icon className="w-[18px] h-[18px]" />
      </div>
    </div>
    <div className="text-display text-3xl font-bold text-[#1C1C1C] tabular-nums">
      {value}
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const periode = currentPeriod();
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStats(periode)
      .then((d) => {
        if (alive) setStats(d);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [periode]);

  const total = stats?.total_pelanggan ?? 0;
  const totalBayar = stats?.total_bayar_bulan_ini ?? 0;
  const lunas = stats?.lunas_count ?? 0;
  const belum = stats?.belum_count ?? 0;
  const recent = stats?.recent_activity ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[#52525B] uppercase mb-1">
            Periode {formatPeriodLabel(periode)}
          </p>
          <h2 className="text-display text-3xl font-bold text-[#1C1C1C] tracking-tight">
            Ringkasan operasional hari ini
          </h2>
        </div>
        <button
          data-testid="dashboard-go-monitor"
          onClick={() => nav("/monitor")}
          className="self-start md:self-end inline-flex items-center gap-2 text-sm font-medium text-[#166534] hover:underline"
        >
          Lihat tunggakan <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pelanggan Aktif"
          value={loading ? "…" : total}
          icon={Users}
          accent="#166534"
          testid="stat-total-pelanggan"
        />
        <StatCard
          label={`Pemasukan ${formatPeriodLabel(periode)}`}
          value={loading ? "…" : fmtRp(totalBayar)}
          icon={Banknote}
          accent="#10B981"
          testid="stat-total-bayar"
        />
        <StatCard
          label="Sudah Bayar"
          value={loading ? "…" : lunas}
          icon={CheckCircle2}
          accent="#166534"
          testid="stat-lunas"
        />
        <StatCard
          label="Belum Bayar"
          value={loading ? "…" : belum}
          icon={AlertCircle}
          accent="#B45309"
          testid="stat-belum"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-display text-lg font-semibold text-[#1C1C1C]">
              Aktivitas Verifikasi Terbaru
            </h3>
            <span className="text-xs text-[#52525B]">{recent.length} entri</span>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#52525B] dotted-grid rounded-md">
              Belum ada verifikasi pembayaran tercatat.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((r, i) => (
                <li key={i} className="py-3 flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                    style={{
                      background:
                        r.status_bayar === "LUNAS" ? "#D1FAE5" : "#FEF3C7",
                      color:
                        r.status_bayar === "LUNAS" ? "#10B981" : "#B45309",
                    }}
                  >
                    {(r.user_input || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1C1C1C] truncate">
                      {r.nama_client || r.nama_wifi}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">
                      Periode {r.periode} • {fmtRp(r.harga)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        r.status_bayar === "LUNAS"
                          ? "bg-[#D1FAE5] text-[#065F46]"
                          : "bg-[#FEF3C7] text-[#92400E]"
                      }`}
                    >
                      {r.status_bayar}
                    </span>
                    <div className="text-[11px] text-[#52525B] font-mono-display mt-1">
                      {r.timestamp}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-display text-lg font-semibold text-[#1C1C1C] mb-4">
            Aksi Cepat
          </h3>
          <div className="space-y-3">
            {[
              { label: "Tambah Pelanggan Baru", to: "/psb", testid: "quick-add-psb" },
              { label: "Verifikasi Pembayaran", to: "/payment", testid: "quick-verify" },
              { label: "Lihat Statistik", to: "/stats", testid: "quick-stats" },
              { label: "Cek Tunggakan", to: "/monitor", testid: "quick-monitor" },
            ].map((a) => (
              <button
                key={a.to}
                data-testid={a.testid}
                onClick={() => nav(a.to)}
                className="w-full text-left px-4 py-3 rounded-md border border-gray-200 hover:border-[#166534] hover:bg-[#166534]/4 transition-colors flex items-center justify-between group"
              >
                <span className="text-sm font-medium text-[#1C1C1C]">
                  {a.label}
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#52525B] group-hover:text-[#166534]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
