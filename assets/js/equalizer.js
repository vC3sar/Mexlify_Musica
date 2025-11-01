document.addEventListener("DOMContentLoaded", () => {
  // Obtener el elemento de audio
  const audioElement = document.getElementById("player");

  // Crear un contexto de audio
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Crear el nodo de origen del audio
  const audioSourceNode = audioContext.createMediaElementSource(audioElement);

  // Crear un ecualizador (con 5 bandas: grave, medio, agudo, super-agudo y ultra-grave)
  const gainNodeLow = audioContext.createGain(); // Grave (Low)
  const gainNodeMid = audioContext.createGain(); // Medio (Mid)
  const gainNodeHigh = audioContext.createGain(); // Agudo (High)
  const gainNodeUltraHigh = audioContext.createGain(); // Ultra agudo (Ultra High)

  // Crear filtros para las frecuencias de cada banda
  const lowShelf = audioContext.createBiquadFilter(); // Filtro grave
  lowShelf.type = "lowshelf";
  lowShelf.frequency.setValueAtTime(80, audioContext.currentTime); // Frecuencia de corte de los graves (80Hz)

  const midShelf = audioContext.createBiquadFilter(); // Filtro medio
  midShelf.type = "peaking";
  midShelf.frequency.setValueAtTime(1000, audioContext.currentTime); // Frecuencia de corte de los medios (1000Hz)

  const highShelf = audioContext.createBiquadFilter(); // Filtro agudo
  highShelf.type = "highshelf";
  highShelf.frequency.setValueAtTime(5000, audioContext.currentTime); // Frecuencia de corte de los agudos (5000Hz)

  const ultraHighShelf = audioContext.createBiquadFilter(); // Filtro ultra agudo
  ultraHighShelf.type = "highshelf";
  ultraHighShelf.frequency.setValueAtTime(12000, audioContext.currentTime); // Frecuencia de corte de los ultra-agudos (12000Hz)

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

  // Control de ganancia para evitar saturación y mejorar la claridad
  gainNodeLow.gain.setValueAtTime(1.4, audioContext.currentTime); // Aumentar los graves para claridad, pero sin distorsionar
  gainNodeMid.gain.setValueAtTime(1, audioContext.currentTime); // Ganancia normal para medios
  gainNodeHigh.gain.setValueAtTime(0.9, audioContext.currentTime); // Reducir ligeramente los agudos
  gainNodeUltraHigh.gain.setValueAtTime(0.8, audioContext.currentTime); // Reducir los ultra-agudos para evitar saturación

  // Detectar cuando el audio empieza a reproducirse
  audioElement.addEventListener("play", () => {
    // Iniciar la reproducción del audio solo cuando se detecte que ha comenzado
    if (audioContext.state === "suspended") {
      audioContext.resume(); // Asegura que el contexto de audio esté activo
    }
  });
});
