export const appConfig = {
  port: Number(process.env.PORT || 8788),
  googleSheet: {
    spreadsheetId: process.env.GOOGLE_SHEET_ID || "18pj1jUxXubZXA0zbbpeQQrpCulRTTX3i",
    gid: process.env.GOOGLE_SHEET_GID || "1437857818",
    worksheetName: process.env.GOOGLE_SHEET_WORKSHEET || "Úkolovník",
  },
  cacheMs: Number(process.env.SOURCE_CACHE_MS || 60_000),
};
