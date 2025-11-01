// ======= Constantes de DOM =======
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsList = document.getElementById("resultsList");
const downloadsList = document.getElementById("downloadsList");
const player = document.getElementById("player");
const cover = document.getElementById("cover");
const fcp_cover = document.getElementById("fcp-cover");
const songTitle = document.getElementById("songTitle");
const fcp_songTitle = document.getElementById("fcp-title");
const songArtist = document.getElementById("songArtist");
const fcp_songArtist = document.getElementById("fcp-artist");

const volumeSlider = document.getElementById("volumeSlider");
const fcp_volumeSlider = document.getElementById("fcp-volumeSlider");
const muteBtn = document.getElementById("muteBtn");
const fcp_muteBtn = document.getElementById("fcp_muteBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const fcp_playPauseBtn = document.getElementById("fcp-playPauseBtn");
const repeatBtn = document.getElementById("repeatBtn");
const fcp_repeatBtn = document.getElementById("fcp_repeatBtn");
const progressBar = document.getElementById("progressBar");
const fcpProgressBar = document.getElementById("fcp-progressbar");
const currentTimeEl = document.getElementById("currentTime");
const fcpCurrentTimeEl = document.getElementById("fcp-time");
const totalTimeEl = document.getElementById("totalTime");
const fcpTotalTimeEl = document.getElementById("fcp-time-total");
const countryMixbtnA = document.getElementById("btnCountryMixA");
const countryMixbtnB = document.getElementById("btnCountryMixB");
const settingsTabButton = document.getElementById("settingsTab");

const searchTab = document.getElementById("searchTab");
const downloadsTab = document.getElementById("downloadsTab");
const searchContainer = document.getElementById("searchContainer");
const downloadsContainer = document.getElementById("downloadsContainer");
const queueTabButton = document.getElementById("queueTabButton");
const queueTab = document.getElementById("queuetab");
const countryTopContainer = document.getElementById("country-top-container");
const settingsContainer = document.getElementById("settings");
// ======= Variables globales =======
let currentAudio = null;
let queue = [];
let currentIndex = -1;
let currentSong = null;
let lastVolume = 1;
let isMuted = false;
let isRepeating = false;
progressBar.disabled = true;
fcpProgressBar.disabled = true;

// ======= Utilidades =======
function debugLog(...args) {
  console.log("[DEBUG]", ...args);
}

function cleanSongTitle(title) {
  return title
    .replace(
      /\b(video|oficial|lyrics|clip|feat\.?|ft\.?|remix|version|deluxe)\b/gi,
      ""
    )
    .replace(/[\(\[\{].*?[\)\]\}]/g, "")
    .replace(/[-_|\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

function normalize(str) {
  return str.replace(/[^\wáéíóúüñ]/gi, "").toLowerCase();
}

// ======= Limpieza de Query =======
function cleanQuery(query, maxChars = 40) {
  let cleaned = query;
  maxChars = 28;
  cleaned = cleaned.replace(/\([^)]+\)/g, "");
  cleaned = cleaned.replace(/\[[^\]]+\]/g, "");
  cleaned = cleaned.replace(/feat\.?[^&]*&/gi, "");
  cleaned = cleaned.replace(/feat\.?[^-]*-/gi, "");
  cleaned = cleaned.replace(/feat\.?[^$]*$/gi, "");
  cleaned = cleaned.replace(/\b(remix|mixed|edit|version)\b/gi, "");
  cleaned = cleaned.replace(/\/|\\/g, " ");
  cleaned = cleaned.replace(/,+/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.trim();

  // Limitar a los primeros N caracteres SIN contar espacios
  let count = 0;
  let result = "";
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== " ") {
      count++;
    }
    if (count > maxChars) break;
    result += cleaned[i];
  }
  return result.trim();
}

// ======= Reproducción y manejo de audio =======
async function handleExpiredStream(currentSong) {
  if (!currentSong) return;
  debugLog("Renovando URL de streaming para:", currentSong.title);
  try {
    const newStreamUrl = await window.electronAPI.streamSong(currentSong);
    player.src = newStreamUrl;
    player
      .play()
      .catch((err) => debugLog("Error al reproducir tras renovar:", err));
  } catch (err) {
    debugLog("No se pudo renovar URL:", err);
    alert("La canción expiró y no se pudo renovar.");
    playNextInQueue();
  }
}

async function playSong(song, isDownloaded = false) {
  debugLog("Reproduciendo:", song.title);

  progressBar.disabled = false;
  fcpProgressBar.disabled = false;

  // Intentar obtener la portada de iTunes si no está descargada
  let coverImageUrl = song.thumbnail; // Usa la portada de la canción por defecto

  console.log("Portada usada:", coverImageUrl);
  // Establecer la imagen de portada en los elementos correspondientes
  cover.src = coverImageUrl;
  fcp_cover.src = coverImageUrl;

  // Establecer el título y el artista
  songTitle.textContent = cleanSongTitle(song.title);
  songArtist.textContent = song.uploader;
  fcp_songTitle.textContent = cleanSongTitle(song.title);
  fcp_songArtist.textContent = song.uploader;

  let songTitleText = songTitle.textContent;
  let songArtistText = songArtist.textContent;
  let baseArtist = songArtistText
    .replace(/\b(Jr|Sr|feat\.?|ft\.?)\b/gi, "")
    .trim();
  let regex = new RegExp(baseArtist, "gi");
  let songTitleDC = songTitleText.replace(regex, "");
  songTitleDC = songTitleDC
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/(^|\s),\s*/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();

  // Actualizar estado de Discord después de 5 segundos
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `Reproduciendo 🎶 | (${formatTime(player.duration)})`,
      `${songTitleDC} - ${songArtistText}`,
      coverImageUrl,
      false
    );
  }, 5 * 1000);

  // Pausar audio anterior si existe
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
  }

  if (song?.filename?.includes(".mp3")) {
    isDownloaded = true;
  }
  const streamUrl = await window.electronAPI.streamSong(song);
  player.src = streamUrl;
  saySong(`${songTitleText}`);
  player.play().catch((err) => {
    handleExpiredStream(song);
    if (isDownloaded) {
      return debugLog("Reproduciendo musica descargada...");
    }
    debugLog("Audio: URL posiblemente expirada o no soportada", err);
  });
  currentAudio = player;

  // Actualizar índice si la canción estaba en la cola
  const indexInQueue = queue.findIndex((s) => s.url === song.url);
  if (indexInQueue !== -1) {
    currentIndex = indexInQueue;
  } else {
    queue = [song];
    currentIndex = 0;
    renderQueue();
  }

  // Actualizar metadata para Media Session API (si está soportada)
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: songTitleDC,
      artist: songArtistText,
      album: isDownloaded ? "Descargada" : "En línea",
      artwork: [
        {
          src:
            coverImageUrl ||
            "https://i.ibb.co/CKrdcJTT/logo-app-mexlify-center.png", // Usa la portada de iTunes si existe, o una predeterminada
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      audio.play();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      audio.pause();
    });
  }
}

