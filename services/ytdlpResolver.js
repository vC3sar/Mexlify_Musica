const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_TTL_MS = 40 * 60 * 1000;
const DEFAULT_SEARCH_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CONCURRENCY = 2;

class ProcessQueue {
  constructor(concurrency = DEFAULT_CONCURRENCY, logger = console.log) {
    this.concurrency = Math.max(1, concurrency);
    this.logger = logger;
    this.active = 0;
    this.jobs = [];
  }

  add(job) {
    return new Promise((resolve, reject) => {
      this.jobs.push({ job, resolve, reject });
      this.logger(`[resolver] queue size: ${this.jobs.length}`);
      this.next();
    });
  }

  next() {
    while (this.active < this.concurrency && this.jobs.length > 0) {
      const item = this.jobs.shift();
      this.active += 1;
      this.logger(`[resolver] active processes: ${this.active}`);

      Promise.resolve()
        .then(item.job)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.active -= 1;
          this.next();
        });
    }
  }

  stats() {
    return {
      active: this.active,
      queued: this.jobs.length,
      concurrency: this.concurrency,
    };
  }
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

function normalizeQuery(query) {
  return String(query || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function extractVideoId(sourceUrl) {
  if (!sourceUrl) return null;

  try {
    const url = new URL(sourceUrl);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (url.searchParams.get("v")) return url.searchParams.get("v");

    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((p) =>
      ["shorts", "embed", "live"].includes(p)
    );
    if (marker !== -1 && parts[marker + 1]) return parts[marker + 1];
  } catch {}

  return null;
}

function makeTrackKey(track) {
  return (
    track?.videoId ||
    extractVideoId(track?.sourceUrl || track?.url) ||
    track?.sourceUrl ||
    track?.url ||
    null
  );
}

function toPublicTrack(entry) {
  return {
    videoId: entry.videoId,
    title: entry.title,
    uploader: entry.artist,
    artist: entry.artist,
    duration: entry.duration,
    thumbnail: entry.thumbnail,
    url: entry.sourceUrl,
    sourceUrl: entry.sourceUrl,
    streamUrl: entry.streamUrl,
    resolvedAt: entry.resolvedAt,
    expiresAt: entry.expiresAt,
  };
}

function isUsableStream(entry, now = Date.now()) {
  return Boolean(entry?.streamUrl && entry?.resolvedAt && entry?.expiresAt > now);
}

function classifyYtdlpError(error) {
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();

  if (error?.code === "ENOENT") {
    return "yt-dlp no esta instalado o no se encontro el ejecutable.";
  }
  if (lower.includes("unsupported url") || lower.includes("invalid url")) {
    return "URL invalida para yt-dlp.";
  }
  if (lower.includes("private video") || lower.includes("unavailable")) {
    return "El video no esta disponible.";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "yt-dlp tardo demasiado y se cancelo el proceso.";
  }
  if (lower.includes("requested format is not available")) {
    return "No hay un formato de audio reproducible para esta cancion.";
  }

  return message || "Fallo desconocido al resolver audio.";
}

function createYtdlpResolver(options) {
  const {
    getYtdlpPath,
    cacheFile,
    cookiesFile,
    logger = console.log,
    concurrency = DEFAULT_CONCURRENCY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    streamTtlMs = DEFAULT_TTL_MS,
    searchTtlMs = DEFAULT_SEARCH_TTL_MS,
  } = options;

  const state = readJson(cacheFile) || { version: 1, tracks: {}, searches: {} };
  state.tracks ||= {};
  state.searches ||= {};

  const pendingResolves = new Map();
  const queue = new ProcessQueue(concurrency, logger);

  function persist() {
    const now = Date.now();
    // Evict expired stream entries (tracks whose streamUrl has expired)
    for (const key of Object.keys(state.tracks)) {
      const entry = state.tracks[key];
      if (entry.expiresAt && entry.expiresAt <= now) {
        delete state.tracks[key];
      }
    }
    // Evict expired search cache entries
    for (const key of Object.keys(state.searches)) {
      if (state.searches[key].expiresAt <= now) {
        delete state.searches[key];
      }
    }
    writeJsonAtomic(cacheFile, state);
  }

  function rememberTrack(track, extra = {}) {
    const sourceUrl = track?.sourceUrl || track?.url;
    const key = makeTrackKey({ ...track, sourceUrl });
    if (!key || !sourceUrl) return null;

    const current = state.tracks[key] || {};
    const entry = {
      ...current,
      videoId: track.videoId || current.videoId || extractVideoId(sourceUrl),
      title: track.title || current.title || "",
      artist: track.artist || track.uploader || current.artist || "",
      duration: Number(track.duration || current.duration || 0),
      thumbnail: track.thumbnail || current.thumbnail || "",
      sourceUrl,
      ...extra,
    };

    state.tracks[key] = entry;
    return entry;
  }

  function rememberSearchResults(query, results) {
    const normalized = normalizeQuery(query);
    const now = Date.now();

    const normalizedResults = results
      .map((track) => {
        const entry = rememberTrack(track);
        return entry ? toPublicTrack(entry) : null;
      })
      .filter(Boolean);

    state.searches[normalized] = {
      query,
      cachedAt: now,
      expiresAt: now + searchTtlMs,
      results: normalizedResults,
    };

    persist();
    logger(`[resolver] search cache saved: ${normalizedResults.length} results`);
    return normalizedResults;
  }

  function getCachedSearchResults(query) {
    const normalized = normalizeQuery(query);
    const entry = state.searches[normalized];
    if (!entry || entry.expiresAt <= Date.now()) return null;

    logger(`[resolver] search cache hit: ${normalized}`);
    return entry.results.map((track) => {
      const key = makeTrackKey(track);
      const cached = key ? state.tracks[key] : null;
      return cached ? toPublicTrack(cached) : track;
    });
  }

  function getCachedStream(track) {
    const key = makeTrackKey(track);
    const entry = key ? state.tracks[key] : null;
    if (!entry?.streamUrl) return null;

    if (isUsableStream(entry)) {
      logger(`[resolver] cache hit: ${key}`);
      return entry.streamUrl;
    }

    logger(`[resolver] stream expired, refreshing: ${key}`);
    return null;
  }

  function runYtdlpGetUrl(sourceUrl) {
    return new Promise((resolve, reject) => {
      const args = [
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "--skip-download",
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "--get-url",
      ];

      if (cookiesFile && fs.existsSync(cookiesFile)) {
        args.push("--cookies", cookiesFile);
      }

      args.push(sourceUrl);

      const startedAt = Date.now();
      const proc = spawn(getYtdlpPath(), args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        settled = true;
        proc.kill();
        reject(new Error(`yt-dlp timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });

      proc.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
          return;
        }

        const streamUrl = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find(Boolean);

        if (!streamUrl) {
          reject(new Error("No se obtuvo URL de audio desde yt-dlp."));
          return;
        }

        logger(`[resolver] yt-dlp resolved in ${Date.now() - startedAt}ms`);
        resolve(streamUrl);
      });
    });
  }

  async function resolveTrack(track, options = {}) {
    if (!track?.url && !track?.sourceUrl) {
      throw new Error("La cancion no tiene URL de origen.");
    }

    const sourceUrl = track.sourceUrl || track.url;
    const key = makeTrackKey({ ...track, sourceUrl });

    if (!options.force) {
      const cached = getCachedStream({ ...track, sourceUrl });
      if (cached) return cached;
    }

    if (pendingResolves.has(key)) {
      logger(`[resolver] reuse pending resolve: ${key}`);
      return pendingResolves.get(key);
    }

    const job = queue
      .add(async () => {
        const streamUrl = await runYtdlpGetUrl(sourceUrl);
        const now = Date.now();
        rememberTrack({ ...track, sourceUrl }, {
          streamUrl,
          resolvedAt: now,
          expiresAt: now + streamTtlMs,
          format: "bestaudio[ext=m4a]/bestaudio",
        });
        persist();
        return streamUrl;
      })
      .catch((error) => {
        const friendly = classifyYtdlpError(error);
        logger(`[resolver] error: ${friendly}`);
        throw new Error(friendly);
      })
      .finally(() => pendingResolves.delete(key));

    pendingResolves.set(key, job);
    return job;
  }

  function prewarmTracks(tracks, limit = 3) {
    const startedAt = Date.now();
    const candidates = (Array.isArray(tracks) ? tracks : [])
      .filter((track) => track?.url || track?.sourceUrl)
      .slice(0, limit);

    candidates.forEach((track) => {
      resolveTrack(track).catch((error) => {
        logger(`[resolver] prewarm failed: ${classifyYtdlpError(error)}`);
      });
    });

    logger(
      `[resolver] prewarm scheduled: ${candidates.length} tracks in ${
        Date.now() - startedAt
      }ms`
    );

    return candidates.length;
  }

  function getVersion() {
    return new Promise((resolve) => {
      const proc = spawn(getYtdlpPath(), ["--version"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("error", (error) => {
        resolve({ ok: false, error: classifyYtdlpError(error) });
      });
      proc.on("close", (code) => {
        resolve({
          ok: code === 0,
          version: stdout.trim(),
          error: code === 0 ? null : classifyYtdlpError(stderr),
        });
      });
    });
  }

  return {
    resolveTrack,
    prewarmTracks,
    rememberSearchResults,
    getCachedSearchResults,
    getVersion,
    stats: () => ({
      ...queue.stats(),
      pending: pendingResolves.size,
      cachedTracks: Object.keys(state.tracks).length,
      cachedSearches: Object.keys(state.searches).length,
      cacheFile,
    }),
  };
}

module.exports = {
  createYtdlpResolver,
  extractVideoId,
};
