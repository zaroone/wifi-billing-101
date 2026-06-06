import { useState } from "react";
import { Search, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBelumBayar } from "@/lib/api";
import { fmtRp, currentPeriod, formatPeriodLabel } from "@/lib/format";

export default function MonitorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tooEarly, setTooEarly] = useState(false);

  const periode = currentPeriod();

  const cek = async () => {
    const today = new Date();
    if (today.getDate() <= 10) {
      setTooEarly(true);
      setChecked(true);
      setData(null);
      return;
    }
    setLoading(true);
    setTooEarly(false);
    try {
      const d = await getBelumBayar(periode);
      setData(d);
      setChecked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-display text-2xl font-bold text-[#1C1C1C]">
          Monitoring Tunggakan
        </h2>
        <p className="text-sm text-[#52525B] mt-1">
          Periode {formatPeriodLabel(periode)} • Penagihan aktif setelah tanggal 10
        </p>
      </div>

      {!checked && (
        <div className="bg-white border border-gray-200 rounded-lg p-10 md:p-16 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
            style={{ background: "#166534/10", backgroundColor: "rgba(22,101,52,0.08)" }}
          >
            <Search className="w-7 h-7 text-[#166534]" />
          </div>
          <h3 className="text-display text-xl font-bold text-[#1C1C1C] mb-2">
            Cek Pelanggan Belum Bayar
          </h3>
          <p className="text-sm text-[#52525B] max-w-md mx-auto mb-8">
            Klik tombol di bawah untuk melihat daftar pelanggan yang belum melunasi tagihan bulan ini, dikelompokkan per pemilik.
          </p>
          <Button
            data-testid="monitor-check-button"
            onClick={cek}
            disabled={loading}
            size="lg"
            className="bg-[#166534] hover:bg-[#14532D] text-white px-8 h-12"
          >
            {loading ? "Mengecek…" : "Cek Pelanggan Belum Bayar"}
          </Button>
        </div>
      )}

      {checked && tooEarly && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: "#FEF3C7" }}
          >
            <Clock className="w-6 h-6 text-[#B45309]" />
          </div>
          <h3 className="text-display text-lg font-bold text-[#1C1C1C] mb-2">
            Belum Masuk Periode Penagihan
          </h3>
          <p className="text-sm text-[#52525B] max-w-md mx-auto">
            Penagihan baru dimulai setelah tanggal 10 setiap bulan. Silakan kembali setelah tanggal tersebut.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setChecked(false);
              setTooEarly(false);
            }}
            className="mt-6"
          >
            Kembali
          </Button>
        </div>
      )}

      {checked && data && data.items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: "#D1FAE5" }}
          >
            <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
          </div>
          <h3 className="text-display text-lg font-bold text-[#166534] mb-2">
            Semua Pelanggan Sudah Bayar
          </h3>
          <p className="text-sm text-[#52525B]">
            Tidak ada tunggakan untuk periode {formatPeriodLabel(periode)}.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setChecked(false);
              setData(null);
            }}
            className="mt-6"
          >
            Cek Ulang
          </Button>
        </div>
      )}

      {checked && data && data.items.length > 0 && (
        <>
          <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-display font-semibold text-[#92400E]">
                {data.items.length} pelanggan belum melunasi tagihan
              </div>
              <div className="text-sm text-[#92400E]/80 mt-0.5">
                Total tunggakan: <b className="tabular-nums">{fmtRp(data.total_tunggakan)}</b>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-display font-semibold text-[#1C1C1C]">
                  Daftar Tunggakan
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["No", "Client", "WiFi", "Paket", "Pemilik", "Harga"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#52525B]"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((b, i) => (
                      <tr
                        key={b.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3 text-[#52525B]">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-[#1C1C1C]">
                          {b.nama_client}
                        </td>
                        <td className="px-4 py-3 text-[#1C1C1C]">{b.nama_wifi}</td>
                        <td className="px-4 py-3 text-[#52525B]">{b.paket || "-"}</td>
                        <td className="px-4 py-3 text-[#52525B]">{b.pemilik}</td>
                        <td className="px-4 py-3 font-semibold text-[#B45309] tabular-nums">
                          {fmtRp(b.harga)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-display font-semibold text-[#1C1C1C] mb-4">
                Tunggakan per Pemilik
              </h3>
              <dl className="space-y-3">
                {Object.entries(data.summary_per_owner).map(([owner, total]) => (
                  <div
                    key={owner}
                    className="flex items-center justify-between p-3 rounded-md bg-[#FEF3C7]/30 border border-[#FDE68A]"
                  >
                    <dt className="text-sm font-medium text-[#1C1C1C] capitalize">
                      {owner}
                    </dt>
                    <dd className="text-display font-bold text-[#B45309] tabular-nums">
                      {fmtRp(total)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-display font-bold text-sm text-[#1C1C1C] uppercase tracking-wider">
                  Total
                </span>
                <span className="text-display text-xl font-bold text-[#B45309] tabular-nums">
                  {fmtRp(data.total_tunggakan)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setChecked(false);
                setData(null);
              }}
            >
              Cek Ulang
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