// ======= Cola de reproducción =======
function renderQueue() {
  const queueElement = document.getElementById("queueList");
  if (!queueElement) return;

  queueElement.innerHTML = "";
  queue.forEach((song, index) => {
    const li = document.createElement("li");
    li.classList.add("queue-item");
    li.innerHTML = `
      <img class="queue-thumb" src="${song.thumbnail}" alt="${song.title}">
      <span class="song-title">${song.title}</span>
    `;
    li.querySelector(".song-title").addEventListener("click", () => {
      currentIndex = index;
      playSong(queue[currentIndex]);
      renderQueue();
    });
    li.querySelector(".queue-thumb").addEventListener("click", () => {
      currentIndex = index;
      playSong(queue[currentIndex]);
      renderQueue();
    });
    queueElement.appendChild(li);
  });
}

function addToQueue(song, isDownloaded = false) {
  let songToplay = song;
  if (isDownloaded) {
    songToplay = {
      title: song.Title,
      uploader: song.Uploader,
      duration: song.Duration,
      filename: song.Filename,
      thumbnail: song.Thumbnail,
    };
  }

  queue.push(songToplay);
  debugLog("Agregada a la cola:", songToplay.title);
  if (player.src === "") playNextInQueue();
  setTimeout(renderQueue, 4000);
}

function playNextInQueue() {
  if (queue.length === 0) {
    currentSong = null;
    return;
  }
  console.log(queue);

  currentSong = queue.shift();
  //debug
  console.log("Siguiente en cola:", currentSong.title);
  console.log("Canciones restantes en cola:", queue.length);
  playSong(currentSong);
}

