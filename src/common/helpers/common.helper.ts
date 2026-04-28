export function preloadImage(src: string): Promise<void> {
  if (!src) {
    return Promise.reject(new Error('Image source is required'));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Image "${src}" failed to load`));
    img.src = src;
  });
}
