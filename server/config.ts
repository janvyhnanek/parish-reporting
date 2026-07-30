export const appConfig = {
  port: Number(process.env.PORT || 8788),
  googleSheet: {
    spreadsheetId: process.env.GOOGLE_SHEET_ID || "1jw2PY8-s580z5PyeleIt4XdKLhAqKspS",
    gid: process.env.GOOGLE_SHEET_GID || "25",
    worksheetName: process.env.GOOGLE_SHEET_WORKSHEET || "Úkolovník",
  },
  cacheMs: Number(process.env.SOURCE_CACHE_MS || 60_000),
};
