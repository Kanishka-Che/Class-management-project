import axios from "axios";

// =========================================
// Dynamic Base URL Generator
// Phone එකෙන් ආවත් Laptop එකෙන් ආවත් IP එක auto අල්ලගනී
// =========================================
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Phone එකෙන් IP එකෙන් එද්දී (eg: 192.168.8.100), hostname එක '192.168.8.100' ලෙස ලැබෙයි
    const hostname = window.location.hostname;
    return `http://${hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request යැවීමට පෙර නිවැරදි BaseURL එක සෙට් කිරීම
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