import api from "../plugins/axios";

export const getRekomendasiAngkot = async (startLat, startLng, endLat, endLng) => {
  return api.get("/rekomendasi-angkot", {
    params: {
      start_lat: startLat,
      start_lng: startLng,
      end_lat: endLat,
      end_lng: endLng,
    },
  });
};
