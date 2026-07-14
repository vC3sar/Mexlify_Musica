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
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fcp_prevBtn = document.getElementById("fcp-prevBtn");
const fcp_nextBtn = document.getElementById("fcp-nextBtn");
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

const homeTab = document.getElementById("homeTab");
const searchTab = document.getElementById("searchTab");
const downloadsTab = document.getElementById("downloadsTab");
const searchContainer = document.getElementById("searchContainer");
const downloadsContainer = document.getElementById("downloadsContainer");
const queueTabButton = document.getElementById("queueTabButton");
const queueTab = document.getElementById("queuetab");
const countryTopContainer = document.getElementById("country-top-container");
const settingsContainer = document.getElementById("settings");
// Referencias nuevas — navegación centralizada y queue drawer
const homeView = document.getElementById("homeView");
const queueOverlay = document.getElementById("queueOverlay");
const recentsContainer = document.getElementById("recentsContainer");
const recentsTab = document.getElementById("recentsTab");

// Playlists DOM
const playlistsContainer = document.getElementById("playlistsContainer");
const playlistsTab = document.getElementById("playlistsTab");
const playlistsGrid = document.getElementById("playlistsGrid");
const playlistNameInput = document.getElementById("playlistNameInput");
const createPlaylistBtn = document.getElementById("createPlaylistBtn");
const playlistDetailView = document.getElementById("playlistDetailView");
const backToPlaylistsBtn = document.getElementById("backToPlaylistsBtn");
const currentPlaylistTitle = document.getElementById("currentPlaylistTitle");
const playPlaylistBtn = document.getElementById("playPlaylistBtn");
const playlistSongsList = document.getElementById("playlistSongsList");

// Modal Selección Playlist DOM
const playlistModalOverlay = document.getElementById("playlistModalOverlay");
const closePlaylistModalBtn = document.getElementById("closePlaylistModalBtn");
const playlistModalSongTitle = document.getElementById("playlistModalSongTitle");
const playlistModalList = document.getElementById("playlistModalList");
const playlistModalNameInput = document.getElementById("playlistModalNameInput");
const playlistModalCreateBtn = document.getElementById("playlistModalCreateBtn");

// ======= Variables globales =======
let currentAudio = null;
let queue = [];
let currentIndex = -1;
let playlists = [];
let selectedSongForPlaylist = null;
let currentSong = null;
let lastVolume = 1;
let isMuted = false;
let isRepeating = false;
let recentSongs = [];
let isResolvingSong = false; // Bandera para bloquear peticiones concurrentes de playSong
progressBar.disabled = true;
fcpProgressBar.disabled = true;
progressBar.style.setProperty('--value', '0%');
fcpProgressBar.style.setProperty('--value', '0%');

// ======= Utilidades =======
function debugLog(...args) {
  console.log("[DEBUG]", ...args);
}

function showPlayerStatus(message) {
  debugLog("[player]", message);
  if (!message) return;
  
  // Log strictly to our system messages tray to keep the screen clean and avoid toast spam
  if (window.systemTray) {
    window.systemTray.addMessage("Reproductor", message, "info");
  }
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
function cleanQuery(query) {
  let cleaned = query;
  const maxChars = 28;
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
async function playSong(song, isDownloaded = false, forceIndex = -1) {
  if (isResolvingSong) {
    debugLog("Ya se está cargando/resolviendo una canción. Ignorando petición redundante.");
    return;
  }
  isResolvingSong = true;

  try {
    // Limpiar controlador dinámico de topSongs
    player.onended = null;
    
    // Limpiar cola automática de top country si se reproduce una canción directamente
    if (forceIndex === -1 && song && !song._fromQueue) {
      window.songQueue = null;
    }

    debugLog("Reproduciendo:", song.title || song.Title);

    // Normalizar y guardar en historial de reproducción reciente
    if (song) {
      const normalizedSong = {
        title: song.title || song.Title || "Título desconocido",
        uploader: song.uploader || song.Uploader || "Artista desconocido",
        thumbnail: song.thumbnail || song.Thumbnail || "resources/player.gif",
        duration: song.duration || song.Duration || 0,
        url: song.url || song.Url || null,
        filename: song.filename || song.Filename || null,
        ...song
      };
      recentSongs = recentSongs.filter(s => (s.title || s.Title || "").toLowerCase() !== normalizedSong.title.toLowerCase());
      recentSongs.unshift(normalizedSong);
      if (recentSongs.length > 50) {
        recentSongs.pop();
      }
      
      currentSong = normalizedSong;
      localStorage.setItem("mexlify_last_song", JSON.stringify(normalizedSong));
      localStorage.setItem("mexlify_last_song_local", isDownloaded ? "true" : "false");

      // Incrementar contador de reproducciones en base de datos SQLite
      window.electronAPI.incrementPlayCount(normalizedSong).then(() => {
        // Actualizar la portada de la playlist en tiempo real
        renderMostPlayedCardCover();
      }).catch((err) => {
        console.error("Error al registrar reproducción en SQLite:", err);
      });

      if (window.systemTray) {
        window.systemTray.addMessage("Reproductor", `Reproduciendo: ${normalizedSong.title} - ${normalizedSong.uploader}`, "music");
      }
    }

    progressBar.disabled = false;
    fcpProgressBar.disabled = false;

    // Portada
    let coverImageUrl = song.thumbnail;
    cover.src = coverImageUrl;
    fcp_cover.src = coverImageUrl;

    // Título y artista
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
    let songTitleDC = songTitleText
      .replace(regex, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*[-–—]\s*/g, " ")
      .replace(/(^|\s),\s*/g, "$1")
      .replace(/\(\s*\)/g, "")
      .trim();

    // Discord Rich Presence
    setTimeout(async () => {
      await window.electronAPI.setDiscordActivity(
        `Reproduciendo 🎶 | (${formatTime(player.duration)})`,
        `${songTitleDC} - ${songArtistText}`,
        coverImageUrl,
        false
      );
    }, 5000);

    // Pausar canción anterior
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }

    if (song?.filename?.includes(".mp3")) {
      isDownloaded = true;
    }

    showPlayerStatus("Preparando audio...");

    let streamUrl;
    try {
      streamUrl = await window.electronAPI.streamSong(song);
    } catch (err) {
      debugLog("No se pudo preparar el audio:", err);
      showPlayerStatus("No se pudo preparar el audio.");
      alert(err?.message || "No se pudo preparar el audio.");
      return;
    }

    showPlayerStatus("Listo para reproducir");
    player.preload = "auto";
    player.src = streamUrl;
    player.load();
    saySong(`${songTitleText}`);

    player.play().catch((err) => {
      if (err.name === "AbortError") {
        debugLog("Reproducción interrumpida por una nueva carga.");
        return;
      }
      if (err.name === "NotAllowedError") {
        debugLog("Reproducción bloqueada por políticas de reproducción automática.");
        return;
      }
      handleExpiredStream(song);
      if (isDownloaded) {
        return debugLog("Reproduciendo música descargada...");
      }
      debugLog("Error al reproducir stream.", err);
    });

    currentAudio = player;

    // Manejo de cola
    if (forceIndex !== -1) {
      currentIndex = forceIndex;
      renderQueue();
    } else {
      const indexInQueue = queue.findIndex((s) => 
        (s.url && s.url === song.url) || 
        (s.filename && s.filename === song.filename) || 
        (s.title === song.title && s.uploader === song.uploader)
      );
      if (indexInQueue !== -1) {
        currentIndex = indexInQueue;
        renderQueue();
      } else {
        queue = [song];
        currentIndex = 0;
        renderQueue();
      }
    }

    // MediaSession API
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songTitleDC,
        artist: songArtistText,
        album: isDownloaded ? "Descargada" : "En línea",
        artwork: [
          {
            src:
              coverImageUrl ||
              "https://i.ibb.co/CKrdcJTT/logo-app-mexlify-center.png",
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

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        playPrev();
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        playNext();
      });
    }

    if (queue.length > 0) {
      window.electronAPI.prewarmSongs(queue.slice(0, 1), 1).catch(debugLog);
    }
    highlightPlayingSong();
  } finally {
    isResolvingSong = false;
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
    if (index === currentIndex) {
      li.classList.add("playing");
    }
    li.innerHTML = `
      <img class="queue-thumb" src="${song.thumbnail}" alt="${song.title}">
      <span class="song-title">${song.title}</span>
    `;
    const isLocal = !!song.filename;
    li.querySelector(".song-title").addEventListener("click", () => {
      playSong(song, isLocal, index);
      renderQueue();
    });
    li.querySelector(".queue-thumb").addEventListener("click", () => {
      playSong(song, isLocal, index);
      renderQueue();
    });
    queueElement.appendChild(li);
  });
}

