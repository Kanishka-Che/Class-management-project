
import axios from "axios";

const api = axios.create({
  baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================================
// Request Interceptor
// Attach JWT Token
// =========================================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =========================================
// Response Interceptor
// Handle 401 Unauthorized
// =========================================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401
    ) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
