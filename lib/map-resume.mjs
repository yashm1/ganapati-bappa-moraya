export function installMapResumeHandler(onResume, page = globalThis) {
  const refresh = () => {
    if (page.document.visibilityState !== "visible") return;
    onResume();
  };

  page.addEventListener("pageshow", refresh);
  page.document.addEventListener("visibilitychange", refresh);

  return () => {
    page.removeEventListener("pageshow", refresh);
    page.document.removeEventListener("visibilitychange", refresh);
  };
}