function addToQueue(song, isDownloaded = false) {
  let songToplay = song;
  if (isDownloaded) {
    songToplay = {
      title: song.Title || song.title,
      uploader: song.Uploader || song.uploader,
      duration: song.Duration || song.duration,
      filename: song.Filename || song.filename,
      thumbnail: song.Thumbnail || song.thumbnail,
    };
  }

  queue.push(songToplay);
  debugLog("Agregada a la cola:", songToplay.title);
  if (player.src === "") playNextInQueue();
  setTimeout(renderQueue, 4000);
}

function playNext() {
  if (queue.length === 0) {
    currentSong = null;
    return;
  }
  
  if (currentIndex < queue.length - 1) {
    currentIndex++;
    const nextSong = queue[currentIndex];
    nextSong._fromQueue = true;
    playSong(nextSong, !!nextSong.filename, currentIndex);
  } else {
    // Hemos llegado al final de la cola
    const autoplayCheckbox = document.getElementById("autoplay");
    const isAutoplayEnabled = autoplayCheckbox ? autoplayCheckbox.checked : true;
    
    if (isAutoplayEnabled && !window.songQueue) {
      playRandomSongByArtistDirect();
    } else {
      debugLog("Fin de la cola de reproducción.");
    }
  }
}

function playPrev() {
  if (queue.length === 0) return;
  
  // Si lleva más de 3 segundos reproduciéndose, reiniciar
  if (player && player.currentTime > 3) {
    player.currentTime = 0;
    return;
  }
  
  if (currentIndex > 0) {
    currentIndex--;
    const prevSong = queue[currentIndex];
    prevSong._fromQueue = true;
    playSong(prevSong, !!prevSong.filename, currentIndex);
  } else {
    // Reiniciar primera canción
    if (player) player.currentTime = 0;
  }
}

function playNextInQueue() {
  playNext();
}

// ======= Descargas =======
async function loadDownloaded() {
  const downloaded = await window.electronAPI.getDownloaded();
  downloadsList.innerHTML = "";

  const offlineCountBadge = document.getElementById("offlineCountBadge");
  if (offlineCountBadge) {
    offlineCountBadge.textContent = `${downloaded.length} guardada${downloaded.length !== 1 ? 's' : ''}`;
  }

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
        <button class="queue" title="Añadir a la cola"><i class="ph ph-list-plus"></i></button>
        <button class="add-to-playlist" title="Añadir a playlist"><i class="ph ph-folder-plus"></i></button>
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
    li.querySelector(".add-to-playlist").addEventListener("click", () => {
      openPlaylistModal({
        title: song.Title,
        uploader: song.Uploader,
        duration: song.Duration,
        thumbnail: song.Thumbnail,
        filename: song.Filename,
        url: null
      });
    });
  });
  highlightPlayingSong();
}

// ======= Búsqueda =======
async function searchSongDirectPlay(query = "") {
  const genreEl = document.getElementById("songGenre");
  const searchResultsHeader = document.getElementById("searchResultsHeader");
  navigateTo("search");

  if (!query) {
    query = searchInput.value.trim();
  } else {
    searchInput.value = query;
  }
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";
  if (searchResultsHeader) searchResultsHeader.style.display = "none";
  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";

    if (results.length === 0) {
      resultsList.innerHTML = "<li>No se encontraron canciones</li>";
      if (genreEl) genreEl.textContent = "";
      if (searchResultsHeader) searchResultsHeader.style.display = "none";
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

    if (searchResultsHeader) searchResultsHeader.style.display = "flex";

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
            <button class="playbtn"><i class="ph ph-play"></i></button>
            <button class="download downloadButton"><i class="ph ph-download-simple"></i></button>
            <button class="queue" title="Añadir a la cola"><i class="ph ph-list-plus"></i></button>
        </div>
      `;
      resultsList.appendChild(li);

      li.querySelector(".playbtn").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        if (btn.disabled === true) {
          console.log("Este boton esta bloqueado...");
          return new Notify({
            status: "warning",
            title: "Espera...",
            text: "La reproducción es automática, espera un momento.",
            effect: "fade",
          });
        }
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
        try {
          await playSong(song);
        } finally {
          setTimeout(() => {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
          }, 1500);
        }
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
    if (searchResultsHeader) searchResultsHeader.style.display = "none";
    debugLog("Error searchSongDirectPlay:", err);
    console.dir(err);
  }
}

async function searchSongs() {
  if (window.songQueue) {
    window.songQueue = null;
    console.log("Se limpió la cola de reproducción automática.");
  }
  navigateTo("search");

  const searchResultsHeader = document.getElementById("searchResultsHeader");
  const query = searchInput.value.trim();
  if (!query) return;
  resultsList.innerHTML = "<li>Buscando...</li>";
  if (searchResultsHeader) searchResultsHeader.style.display = "none";
  try {
    const results = await window.electronAPI.searchSong(cleanQuery(query));
    resultsList.innerHTML = "";
    if (results.length > 0) {
      if (searchResultsHeader) searchResultsHeader.style.display = "flex";
    } else {
      resultsList.innerHTML = "<li>No se encontraron canciones</li>";
      if (searchResultsHeader) searchResultsHeader.style.display = "none";
    }
    results.forEach((song) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <img class="play" src="${song.thumbnail}">
        <div class="song-info">
            <b>${song.title}</b><br>
            ${song.uploader} (${song.duration}s)
        </div>
        <div class="song-actions">
            <button class="playbtn"><i class="ph ph-play"></i></button>
            <button class="download downloadButton"><i class="ph ph-download-simple"></i></button>
            <button class="queue" title="Añadir a la cola"><i class="ph ph-list-plus"></i></button>
            <button class="add-to-playlist" title="Añadir a playlist"><i class="ph ph-folder-plus"></i></button>
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
        if (window.systemTray) {
          window.systemTray.addMessage("Descarga", `Descargando: ${song.title}`, "info");
        }
        try {
          const res = await window.electronAPI.downloadSong(song);
          if (res.success) {
            if (res.alreadyExists) {
              debugLog(`La canción ya existe: ${song.title}`);
              if (window.systemTray) {
                window.systemTray.addMessage("Descarga", `La canción ya existe: ${song.title}`, "warning");
              }
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
              if (window.systemTray) {
                window.systemTray.addMessage("Descarga", `Descarga completada: ${song.title}`, "success");
              }
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
            if (window.systemTray) {
              window.systemTray.addMessage("Descarga", `Error al descargar ${song.title}: ${res.error}`, "error");
            }
            alert(`Error descargando ${song.title}: ${res.error}`);
          }
        } catch (err) {
          debugLog("Error en download listener:", err);
          if (window.systemTray) {
            window.systemTray.addMessage("Descarga", `Error inesperado al descargar ${song.title}`, "error");
          }
          alert(`Error inesperado descargando ${song.title}`);
        } finally {
        }
      });
      li.querySelector(".queue").addEventListener("click", () =>
        addToQueue(song)
      );
      li.querySelector(".add-to-playlist").addEventListener("click", () => {
        openPlaylistModal({
          title: song.title,
          uploader: song.uploader,
          duration: song.duration,
          thumbnail: song.thumbnail,
          url: song.url || song.webpage_url || null,
          filename: null
        });
      });
    });
    highlightPlayingSong();
  } catch (err) {
    resultsList.innerHTML = "<li>Error al buscar canciones</li>";
    if (searchResultsHeader) searchResultsHeader.style.display = "none";
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
  let data;
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        artistName
      )}&entity=song&limit=10`
    );
    if (!response.ok) return null;
    data = await response.json();
  } catch (err) {
    debugLog("getRandomSongByArtist: error de red:", err);
    return null;
  }
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
player.addEventListener("loadstart", () => {
  debugLog("Audio: loadstart");
});

