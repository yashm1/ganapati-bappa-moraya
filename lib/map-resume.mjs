export function installMapResumeHandler(map, page = window) {
  const refresh = () => {
    if (page.document.visibilityState !== "visible") return;
    map.resize();
    map.triggerRepaint();
  };

  page.addEventListener("pageshow", refresh);
  page.document.addEventListener("visibilitychange", refresh);

  return () => {
    page.removeEventListener("pageshow", refresh);
    page.document.removeEventListener("visibilitychange", refresh);
  };
}
