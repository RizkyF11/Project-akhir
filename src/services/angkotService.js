import axios from "axios";

// 1. Cek apakah variabel terbaca di console browser
console.log("DEBUG NGROK URL:", import.meta.env.VITE_API_NGROK);

// 2. Buat instance axios terlebih dahulu
const api = axios.create({
  // Gunakan URL dari Vercel, jika kosong gunakan URL ngrok manual (untuk tes)
  baseURL:
    import.meta.env.VITE_API_NGROK ||
    "https://gemmaceous-birectangular-sunshine.ngrok-free.dev/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    // WAJIB: Agar ngrok tidak memblokir request dari browser
    "ngrok-skip-browser-warning": "69420",
  },
});

// 3. Baru ekspor fungsi yang menggunakan instance 'api' di atas
export const getRekomendasiAngkot = async (
  startLat,
  startLng,
  endLat,
  endLng
) => {
  return api.get("/rekomendasi-angkot", {
    params: {
      start_lat: startLat,
      start_lng: startLng,
      end_lat: endLat,
      end_lng: endLng,
    },
  });
};

export default api;
