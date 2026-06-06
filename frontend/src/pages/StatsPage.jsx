import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { getStats } from "@/lib/api";
import { fmtRp, currentPeriod, formatPeriodLabel } from "@/lib/format";

const COLORS = {
  primary: "#166534",
  secondary: "#10B981",
  warn: "#B45309",
  jamil: "#166534",
  idham: "#65A30D",
  fachri: "#10B981",
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6">
    <div className="mb-5">
      <h3 className="text-display text-lg font-semibold text-[#1C1C1C]">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-[#52525B] mt-1">{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  fontSize: 12,
  padding: 8,
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const periode = currentPeriod();

  useEffect(() => {
    setLoading(true);
    getStats(periode)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periode]);

  if (loading) {
    return <div className="text-sm text-[#52525B]">Memuat statistik…</div>;
  }
  if (!stats) {
    return <div className="text-sm text-[#52525B]">Tidak ada data.</div>;
  }

  const lbData = [
    { name: "LUNAS", value: stats.lunas_count, color: COLORS.primary },
    { name: "BELUM", value: stats.belum_count, color: COLORS.warn },
  ];

  const incomeEntries = Object.entries(stats.income_per_month || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([k, v]) => ({ name: k.slice(5), full: k, value: v }));

  const userEntries = Object.entries(stats.income_per_user || {}).map(
    ([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: v,
      color: COLORS[k] || COLORS.primary,
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-display text-2xl font-bold text-[#1C1C1C]">
          Statistik & Laporan
        </h2>
        <p className="text-sm text-[#52525B] mt-1">
          Periode {formatPeriodLabel(periode)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Lunas vs Belum Bayar"
          subtitle={`Bulan ${formatPeriodLabel(periode)}`}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lbData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="name" stroke="#52525B" fontSize={12} />
              <YAxis stroke="#52525B" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F3F4F6" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {lbData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pemasukan per Bulan"
          subtitle="6 bulan terakhir"
        >
          {incomeEntries.length === 0 ? (
            <div className="text-sm text-[#52525B] py-16 text-center dotted-grid rounded-md">
              Belum ada data pemasukan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incomeEntries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" stroke="#52525B" fontSize={12} />
                <YAxis stroke="#52525B" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => fmtRp(v)}
                  cursor={{ fill: "#F3F4F6" }}
                />
                <Bar dataKey="value" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Pemasukan per Operator"
          subtitle="Total semua periode"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={userEntries} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" stroke="#52525B" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" stroke="#52525B" fontSize={12} width={70} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => fmtRp(v)}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {userEntries.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ringkasan" subtitle="Ikhtisar finansial">
          <dl className="divide-y divide-gray-100">
            {[
              ["Total Pelanggan Aktif", stats.total_pelanggan, "default"],
              ["Total Pemasukan (semua)", fmtRp(stats.total_income_all), "success"],
              ["Pemasukan Bulan Ini", fmtRp(stats.total_bayar_bulan_ini), "success"],
              ["Sudah Lunas Bulan Ini", stats.lunas_count, "success"],
              ["Belum Bayar Bulan Ini", stats.belum_count, "warn"],
            ].map(([label, value, kind]) => (
              <div
                key={label}
                className="flex items-center justify-between py-3"
              >
                <dt className="text-sm text-[#52525B]">{label}</dt>
                <dd
                  className={`text-display font-bold tabular-nums ${
                    kind === "success"
                      ? "text-[#166534]"
                      : kind === "warn"
                      ? "text-[#B45309]"
                      : "text-[#1C1C1C]"
                  }`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}