// ======= Descargas =======
async function loadDownloaded() {
  const downloaded = await window.electronAPI.getDownloaded();
  downloadsList.innerHTML = "";

  if (downloaded.length === 0) {
    downloadsList.innerHTML = "<li>No hay descargas aún</li>";
    return;
  }

  downloaded.forEach((song) => {
    const li = document.createElement("li");
    const thumbnail = song.Thumbnail || "default-thumbnail.png";
    const duration = song.Duration
      ? `${Math.floor(song.Duration / 60)}:${String(
          song.Duration % 60
        ).padStart(2, "0")}`
      : "N/A";

    li.innerHTML = `
      <img src="${thumbnail}" alt="Thumbnail">
      <div class="song-info">
        <b>${song.Title || "Título desconocido"}</b><br>
        ${song.Uploader || "Artista desconocido"} (${duration})
      </div>
      <div class="song-actions">
        <button class="play">Reproducir</button>
        <button class="queue"><i class="ph ph-list-plus"></i></button>
        <button class="deleteThis"><i class="ph ph-trash"></i></button>
      </div>
    `;
    downloadsList.appendChild(li);

    li.querySelector(".play").addEventListener("click", async (e) => {
      const btn = e.currentTarget;

      // si ya está bloqueado -> no ejecutar
      if (btn.dataset.locked === "true") {
        console.log("⏳ Este botón está bloqueado...");
        new Notify({
          status: "warning",
          title: "Espera...",
          text: "La reproducción es automática, espera un momento.",
          effect: "fade",
          speed: 300,
          customClass: "",
          customIcon: "",
          showIcon: true,
          showCloseButton: true,
          autoclose: true,
          autotimeout: 3000,
          notificationsGap: null,
          notificationsPadding: null,
          type: "outline",
          position: "right top",
          customWrapper: "",
        });
        btn.disabled = true;
        return; // ⬅️ aquí se detiene
      }

      // bloquear
      btn.dataset.locked = "true";
      //btn.disabled = true;
      console.log("▶️ Botón bloqueado por 5s");

      try {
        playSong(
          {
            title: song.Title,
            uploader: song.Uploader,
            duration: song.Duration,
            filename: song.Filename,
            thumbnail: song.Thumbnail,
          },
          true
        );
      } catch (err) {
        console.error("❌ Error en playSong:", err);
      }

      // desbloquear a los 5s
      setTimeout(() => {
        btn.dataset.locked = "false";
        btn.disabled = false;
        console.log("✅ Botón desbloqueado");
      }, 5000);
    });
    li.querySelector(".queue").addEventListener("click", () => {
      addToQueue(song, true);
    });
    li.querySelector(".deleteThis").addEventListener("click", async () => {
      try {
        await window.electronAPI.deleteDownload(song.Filename);
        debugLog(`Eliminada descarga: ${song.Title}`);
        await loadDownloaded();
      } catch (err) {
        debugLog("Error eliminando descarga:", err);
        alert("Error eliminando la descarga.");
      }
    });
  });
}

