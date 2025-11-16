/**
 * Configuration for API endpoints
 * Uses environment variable in production, falls back to localhost in development
 */

// Vite exposes env vars that start with VITE_ as import.meta.env.VITE_*
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Export a helper function for making API requests
export const getApiUrl = (endpoint: string): string => {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};

