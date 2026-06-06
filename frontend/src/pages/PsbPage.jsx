import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Pencil,
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
  listPsb,
  createPsb,
  updatePsb,
  deletePsb,
  deleteAllPsb,
  importPsb,
} from "@/lib/api";
import { fmtRp, formatTgl, csvParseLine } from "@/lib/format";

const EMPTY = {
  pemilik: "",
  nama_wifi: "",
  password_wifi: "",
  nama_client: "",
  paket: "",
  harga: "",
  tanggal_daftar: "",
  infrastruktur: "",
  status_client: "aktif",
};

const Badge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
      active
        ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]"
        : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
    }`}
  >
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: active ? "#10B981" : "#B45309" }}
    />
    {active ? "Aktif" : "Nonaktif"}
  </span>
);

export default function PsbPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delAllOpen, setDelAllOpen] = useState(false);
  const [delAllPw, setDelAllPw] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const d = await listPsb();
      setData(d || []);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return data;
    return data.filter((d) =>
      [d.pemilik, d.nama_wifi, d.nama_client, d.paket]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [data, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...EMPTY, ...row, harga: String(row.harga ?? "") });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.nama_wifi || !form.nama_client) {
      toast.error("Nama WiFi & Client wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, harga: Number(form.harga) || 0 };
      if (editing) {
        await updatePsb(editing.id, payload);
        toast.success("Data diperbarui");
      } else {
        await createPsb(payload);
        toast.success("Data ditambahkan");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deletePsb(confirmDel.id);
      toast.success("Data dihapus");
      setConfirmDel(null);
      load();
    } catch (e) {
      toast.error("Gagal menghapus");
    }
  };

  const doDeleteAll = async () => {
    try {
      const r = await deleteAllPsb(delAllPw);
      toast.success(`${r.deleted} data dihapus`);
      setDelAllOpen(false);
      setDelAllPw("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Password salah");
    }
  };

  const exportCsv = () => {
    if (data.length === 0) {
      toast.error("Tidak ada data");
      return;
    }
    const header =
      "Pemilik,Nama WiFi,Password WiFi,Nama Client,Paket,Harga,Tanggal Daftar,Infrastruktur,Status";
    const rows = data.map((d) =>
      [
        d.pemilik,
        d.nama_wifi,
        d.password_wifi,
        d.nama_client,
        d.paket,
        d.harga,
        d.tanggal_daftar,
        d.infrastruktur,
        d.status_client,
      ]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    setCsvContent([header, ...rows].join("\n"));
    setCsvOpen(true);
  };

  const copyCsv = () => {
    navigator.clipboard
      .writeText(csvContent)
      .then(() => toast.success("Disalin ke clipboard"))
      .catch(() => toast.error("Gagal copy"));
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const lines = importText.trim().split("\n").filter((l) => l.trim());
      if (lines.length === 0) {
        toast.error("Tidak ada data");
        setImporting(false);
        return;
      }
      let start = 0;
      if (lines[0].toLowerCase().includes("pemilik")) start = 1;
      const items = [];
      for (let i = start; i < lines.length; i++) {
        const cols = csvParseLine(lines[i]);
        if (cols.length < 4) continue;
        items.push({
          pemilik: cols[0] || "",
          nama_wifi: cols[1] || "",
          password_wifi: cols[2] || "",
          nama_client: cols[3] || "",
          paket: cols[4] || "",
          harga: Number(cols[5]) || 0,
          tanggal_daftar: cols[6] || "",
          infrastruktur: cols[7] || "",
          status_client: cols[8] || "aktif",
        });
      }
      const r = await importPsb(items);
      toast.success(`${r.created} data diimport`);
      if (r.failed && r.failed.length > 0) {
        toast.error(`${r.failed.length} baris gagal`);
      }
      setImportOpen(false);
      setImportText("");
      load();
    } catch (e) {
      toast.error("Import gagal");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-display text-2xl font-bold text-[#1C1C1C]">
            Data Pelanggan (PSB)
          </h2>
          <p className="text-sm text-[#52525B] mt-1">
            {data.length} pelanggan terdaftar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="psb-add-button"
            onClick={openAdd}
            className="bg-[#166534] hover:bg-[#14532D] text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Tambah
          </Button>
          <Button
            data-testid="psb-export-button"
            variant="outline"
            onClick={exportCsv}
            className="border-gray-300"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
          <Button
            data-testid="psb-import-button"
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-gray-300"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button
            data-testid="psb-delete-all-button"
            variant="outline"
            onClick={() => setDelAllOpen(true)}
            className="border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Hapus Semua
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
        <Input
          data-testid="psb-search"
          placeholder="Cari pemilik, WiFi, client, paket..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white border-gray-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  "No",
                  "Pemilik",
                  "Nama WiFi",
                  "Password",
                  "Client",
                  "Paket",
                  "Harga",
                  "Tgl Daftar",
                  "Infra",
                  "Status",
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
                  <td colSpan={11} className="text-center py-12 text-[#52525B]">
                    Memuat…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-[#52525B]">
                    {search
                      ? "Tidak ada hasil yang cocok"
                      : "Belum ada pelanggan terdaftar"}
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => (
                  <tr
                    key={d.id}
                    data-testid={`psb-row-${d.id}`}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-[#52525B] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C]">
                      {d.pemilik || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#1C1C1C]">{d.nama_wifi}</td>
                    <td className="px-4 py-3 font-mono-display text-xs text-[#52525B]">
                      {d.password_wifi || "-"}
                    </td>
                    <td className="px-4 py-3 text-[#1C1C1C]">{d.nama_client}</td>
                    <td className="px-4 py-3 text-[#52525B]">{d.paket || "-"}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C] tabular-nums">
                      {fmtRp(d.harga)}
                    </td>
                    <td className="px-4 py-3 text-[#52525B] text-xs">
                      {formatTgl(d.tanggal_daftar)}
                    </td>
                    <td className="px-4 py-3 text-[#52525B] text-xs">
                      {d.infrastruktur || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge active={d.status_client === "aktif"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          data-testid={`psb-edit-${d.id}`}
                          onClick={() => openEdit(d)}
                          className="p-1.5 rounded hover:bg-[#166534]/8 text-[#166534]"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          data-testid={`psb-delete-${d.id}`}
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

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" data-testid="psb-modal">
          <DialogHeader>
            <DialogTitle className="text-display">
              {editing ? "Edit Pelanggan" : "Tambah Pelanggan"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi data pelanggan WiFi
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="md:col-span-2">
              <Label>Pemilik</Label>
              <Select
                value={form.pemilik}
                onValueChange={(v) => setForm({ ...form, pemilik: v })}
              >
                <SelectTrigger data-testid="psb-form-pemilik">
                  <SelectValue placeholder="Pilih pemilik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jamil">Jamil</SelectItem>
                  <SelectItem value="Idham">Idham</SelectItem>
                  <SelectItem value="Fachri">Fachri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nama WiFi (SSID)</Label>
              <Input
                data-testid="psb-form-nama-wifi"
                value={form.nama_wifi}
                onChange={(e) => setForm({ ...form, nama_wifi: e.target.value })}
              />
            </div>
            <div>
              <Label>Password WiFi</Label>
              <Input
                data-testid="psb-form-pw-wifi"
                value={form.password_wifi}
                onChange={(e) =>
                  setForm({ ...form, password_wifi: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Nama Client</Label>
              <Input
                data-testid="psb-form-client"
                value={form.nama_client}
                onChange={(e) =>
                  setForm({ ...form, nama_client: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Paket</Label>
              <Select
                value={form.paket}
                onValueChange={(v) => setForm({ ...form, paket: v })}
              >
                <SelectTrigger data-testid="psb-form-paket">
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 Mbps">3 Mbps</SelectItem>
                  <SelectItem value="7 Mbps">7 Mbps</SelectItem>
                  <SelectItem value="10 Mbps">10 Mbps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harga (Rp)</Label>
              <Input
                data-testid="psb-form-harga"
                type="number"
                value={form.harga}
                onChange={(e) => setForm({ ...form, harga: e.target.value })}
              />
            </div>
            <div>
              <Label>Tanggal Daftar</Label>
              <Input
                data-testid="psb-form-tgl"
                type="date"
                value={form.tanggal_daftar}
                onChange={(e) =>
                  setForm({ ...form, tanggal_daftar: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Infrastruktur</Label>
              <Select
                value={form.infrastruktur}
                onValueChange={(v) => setForm({ ...form, infrastruktur: v })}
              >
                <SelectTrigger data-testid="psb-form-infra">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KABEL LAN">KABEL LAN</SelectItem>
                  <SelectItem value="FO">FO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Status</Label>
              <Select
                value={form.status_client}
                onValueChange={(v) => setForm({ ...form, status_client: v })}
              >
                <SelectTrigger data-testid="psb-form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              data-testid="psb-save-button"
              onClick={save}
              disabled={saving}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              {saving ? "Menyimpan…" : editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#B45309]" /> Hapus data?
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-[#1C1C1C]">
                {confirmDel?.nama_client}
              </span>{" "}
              akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Batal
            </Button>
            <Button
              data-testid="psb-confirm-delete"
              onClick={doDelete}
              className="bg-[#B45309] hover:bg-[#92400E] text-white"
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete all */}
      <Dialog open={delAllOpen} onOpenChange={setDelAllOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#B45309]" /> Hapus SEMUA data PSB?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak bisa dibatalkan. Masukkan password untuk konfirmasi.
            </DialogDescription>
          </DialogHeader>
          <Input
            data-testid="psb-delete-all-password"
            type="password"
            placeholder="Password"
            value={delAllPw}
            onChange={(e) => setDelAllPw(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelAllOpen(false)}>
              Batal
            </Button>
            <Button
              data-testid="psb-confirm-delete-all"
              onClick={doDeleteAll}
              className="bg-[#B45309] hover:bg-[#92400E] text-white"
            >
              Hapus Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Data PSB (CSV)</DialogTitle>
            <DialogDescription>
              Format: Pemilik,Nama WiFi,Password,Client,Paket,Harga,Tgl Daftar,Infrastruktur,Status
            </DialogDescription>
          </DialogHeader>
          <Textarea
            data-testid="psb-import-textarea"
            placeholder="Paste CSV disini..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="h-48 font-mono-display text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Batal
            </Button>
            <Button
              data-testid="psb-do-import"
              onClick={doImport}
              disabled={importing}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              {importing ? "Mengimpor…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export CSV view */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Data PSB</DialogTitle>
            <DialogDescription>Salin teks CSV di bawah</DialogDescription>
          </DialogHeader>
          <Textarea
            value={csvContent}
            readOnly
            className="h-48 font-mono-display text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>
              Tutup
            </Button>
            <Button
              onClick={copyCsv}
              className="bg-[#166534] hover:bg-[#14532D] text-white"
            >
              Salin ke Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