player.addEventListener("canplay", () => {
  debugLog("Audio: canplay");
});

player.addEventListener("playing", () => {
  debugLog("Audio: playing");
});

player.addEventListener("waiting", () => {
  debugLog("Audio: waiting");
  showPlayerStatus("Reintentando conexión...");
});

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
  const repText = document.querySelector('.reproduciendo-text-container');
  if (repText) repText.classList.remove('active');
  if (!isRepeating) currentAudio = null;
  progressBar.value = 0;
  progressBar.style.setProperty('--value', '0%');
  fcpProgressBar.value = 0;
  fcpProgressBar.style.setProperty('--value', '0%');
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
  playNext();

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
  progressBar.style.setProperty('--value', `${progressBar.value}%`);
  player.currentTime = (progressBar.value / 100) * player.duration;
});
fcpProgressBar.addEventListener("input", () => {
  if (!player.duration) return;
  fcpProgressBar.style.setProperty('--value', `${fcpProgressBar.value}%`);
  player.currentTime = (fcpProgressBar.value / 100) * player.duration;
});

player.addEventListener("play", () => {
  playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
  fcp_playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
  const repText = document.querySelector('.reproduciendo-text-container');
  if (repText) repText.classList.add('active');
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
  const repText = document.querySelector('.reproduciendo-text-container');
  if (repText) repText.classList.remove('active');
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
      const percent = (currentTime / duration) * 100;
      progressBar.value = percent;
      progressBar.style.setProperty('--value', `${percent}%`);
      fcpProgressBar.value = percent;
      fcpProgressBar.style.setProperty('--value', `${percent}%`);
      currentTimeEl.textContent = formatTime(currentTime);
      fcpCurrentTimeEl.textContent = formatTime(currentTime);
    }
  } else {
    if (lastDisplayedSecond !== -1) {
      progressBar.value = 0;
      progressBar.style.setProperty('--value', '0%');
      fcpProgressBar.value = 0;
      fcpProgressBar.style.setProperty('--value', '0%');
      currentTimeEl.textContent = "0:00";
      fcpCurrentTimeEl.textContent = "0:00";
      lastDisplayedSecond = -1;
    }
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
      if ((!player.src || player.src === "") && currentSong) {
        playSong(currentSong, currentSong.isDownloaded || false);
      } else {
        player.play();
        playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
        fcp_playPauseBtn.innerHTML = '<i class="ph ph-pause"></i>';
      }
    } else {
      player.pause();
      playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
      fcp_playPauseBtn.innerHTML = '<i class="ph ph-play"></i>';
    }
  });
});

[prevBtn, fcp_prevBtn].forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", () => {
      playPrev();
    });
  }
});

[nextBtn, fcp_nextBtn].forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", () => {
      playNext();
    });
  }
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
      const percent = (lastVolume / 0.95) * 100;
      volumeSlider.style.setProperty('--value', `${percent}%`);
      fcp_volumeSlider.style.setProperty('--value', `${percent}%`);
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
      volumeSlider.style.setProperty('--value', '0%');
      fcp_volumeSlider.value = 0;
      fcp_volumeSlider.style.setProperty('--value', '0%');
      muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-simple-slash"></i>';
      fcp_muteBtn.innerHTML =
        '<i style="font-size: larger;" class="ph ph-speaker-simple-slash"></i>';
      isMuted = true;
      muteBtn.style.backgroundColor = "#080014";
    }
    localStorage.setItem("mexlify_volume", isMuted ? 0 : lastVolume);
    localStorage.setItem("mexlify_muted", isMuted ? "true" : "false");
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
  const percent = (value / 0.95) * 100;

  // Cambia ambos sliders y ambos players
  volumeSlider.value = value;
  volumeSlider.style.setProperty('--value', `${percent}%`);
  fcp_volumeSlider.value = value;
  fcp_volumeSlider.style.setProperty('--value', `${percent}%`);
  player.volume = value;

  // Guardar volumen antes de mutear
  if (value > 0) {
    lastVolume = value;
    isMuted = false;
    muteBtn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  }

  // Guardar en localStorage
  localStorage.setItem("mexlify_volume", value);
  localStorage.setItem("mexlify_muted", (value === 0 || isMuted) ? "true" : "false");

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

// ======= Navegación centralizada =======
// Todas las vistas de contenido central que navigateTo controla
const ALL_CONTENT_VIEWS = [searchContainer, downloadsContainer, settingsContainer, countryTopContainer, recentsContainer, playlistsContainer];
// Todos los nav-links del navbar superior y sidebar
const ALL_NAV_LINKS = [homeTab, searchTab, downloadsTab, settingsTabButton, playlistsTab];

/**
 * navigateTo — fuente única de verdad para mostrar/ocultar vistas.
 * @param {string} view - "home" | "search" | "downloads" | "settings" | "countryTop" | "recents" | "playlists"
 */
