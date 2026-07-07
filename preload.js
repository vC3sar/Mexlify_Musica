const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Buscar canciones en YouTube
  searchSong: async (query) => {
    return await ipcRenderer.invoke("searchSong", query);
  },

  // Descargar canción a carpeta local
  downloadSong: async (song) => {
    return await ipcRenderer.invoke("downloadSong", song);
  },

  // Obtener lista de canciones descargadas
  getDownloaded: async () => {
    return await ipcRenderer.invoke("getDownloaded");
  },

  // Reproducir canción (si ya está descargada, usa local; si no, stream)
  streamSong: async (song) => {
    return await ipcRenderer.invoke("streamSong", song);
  },

  // Precalienta canciones en segundo plano sin bloquear la UI.
  prewarmSongs: async (songs, limit = 3) => {
    return await ipcRenderer.invoke("prewarmSongs", songs, limit);
  },

  getYtdlpDiagnostics: async () => {
    return await ipcRenderer.invoke("ytdlp-diagnostics");
  },

  updateYtdlpNightly: async () => {
    return await ipcRenderer.invoke("ytdlp-update-nightly");
  },

  // Activar/desactivar modo debug
  setDebug: async (value) => {
    return await ipcRenderer.invoke("set-debug", value);
  },

  // Enviar mensajes de debug al main
  log: async (msg) => {
    return await ipcRenderer.invoke("debug-log", msg);
  },

  // Obtener ruta de la app (útil para reproducir archivos locales)
  getAppPath: async () => {
    return await ipcRenderer.invoke("get-app-path");
  },

  // DISCORD STATUS
  setDiscordActivity: async (details, state, image, resetTime) => {
    return await ipcRenderer.invoke(
      "discord-set-activity",
      details,
      state,
      image,
      resetTime
    );
  },

  deleteDownload: async (filename) => {
    return await ipcRenderer.invoke("deleteDownload", filename);
  },

  exportDownloadsToZip: async () => {
    return await ipcRenderer.invoke("exportDownloadsToZip");
  },

  openExternal: async (url) => {
    return await ipcRenderer.invoke("open-external", url);
  },

  // SQLite Database API
  incrementPlayCount: async (song) => {
    return await ipcRenderer.invoke("incrementPlayCount", song);
  },

  getMostPlayedSongs: async () => {
    return await ipcRenderer.invoke("getMostPlayedSongs");
  },

  // Recibir mensajes de actualización de yt-dlp
  onYtdlpUpdate: (callback) => {
    ipcRenderer.on("ytdlp-update-status", (_event, value) => callback(value));
  },
});