// ======= Búsqueda =======
async function searchSongDirectPlay(query = "") {
  const genreEl = document.getElementById("songGenre");
  searchContainer.style.display = "block";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  queueTab.classList.remove("active");
  countryTopContainer.style.display = "none";
  countryTopContainer.classList.remove("active");
  settingsTabButton.classList.remove("active");
  settingsContainer.style.display = "none";

  if (!query) {
    query = searchInput.value.trim();
  } else {
    searchInput.value = query;
  }
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";
  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";

    if (results.length === 0) {
      resultsList.innerHTML = "<li>No se encontraron canciones</li>";
      if (genreEl) genreEl.textContent = "";
      return;
    }

    // Filtrar canciones que NO incluyan "remix" o "remixes" en el título
    const filteredResults = results.filter(
      (song) => !/remix(es)?|choreography|#\w+|@\w+/i.test(song.title) // filtra palabras remix, remixes, choreography, hashtags y arrobas
    );

    let playRandom;
    if (filteredResults.length > 0) {
      playRandom =
        filteredResults[Math.floor(Math.random() * filteredResults.length)];
    } else {
      playRandom = results[Math.floor(Math.random() * results.length)];
    }
    playSong(playRandom);

    if (genreEl) {
      genreEl.textContent = results[0].genre
        ? `Género: ${results[0].genre}`
        : "";
      genreEl.style.display = results[0].genre ? "block" : "none";
    }

    results.forEach((song) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <img class="play" src="${song.thumbnail || ""}">
        <div class="song-info">
            <b>${song.title || "Sin título"}</b><br>
            ${song.uploader || "Desconocido"} (${song.duration || "?"}s)
            ${
              song.genre
                ? `<br><span class="genre-tag">${song.genre}</span>`
                : ""
            }
        </div>
        <div class="song-actions">
            <button class="playbtn"><i class="ph ph-play"></i> Reproducir</button>
            <button class="download downloadButton"><i class="ph ph-download-simple"></i></button>
            <button class="queue"><i class="ph ph-list-plus"></i></button>
        </div>
      `;
      resultsList.appendChild(li);

      li.querySelector(".playbtn").addEventListener("click", (e) => {
        if (li.querySelector(".playbtn").disabled == true) {
          console.log("⏳ Este botón está bloqueado...");
          return new Notify({
            status: "warning",
            title: "Espera...",
            text: "La reproducción es automática, espera un momento.",
            effect: "fade",
          });
        }
        li.querySelector(".playbtn").disabled = true;
        li.querySelector(".playbtn").style.opacity = "0.6";
        li.querySelector(".playbtn").style.cursor = "not-allowed";
        playSong(song);
      });
      li.querySelector(".playbtn").addEventListener("click", () =>
        playSong(song)
      );
      li.querySelector(".download").addEventListener("click", async () => {
        if (li.querySelector(".download").disabled) return;
        li.querySelector(".download").disabled = true;
        li.querySelector(".download").style.opacity = "0.6";
        await new Notify({
          status: "info",
          title: "Descargando...",
          text: `"${song.title}"`,
          effect: "fade",
        });
        try {
          debugLog("Iniciando descarga de:", song.title);
          const res = await window.electronAPI.downloadSong(song);
          if (res.success) {
            if (res.alreadyExists) {
              debugLog(`La canción ya existe: ${song.title}`);
              new Notify({
                status: "warning",
                title: "Descarga existente",
                text: `"${song.title}"`,
                effect: "fade",
              });
            } else {
              debugLog(`Descarga completada: ${song.title}`);
              new Notify({
                status: "success",
                title: "Descarga completada",
                text: `"${song.title}"`,
                effect: "fade",
              });
            }
            await loadDownloaded();
          } else {
            debugLog(`Error descargando ${song.title}: ${res.error}`);
            alert(`Error descargando ${song.title}: ${res.error}`);
          }
        } catch (err) {
          debugLog("Error en download listener:", err);
          alert(`Error inesperado descargando ${song.title}`);
        }
      });
      li.querySelector(".queue").addEventListener("click", () =>
        addToQueue(song)
      );
    });
  } catch (err) {
    resultsList.innerHTML = "<li>Error al buscar canciones</li>";
    if (genreEl) genreEl.textContent = "";
    debugLog("Error searchSongDirectPlay:", err);
    console.dir(err);
  }
}

async function searchSongs() {
  if (window.songQueue) {
    window.songQueue = null;
    console.log("Se limpió la cola de reproducción automática.");
  }
  searchContainer.style.display = "block";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  queueTab.classList.remove("active");
  settingsContainer.style.display = "none";
  settingsTabButton.classList.remove("active");

  const query = searchInput.value.trim();
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";
  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";
    results.forEach((song) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <img class="play" src="${song.thumbnail}">
        <div class="song-info">
            <b>${song.title}</b><br>
            ${song.uploader} (${song.duration}s)
        </div>
        <div class="song-actions">
            <button class="playbtn"><i class="ph ph-play"></i> Reproducir</button>
            <button class="download downloadButton"><i class="ph ph-download-simple"></i></button>
            <button class="queue"><i class="ph ph-list-plus"></i></button>
        </div>
      `;
      resultsList.appendChild(li);

      li.querySelector(".play").addEventListener("click", () => playSong(song));
      // tu listener con bloqueo
      li.querySelector(".playbtn").addEventListener("click", async (e) => {
        const btn = e.currentTarget;

        // si ya está bloqueado -> no ejecutar
        if (btn.dataset.locked === "true") {
          console.log("⏳ Este botón está bloqueado...");
          new Notify({
            status: "warning",
            title: "Espera...",
            text: "La reproducción es automática, espera un momento.",
            effect: "fade",
            speed: 300,
            customClass: "",
            customIcon: "",
            showIcon: true,
            showCloseButton: true,
            autoclose: true,
            autotimeout: 3000,
            notificationsGap: null,
            notificationsPadding: null,
            type: "outline",
            position: "right top",
            customWrapper: "",
          });
          btn.disabled = true;
          return; // ⬅️ aquí se detiene
        }

        // bloquear
        btn.dataset.locked = "true";
        //btn.disabled = true;
        console.log("▶️ Botón bloqueado por 5s");

        try {
          await playSong(song); // solo se ejecuta si NO estaba bloqueado
        } catch (err) {
          console.error("❌ Error en playSong:", err);
        }

        // desbloquear a los 5s
        setTimeout(() => {
          btn.dataset.locked = "false";
          btn.disabled = false;
          console.log("✅ Botón desbloqueado");
        }, 5000);
      });

      li.querySelector(".download").addEventListener("click", async () => {
        if (li.querySelector(".download").disabled) return;
        li.querySelector(".download").disabled = true;
        li.querySelector(".download").style.opacity = "0.6";
        await new Notify({
          status: "info",
          title: "Descargando...",
          text: `"${song.title}"`,
          effect: "fade",
        });
        debugLog("Iniciando descarga de:", song.title);
        try {
          const res = await window.electronAPI.downloadSong(song);
          if (res.success) {
            if (res.alreadyExists) {
              debugLog(`La canción ya existe: ${song.title}`);
              setTimeout(() => {
                new Notify({
                  status: "warning",
                  title: "Descarga existente",
                  text: `"${song.title}"`,
                  effect: "fade",
                });
              }, 1000);
            } else {
              debugLog(`Descarga completada: ${song.title}`);
              new Notify({
                status: "success",
                title: "Descarga completada",
                text: `"${song.title}"`,
                effect: "fade",
              });
            }
            await loadDownloaded();
          } else {
            debugLog(`Error descargando ${song.title}: ${res.error}`);
            alert(`Error descargando ${song.title}: ${res.error}`);
          }
        } catch (err) {
          debugLog("Error en download listener:", err);
          alert(`Error inesperado descargando ${song.title}`);
        } finally {
        }
      });
      li.querySelector(".queue").addEventListener("click", () =>
        addToQueue(song)
      );
    });
  } catch (err) {
    resultsList.innerHTML = "<li>Error al buscar canciones</li>";
    debugLog("Error searchSong:", err);
    console.dir(err);
  }
}