function navigateTo(view) {
  // 1. Ocultar TODAS las vistas de contenido
  ALL_CONTENT_VIEWS.forEach((el) => {
    if (el) el.classList.add("is-hidden");
  });

  // 2. Quitar activo de todos los nav-links
  ALL_NAV_LINKS.forEach((el) => {
    if (el) el.classList.remove("is-active");
  });

  // 3. Mostrar/ocultar el homeView (las cards de inicio + bienvenida)
  if (homeView) homeView.classList.toggle("is-hidden", view !== "home");

  // 4. Activar la vista correcta
  switch (view) {
    case "home":
      searchContainer.classList.remove("is-hidden");
      homeTab.classList.add("is-active");
      break;
    case "search":
      searchContainer.classList.remove("is-hidden");
      searchTab.classList.add("is-active");
      break;
    case "downloads":
      downloadsContainer.classList.remove("is-hidden");
      downloadsTab.classList.add("is-active");
      break;
    case "settings":
      settingsContainer.classList.remove("is-hidden");
      settingsTabButton.classList.add("is-active");
      // Activar tab General por defecto si ninguna está activa
      if (!document.querySelector(".tablinkSettings.is-active")) {
        const defaultTab = document.getElementById("defaultTab");
        if (defaultTab) defaultTab.click();
      }
      break;
    case "countryTop":
      countryTopContainer.classList.remove("is-hidden");
      break;
    case "recents":
      if (recentsContainer) recentsContainer.classList.remove("is-hidden");
      renderRecents();
      break;
    case "playlists":
      if (playlistsContainer) playlistsContainer.classList.remove("is-hidden");
      if (playlistsTab) playlistsTab.classList.add("is-active");
      
      // Hide detail view by default and show playlists grid
      if (playlistDetailView) playlistDetailView.classList.add("is-hidden");
      const createRow = document.querySelector(".playlist-create-row");
      if (createRow) createRow.classList.remove("is-hidden");
      if (playlistsGrid) playlistsGrid.classList.remove("is-hidden");
      renderPlaylists();
      break;
  }
  highlightPlayingSong();
}

// ======= Listeners de navegación (navbar y sidebar) =======
homeTab.addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("home");
});

searchTab.addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("search");
});

downloadsTab.addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("downloads");
});

settingsTabButton.addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("settings");
});

if (recentsTab) {
  recentsTab.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("recents");
  });
}

if (playlistsTab) {
  playlistsTab.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("playlists");
  });
}

// ======= Renderizador de Recientes =======
function renderRecents() {
  const recentsList = document.getElementById("recentsList");
  if (!recentsList) return;
  recentsList.innerHTML = "";

  const recentsCountBadge = document.getElementById("recentsCountBadge");
  if (recentsCountBadge) {
    recentsCountBadge.textContent = `${recentSongs.length} reproducida${recentSongs.length !== 1 ? 's' : ''}`;
  }

  if (recentSongs.length === 0) {
    recentsList.innerHTML = "<li style='color: rgba(255,255,255,0.6); padding: 20px; text-align: center; font-family: Poppins, sans-serif;'>No has reproducido ninguna canción en esta sesión aún.</li>";
    return;
  }

  recentSongs.forEach((song) => {
    const li = document.createElement("li");
    const formattedDuration = typeof song.duration === "number"
      ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
      : song.duration || "N/A";

    li.innerHTML = `
      <img class="play" src="${song.thumbnail}" style="cursor: pointer;">
      <div class="song-info">
          <b>${song.title}</b><br>
          ${song.uploader} (${formattedDuration})
      </div>
      <div class="song-actions">
          <button class="playbtn"><i class="ph ph-play"></i></button>
          <button class="queue" title="Añadir a la cola"><i class="ph ph-list-plus"></i></button>
      </div>
    `;
    recentsList.appendChild(li);

    li.querySelector(".play").addEventListener("click", () => playSong(song));
    
    const playBtn = li.querySelector(".playbtn");
    playBtn.addEventListener("click", async (e) => {
      const btn = e.currentTarget;

      if (btn.dataset.locked === "true") {
        console.log("⏳ Este botón está bloqueado...");
        new Notify({
          status: "warning",
          title: "Espera...",
          text: "La reproducción es automática, espera un momento.",
          effect: "fade",
        });
        return;
      }

      btn.dataset.locked = "true";

      try {
        await playSong(song);
      } catch (err) {
        console.error("❌ Error en playSong:", err);
      }

      setTimeout(() => {
        btn.dataset.locked = "false";
      }, 5000);
    });

    li.querySelector(".queue").addEventListener("click", () => addToQueue(song));
  });
  highlightPlayingSong();
}

// ======= Queue Drawer =======
function openQueueDrawer() {
  if (queueTab) queueTab.classList.add("is-open");
  if (queueOverlay) queueOverlay.classList.add("is-open");
  renderQueue(); // refrescar la lista al abrir
}

function closeQueueDrawer() {
  if (queueTab) queueTab.classList.remove("is-open");
  if (queueOverlay) queueOverlay.classList.remove("is-open");
}

function toggleQueueDrawer() {
  if (queueTab && queueTab.classList.contains("is-open")) {
    closeQueueDrawer();
  } else {
    openQueueDrawer();
  }
}

// Botón "Lista de reproducción" en el player aside
queueTabButton.addEventListener("click", toggleQueueDrawer);

// Botón queue en el footer compact player
const fcpQueueBtn = document.getElementById("fcp-queueBtn");
if (fcpQueueBtn) fcpQueueBtn.addEventListener("click", toggleQueueDrawer);

// Botón X para cerrar el drawer
const closeQueueBtn = document.getElementById("closeQueueBtn");
if (closeQueueBtn) closeQueueBtn.addEventListener("click", closeQueueDrawer);

// Clic en el overlay cierra el drawer
if (queueOverlay) queueOverlay.addEventListener("click", closeQueueDrawer);

// ======= renderCountryTop =======
function renderCountryTop() {
  navigateTo("countryTop");
  countryTopContainer.innerHTML = "<p>Cargando top del país...</p>";
  countryTopContainer.scrollIntoView({ behavior: "smooth" });
}

countryMixbtnA.addEventListener("click", () => {
  renderCountryTop();
});
countryMixbtnB.addEventListener("click", () => {
  renderCountryTop();
});

document.getElementById("backtop").addEventListener("click", () => {
  navigateTo("countryTop");
  countryTopContainer.scrollIntoView({ behavior: "smooth" });
});



