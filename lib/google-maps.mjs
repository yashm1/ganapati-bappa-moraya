let googleMapsPromise;

export function loadGoogleMaps(apiKey, page = globalThis) {
  if (page.google?.maps) return Promise.resolve(page.google.maps);
  if (!apiKey) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"));
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__bappaGoogleMapsReady${Date.now()}`;
    const script = page.document.createElement("script");
    const cleanup = () => {
      delete page[callbackName];
      script.remove();
    };

    page[callbackName] = () => {
      cleanup();
      resolve(page.google.maps);
    };
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("Google Maps failed to load"));
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
    page.document.head.appendChild(script);
  }).catch((error) => {
    googleMapsPromise = undefined;
    throw error;
  });

  return googleMapsPromise;
}