// ======= iTunes API =======
class ITunesSearch {
  constructor() {
    this.baseUrl = "https://itunes.apple.com/search";
  }

  async searchTracks(query, limit = 15) {
    const response = await fetch(
      `${this.baseUrl}?term=${encodeURIComponent(
        query
      )}&entity=song&limit=${limit}`
    );
    return response.json();
  }

  async searchArtistName(artistName) {
    const response = await fetch(
      `${this.baseUrl}?term=${encodeURIComponent(
        artistName
      )}&entity=musicArtist&limit=5`
    );
    const data = await response.json();
    return data.results; // array de artistas encontrados
  }
}

// Crear instancia
const itunes = new ITunesSearch();

// Función principal
async function showArtistRecommendations(artistName) {
  const container = document.getElementById("artistRecommends");
  if (!container) return;
  container.innerHTML = "";

  const h3 = document.createElement("h3");
  h3.textContent = `Recomendaciones para ${artistName}`;
  container.appendChild(h3);

  const ul = document.createElement("ul");
  const seenIds = new Set();

  // ===== 1. Buscar nombre correcto del artista =====
  let artistResults = [];
  const queries = [
    artistName,
    artistName.split(" ").slice(0, 2).join(" "),
    artistName.split(" ")[0],
  ];

  for (const query of queries) {
    const results = await itunes.searchArtistName(query);
    if (results && results.length > 0) {
      artistResults = results;
      break;
    }
  }

  if (artistResults.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Artista no encontrado en iTunes.";
    ul.appendChild(li);
    container.appendChild(ul);
    return;
  }

  const artistCorrectName = artistResults[0].artistName;

  // ===== 2. Buscar canciones del artista correcto =====
  let trackResults = [];
  const trackData = await itunes.searchTracks(artistCorrectName, 20);
  if (trackData.results && trackData.results.length > 0) {
    trackResults = trackData.results;
  }

  if (trackResults.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No se encontraron canciones del artista.";
    ul.appendChild(li);
    container.appendChild(ul);
    return;
  }

  // ===== 3. Mostrar tracks =====
  trackResults.forEach((track) => {
    if (seenIds.has(track.trackId)) return;
    seenIds.add(track.trackId);

    const li = document.createElement("li");
    li.setAttribute("data-id", track.trackId);
    li.style.cursor = "pointer";

    li.addEventListener("click", () => {
      const query = `${track.artistName} ${track.trackName}`;
      searchSongDirectPlay(query);
    });

    li.innerHTML = `
      <img src="${track.artworkUrl60}" alt="${track.trackName} cover" />
      <strong>${track.trackName}</strong> - ${track.artistName} 
    `;

    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ======= iTunes y funciones aleatorias =======
async function getRandomSongByArtist(artistName, excludeTrackName = null) {
  // Búsqueda en iTunes
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(
      artistName
    )}&entity=song&limit=10`
  );
  const data = await response.json();
  let songs = data.results;
  if (excludeTrackName) {
    songs = songs.filter(
      (song) => song.trackName.toLowerCase() !== excludeTrackName.toLowerCase()
    );
  }
  const artistParts = artistName
    .split(/,|\s+/)
    .map((part) => normalize(part))
    .filter(Boolean);

  songs = songs.filter((song) => {
    const normalizedArtist = normalize(song.artistName);
    const matches = artistParts.filter((part) =>
      normalizedArtist.includes(part)
    );
    return matches.length >= Math.ceil(artistParts.length / 2);
  });

  if (songs.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * songs.length);
  const selectedSong = songs[randomIndex];
  return {
    trackName: selectedSong.trackName,
    artistName: selectedSong.artistName,
    genre: selectedSong.primaryGenreName || null,
    cover:
      selectedSong.artworkUrl100?.replace("100x100bb.jpg", "500x500bb.jpg") ||
      null,
  };
}

async function playRandomSongByArtistDirect() {
  const title = songTitle.textContent;
  const artist = songArtist.textContent;
  let song = await getRandomSongByArtist(artist);
  if (!song) {
    // Si no encuentra por artista, intenta buscar por partes del título
    const titleParts = title
      .split(/[-–—,]/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of titleParts) {
      song = await getRandomSongByArtist(part);
      if (song) break;
    }
  }
  if (song) {
    await searchSongDirectPlay(title, song.artistName);
  } else {
    console.log("No se encontraron canciones.");
  }
}

// ======= Eventos =======
player.addEventListener("ended", () => {
  document.querySelector("#progressBar").disabled = true;
  document.querySelector("#fcp-progressbar").disabled = true;
  document.querySelector("#currentTime").textContent = "0:00";
  document.querySelector("#fcp-time").textContent = "0:00";
  document.querySelector("#totalTime").textContent = "0:00";
  document.querySelector("#fcp-time-total").textContent = "0:00";
  document.querySelector("#cover").src =
    "https://i.ibb.co/CKrdcJTT/logo-app-mexlify-center.png";
  document.querySelector("#fcp-cover").src =
    "https://i.ibb.co/CKrdcJTT/logo-app-mexlify-center.png";
  playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
  fcp_playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
  if (!isRepeating) currentAudio = null;
  progressBar.value = 0;
  fcpProgressBar.value = 0;
  currentTimeEl.textContent = "0:00";
  fcpCurrentTimeEl.textContent = "0:00";
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En hub | (${formatTime(player.duration)})`,
      `Esperando canción...`,
      "logo_app_mexlify_center",
      false
    );
  }, 5 * 1000);
  // Reproducir siguiente en cola o canción aleatoria
  if (isRepeating) return;
  if (queue.length > 0) {
    playNextInQueue();
  } else if (!window.songQueue) {
    playRandomSongByArtistDirect();
  }

  // Recomendaciones con Spotify
  const songArtist = document.getElementById("songArtist");
  if (!songArtist) return;
  const artistName = songArtist.textContent;
  showArtistRecommendations(artistName);
});

