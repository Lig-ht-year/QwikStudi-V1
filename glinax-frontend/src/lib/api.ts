import axios from "axios";
import { useDataStore } from "@/stores/dataStore";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Add Authorization header if access token exists
api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  const access = localStorage.getItem("access");
  if (access) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// 🔁 Handle expired token and refresh flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and refresh token available
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh")
    ) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/token/refresh/`, {
          refresh: localStorage.getItem("refresh"),
        });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        // Retry original request with new access
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed → force logout
        useDataStore.getState().logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
