import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AppLayout from "@/pages/AppLayout";
import Dashboard from "@/pages/Dashboard";
import PsbPage from "@/pages/PsbPage";
import PaymentPage from "@/pages/PaymentPage";
import StatsPage from "@/pages/StatsPage";
import MonitorPage from "@/pages/MonitorPage";

const RequireAuth = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppShell() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="psb" element={<PsbPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="monitor" element={<MonitorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="App h-full">
        <AppShell />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </AuthProvider>
  );
}

export default App;
