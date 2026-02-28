export const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

export async function apiFetch(endpoint, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...optionHeaders,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}
