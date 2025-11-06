const DiscordRPC = require("discord-rpc");
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// Solo estos cambios mínimos para mejorar sin romper nada
const isDev = !app.isPackaged; // ✅ Auto-detecta entorno (en lugar de hardcodear)
let debug = true; // ✅ Mantener como variable para poder cambiar

function logDebug(...args) {
  if (debug) console.log("[DEBUG]", ...args);
}

/////////////////////
// DISCORD PRESENCE
/////////////////////

const CLIENT_ID = "1417279389858529392"; // ← Cambiar por tu Discord Application ID
let rpc = null;

// ================ FUNCIONES ESENCIALES ================
async function initDiscord() {
  try {
    rpc = new DiscordRPC.Client({ transport: "ipc" });
    await rpc.login({ clientId: CLIENT_ID });
    console.log("✅ Discord RPC conectado.");
    return true;
  } catch (error) {
    console.log("❌ Discord no disponible:", error.message);
    rpc = null;
    return false;
  }
}

let rpcStartTimestamp = null; // timestamp global de inicio

async function updateActivity(details, state, image, resetTime = false) {
  if (!rpc) return;
  let imgurl = image;
  console.log("Imagen recibida:", image); // <-- Nuevo log
  if (typeof imgurl == "undefined" || imgurl === null || imgurl === "") {
    imgurl = "logo_app_mexlify_center";
  }
  try {
    console.log("Usando imagen:", imgurl); // <-- Nuevo log

    if (resetTime || !rpcStartTimestamp) {
      rpcStartTimestamp = Math.floor(Date.now() / 1000); // inicializamos
    }
    // agregar presencia con denotacion en debug
    details = debug ? `[MODO DESARROLLO] - ${details}` : details;
    await rpc.setActivity({
      details: details,
      state: state,
      startTimestamp: rpcStartTimestamp, // usamos la misma referencia
      largeImageKey: imgurl,
      largeImageText: "Mexlify Music",
      type: 2, // <--- "Listening to"
      buttons: [{ label: "Ver proyecto", url: "https://mexlify.top" }],
    });

    console.log("✅ Rich Presence actualizado:", details, state);
  } catch (error) {
    console.log("❌ Error actualizando Discord:", error.message);
  }
}

// ================ IPC HANDLERS ================
ipcMain.handle(
  "discord-set-activity",
  async (event, details, state, image, resetTime) => {
    await updateActivity(details, state, image, resetTime);
    return true;
  }
);

// ------------------- Paths de binarios (TU CÓDIGO ORIGINAL) -------------------
function getYtdlpPath() {
  if (!isDev) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "yt-dlp-exec",
      "bin",
      "yt-dlp.exe"
    );
  } else {
    return path.join(
      __dirname,
      "node_modules",
      "yt-dlp-exec",
      "bin",
      "yt-dlp.exe"
    );
  }
}

function getFfmpegPath() {
  if (!isDev) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg.exe"
    );
  } else {
    return path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg.exe");
  }
}

console.dir(isDev);

function checkYtdlpUpdate(win) {
  return new Promise((resolve) => {
    if (!win) {
      logDebug(
        "La ventana no está lista para mostrar mensajes de actualización."
      );
      return resolve();
    }

    logDebug("Buscando actualizaciones de yt-dlp...");
    win.webContents.send("ytdlp-update-status", {
      message: "Buscando actualizaciones de yt-dlp...",
      type: "info",
    });

    const ytdlpPath = getYtdlpPath();
    const proc = spawn(ytdlpPath, ["-U"]);

    let output = "";

    proc.stdout.on("data", (data) => {
      const message = data.toString();
      output += message;
      logDebug(`yt-dlp update: ${message}`);
      win.webContents.send("ytdlp-update-status", { message, type: "info" });
    });

    proc.stderr.on("data", (data) => {
      const message = data.toString();
      logDebug(`yt-dlp update error: ${message}`);
      win.webContents.send("ytdlp-update-status", { message, type: "error" });
    });

    proc.on("close", (code) => {
      logDebug(`yt-dlp update process exited with code ${code}`);
      resolve();
    });
  });
}

// ------------------- Crear ventana (TU CÓDIGO ORIGINAL) -------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, "logo.png"), // aquí sí acepta PNG en Windows
  });
  win.icon = path.join(__dirname, "logo.png");
  win.webContents.setFrameRate(60);
  win.loadFile("index.html");
  if (debug) win.webContents.openDevTools();
  return win;
}
// ================ INICIALIZACIÓN ================
app.setName("Mexlify");
app.setAboutPanelOptions({
  applicationName: "Mexlify",
  applicationVersion: "1.0.0",
  copyright: "© 2025 VAEN Systems",
});

