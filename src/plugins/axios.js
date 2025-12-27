import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_NGROK,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "any-value"
  },
});

// Optional interceptor error
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
