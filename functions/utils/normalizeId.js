export function normalizeId(str, prefix = "") {
  if (!str) return null;
  let id = String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")          // replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "");   // remove non-alphanumeric except hyphen

  // Avoid duplicate prefixing
  if (prefix && !id.startsWith(prefix + "_")) {
    id = `${prefix}_${id}`;
  }

  return id;
}