app.whenReady().then(() => {
  const win = createWindow();
  checkYtdlpUpdate(win);
  setTimeout(async () => {
    await initDiscord();
    await updateActivity("En hub", "Esperando canción...");
  }, 2000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ------------------- Cache (TU CÓDIGO ORIGINAL) -------------------
const itunesCache = new Map();
const ytdlpCache = new Map();
const streamCache = new Map();

// ------------------- Utilidades (TU CÓDIGO ORIGINAL EXACTO) -------------------
function normalize(query) {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ------------------- Función helper para ejecutar yt-dlp (TU CÓDIGO ORIGINAL) -------------------
function execYtdlp(args = []) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtdlpPath();
    const proc = spawn(ytdlpPath, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          reject(new Error("Error parsing JSON: " + err.message));
        }
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
  });
}

function execYtdlpDownload(args = []) {
  return new Promise((resolve, reject) => {
    const ytdlpPath = getYtdlpPath();
    const proc = spawn(ytdlpPath, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";

    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      if (code === 0) {
        // Éxito, simplemente resolvemos sin JSON
        resolve(true);
      } else {
        // Si falla por el formato volver a intentarlo de otra manera
        const newArgs = args.map((arg) =>
          arg === "-f" ? "-f bestaudio" : arg
        );
        if (newArgs.toString() !== args.toString()) {
          console.log("Reintentando descarga con otros parámetros...");
          execYtdlpDownload(newArgs).then(resolve).catch(reject);
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      }
    });
  });
}

async function validateURL(url) {
  try {
    await execYtdlp([url, "--dump-single-json", "--quiet", "--no-warnings"]);
    return true;
  } catch (err) {
    console.error("URL inválida:", err.message);
    return false;
  }
}

async function getCorrectSongName(query) {
  // Consultar iTunes
  try {
    const resp = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&entity=musicTrack&limit=5`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    if (!resp.ok)
      return res.status(resp.status).json({
        corrected: query,
        cover: null,
        genre: null,
        source: "fallback",
      });

    const data = await resp.json();

    if (data.results?.length > 0) {
      // lista todos y los devuelve en un array siguiendo el proceso de if results
      const tracks = data.results.map((track) => ({
        corrected: `${track.trackName} ${track.artistName}`,
        cover: track.artworkUrl100?.replace("100x100bb.jpg", "500x500bb.jpg"),
        genre: track.primaryGenreName || null,
      }));
      // Devuelve lo que la API ya haya procesado y cacheado
      return tracks;
    } else {
      return { corrected: query, cover: null };
    }
  } catch (err) {
    console.error("Error consultando API Redis:", err);
  }

  // fallback
  return { corrected: query, cover: null };
}
// ------------------- IPC Handlers (TU CÓDIGO ORIGINAL EXACTO) -------------------
ipcMain.handle("searchSong", async (event, query) => {
  logDebug("Buscando:", query);
  const limit = query.includes(" - ") ? 1 : 3;
  query = normalize(query);

  try {
    // 1️⃣ Obtener nombre corregido, cover y género desde iTunes de todos los del array
    /*const tracks = await getCorrectSongName(query);
    const {
      corrected,
      cover: itunesCover,
      genre,
    } = tracks[0] || { corrected: query, cover: null, genre: null };
    console.log("Nombre corregido:", corrected, itunesCover, genre);
    console.log("Tambien se obtuvieron:", tracks);*/
    const corrected = query; // Desactivar corrección por ahora
    const itunesCover = null;
    const genre = null;
    
    // Función para validar los datos de una canción
    function isValidSong(item) {
      return (
        item &&
        typeof item.title === "string" &&
        item.title.length > 0 &&
        typeof item.url === "string" &&
        item.url.startsWith("https://www.youtube.com/") &&
        typeof item.duration === "number" &&
        item.duration >= 50 &&
        typeof item.uploader === "string" &&
        item.uploader.length > 0 &&
        typeof item.thumbnail === "string" &&
        item.thumbnail.startsWith("https://")
      );
    }

    // 3️⃣ Ejecutar yt-dlp
    const searchResults = await execYtdlp([
      `ytsearch${limit}:music ${corrected} official video`,
      "--dump-single-json",
      "--flat-playlist",
      "--skip-download",
      "--quiet",
      "--no-warnings",
      "--no-check-certificate",
    ]);

    const entries = searchResults.entries || [];
    const detailedResults = await Promise.all(
      entries.map(async (entry) => {
        try {
          const info = await execYtdlp([
            entry.url,
            "--dump-single-json",
            "--skip-download",
            "--quiet",
          ]);
          //console.log(info);
          const thumbnail =
            itunesCover ||
            info.thumbnail?.replace(/hqdefault\.jpg$/, "maxresdefault.jpg") ||
            null;
          return {
            title: info.title,
            url: info.webpage_url,
            duration: info.duration,
            uploader: info.uploader || info.channel,
            thumbnail,
            genre, // <--- Agrega el género aquí
          };
        } catch {
          return {
            title: entry.title,
            url: entry.url,
            duration: null,
            uploader: null,
            thumbnail: itunesCover || null,
            genre, // <--- También aquí
          };
        }
      })
    );
    // Filtrar canciones de menos de 60 segundos
    const filteredResults = detailedResults.filter(
      (song) => !song.duration || song.duration >= 50
    );

    return filteredResults;
  } catch (err) {
    logDebug("Error searchSong:", err);
    return [];
  }
});

// ------------------- Descargas (TU CÓDIGO ORIGINAL EXACTO) -------------------
// Carpeta de descargas "segura" fuera de ASAR
const downloadsDir = path.join(app.getPath("userData"), "downloads");

// Asegurarse de que exista la carpeta y el archivo de metadata
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Carpeta para metadata independiente
const metadataDir = path.join(downloadsDir, "metadata");
if (!fs.existsSync(metadataDir)) fs.mkdirSync(metadataDir, { recursive: true });

ipcMain.handle("downloadSong", async (event, song) => {
  try {
    // Validar datos
    if (!song?.url || !song?.title) {
      throw new Error("Datos de la canción inválidos");
    }

    // Nombre seguro del archivo
    const safeTitle = song.title.replace(/[<>:"/\\|?*]+/g, "_");
    const outputPath = path.join(downloadsDir, `${safeTitle}.mp3`);
    const metadataFile = path.join(metadataDir, `${safeTitle}.txt`);

    // Si ya existe, retornar
    if (fs.existsSync(outputPath)) {
      return { success: true, path: outputPath, alreadyExists: true };
    }

    // Validar URL
    const isValid = await validateURL(song.url);
    if (!isValid) throw new Error("URL inválida o inaccesible");
    console.log(song);
    // Ejecutar yt-dlp para descargar audio
    await execYtdlpDownload([
      song.url,
      "-o",
      outputPath,
      "-f",
      "bestaudio",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--quiet",
      "--no-warnings",
      "--ffmpeg-location",
      getFfmpegPath(),
    ]);

    // Verificar descarga
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw new Error("Descarga incompleta: archivo vacío");
    }

    // Guardar metadata de manera segura
    const metadata = [
      `Title: ${song.title}`,
      `Uploader: ${song.uploader || "N/A"}`,
      `Duration: ${song.duration || "N/A"}`,
      `Filename: ${safeTitle}.mp3`,
      `Thumbnail: ${song.thumbnail || "N/A"}`,
      `DownloadedAt: ${new Date().toISOString()}`,
    ].join("\n");

    fs.writeFileSync(metadataFile, metadata, "utf-8");

    return { success: true, path: outputPath };
  } catch (err) {
    console.error("downloadSong error:", err);
    return { success: false, error: err.message };
  }
});
ipcMain.handle("deleteDownload", async (event, filename) => {
  try {
    if (!filename || typeof filename !== "string") {
      throw new Error("Nombre de archivo inválido");
    }
    const safeFilename = filename.replace(/[<>:"/\\|?*]+/g, "_");
    const filePath = path.join(downloadsDir, safeFilename);
    const metadataFile = path.join(
      metadataDir,
      safeFilename.replace(/\.mp3$/, ".txt")
    );

    // Eliminar archivos
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(metadataFile)) fs.unlinkSync(metadataFile);

    return { success: true };
  } catch (err) {
    console.error("deleteSong error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("getDownloaded", async () => {
  try {
    const metadataDir = path.join(downloadsDir, "metadata");
    if (!fs.existsSync(metadataDir)) return [];

    const files = fs.readdirSync(metadataDir).filter((f) => f.endsWith(".txt"));
    const downloaded = files.map((file) => {
      const content = fs.readFileSync(path.join(metadataDir, file), "utf-8");
      const obj = {};
      content.split("\n").forEach((line) => {
        const [key, ...rest] = line.split(":");
        obj[key.trim()] = rest.join(":").trim();
      });
      return obj;
    });
    console.log(downloaded);
    return downloaded;
  } catch (err) {
    console.error("getDownloaded error:", err);
    return [];
  }
});

ipcMain.handle("streamSong", async (event, song) => {
  if (!song?.url && !song?.filename) throw new Error("Objeto inválido");
  console.log("streamSong recibido:", song);
  if (song.filename) {
    const filePath = path.join(downloadsDir, song.filename);
    if (!fs.existsSync(filePath)) throw new Error("Archivo no encontrado");
    return `file://${filePath}`;
  }

  if (streamCache.has(song.url)) return streamCache.get(song.url);

  const info = await execYtdlp([
    song.url,
    "--dump-single-json",
    "--skip-download",
    "--quiet",
  ]);
  if (!info.formats) throw new Error("No hay formatos de audio");

  let audioFormat =
    info.formats.find((f) => f.itag === 140) ||
    info.formats.find((f) => f.ext === "m4a") ||
    info.formats
      .filter((f) => f.acodec !== "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  if (!audioFormat?.url) throw new Error("No se encontró audio válido");

  streamCache.set(song.url, audioFormat.url);
  return audioFormat.url;
});

ipcMain.on("set-debug", (event, value) => {
  debug = value;
  logDebug("Debug cambiado a", debug);
});

ipcMain.handle("get-app-path", async (event, filename) => {
  if (filename) {
    return path.join(downloadsDir, filename); // C:\...\downloads\song.mp3
  }
  return downloadsDir; // solo la carpeta
});
