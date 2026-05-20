/// <reference types="vite/client" />

const API = import.meta.env.VITE_API_URL;

export const getToken = () => localStorage.getItem("token");

export const apiFetch = (path: string, options: RequestInit = {}) => {
  const token = getToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};