// Listener para actualizaciones de yt-dlp
function showUpdateStatus(message, sub_message) {
  new Notify({
    status: "info",
    title: message,
    text: sub_message,
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
}
window.electronAPI.onYtdlpUpdate((status) => {
  console.log("Estado de actualización de yt-dlp:", status);

  // Usamos la función showModal que ya existe en tu proyecto
  // para notificar al usuario de una forma más elegante que un alert.
  if (status.message.includes("is up to date")) {
    // No mostramos nada si ya está actualizado para no molestar.
    console.log("yt-dlp ya está actualizado.");
    showUpdateStatus(
      "El motor está actualizado",
      "La APP funciona correctamente."
    );
    if (window.systemTray) {
      window.systemTray.addMessage("Motor de descargas", "El motor yt-dlp está actualizado.", "success");
    }
    // guardar estado en localStorage
    localStorage.setItem("engineStatus", "Actualizada");
  } else if (status.message.includes("yt-dlp version:")) {
    const version = status.message.replace("yt-dlp version:", "Version:");
    showUpdateStatus(
      "Motor detectado",
      version
    );
    if (window.systemTray) {
      window.systemTray.addMessage("Motor de descargas", `Motor detectado: ${version}`, "info");
    }
    localStorage.setItem("engineStatus", status.message);
  } else if (status.message.includes("Updating to")) {
    showModal(
      "Actualización",
      "Se está actualizando el motor de descargas (yt-dlp)...",
      "info"
    );
    if (window.systemTray) {
      window.systemTray.addMessage("Motor de descargas", `Iniciando actualización a la versión más reciente...`, "info");
    }
  } else if (status.type === "error") {
    showModal(
      "Error de Actualización",
      `No se pudo actualizar yt-dlp: <br><pre>${status.message}</pre>`,
      "error"
    );
    if (window.systemTray) {
      window.systemTray.addMessage("Motor de descargas", `Error al actualizar: ${status.message}`, "error");
    }
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
const audio = document.getElementById("player");
audio.preload = "auto"; // carga inmediata
audio.autoplay = true; // sin clic
audio.crossOrigin = "anonymous"; // evita bloqueos
audio.disableRemotePlayback = true;
audio.setAttribute("playsinline", "true");

// ============================================================
//  PLAYLISTS ENGINE
// ============================================================

// ---- Persistence ----
function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem("mexlify_playlists");
    playlists = raw ? JSON.parse(raw) : [];
  } catch (e) {
    playlists = [];
  }
}

function savePlaylistsToStorage() {
  localStorage.setItem("mexlify_playlists", JSON.stringify(playlists));
}

// ---- CRUD helpers ----
function createPlaylist(name) {
  if (!name || !name.trim()) return null;
  const pl = { id: Date.now().toString(), name: name.trim(), songs: [] };
  playlists.push(pl);
  savePlaylistsToStorage();
  return pl;
}

function deletePlaylist(id) {
  playlists = playlists.filter(p => p.id !== id);
  savePlaylistsToStorage();
}

function addSongToPlaylist(playlistId, song) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return false;
  const already = pl.songs.some(s =>
    (s.url && s.url === song.url) ||
    (s.filename && s.filename === song.filename) ||
    (s.title === song.title && s.uploader === song.uploader)
  );
  if (already) return false;
  pl.songs.push(song);
  savePlaylistsToStorage();
  return true;
}

// ---- Grid renderer ----
function renderPlaylists() {
  if (!playlistsGrid) return;
  playlistsGrid.innerHTML = "";

  if (playlists.length === 0) {
    playlistsGrid.innerHTML = `
      <div class="messages-empty-state" style="grid-column: 1/-1;">
        <i class="ph ph-playlist" style="font-size:2.5rem; color:rgba(255,0,144,0.4);"></i>
        <p>No tienes playlists todavía. ¡Crea una!</p>
      </div>`;
    return;
  }

  playlists.forEach(pl => {
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.innerHTML = `
      <button class="playlist-card-delete-btn" title="Eliminar playlist"><i class="ph ph-trash"></i></button>
      <div class="playlist-card-icon"><i class="ph ph-playlist"></i></div>
      <p class="playlist-card-name">${pl.name}</p>
      <span class="playlist-card-count">${pl.songs.length} canción${pl.songs.length !== 1 ? "es" : ""}</span>
    `;
    card.querySelector(".playlist-card-delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar la playlist "${pl.name}"?`)) {
        deletePlaylist(pl.id);
        renderPlaylists();
      }
    });
    card.addEventListener("click", () => openPlaylistDetail(pl.id));
    playlistsGrid.appendChild(card);
  });
}

// ---- Detail view ----
function openPlaylistDetail(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl || !playlistDetailView) return;

  // Switch visibility
  if (playlistsGrid) playlistsGrid.classList.add("is-hidden");
  const createRow = document.querySelector(".playlist-create-row");
  if (createRow) createRow.classList.add("is-hidden");
  playlistDetailView.classList.remove("is-hidden");

  if (currentPlaylistTitle) currentPlaylistTitle.textContent = pl.name;

  // Store current playlist id on the play button
  if (playPlaylistBtn) playPlaylistBtn.dataset.playlistId = playlistId;

  renderPlaylistSongs(pl);
}

function playPlaylistSong(playlist, clickedIndex) {
  // Configurar la cola con todas las canciones de la playlist
  queue = playlist.songs.map(s => ({
    title: s.title,
    uploader: s.uploader,
    duration: s.duration,
    thumbnail: s.thumbnail,
    filename: s.filename || null,
    url: s.url || null
  }));

  renderQueue();

  const song = queue[clickedIndex];
  if (song) {
    playSong(song, !!song.filename, clickedIndex);
  }
}

function renderPlaylistSongs(pl) {
  if (!playlistSongsList) return;
  playlistSongsList.innerHTML = "";

  const playlistMetaCount = document.getElementById("playlistMetaCount");
  if (playlistMetaCount) {
    playlistMetaCount.textContent = `${pl.songs.length} canción${pl.songs.length !== 1 ? 'es' : ''}`;
  }

  if (pl.songs.length === 0) {
    playlistSongsList.innerHTML = `
      <div class="messages-empty-state">
        <i class="ph ph-music-notes" style="font-size:2rem; color:rgba(255,0,144,0.4);"></i>
        <p>Esta playlist está vacía. Añade canciones desde Buscar o Fuera de línea.</p>
      </div>`;
    return;
  }

  pl.songs.forEach((song, idx) => {
    const li = document.createElement("li");
    const isLocal = !!song.filename;
    const thumb = song.thumbnail || "resources/player.gif";
    const dur = song.duration
      ? (typeof song.duration === "number"
          ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
          : song.duration + "s")
      : "";

    li.innerHTML = `
      <img class="play" src="${thumb}" alt="${song.title}" style="cursor:pointer;">
      <div class="song-info">
        <b>${song.title}</b><br>
        ${song.uploader || ""} ${dur ? "(" + dur + ")" : ""}
      </div>
      <div class="song-actions">
        <button class="playbtn"><i class="ph ph-play"></i></button>
        <button class="queue" title="Añadir a la cola"><i class="ph ph-list-plus"></i></button>
        ${!isLocal ? `<button class="download-pl"><i class="ph ph-download-simple"></i></button>` : `<span title="Disponible offline" style="color:#00d170; font-size:1.1rem; display:flex; align-items:center;"><i class="ph ph-check-circle"></i></span>`}
        <button class="remove-from-pl" title="Quitar de playlist"><i class="ph ph-x"></i></button>
      </div>
    `;
    playlistSongsList.appendChild(li);

    const songObj = isLocal ? { title: song.title, uploader: song.uploader, duration: song.duration, thumbnail: song.thumbnail, filename: song.filename } : song;

    li.querySelector(".play").addEventListener("click", () => playPlaylistSong(pl, idx));
    li.querySelector(".playbtn").addEventListener("click", () => playPlaylistSong(pl, idx));
    li.querySelector(".queue").addEventListener("click", () => addToQueue(songObj, isLocal));

    const removeBtn = li.querySelector(".remove-from-pl");
    removeBtn.addEventListener("click", () => {
      pl.songs.splice(idx, 1);
      savePlaylistsToStorage();
      renderPlaylistSongs(pl);
    });

    if (!isLocal) {
      li.querySelector(".download-pl").addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.style.opacity = "0.5";
        try {
          const res = await window.electronAPI.downloadSong({
            title: song.title, uploader: song.uploader,
            duration: song.duration, thumbnail: song.thumbnail,
            url: song.url || song.webpage_url
          });
          if (res.success) {
            // Update the song entry in the playlist with the local filename
            song.filename = res.filename || song.title;
            savePlaylistsToStorage();
            new Notify({ status: "success", title: "Descarga completada", text: `"${song.title}"`, effect: "fade" });
            await loadDownloaded();
            renderPlaylistSongs(pl); // refresh icons
          } else {
            btn.disabled = false; btn.style.opacity = "1";
            new Notify({ status: "error", title: "Error", text: res.error || "No se pudo descargar", effect: "fade" });
          }
        } catch (err) {
          btn.disabled = false; btn.style.opacity = "1";
          console.error("Download from playlist error:", err);
        }
      });
    }
  });
  highlightPlayingSong();
}