player.addEventListener("loadedmetadata", () => {
  totalTimeEl.textContent = formatTime(player.duration);
  fcpTotalTimeEl.textContent = formatTime(player.duration);
});

progressBar.addEventListener("input", () => {
  if (!player.duration) return;
  player.currentTime = (progressBar.value / 100) * player.duration;
});
fcpProgressBar.addEventListener("input", () => {
  if (!player.duration) return;
  player.currentTime = (fcpProgressBar.value / 100) * player.duration;
});

player.addEventListener("play", () => {
  playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
  fcp_playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En reproducción | (${formatTime(player.duration)})`,
      `${songTitle.textContent} - ${songArtist.textContent}`,
      `${cover.src}`,
      false
    );
  }, 5 * 1000);
  renderQueue();
});

player.addEventListener("pause", () => {
  setTimeout(async () => {
    await window.electronAPI.setDiscordActivity(
      `En pausa | (${formatTime(player.duration)})`,
      `${songTitle.textContent} - ${songArtist.textContent}`,
      `${cover.src}`,
      false
    );
  }, 5 * 1000);
  playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
  fcp_playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
});

let lastDisplayedSecond = -1;

player.addEventListener("timeupdate", () => {
  const duration = player.duration;
  const currentTime = player.currentTime;

  if (
    typeof duration === "number" &&
    duration > 0 &&
    typeof currentTime === "number" &&
    !isNaN(currentTime)
  ) {
    // Solo actualiza si el segundo entero ha cambiado
    const currentSecond = Math.floor(currentTime);
    if (currentSecond !== lastDisplayedSecond) {
      lastDisplayedSecond = currentSecond;
      progressBar.value = (currentTime / duration) * 100;
      fcpProgressBar.value = (currentTime / duration) * 100;
      currentTimeEl.textContent = formatTime(currentTime);
      fcpCurrentTimeEl.textContent = formatTime(currentTime);
    }
  } else {
    progressBar.value = 0;
    fcpProgressBar.value = 0;
    currentTimeEl.textContent = "0:00";
    fcpCurrentTimeEl.textContent = "0:00";
    lastDisplayedSecond = -1;
  }
});

player.addEventListener("error", (e) => {
  const audioError = e.target.error;
  if (!audioError) return;
  switch (audioError.code) {
    case MediaError.MEDIA_ERR_ABORTED:
    case MediaError.MEDIA_ERR_NETWORK:
      debugLog("Audio: Error ignorado temporal", audioError);
      break;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      if (player.src === "" || !player.src) {
        debugLog("Audio: src vacío o no soportado", audioError);
        alert(
          "No se pudo reproducir la canción (src vacío o formato no soportado)."
        );
        if (queue.length > 0 && currentIndex < queue.length - 1) {
          currentIndex++;
          playSong(queue[currentIndex]);
        }
      } else {
        debugLog("Audio: Formato no soportado", audioError);
        console.dir(audioError);
      }
      break;
    default:
      debugLog("Audio: Error real", audioError);
  }
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchSongs();
});

let searchTimeout;
searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() === "") return;
  // clearTimeout(searchTimeout);
  // searchTimeout = setTimeout(searchSongs, 2000);
});

[playPauseBtn, fcp_playPauseBtn].forEach((btn) => {
  btn.addEventListener("click", () => {
    if (player.paused) {
      player.play();
      playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
      fcp_playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
    } else {
      player.pause();
      playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
      fcp_playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
    }
  });
});

[repeatBtn, fcp_repeatBtn].forEach((btn) => {
  btn.addEventListener("click", () => {
    isRepeating = !isRepeating;
    repeatBtn.style.backgroundColor = isRepeating
      ? "#080014"
      : "rgba(255,255,255,0.1)";
    fcp_repeatBtn.style.color = isRepeating
      ? "#00da28ff"
      : "rgba(255, 255, 255, 1)";
    debugLog(
      isRepeating ? "Modo repetición activado" : "Modo repetición desactivado"
    );
    player.loop = isRepeating;
    // Si tienes otro player, puedes agregar: fcp_player.loop = isRepeating;
  });
});

[muteBtn, fcp_muteBtn].forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isMuted) {
      player.volume = lastVolume;
      volumeSlider.value = lastVolume;
      fcp_volumeSlider.value = lastVolume;
      muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-high"></i>';
      fcp_muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-high"></i>';
      isMuted = false;
      muteBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    } else {
      lastVolume = player.volume;
      player.volume = 0;
      volumeSlider.value = 0;
      fcp_volumeSlider.value = 0;
      muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-simple-slash"></i>';
      fcp_muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-simple-slash"></i>';
      isMuted = true;
      muteBtn.style.backgroundColor = "#080014";
    }
  });
});

const volumeSliders = [fcp_volumeSlider, volumeSlider];

volumeSliders.forEach((slider) => {
  slider.addEventListener("wheel", function (event) {
    event.preventDefault();

    const step = 0.1; // Sensibilidad del scroll
    let value = parseFloat(this.value);

    if (event.deltaY < 0) {
      // Scroll arriba: sube volumen
      value = Math.min(value + step, parseFloat(this.max));
    } else {
      // Scroll abajo: baja volumen
      value = Math.max(value - step, parseFloat(this.min));
    }

    this.value = value.toFixed(2);
    handleVolumeChange({ target: this });
  });
});

function handleVolumeChange(e) {
  const value = parseFloat(e.target.value);

  // Cambia ambos sliders y ambos players
  volumeSlider.value = value;
  fcp_volumeSlider.value = value;
  player.volume = value;

  // Guardar volumen antes de mutear
  if (value > 0) {
    lastVolume = value;
    isMuted = false;
    muteBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  }

  // Determinar el ícono del botón mute según el volumen
  let iconHtml;
  let volume = Math.max(0, Math.min(value, 1)); // Asegura que 0 <= volume <= 1
  if (volume === 0) {
    // Muteado
    iconHtml =
      "<i style='font-size: larger;' class='ph ph-speaker-simple-slash'></i>";
    isMuted = true;
    muteBtn.style.backgroundColor = "#080014";
  } else if (volume > 0 && volume <= 0.5) {
    // Volumen bajo
    iconHtml = "<i style='font-size: larger;' class='ph ph-speaker-low'></i>";
    isMuted = false;
  } else if (volume > 0.5 && volume <= 1.0) {
    // Volumen alto
    iconHtml = "<i style='font-size: larger;' class='ph ph-speaker-high'></i>";
    isMuted = false;
  } else {
    // Fallback
    iconHtml =
      "<i style='font-size: larger;' class='ph ph-speaker-simple-slash'></i>";
    isMuted = true;
  }

  // Solo actualiza el HTML si cambió
  if (muteBtn.innerHTML !== iconHtml) muteBtn.innerHTML = iconHtml;
  if (fcp_muteBtn.innerHTML !== iconHtml) fcp_muteBtn.innerHTML = iconHtml;
}

volumeSlider.addEventListener("input", handleVolumeChange);
fcp_volumeSlider.addEventListener("input", handleVolumeChange);

// ======= Tabs =======
searchTab.addEventListener("click", () => {
  searchContainer.style.display = "block";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  searchTab.classList.add("active");
  downloadsTab.classList.remove("active");
  queueTab.classList.remove("active");
  countryTopContainer.style.display = "none";
  countryTopContainer.classList.remove("active");
  settingsContainer.style.display = "none";
  settingsTabButton.classList.remove("active");
});

downloadsTab.addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "block";
  queueTab.style.display = "none";
  countryTopContainer.style.display = "none";
  downloadsTab.classList.add("active");
  searchTab.classList.remove("active");
  queueTab.classList.remove("active");
  countryTopContainer.classList.remove("active");
  settingsContainer.style.display = "none";
  settingsTabButton.classList.remove("active");
});

queueTabButton.addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "none";
  countryTopContainer.style.display = "none";
  queueTab.style.display = "block";
  queueTabButton.classList.add("active");
  searchTab.classList.remove("active");
  downloadsTab.classList.remove("active");
  countryTopContainer.classList.remove("active");
  settingsContainer.style.display = "none";
  settingsTabButton.classList.remove("active");
});

settingsTabButton.addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  countryTopContainer.style.display = "none";
  queueTabButton.classList.remove("active");
  searchTab.classList.remove("active");
  downloadsTab.classList.remove("active");
  countryTopContainer.classList.remove("active");
  settingsContainer.style.display = "block";
  settingsTabButton.classList.add("active");
});

function renderCountryTop() {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  countryTopContainer.style.display = "block";
  queueTabButton.classList.remove("active");
  searchTab.classList.remove("active");
  downloadsTab.classList.remove("active");
  countryTopContainer.innerHTML = "<p>Cargando top del país...</p>";
  countryTopContainer.scrollIntoView({ behavior: "smooth" });
  countryTopContainer.style.visibility = "none";
  countryTopContainer.classList.add("active");
}

countryMixbtnA.addEventListener("click", () => {
  renderCountryTop();
});
countryMixbtnB.addEventListener("click", () => {
  renderCountryTop();
});

document.getElementById("backtop").addEventListener("click", () => {
  searchContainer.style.display = "none";
  downloadsContainer.style.display = "none";
  queueTab.style.display = "none";
  countryTopContainer.style.display = "block";
  queueTabButton.classList.remove("active");
  searchTab.classList.remove("active");
  downloadsTab.classList.remove("active");
  countryTopContainer.scrollIntoView({ behavior: "smooth" });
  countryTopContainer.style.visibility = "none";
  countryTopContainer.classList.add("active");
});

// Listener para actualizaciones de yt-dlp
window.electronAPI.onYtdlpUpdate((status) => {
  console.log("Estado de actualización de yt-dlp:", status);

  // Usamos la función showModal que ya existe en tu proyecto
  // para notificar al usuario de una forma más elegante que un alert.
  if (status.message.includes("is up to date")) {
    // No mostramos nada si ya está actualizado para no molestar.
    console.log("yt-dlp ya está actualizado.");
  } else if (status.message.includes("Updating to")) {
    showModal(
      "Actualización",
      "Se está actualizando el motor de descargas (yt-dlp)...",
      "info"
    );
  } else if (status.type === "error") {
    showModal(
      "Error de Actualización",
      `No se pudo actualizar yt-dlp: <br><pre>${status.message}</pre>`,
      "error"
    );
  }
});
// ======= Inicializar =======
loadDownloaded();
debugLog("Aplicación iniciada");

// Opcional: FPS real del renderer
/*
let frames = 0;
let lastTime = performance.now();
function measureFPS() {
  frames++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log("[Renderer] FPS real:", frames);
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
measureFPS();
*/
