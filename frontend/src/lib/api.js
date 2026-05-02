import axios from "axios";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
// In production on mwana-lingala.com, frontend and backend share the same origin via Railway.
// Empty REACT_APP_BACKEND_URL means "same-origin" → API calls go to /api/... on the same domain.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});