// ---- Play entire playlist ----
function playPlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl || pl.songs.length === 0) return;

  queue = pl.songs.map(s => ({
    title: s.title,
    uploader: s.uploader,
    duration: s.duration,
    thumbnail: s.thumbnail,
    filename: s.filename || null,
    url: s.url || null
  }));

  renderQueue();

  // Reproducir la primera canción de la cola
  playSong(queue[0], !!queue[0].filename, 0);
}

// ---- Modal ----
function openPlaylistModal(song) {
  selectedSongForPlaylist = song;
  if (playlistModalSongTitle) playlistModalSongTitle.textContent = song.title;
  renderPlaylistModalList();
  if (playlistModalOverlay) playlistModalOverlay.classList.remove("is-hidden");
}

function closePlaylistModal() {
  if (playlistModalOverlay) playlistModalOverlay.classList.add("is-hidden");
  selectedSongForPlaylist = null;
  if (playlistModalNameInput) playlistModalNameInput.value = "";
}

function renderPlaylistModalList() {
  if (!playlistModalList) return;
  playlistModalList.innerHTML = "";

  if (playlists.length === 0) {
    playlistModalList.innerHTML = `<p style="color:rgba(255,255,255,0.4); font-size:0.85rem; text-align:center;">No hay playlists. Crea una abajo.</p>`;
    return;
  }

  playlists.forEach(pl => {
    const item = document.createElement("div");
    item.className = "playlist-modal-item";
    item.innerHTML = `<i class="ph ph-playlist"></i> ${pl.name} <span style="margin-left:auto; color:rgba(255,255,255,0.4); font-size:0.8rem;">${pl.songs.length} canciones</span>`;
    item.addEventListener("click", () => {
      if (!selectedSongForPlaylist) return;
      const added = addSongToPlaylist(pl.id, selectedSongForPlaylist);
      if (added) {
        new Notify({ status: "success", title: "Añadida", text: `"${selectedSongForPlaylist.title}" → ${pl.name}`, effect: "fade" });
      } else {
        new Notify({ status: "warning", title: "Ya existe", text: `"${selectedSongForPlaylist.title}" ya está en "${pl.name}"`, effect: "fade" });
      }
      closePlaylistModal();
    });
    playlistModalList.appendChild(item);
  });
}

// ---- Wire up all playlist event listeners ----
loadPlaylistsFromStorage();

// Create playlist from main view
if (createPlaylistBtn) {
  createPlaylistBtn.addEventListener("click", () => {
    const name = playlistNameInput ? playlistNameInput.value.trim() : "";
    if (!name) return;
    createPlaylist(name);
    if (playlistNameInput) playlistNameInput.value = "";
    renderPlaylists();
  });
  if (playlistNameInput) {
    playlistNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") createPlaylistBtn.click();
    });
  }
}

// Back button in detail view
if (backToPlaylistsBtn) {
  backToPlaylistsBtn.addEventListener("click", () => {
    playlistDetailView.classList.add("is-hidden");
    const createRow = document.querySelector(".playlist-create-row");
    if (createRow) createRow.classList.remove("is-hidden");
    if (playlistsGrid) playlistsGrid.classList.remove("is-hidden");
    renderPlaylists();
  });
}

// Play entire playlist button
if (playPlaylistBtn) {
  playPlaylistBtn.addEventListener("click", () => {
    const id = playPlaylistBtn.dataset.playlistId;
    if (id) playPlaylist(id);
  });
}

// Close modal button
if (closePlaylistModalBtn) {
  closePlaylistModalBtn.addEventListener("click", closePlaylistModal);
}

// Close modal on overlay click
if (playlistModalOverlay) {
  playlistModalOverlay.addEventListener("click", (e) => {
    if (e.target === playlistModalOverlay) closePlaylistModal();
  });
}

// Create playlist directly from the modal
if (playlistModalCreateBtn) {
  playlistModalCreateBtn.addEventListener("click", () => {
    const name = playlistModalNameInput ? playlistModalNameInput.value.trim() : "";
    if (!name) return;
    const pl = createPlaylist(name);
    if (pl && selectedSongForPlaylist) {
      addSongToPlaylist(pl.id, selectedSongForPlaylist);
      new Notify({ status: "success", title: "Playlist creada", text: `"${selectedSongForPlaylist.title}" añadida a "${name}"`, effect: "fade" });
      closePlaylistModal();
    }
  });
  if (playlistModalNameInput) {
    playlistModalNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") playlistModalCreateBtn.click();
    });
  }
}

// ======= Sidebar Collapsible Logic =======
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const sidebarToggleIcon = document.getElementById("sidebarToggleIcon");
const sidebar = document.querySelector(".sidebar");

