const API = import.meta.env.VITE_API_URL ?? '';

// Prefix relative paths (e.g. /uploads/file.jpg) with the API base URL.
// Absolute URLs and blob: object URLs are returned unchanged.
export function imgUrl(path) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${API}${path}`;
}
