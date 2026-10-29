import axios from "axios";


const getBaseUrl = () => {
  if (typeof window !== "undefined") {
   
    const hostname = window.location.hostname;
    return `http://${hostname}:5072`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5072";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseUrl();

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