if (sidebarToggleBtn && sidebarToggleIcon && sidebar) {
  const updateSidebarState = (shouldCollapse) => {
    if (shouldCollapse) {
      sidebar.classList.add("collapsed");
      sidebarToggleIcon.className = "ph ph-caret-double-right";
      sidebarToggleBtn.title = "Expandir menú";
    } else {
      sidebar.classList.remove("collapsed");
      sidebarToggleIcon.className = "ph ph-caret-double-left";
      sidebarToggleBtn.title = "Colapsar menú";
    }
  };

  sidebarToggleBtn.addEventListener("click", () => {
    const isCollapsed = sidebar.classList.contains("collapsed");
    updateSidebarState(!isCollapsed);
  });

  const handleResize = () => {
    if (window.innerWidth <= 1024) {
      updateSidebarState(true);
    } else {
      updateSidebarState(false);
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize(); // Ejecutar al inicio para ajustar al tamaño actual
}

// ======= Cargar Volumen Guardado =======
function initVolume() {
  const savedVolume = localStorage.getItem("mexlify_volume");
  const savedMuted = localStorage.getItem("mexlify_muted");

  let volume = 0.5; // fallback predeterminado
  if (savedVolume !== null) {
    volume = parseFloat(savedVolume);
  }

  lastVolume = volume > 0 ? volume : 0.5;
  isMuted = savedMuted === "true";

  if (isMuted) {
    player.volume = 0;
    volumeSlider.value = 0;
    fcp_volumeSlider.value = 0;
  } else {
    player.volume = volume;
    volumeSlider.value = volume;
    fcp_volumeSlider.value = volume;
  }

  handleVolumeChange({ target: { value: isMuted ? 0 : volume } });
}

// ======= Cargar Última Canción Reproducida =======
function initLastSong() {
  const savedSongJson = localStorage.getItem("mexlify_last_song");
  const isLocal = localStorage.getItem("mexlify_last_song_local") === "true";

  if (savedSongJson) {
    try {
      const song = JSON.parse(savedSongJson);
      currentSong = song;
      currentSong.isDownloaded = isLocal;

      // Actualizar UI
      let coverImageUrl = song.thumbnail || "resources/player.gif";
      cover.src = coverImageUrl;
      fcp_cover.src = coverImageUrl;

      songTitle.textContent = cleanSongTitle(song.title);
      songArtist.textContent = song.uploader;
      fcp_songTitle.textContent = cleanSongTitle(song.title);
      fcp_songArtist.textContent = song.uploader;

      // Habilitar barra de progreso
      progressBar.disabled = false;
      fcpProgressBar.disabled = false;

      debugLog("Última canción cargada:", song.title);
    } catch (e) {
      debugLog("Error cargando última canción:", e);
    }
  }
}

// ======= Exportar música a ZIP =======
const exportZipBtn = document.getElementById("exportZipBtn");
if (exportZipBtn) {
  exportZipBtn.addEventListener("click", async () => {
    try {
      const downloadedSongs = await window.electronAPI.getDownloaded();
      if (!downloadedSongs || downloadedSongs.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Sin descargas",
          text: "No tienes canciones descargadas para exportar.",
          confirmButtonColor: "#000",
          confirmButtonText: "Entendido",
          background: "rgba(255, 255, 255, 0.95)",
        });
        return;
      }

      Swal.fire({
        title: "Exportando biblioteca...",
        html: "Comprimiendo tus canciones fuera de línea en un archivo ZIP. Por favor, espera...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
        background: "rgba(255, 255, 255, 0.95)",
      });

      const res = await window.electronAPI.exportDownloadsToZip();

      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "¡Exportación exitosa!",
          text: `Tu música se ha exportado correctamente en:\n${res.path}`,
          confirmButtonColor: "#000",
          confirmButtonText: "Genial",
          background: "rgba(255, 255, 255, 0.95)",
        });
      } else {
        if (res.error === "Operación cancelada por el usuario") {
          Swal.close();
        } else {
          Swal.fire({
            icon: "error",
            title: "Error al exportar",
            text: res.error || "Ocurrió un error desconocido al exportar.",
            confirmButtonColor: "#d33",
            confirmButtonText: "Cerrar",
            background: "rgba(255, 255, 255, 0.95)",
          });
        }
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error inesperado",
        text: err.message || "Ocurrió un error inesperado al procesar la exportación.",
        confirmButtonColor: "#d33",
        confirmButtonText: "Cerrar",
        background: "rgba(255, 255, 255, 0.95)",
      });
    }
  });
}

// Inicializar configuraciones guardadas
initVolume();
initLastSong();
renderMostPlayedCardCover();

