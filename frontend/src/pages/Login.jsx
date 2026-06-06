import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wifi, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { loginApi } from "@/lib/api";

const OPERATORS = [
  {
    key: "jamil",
    name: "Jamil",
    img: "https://images.unsplash.com/photo-1543132220-3ec99c6094dc?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
  },
  {
    key: "idham",
    name: "Idham",
    img: "https://images.unsplash.com/photo-1596502059330-be10388e3ba0?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
  },
  {
    key: "fachri",
    name: "Fachri",
    img: "https://images.unsplash.com/photo-1618593706014-06782cd3bb3b?crop=entropy&cs=srgb&fm=jpg&w=200&q=80",
  },
];

export default function Login() {
  const [selected, setSelected] = useState(null);
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async () => {
    if (!selected) {
      toast.error("Pilih operator dulu");
      return;
    }
    if (!pw) {
      toast.error("Masukkan PIN");
      return;
    }
    setLoading(true);
    try {
      await loginApi(selected, pw);
      login(selected);
      toast.success(`Selamat datang, ${selected.charAt(0).toUpperCase() + selected.slice(1)}`);
      nav("/");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Login gagal");
      setPw("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-screen w-full flex flex-col lg:flex-row" data-testid="login-screen">
      {/* LEFT - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F8F9FA]">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ background: "#166534" }}
            >
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-display font-bold text-[#1C1C1C] text-base leading-none">RT/RW Net</div>
              <div className="text-xs text-[#52525B] mt-1">Manager Terpadu</div>
            </div>
          </div>

          <h1 className="text-display text-3xl font-bold tracking-tight text-[#1C1C1C]">
            Selamat datang kembali.
          </h1>
          <p className="text-sm text-[#52525B] mt-2 mb-8">
            Pilih operator dan masukkan PIN untuk mulai bekerja.
          </p>

          <label className="text-xs font-semibold tracking-wider text-[#52525B] uppercase">
            Operator
          </label>
          <div className="grid grid-cols-3 gap-3 mt-3 mb-6">
            {OPERATORS.map((op) => (
              <button
                key={op.key}
                data-testid={`operator-select-${op.key}`}
                onClick={() => setSelected(op.key)}
                className={`group relative rounded-md border p-3 transition-all text-left ${
                  selected === op.key
                    ? "border-[#166534] bg-white ring-2 ring-[#166534]/15"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full mb-2 bg-cover bg-center border border-gray-200"
                  style={{ backgroundImage: `url(${op.img})` }}
                />
                <div className="text-sm font-semibold text-[#1C1C1C]">{op.name}</div>
                <div className="text-[10px] text-[#52525B] uppercase tracking-wider mt-0.5">
                  Operator
                </div>
                {selected === op.key && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: "#166534" }}
                  />
                )}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold tracking-wider text-[#52525B] uppercase">
            PIN Akses
          </label>
          <div className="relative mt-3">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
            <Input
              data-testid="login-pin-input"
              type="password"
              placeholder="••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="pl-10 h-11 bg-white border-gray-200 focus-visible:ring-[#166534]"
            />
          </div>

          <Button
            data-testid="login-submit-button"
            onClick={submit}
            disabled={loading}
            className="w-full mt-6 h-11 bg-[#166534] hover:bg-[#14532D] text-white font-semibold"
          >
            {loading ? "Memverifikasi..." : "Masuk"} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <p className="text-[11px] text-[#52525B] mt-8 leading-relaxed">
            Sistem manajemen pelanggan & penagihan untuk usaha internet
            lingkungan. Data tersimpan aman di server.
          </p>
        </div>
      </div>

      {/* RIGHT - hero */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1688141585146-1fb4a1358c87?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85)",
          }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(22,101,52,0.75), rgba(20,83,45,0.55))" }} />
        <div className="relative z-10 p-12 max-w-xl text-white">
          <div className="text-xs font-mono-display tracking-[0.3em] uppercase opacity-80 mb-4">
            MasterF4 — versi 2026
          </div>
          <h2 className="text-display text-5xl font-bold leading-[1.05] mb-6">
            Kelola jaringan WiFi lingkungan dengan tenang.
          </h2>
          <p className="text-base opacity-90 leading-relaxed">
            Satu dashboard untuk pelanggan, penagihan bulanan, statistik, dan
            monitoring tunggakan. Dirancang untuk operator kecil yang ingin
            tetap rapi.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              ["Pelanggan", "Terdata"],
              ["Bayar", "Termonitor"],
              ["Tunggakan", "Terlacak"],
            ].map(([a, b]) => (
              <div key={a}>
                <div className="text-2xl font-display font-bold">{a}</div>
                <div className="text-xs uppercase tracking-wider opacity-75 mt-1">
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
