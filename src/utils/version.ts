// Version utility
export const getAppVersion = (): string => {
  // In development, we can't access package.json directly from the renderer
  // So we'll use a fallback and let the main process provide the version
  return '1.0.2'; // This will be overridden by the main process
}; 