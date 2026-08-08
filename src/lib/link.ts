/** Return a display host like "sitepoint.com" (stripping www.) or "" on failure. */
export function displayHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return ""
  }
}
