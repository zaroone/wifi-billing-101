import { useEffect, useState, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Search,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listPayments,
  listPeriods,
  updatePayment,
  markLunas,
  deletePayment,
  generatePayments,
  importPayments,
  deleteAllPayments,
} from "@/lib/api";
import { fmtRp, currentPeriod, formatPeriodLabel, csvParseLine } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
      status === "LUNAS"
        ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]"
        : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
    }`}
  >
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: status === "LUNAS" ? "#10B981" : "#B45309" }}
    />
    {status}
  </span>
);

export default function PaymentPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [periode, setPeriode] = useState(currentPeriod());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [genOpen, setGenOpen] = useState(false);
  const [genPw, setGenPw] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    status_bayar: "BELUM",
    user_input: "",
    timestamp: "",
  });
  const [confirmDel, setConfirmDel] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [delAllOpen, setDelAllOpen] = useState(false);
  const [delAllPw, setDelAllPw] = useState("");
  const [delAllLoading, setDelAllLoading] = useState(false);
  const [genReport, setGenReport] = useState(null); // {created, skipped, skipped_details}

  const loadPeriods = useCallback(async () => {
    try {
      const p = await listPeriods();
      const cur = currentPeriod();
      const all = Array.from(new Set([cur, ...p])).sort().reverse();
      setPeriods(all);
    } catch (e) {
      console.error("listPeriods failed", e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listPayments(periode);
      setData(d || []);
    } catch (e) {
      console.error("listPayments failed", e);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let arr = data;
    if (filterStatus !== "ALL") {
      arr = arr.filter((d) => d.status_bayar === filterStatus);
    }
    const q = search.toLowerCase();
    if (q) {
      arr = arr.filter((d) =>
        [d.nama_wifi, d.nama_client, d.paket]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [data, search, filterStatus]);

  const doGenerate = async () => {
    setGenerating(true);
    try {
      const r = await generatePayments(periode, genPw);
      if (r.created > 0) toast.success(`${r.created} tagihan dibuat`);
      setGenOpen(false);
      setGenPw("");
      load();
      loadPeriods();
      if (r.skipped > 0 || r.created > 0) {
        setGenReport({
          created: r.created,
          skipped: r.skipped,
          skipped_details: r.skipped_details || [],
          periode,
        });
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Password salah");
    } finally {
      setGenerating(false);
    }
  };

  const doMarkLunas = async (id) => {
    try {
      await markLunas(id, user || "system");
      toast.success("Ditandai LUNAS");
      load();
    } catch (e) {
      toast.error("Gagal");
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setEditForm({
      status_bayar: row.status_bayar || "BELUM",
      user_input: row.user_input || "",
      timestamp: row.timestamp || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      await updatePayment(editing.id, editForm);
      toast.success("Pembayaran diperbarui");
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error("Gagal menyimpan");
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deletePayment(confirmDel.id);
      toast.success("Dihapus");
      setConfirmDel(null);
      load();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const doDeleteAll = async () => {
    setDelAllLoading(true);
    try {
      const r = await deleteAllPayments(delAllPw);
      toast.success(`${r.deleted} data pembayaran dihapus`);
      setDelAllOpen(false);
      setDelAllPw("");
      load();
      loadPeriods();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Password salah");
    } finally {
      setDelAllLoading(false);
    }
  };

  const exportCsv = () => {
    if (data.length === 0) {
      toast.error("Tidak ada data");
      return;
    }
    const header =
      "Nama WiFi,Nama Client,Paket,Harga,Status,Verifikator,Waktu";
    const rows = data.map((d) =>
      [
        d.nama_wifi,
        d.nama_client,
        d.paket,
        d.harga,
        d.status_bayar,
        d.user_input,
        d.timestamp,
      ]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    setCsvContent([header, ...rows].join("\n"));
    setCsvOpen(true);
  };

  const doImport = async () => {
    try {
      const lines = importText.trim().split("\n").filter((l) => l.trim());
      let start = 0;
      if (lines[0] && lines[0].toLowerCase().includes("nama wifi")) start = 1;
      const items = [];
      for (let i = start; i < lines.length; i++) {
        const cols = csvParseLine(lines[i]);
        if (cols.length < 5) continue;
        items.push({
          nama_wifi: cols[0],
          nama_client: cols[1] || "",
          paket: cols[2] || "",
          harga: Number(cols[3]) || 0,
          periode,
          status_bayar: cols[4] || "BELUM",
          user_input: cols[5] || "",
          timestamp: cols[6] || "",
        });
      }
      const r = await importPayments(items);
      toast.success(`${r.created} data diimport`);
      setImportOpen(false);
      setImportText("");
      load();
    } catch {
      toast.error("Import gagal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-display text-2xl font-bold text-[#1C1C1C]">
            Verifikasi Pembayaran
          </h2>
          <p className="text-sm text-[#52525B] mt-1">
            Periode {formatPeriodLabel(periode)} • {data.length} tagihan
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger
              data-testid="payment-period-select"
              className="w-[180px] bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {formatPeriodLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            data-testid="payment-generate-button"
            onClick={() => setGenOpen(true)}
            className="bg-[#166534] hover:bg-[#14532D] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Generate
          </Button>
          <Button
            variant="outline"
            onClick={exportCsv}
            data-testid="payment-export-button"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            data-testid="payment-import-button"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button
            variant="outline"
            onClick={() => setDelAllOpen(true)}
            data-testid="payment-delete-all-button"
            className="border-[#B45309]/40 text-[#B45309] hover:bg-[#FEF3C7] hover:text-[#92400E]"
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Hapus Semua
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
          <Input
            data-testid="payment-search"
            placeholder="Cari client, WiFi, paket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            data-testid="payment-status-filter"
            className="w-[180px] bg-white"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="LUNAS">Lunas</SelectItem>
            <SelectItem value="BELUM">Belum Bayar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  "No",
                  "WiFi",
                  "Client",
                  "Paket",
                  "Harga",
                  "Status",
                  "Verifikator",
                  "Waktu",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#52525B]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#52525B]">
                    Memuat…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#52525B]">
                    Belum ada tagihan untuk periode ini. Klik "Generate" untuk membuat.
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    data-testid={`payment-row-${d.id}`}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-[#52525B] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C]">
                      {d.nama_wifi}
                    </td>
                    <td className="px-4 py-3 text-[#1C1C1C]">
                      {d.nama_client}
                    </td>
                    <td className="px-4 py-3 text-[#52525B]">{d.paket || "-"}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C] tabular-nums">
                      {fmtRp(d.harga)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status_bayar} />
                    </td>
                    <td className="px-4 py-3 text-[#52525B] capitalize">
                      {d.user_input || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#52525B] text-xs font-mono-display">
                      {d.timestamp || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {d.status_bayar === "BELUM" && (
                          <Button
                            data-testid={`payment-mark-lunas-${d.id}`}
                            size="sm"
                            onClick={() => doMarkLunas(d.id)}
                            className="bg-[#166534] hover:bg-[#14532D] text-white h-7 px-3 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> LUNAS
                          </Button>
                        )}
                        <button
                          data-testid={`payment-edit-${d.id}`}
                          onClick={() => openEdit(d)}
                          className="p-1.5 rounded hover:bg-[#166534]/8 text-[#166534]"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          data-testid={`payment-delete-${d.id}`}
                          onClick={() => setConfirmDel(d)}
                          className="p-1.5 rounded hover:bg-[#FEF3C7] text-[#B45309]"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate password */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Tagihan</DialogTitle>
            <DialogDescription>
              Buat tagihan baru untuk semua pelanggan aktif pada periode{" "}
              <b>{formatPeriodLabel(periode)}</b>. Masukkan password.
            </DialogDescription>
          </DialogHeader>
          <Input
            data-testid="payment-generate-password"
            type="password"
            placeholder="Password"
            value={genPw}
            onChange={(e) => setGenPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doGenerate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Batal
            </Button>
            <Button
              data-testid="payment-do-generate"
              onClick={doGenerate}
              disabled={generating}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              {generating ? "Memproses…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit payment */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              {editing?.nama_client} • {editing?.nama_wifi}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status_bayar}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, status_bayar: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LUNAS">LUNAS</SelectItem>
                  <SelectItem value="BELUM">BELUM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Verifikator</Label>
              <Input
                value={editForm.user_input}
                onChange={(e) =>
                  setEditForm({ ...editForm, user_input: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Waktu</Label>
              <Input
                value={editForm.timestamp}
                onChange={(e) =>
                  setEditForm({ ...editForm, timestamp: e.target.value })
                }
                placeholder="YYYY-MM-DD HH:MM"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button
              data-testid="payment-save-edit"
              onClick={saveEdit}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus tagihan?</DialogTitle>
            <DialogDescription>
              {confirmDel?.nama_client} akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Batal
            </Button>
            <Button
              onClick={doDelete}
              className="bg-[#B45309] hover:bg-[#92400E] text-white"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Pembayaran</DialogTitle>
            <DialogDescription>Periode {formatPeriodLabel(periode)}</DialogDescription>
          </DialogHeader>
          <Textarea value={csvContent} readOnly className="h-48 font-mono-display text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Tutup</Button>
            <Button
              onClick={() =>
                navigator.clipboard.writeText(csvContent).then(() => toast.success("Disalin"))
              }
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              Salin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Pembayaran (CSV)</DialogTitle>
            <DialogDescription>
              Format: Nama WiFi,Client,Paket,Harga,Status,Verifikator,Waktu
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste CSV..."
            className="h-48 font-mono-display text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={doImport}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Generate report */}
      <Dialog open={!!genReport} onOpenChange={(o) => !o && setGenReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Laporan Generate Tagihan</DialogTitle>
            <DialogDescription>
              Periode <b>{genReport?.periode}</b> — <span className="text-[#166534] font-semibold">{genReport?.created} dibuat</span>
              {", "}
              <span className="text-[#B45309] font-semibold">{genReport?.skipped} dilewati</span>
            </DialogDescription>
          </DialogHeader>
          {genReport?.skipped > 0 ? (
            <div className="max-h-[420px] overflow-auto border border-stone-200 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 sticky top-0">
                  <tr className="text-left text-stone-600">
                    <th className="px-3 py-2 font-medium w-10">#</th>
                    <th className="px-3 py-2 font-medium">Nama Client</th>
                    <th className="px-3 py-2 font-medium">Nama WiFi</th>
                    <th className="px-3 py-2 font-medium">Pemilik</th>
                    <th className="px-3 py-2 font-medium">Alasan Dilewati</th>
                  </tr>
                </thead>
                <tbody>
                  {genReport.skipped_details.map((s, i) => (
                    <tr key={i} className="border-t border-stone-100" data-testid={`skip-row-${i}`}>
                      <td className="px-3 py-2 text-stone-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{s.nama_client}</td>
                      <td className="px-3 py-2 text-stone-600">{s.nama_wifi || "—"}</td>
                      <td className="px-3 py-2 text-stone-600">{s.pemilik || "—"}</td>
                      <td className="px-3 py-2 text-[#B45309]">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-stone-600">
              Semua PSB aktif berhasil di-generate. Tidak ada data yang dilewati.
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => setGenReport(null)} data-testid="close-gen-report">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete all confirm */}
      <Dialog open={delAllOpen} onOpenChange={setDelAllOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#B45309]">
              <AlertTriangle className="w-5 h-5" /> Hapus Semua Pembayaran?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus <b>seluruh data pembayaran di semua periode</b> dan tidak bisa dibatalkan. Masukkan PIN untuk konfirmasi.
            </DialogDescription>
          </DialogHeader>
          <Input
            data-testid="payment-delete-all-password"
            type="password"
            placeholder="PIN"
            value={delAllPw}
            onChange={(e) => setDelAllPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doDeleteAll()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelAllOpen(false)}>
              Batal
            </Button>
            <Button
              data-testid="payment-do-delete-all"
              onClick={doDeleteAll}
              disabled={delAllLoading}
              className="bg-[#B45309] hover:bg-[#92400E] text-white"
            >
              {delAllLoading ? "Menghapus…" : "Hapus Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
