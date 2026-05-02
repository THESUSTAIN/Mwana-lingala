import axios from "axios";

// REMINDER: DO NOT HARDCODE URLs for secrets, but production backend URL is public info (visible in every XHR request).
// We fallback to the Railway URL when REACT_APP_BACKEND_URL is not injected at build time
// (e.g. when building on Hostinger which doesn't read .env.production from the gitignored file).
const PRODUCTION_FALLBACK = "https://hostinger-mwana-lingala.up.railway.app";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || PRODUCTION_FALLBACK;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});
