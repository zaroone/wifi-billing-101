import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

// === Auth ===
export const loginApi = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

// === PSB ===
export const listPsb = () => api.get("/psb").then((r) => r.data);
export const createPsb = (data) => api.post("/psb", data).then((r) => r.data);
export const updatePsb = (id, data) =>
  api.put(`/psb/${id}`, data).then((r) => r.data);
export const deletePsb = (id) => api.delete(`/psb/${id}`).then((r) => r.data);
export const deleteAllPsb = (password) =>
  api.post("/psb/delete-all", { password }).then((r) => r.data);
export const importPsb = (items) =>
  api.post("/psb/import", { items }).then((r) => r.data);

// === Payments ===
export const listPayments = (periode) =>
  api.get("/payments", { params: periode ? { periode } : {} }).then((r) => r.data);
export const listPeriods = () => api.get("/payments/periods").then((r) => r.data);
export const createPayment = (data) =>
  api.post("/payments", data).then((r) => r.data);
export const updatePayment = (id, data) =>
  api.put(`/payments/${id}`, data).then((r) => r.data);
export const markLunas = (id, user_input) =>
  api.post(`/payments/${id}/mark-lunas`, { user_input }).then((r) => r.data);
export const deletePayment = (id) =>
  api.delete(`/payments/${id}`).then((r) => r.data);
export const generatePayments = (periode, password) =>
  api.post("/payments/generate", { periode, password }).then((r) => r.data);
export const importPayments = (items) =>
  api.post("/payments/import", { items }).then((r) => r.data);
export const deleteAllPayments = (password) =>
  api.post("/payments/delete-all", { password }).then((r) => r.data);

// === Stats ===
export const getStats = (periode) =>
  api.get("/stats", { params: { periode } }).then((r) => r.data);

// === Monitoring ===
export const getBelumBayar = (periode) =>
  api.get("/monitoring/belum-bayar", { params: { periode } }).then((r) => r.data);
