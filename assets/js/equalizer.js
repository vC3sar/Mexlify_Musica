document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - Iniciando equalizer");

  // Obtener el elemento de audio
  const audioElement = document.getElementById("player");
  const presetSelect = document.getElementById("presets");

  // Validar que los elementos existen
  if (!audioElement) {
    console.error("Error: No se encontró el elemento con id 'player'");
    return;
  }

  if (!presetSelect) {
    console.error("Error: No se encontró el elemento con id 'presets'");
    return;
  }

  console.log("Elementos encontrados correctamente");

  // Crear un contexto de audio
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Crear el nodo de origen del audio
  const audioSourceNode = audioContext.createMediaElementSource(audioElement);

  // Crear nodos de ganancia para cada banda
  const gainNodeLow = audioContext.createGain(); // Grave (Low)
  const gainNodeMid = audioContext.createGain(); // Medio (Mid)
  const gainNodeHigh = audioContext.createGain(); // Agudo (High)
  const gainNodeUltraHigh = audioContext.createGain(); // Ultra agudo (Ultra High)

  // Crear filtros para las frecuencias de cada banda
  const lowShelf = audioContext.createBiquadFilter(); // Filtro grave
  lowShelf.type = "lowshelf";
  lowShelf.frequency.setValueAtTime(80, audioContext.currentTime);

  const midShelf = audioContext.createBiquadFilter(); // Filtro medio
  midShelf.type = "peaking";
  midShelf.frequency.setValueAtTime(1000, audioContext.currentTime);
  midShelf.Q.setValueAtTime(1, audioContext.currentTime);

  const highShelf = audioContext.createBiquadFilter(); // Filtro agudo
  highShelf.type = "highshelf";
  highShelf.frequency.setValueAtTime(5000, audioContext.currentTime);

  const ultraHighShelf = audioContext.createBiquadFilter(); // Filtro ultra agudo
  ultraHighShelf.type = "highshelf";
  ultraHighShelf.frequency.setValueAtTime(12000, audioContext.currentTime);

  // Conectar el audio a través de los nodos de EQ
  audioSourceNode.connect(lowShelf);
  lowShelf.connect(gainNodeLow);
  gainNodeLow.connect(midShelf);
  midShelf.connect(gainNodeMid);
  gainNodeMid.connect(highShelf);
  highShelf.connect(gainNodeHigh);
  gainNodeHigh.connect(ultraHighShelf);
  ultraHighShelf.connect(gainNodeUltraHigh);

  // Conectar al destino de salida (altavoces)
  gainNodeUltraHigh.connect(audioContext.destination);

  console.log("Nodos de audio conectados correctamente");

  // Detectar cuando el audio empieza a reproducirse
  audioElement.addEventListener("play", () => {
    console.log("Audio play - estado del contexto:", audioContext.state);
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        console.log("Contexto de audio reanudado");
      });
    }
  });

  // Configuración de presets con valores para cada banda
  const presets = {
    flat: [1, 1, 1, 1],
    bassBoost: [1.6, 1, 0.9, 0.8],
    trebleBoost: [0.8, 1, 1.2, 1.3],
    vocal: [1, 1.2, 0.9, 0.8],
  };

  // Función para aplicar el preset seleccionado
  function applyPreset(name) {
    console.log(`Aplicando preset: ${name}`);
    const gains = presets[name];

    if (!gains) {
      console.error(`Preset '${name}' no encontrado`);
      return;
    }

    console.log(`Valores de ganancia: [${gains.join(", ")}]`);

    gainNodeLow.gain.setValueAtTime(gains[0], audioContext.currentTime);
    gainNodeMid.gain.setValueAtTime(gains[1], audioContext.currentTime);
    gainNodeHigh.gain.setValueAtTime(gains[2], audioContext.currentTime);
    gainNodeUltraHigh.gain.setValueAtTime(gains[3], audioContext.currentTime);

    console.log("Preset aplicado exitosamente");
  }

  // Detectar la selección de un preset
  presetSelect.addEventListener("change", (e) => {
    const selectedPreset = e.target.value;
    console.log(`Preset seleccionado desde selector: ${selectedPreset}`);
    localStorage.setItem("eqPreset", selectedPreset);
    applyPreset(selectedPreset);
  });

  // También detectar con input por si acaso
  presetSelect.addEventListener("input", (e) => {
    const selectedPreset = e.target.value;
    console.log(`Preset seleccionado (input): ${selectedPreset}`);
    localStorage.setItem("eqPreset", selectedPreset);
    applyPreset(selectedPreset);
  });

  console.log("Event listeners agregados al selector");
  console.log("Valor inicial del selector:", presetSelect.value);

  // Aplicar preset por defecto
  if (localStorage.getItem("eqPreset")) {
    const savedPreset = localStorage.getItem("eqPreset");
    console.log(`Cargando preset guardado: ${savedPreset}`);
    presetSelect.value = savedPreset;
    applyPreset(savedPreset);
  } else {
    console.log("Aplicando preset por defecto: flat");
    applyPreset("flat");
  }
  console.log("Inicialización completa");
});