// ======= PLAYLIST: MIS MÁS ESCUCHADAS (SQLite) =======
async function showMostPlayedList() {
  try {
    // 1. Navegar a la vista de countryTop que es la que se usa para listas detalladas
    navigateTo("countryTop");
    
    const container = document.getElementById("country-top-container");
    if (!container) return;
    
    container.innerHTML = "<h3>Mi Playlist - Cargando...</h3>";
    container.scrollIntoView({ behavior: "smooth" });
    
    // 2. Obtener canciones de SQLite
    const songs = await window.electronAPI.getMostPlayedSongs();
    
    if (!songs || songs.length === 0) {
      container.innerHTML = `
        <h3>Mi Playlist - Mis Más Escuchadas</h3>
        <div class="messages-empty-state" style="padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;">
          <i class="ph ph-music-notes" style="font-size:3rem; color:rgba(255,0,144,0.4);"></i>
          <p style="color: #fff; font-family: Poppins, sans-serif; font-size: 1.1rem; margin: 0;">Aún no tienes canciones en tu top personal.</p>
          <small style="color: rgba(255,255,255,0.6); max-width: 320px;">¡Reproduce tus canciones favoritas en la app para verlas listadas aquí!</small>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `<h3>Mi Playlist - Mis Más Escuchadas</h3>`;
    
    // Crear el botón "Reproducir todo"
    const btnPlayAll = document.createElement("button");
    btnPlayAll.id = "playAllbtn";
    btnPlayAll.className = "vaen-play-btn";
    btnPlayAll.textContent = "▶ Reproducir todo";
    btnPlayAll.style.marginBottom = "15px";
    container.appendChild(btnPlayAll);
    
    // Listado de tracks
    let htmlList = "<ol class='most-played-list' style='list-style: none; padding: 0; margin: 0;'>";
    songs.forEach((song, idx) => {
      const playCountText = song.playCount === 1 ? "reproducción" : "reproducciones";
      const thumb = song.thumbnail || "resources/player.gif";
      const dur = song.duration
        ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
        : "N/A";
        
      htmlList += `
        <li style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" class="most-played-item" data-index="${idx}">
          <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; flex: 1; padding-right: 15px;">
            <span style="font-weight: bold; color: rgba(255,255,255,0.5); min-width: 20px; font-family: Poppins, sans-serif;">${idx + 1}</span>
            <img src="${thumb}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer;" class="play-most-played-thumb">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <a href="#" class="play-song-link" style="font-weight: bold; text-decoration: none; color: #fff; font-family: Poppins, sans-serif; font-size: 0.95rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cleanSongTitle(song.title)}</a>
              <span style="color: rgba(255,255,255,0.6); font-size: 0.85rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${song.uploader}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 15px;">
            <span style="color: #aaa; font-size: 0.85rem; font-family: Poppins, sans-serif;">${dur}</span>
            <span style="color: #ff0090; font-size: 0.85rem; font-family: Poppins, sans-serif; font-weight: 700; background: rgba(255,0,144,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,0,144,0.2); white-space: nowrap;">${song.playCount} ${playCountText}</span>
          </div>
        </li>
      `;
    });
    htmlList += "</ol>";
    container.insertAdjacentHTML("beforeend", htmlList);
    
    // Click events
    const items = container.querySelectorAll(".most-played-item");
    items.forEach((item, idx) => {
      const song = songs[idx];
      const link = item.querySelector(".play-song-link");
      const thumb = item.querySelector(".play-most-played-thumb");
      
      const playThis = (e) => {
        if (e) e.preventDefault();
        
        // Cargar playlist completa en cola de reproducción
        queue = songs.map(s => ({
          title: s.title,
          uploader: s.uploader,
          duration: s.duration,
          thumbnail: s.thumbnail,
          filename: s.filename || null,
          url: s.url || null
        }));
        renderQueue();
        
        playSong(queue[idx], !!queue[idx].filename, idx);
        
        // Highlight active playing
        container.querySelectorAll(".play-song-link").forEach((a, i) => {
          a.style.color = (i === idx) ? "#ff0090" : "#fff";
        });
      };
      
      link.addEventListener("click", playThis);
      if (thumb) thumb.addEventListener("click", playThis);
    });
    
    // Play all button handler
    btnPlayAll.onclick = () => {
      queue = songs.map(s => ({
        title: s.title,
        uploader: s.uploader,
        duration: s.duration,
        thumbnail: s.thumbnail,
        filename: s.filename || null,
        url: s.url || null
      }));
      renderQueue();
      if (queue.length > 0) {
        playSong(queue[0], !!queue[0].filename, 0);
      }
    };
    
  } catch (err) {
    console.error("Error al cargar la playlist de más escuchadas:", err);
  }
}

async function playMostPlayedList(autoPlay = true) {
  try {
    const songs = await window.electronAPI.getMostPlayedSongs();
    if (!songs || songs.length === 0) {
      new Notify({
        status: "warning",
        title: "Playlist vacía",
        text: "¡Reproduce canciones en la app para llenar tu playlist!",
        effect: "fade",
      });
      showMostPlayedList(); // Show empty state
      return;
    }
    
    // Renders the list
    await showMostPlayedList();
    
    // If autoPlay requested, start playing first track immediately
    if (autoPlay) {
      queue = songs.map(s => ({
        title: s.title,
        uploader: s.uploader,
        duration: s.duration,
        thumbnail: s.thumbnail,
        filename: s.filename || null,
        url: s.url || null
      }));
      renderQueue();
      playSong(queue[0], !!queue[0].filename, 0);
    }
  } catch (err) {
    console.error("Error al reproducir más escuchadas:", err);
  }
}

// Export functions to global scope
window.showMostPlayedList = showMostPlayedList;
window.playMostPlayedList = playMostPlayedList;
window.renderMostPlayedCardCover = renderMostPlayedCardCover;

async function renderMostPlayedCardCover() {
  try {
    const coverContainer = document.getElementById("myMostPlayedCover");
    if (!coverContainer) return;
    
    const songs = await window.electronAPI.getMostPlayedSongs();
    
    if (!songs || songs.length === 0) {
      coverContainer.innerHTML = `<img src="resources/player.gif" class="spotify-cover-single">`;
      return;
    }
    
    const uniqueThumbs = [];
    for (const song of songs) {
      if (song.thumbnail && !uniqueThumbs.includes(song.thumbnail)) {
        uniqueThumbs.push(song.thumbnail);
      }
      if (uniqueThumbs.length === 4) break;
    }
    
    if (uniqueThumbs.length >= 4) {
      coverContainer.innerHTML = `
        <div class="spotify-cover-collage">
          <img src="${uniqueThumbs[0]}">
          <img src="${uniqueThumbs[1]}">
          <img src="${uniqueThumbs[2]}">
          <img src="${uniqueThumbs[3]}">
        </div>
      `;
    } else {
      const primaryCover = uniqueThumbs[0] || "resources/player.gif";
      coverContainer.innerHTML = `<img src="${primaryCover}" class="spotify-cover-single">`;
    }
  } catch (err) {
    console.error("Error al renderizar la portada de más escuchadas:", err);
  }
}

// ======= Funciones de Rediseño Premium (Mexlify UI/UX) =======

/**
 * highlightPlayingSong - Busca en todas las listas la canción actualmente reproducida y le añade clases/visualizador.
 */
function highlightPlayingSong() {
  const currentTitle = currentSong ? (currentSong.title || currentSong.Title || "").toLowerCase() : "";
  if (!currentTitle) return;

  const lists = ["#resultsList", "#downloadsList", "#recentsList", "#playlistSongsList"];
  lists.forEach((listId) => {
    const list = document.querySelector(listId);
    if (!list) return;
    const items = list.querySelectorAll("li");
    items.forEach((li) => {
      const bTag = li.querySelector(".song-info b");
      if (bTag) {
        const titleText = bTag.textContent.toLowerCase();
        if (titleText === currentTitle) {
          li.classList.add("is-playing");
          if (!li.querySelector(".active-playing-indicator")) {
            const indicator = document.createElement("div");
            indicator.className = "active-playing-indicator";
            indicator.innerHTML = `
              <span class="bar bar1"></span>
              <span class="bar bar2"></span>
              <span class="bar bar3"></span>
              <span class="bar bar4"></span>
            `;
            const infoContainer = li.querySelector(".song-info");
            if (infoContainer) {
              infoContainer.appendChild(indicator);
            }
          }
        } else {
          li.classList.remove("is-playing");
          const indicator = li.querySelector(".active-playing-indicator");
          if (indicator) indicator.remove();
        }
      }
    });
  });
}

// Inicialización de escuchadores interactivos al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  // 2. Filtro local para descargas
  const offlineFilterInput = document.getElementById("offlineFilterInput");
  if (offlineFilterInput) {
    offlineFilterInput.addEventListener("input", () => {
      const query = offlineFilterInput.value.toLowerCase().trim();
      const items = downloadsList.querySelectorAll("li");
      items.forEach((item) => {
        const titleElement = item.querySelector(".song-info b");
        const infoElement = item.querySelector(".song-info");
        const titleText = titleElement ? titleElement.textContent.toLowerCase() : "";
        const infoText = infoElement ? infoElement.textContent.toLowerCase() : "";
        
        if (titleText.includes(query) || infoText.includes(query)) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    });
  }

  // 3. Botón para limpiar historial de recents
  const clearRecentsBtn = document.getElementById("clearRecentsBtn");
  if (clearRecentsBtn) {
    clearRecentsBtn.addEventListener("click", () => {
      recentSongs = [];
      renderRecents();
      new Notify({
        status: "success",
        title: "Historial Limpiado",
        text: "Se ha vaciado la lista de canciones recientes.",
        effect: "fade",
        autotimeout: 2500
      });
    });
  }

  // 4. Color pickers sincronizados con etiquetas hex
  const color1Input = document.getElementById("color1");
  const color2Input = document.getElementById("color2");
  const color1HexLabel = document.getElementById("color1Hex");
  const color2HexLabel = document.getElementById("color2Hex");

  if (color1Input && color1HexLabel) {
    color1Input.addEventListener("input", () => {
      color1HexLabel.textContent = color1Input.value.toUpperCase();
    });
  }
  if (color2Input && color2HexLabel) {
    color2Input.addEventListener("input", () => {
      color2HexLabel.textContent = color2Input.value.toUpperCase();
    });
  }
});


