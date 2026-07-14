document.addEventListener("DOMContentLoaded", () => {
  // ======= 6. CONFIGURACIÓN SEPARADA =======
  const CONFIG = {
    frequencies: {
      low: 80,
      mid: 1000,
      high: 5000,
      ultraHigh: 12000
    },
    midQ: 1.0,
    rampTime: 0.05, // Tiempo de rampa suave (~0.05s) para evitar clicks
    storageKey: "eqPreset",
    defaultPreset: "flat"
  };

  // Ajustes de presets con coeficientes de ganancia para cada banda
  const PRESETS = {
    flat: [1.0, 1.0, 1.0, 1.0],
    bassBoost: [1.6, 1.0, 0.9, 0.8],
    trebleBoost: [0.8, 1.0, 1.2, 1.3],
    vocal: [1.0, 1.2, 0.9, 0.8]
  };

  // ======= 2. CONTROL DE LOGS EN PRODUCCIÓN =======
  const DEBUG = false;

  /**
   * Imprime mensajes de depuración en consola si DEBUG está activo.
   * @param {...any} args - Argumentos a imprimir.
   */
  function log(...args) {
    if (DEBUG) {
      console.log("[EQ-DEBUG]", ...args);
    }
  }

  // Obtener elementos de la interfaz
  const audioElement = document.getElementById("player");
  const presetSelect = document.getElementById("presets");

  // Validaciones iniciales del DOM
  if (!audioElement) {
    console.error("Error en ecualizador: No se encontró el elemento con ID 'player'");
    return;
  }
  if (!presetSelect) {
    console.error("Error en ecualizador: No se encontró el elemento con ID 'presets'");
    return;
  }

  log("Elementos de interfaz vinculados con éxito.");

  // ======= 4. ARQUITECTURA: CLASE EQUALIZER =======
  /**
   * Clase que gestiona el ecualizador de audio utilizando la Web Audio API.
   */
  class Equalizer {
    #ctx = null;
    #nodes = null;
    #initialized = false;
    #pendingPreset = null;

    /**
     * Inicializa el contexto de audio y los nodos de filtrado.
     * El contexto solo se creará si el navegador lo soporta.
     * @param {HTMLAudioElement} audioEl - Elemento de audio HTML5.
     * @returns {boolean} True si la inicialización fue exitosa, false en caso contrario.
     */
    init(audioEl) {
      if (this.#initialized) return true;

      // ======= 7. DETECCIÓN DE SOPORTE =======
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.error("Error: Web Audio API no es soportada por este navegador. El audio se reproducirá sin EQ.");
        return false;
      }

      // ======= 3. MANEJO DE ERRORES EN AUDIO CONTEXT =======
      try {
        this.#ctx = new AudioContextClass();
        const source = this.#ctx.createMediaElementSource(audioEl);

        // Crear filtros de frecuencia
        const lowShelf = this.#ctx.createBiquadFilter();
        lowShelf.type = "lowshelf";
        lowShelf.frequency.setValueAtTime(CONFIG.frequencies.low, this.#ctx.currentTime);

        const midShelf = this.#ctx.createBiquadFilter();
        midShelf.type = "peaking";
        midShelf.frequency.setValueAtTime(CONFIG.frequencies.mid, this.#ctx.currentTime);
        midShelf.Q.setValueAtTime(CONFIG.midQ, this.#ctx.currentTime);

        const highShelf = this.#ctx.createBiquadFilter();
        highShelf.type = "highshelf";
        highShelf.frequency.setValueAtTime(CONFIG.frequencies.high, this.#ctx.currentTime);

        const ultraHighShelf = this.#ctx.createBiquadFilter();
        ultraHighShelf.type = "highshelf";
        ultraHighShelf.frequency.setValueAtTime(CONFIG.frequencies.ultraHigh, this.#ctx.currentTime);

        // Crear nodos de ganancia para cada banda
        const gainLow = this.#ctx.createGain();
        const gainMid = this.#ctx.createGain();
        const gainHigh = this.#ctx.createGain();
        const gainUltraHigh = this.#ctx.createGain();

        // Conectar la cadena de audio: source -> filtros -> ganancias -> salida
        source.connect(lowShelf);
        lowShelf.connect(gainLow);

        gainLow.connect(midShelf);
        midShelf.connect(gainMid);

        gainMid.connect(highShelf);
        highShelf.connect(gainHigh);

        gainHigh.connect(ultraHighShelf);
        ultraHighShelf.connect(gainUltraHigh);

        gainUltraHigh.connect(this.#ctx.destination);

        // Guardar las referencias de los nodos
        this.#nodes = {
          gainLow,
          gainMid,
          gainHigh,
          gainUltraHigh
        };

        this.#initialized = true;
        log("Contexto de Web Audio API y nodos creados con éxito.");

        // Si había un preset pendiente seleccionado antes de dar play, aplicarlo
        if (this.#pendingPreset) {
          log(`Aplicando preset diferido: ${this.#pendingPreset}`);
          this.applyPreset(this.#pendingPreset);
          this.#pendingPreset = null;
        }

        return true;
      } catch (err) {
        console.error("Error crítico inicializando AudioContext:", err);
        this.#ctx = null;
        this.#nodes = null;
        this.#initialized = false;
        return false;
      }
    }

    /**
     * Reanuda de forma segura el contexto de audio si está suspendido.
     * @returns {Promise<void>}
     */
    async resume() {
      if (this.#ctx && this.#ctx.state === "suspended") {
        try {
          await this.#ctx.resume();
          log("Contexto de audio reanudado.");
        } catch (err) {
          log("Error reanudando AudioContext:", err);
        }
      }
    }

    /**
     * Aplica de forma suave los cambios de ganancia de un preset determinado.
     * @param {string} name - Nombre del preset de EQ.
     */
    applyPreset(name) {
      // Validar si el preset existe, si no, aplicar fallback "flat"
      let presetName = name;
      if (!PRESETS[presetName]) {
        log(`Advertencia: El preset '${name}' no existe. Aplicando fallback '${CONFIG.defaultPreset}'.`);
        presetName = CONFIG.defaultPreset;
      }

      const gains = PRESETS[presetName];

      // ======= 8. FLUJO CORRECTO: Si no está inicializado, guardar como pendiente =======
      if (!this.#initialized || !this.#nodes || !this.#ctx) {
        this.#pendingPreset = presetName;
        log(`Guardando preset '${presetName}' como pendiente hasta inicialización.`);
        return;
      }

      // ======= 5. TRANSICIONES SUAVES (linearRampToValueAtTime) =======
      try {
        const now = this.#ctx.currentTime;
        const ramp = CONFIG.rampTime;

        const targetBands = [
          { node: this.#nodes.gainLow, value: gains[0] },
          { node: this.#nodes.gainMid, value: gains[1] },
          { node: this.#nodes.gainHigh, value: gains[2] },
          { node: this.#nodes.gainUltraHigh, value: gains[3] }
        ];

        targetBands.forEach((band) => {
          // Anclar el valor inicial de la ganancia al valor actual para evitar chasquidos
          band.node.gain.setValueAtTime(band.node.gain.value, now);
          // Rampa lineal hacia el valor objetivo en rampTime segundos
          band.node.gain.linearRampToValueAtTime(band.value, now + ramp);
        });

        log(`Preset '${presetName}' aplicado exitosamente con transiciones suaves.`);
      } catch (err) {
        log("Error aplicando rampa de presets:", err);
      }
    }
  }

  // Instanciar el gestor del ecualizador
  const eq = new Equalizer();

  // ======= 3. MANEJO DE ERRORES EN LOCAL STORAGE & FALLBACK =======
  let initialPreset = CONFIG.defaultPreset;
  try {
    const savedPreset = localStorage.getItem(CONFIG.storageKey);
    if (savedPreset) {
      if (PRESETS[savedPreset]) {
        initialPreset = savedPreset;
        log(`Cargado preset guardado en localStorage: ${initialPreset}`);
      } else {
        log(`Preset guardado '${savedPreset}' no es válido. Fallback: ${CONFIG.defaultPreset}`);
        localStorage.setItem(CONFIG.storageKey, CONFIG.defaultPreset);
      }
    }
  } catch (err) {
    log("Acceso a localStorage deshabilitado o no disponible en este navegador.", err);
  }

  // Sincronizar el select de la interfaz
  presetSelect.value = initialPreset;
  // Guardar el preset inicial en el ecualizador (se aplicará al iniciar el reproductor)
  eq.applyPreset(initialPreset);

  // ======= 8. FLUJO DE INICIALIZACIÓN POR EVENTO PLAY =======
  audioElement.addEventListener("play", () => {
    log("Evento 'play' detectado. Inicializando ecualizador...");
    const ok = eq.init(audioElement);
    if (ok) {
      eq.resume();
    }
  });

  // ======= 1. BUG: UN SOLO EVENT LISTENER PARA EL SELECT =======
  presetSelect.addEventListener("change", (e) => {
    const selectedPreset = e.target.value;
    log(`Preset cambiado manualmente en interfaz a: ${selectedPreset}`);
    
    // Guardar en localStorage de forma segura
    try {
      localStorage.setItem(CONFIG.storageKey, selectedPreset);
    } catch (err) {
      log("No se pudo escribir en localStorage:", err);
    }

    // Aplicar al ecualizador
    eq.applyPreset(selectedPreset);
  });

  log("Módulo de ecualización cargado y escuchando eventos.");
});
