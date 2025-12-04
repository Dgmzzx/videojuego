document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas")
  const ctx = canvas.getContext("2d")

  // Variables para el sistema de audio
  let audioContext = null
  let audioInteractionRequired = true;
  let audioActivated = false;

  // Inicializar AudioContext inmediatamente
  initAudioContext();

  // Ajustar tamaño del canvas
  function resizeCanvas() {
    const maxWidth = Math.min(800, window.innerWidth - 40)
    const maxHeight = window.innerHeight - 200
    canvas.width = maxWidth
    canvas.height = Math.min(600, maxHeight)
  }

  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  canvas.focus()
  canvas.tabIndex = 0

  // Variables del juego
  let gameState = "menu"
  let score = 0
  let lives = 3
  let level = 1
  let ballAttached = true
  let soundEnabled = true
  let combo = 1
  let comboTimeout = null
  let lastBrickHitTime = 0
  let isPaused = false
  let bgMusic = null;

  // Configuración
  let difficulty = "normal"
  let ballBaseSpeed = 5

  // ========================================
  // CONFIGURACIONES
  // ========================================
  let settings = {
    // Audio
    sfxVolume: 1.0,
    musicVolume: 1.0,
    muteAll: false,
    
    // Jugabilidad
    difficulty: "normal",
    
    // Visual
    brightness: 1.0,
    showTrail: true,
    showParticles: true,
    
    // Accesibilidad
    colorblindMode: false,
    reduceAnimations: false,
    
    // Datos
    highScore: 0
  }

  // ========================================
  // SISTEMA DE AUDIO MEJORADO
  // ========================================
  
  function initAudioContext() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        console.log("AudioContext inicializado correctamente")
        
        // Intentar reanudar inmediatamente
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log("AudioContext reanudado automáticamente");
          });
        }
      } catch (e) {
        console.log("No se pudo crear el AudioContext:", e)
        soundEnabled = false
      }
    }
  }
  
  function initBackgroundMusic() {
    bgMusic = document.getElementById("bg-music");
    if (bgMusic) {
      bgMusic.volume = settings.musicVolume;
      bgMusic.muted = settings.muteAll;
    }
  }

  function playBackgroundMusic() {
    if (bgMusic && !settings.muteAll) {
      bgMusic.volume = settings.musicVolume;
      bgMusic.play().catch(e => {
        console.log("Error al reproducir música:", e);
      });
    }
  }

  function pauseBackgroundMusic() {
    if (bgMusic) {
      bgMusic.pause();
    }
  }

  function stopBackgroundMusic() {
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
  }
  
  function playSound(type, frequency, duration = 0.1, waveType = "square") {
    // Verificar si el audio está habilitado
    if (!soundEnabled || settings.muteAll || type === "music") return;
    
    // Asegurarse de que AudioContext esté listo
    if (!audioContext) {
      initAudioContext();
      return;
    }
    
    try {
      // Reanudar AudioContext si está suspendido
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          // Reintentar reproducir el sonido después de reanudar
          setTimeout(() => playSound(type, frequency, duration, waveType), 50);
        });
        return;
      }
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.type = waveType
      oscillator.frequency.value = frequency
      gainNode.gain.value = 0.1 * settings.sfxVolume
      
      const currentTime = audioContext.currentTime
      oscillator.start(currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration)
      oscillator.stop(currentTime + duration)
      
    } catch (e) {
      console.log("Error al reproducir sonido:", e)
    }
  }
  
  function playWinSound() {
    if (!soundEnabled || !audioContext || settings.muteAll) return
    
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      const frequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51]
      const times = [0, 0.1, 0.2, 0.3, 0.4]
      
      times.forEach((time, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.type = "sine"
        oscillator.frequency.value = frequencies[index]
        gainNode.gain.value = 0.1 * settings.sfxVolume
        
        const currentTime = audioContext.currentTime
        oscillator.start(currentTime + time)
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + time + 0.3)
        oscillator.stop(currentTime + time + 0.3)
      })
      
    } catch (e) {
      console.log("Error al reproducir sonido de victoria:", e)
    }
  }
  
  function playGameOverSound() {
    if (!soundEnabled || !audioContext || settings.muteAll) return
    
    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.type = "sawtooth"
      const currentTime = audioContext.currentTime
      oscillator.frequency.setValueAtTime(200, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(50, currentTime + 1)
      
      gainNode.gain.value = 0.1 * settings.sfxVolume
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 1)
      
      oscillator.start(currentTime)
      oscillator.stop(currentTime + 1)
      
    } catch (e) {
      console.log("Error al reproducir sonido de game over:", e)
    }
  }
  
  const sounds = {
    brickHit: () => playSound("hit", 960, 0.1, "square"),
    paddleHit: () => playSound("hit", 800, 0.1, "square"),
    wallHit: () => playSound("hit", 640, 0.1, "square"),
    loseLife: () => playSound("hit", 560, 0.15, "square"),
    launch: () => playSound("hit", 1200, 0.1, "square"),
    buttonHover: () => playSound("ui", 1040, 0.05, "square"),
    buttonClick: () => playSound("ui", 800, 0.08, "square"),
    powerUp: () => playSound("powerup", 880, 0.12, "sine"),
    combo: () => playSound("combo", 1120, 0.1, "triangle"),
    win: () => playWinSound(),
    gameOver: () => playGameOverSound(),
  }

  // ========================================
  // SISTEMA DE ACTIVACIÓN DE AUDIO
  // ========================================

  // Función para activar el audio
  function activateAudio() {
    if (audioActivated) return;
    
    audioActivated = true;
    initAudioContext();
    
    // Ocultar mensaje
    const audioMessage = document.getElementById('audio-interaction-message');
    if (audioMessage) {
      audioMessage.classList.add('hidden');
    }
    
    // Intentar reproducir música
    if (gameState === "menu" && bgMusic && !settings.muteAll) {
      playBackgroundMusic();
    }
    
    // Reproducir sonido de confirmación
    setTimeout(() => {
      if (soundEnabled && !settings.muteAll) {
        sounds.buttonClick();
      }
    }, 300);
    
    console.log("Audio activado por interacción del usuario");
  }

  // Mostrar mensaje de audio si es necesario
  function checkAudioStatus() {
    // Verificar si el audio está bloqueado (esto es una aproximación)
    if (audioContext && audioContext.state === 'running') {
      audioInteractionRequired = false;
      const audioMessage = document.getElementById('audio-interaction-message');
      if (audioMessage) {
        audioMessage.classList.add('hidden');
      }
    } else {
      // Mostrar mensaje después de un breve retraso si el audio no se activó
      setTimeout(() => {
        if (!audioActivated && audioInteractionRequired) {
          const audioMessage = document.getElementById('audio-interaction-message');
          if (audioMessage) {
            audioMessage.classList.remove('hidden');
          }
        }
      }, 1000);
    }
  }

  // Event listeners globales para activar audio
  function setupAudioActivation() {
    const activationEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
    
    activationEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (!audioActivated) {
          activateAudio();
        }
      }, { once: false });
    });
  }

  // ========================================
  // SISTEMA DE PESTAÑAS
  // ========================================
  function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn')
    const tabPanels = document.querySelectorAll('.tab-panel')

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab')
        
        // Remover clase active de todos los botones y paneles
        tabButtons.forEach(btn => btn.classList.remove('active'))
        tabPanels.forEach(panel => panel.classList.remove('active'))
        
        // Agregar clase active al botón y panel seleccionado
        button.classList.add('active')
        document.getElementById(`tab-${targetTab}`).classList.add('active')
        
        // Sonido al cambiar de pestaña
        sounds.buttonClick()
      })
    })
  }

  // Cargar configuraciones guardadas
  function loadSettings() {
    const saved = localStorage.getItem('neonBreakerSettings')
    if (saved) {
      const parsed = JSON.parse(saved)
      settings = { ...settings, ...parsed }
      applySettings()
    }
    updateSettingsUI()
  }

  // Guardar configuraciones
  function saveSettings() {
    localStorage.setItem('neonBreakerSettings', JSON.stringify(settings))
  }

  // Aplicar configuraciones al juego
  function applySettings() {
    // Audio
    soundEnabled = !settings.muteAll
    
    // Aplicar configuración de música inmediatamente
    if (bgMusic) {
      bgMusic.volume = settings.musicVolume;
      bgMusic.muted = settings.muteAll;
    }
    
    // Jugabilidad
    difficulty = settings.difficulty
    
    // Visual - aplicar brillo al canvas
    canvas.style.filter = `brightness(${settings.brightness})`
    
    // Actualizar UI
    const toggleBtn = document.getElementById("sound-toggle")
    toggleBtn.textContent = soundEnabled ? "🔊" : "🔇"
    toggleBtn.classList.toggle("muted", !soundEnabled)
    
    // Inicializar audio si está habilitado
    if (soundEnabled) {
      initAudioContext();
    }
  }

  // Actualizar UI de configuraciones
  function updateSettingsUI() {
    // Audio
    document.getElementById('sfx-volume-slider').value = settings.sfxVolume * 100
    document.getElementById('sfx-volume-value').textContent = Math.round(settings.sfxVolume * 100) + '%'
    document.getElementById('music-volume-slider').value = settings.musicVolume * 100
    document.getElementById('music-volume-value').textContent = Math.round(settings.musicVolume * 100) + '%'
    document.getElementById('mute-all-checkbox').checked = settings.muteAll
    
    // Jugabilidad
    document.getElementById('difficulty-select').value = settings.difficulty
    
    // Visual
    document.getElementById('brightness-slider').value = settings.brightness * 100
    document.getElementById('brightness-value').textContent = Math.round(settings.brightness * 100) + '%'
    document.getElementById('trail-checkbox').checked = settings.showTrail
    document.getElementById('particles-checkbox').checked = settings.showParticles
    
    // Accesibilidad
    document.getElementById('colorblind-mode-checkbox').checked = settings.colorblindMode
    document.getElementById('reduce-animations-checkbox').checked = settings.reduceAnimations
    
    // Datos
    document.getElementById('current-level-data').textContent = level
    document.getElementById('high-score-data').textContent = settings.highScore
  }

  // Actualizar récord
  function updateHighScore() {
    if (score > settings.highScore) {
      settings.highScore = score
      saveSettings()
      document.getElementById('high-score-data').textContent = settings.highScore
    }
  }

  // Colores para modo daltónico
  const normalColors = ["#00f5ff", "#ff00ff", "#00ff88", "#ffaa00", "#ff0080"]
  const colorblindColors = ["#0173B2", "#DE8F05", "#029E73", "#CC78BC", "#CA9161"]

  function getCurrentColors() {
    return settings.colorblindMode ? colorblindColors : normalColors
  }

  // Sistema de partículas y animaciones
  const particles = []
  let screenShake = 0

  // Power-ups
  const powerUps = []
  const powerUpTypes = {
    EXTRA_LIFE: { color: "#00ff88", effect: "Vida extra" },
    EXPAND_PADDLE: { color: "#ffaa00", effect: "Paleta grande" },
    SLOW_BALL: { color: "#00f5ff", effect: "Bola lenta" },
    MULTI_BALL: { color: "#ff00ff", effect: "Bolas múltiples" },
    GUN_POWER: { color: "#ff0000", effect: "Pistola" }, // NUEVO POWER-UP
  }

  // Sistema de balas para el power-up de pistola
  const bullets = []
  let gunActive = false
  let gunActiveUntil = 0
  const bulletSpeed = 10
  const bulletWidth = 4
  const bulletHeight = 10

  // Bolas múltiples
  const balls = []

  // Paleta del jugador
  const paddle = {
    width: 100,
    height: 15,
    x: 0,
    y: 0,
    speed: 8,
    dx: 0,
    color: "#00f5ff",
    originalWidth: 100,
  }

  // Bola principal
  const ball = {
    x: 0,
    y: 0,
    radius: 8,
    dx: 0,
    dy: -5,
    color: "#ff00ff",
    originalSpeed: 5,
  }

  // Bloques
  let bricks = []
  const brickColors = ["#00f5ff", "#ff00ff", "#00ff88", "#ffaa00", "#ff0080"]
  const brickRowCount = 5
  const brickColumnCount = 7
  const brickWidth = 85
  const brickHeight = 25
  const brickPadding = 10
  const brickOffsetTop = 80
  let brickOffsetLeft = 0

  // Sistema de partículas
  function createParticles(x, y, color, count = 5) {
    if (!settings.showParticles) return
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 8,
        speedY: (Math.random() - 0.5) * 8,
        color: color,
        life: 30,
        maxLife: 30,
      })
    }
  }

  function updateParticles() {
    if (!settings.showParticles) return
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.speedX
      p.y += p.speedY
      p.life--
      p.speedY += 0.1

      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.shadowBlur = 10
      ctx.shadowColor = p.color
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      if (p.life <= 0) {
        particles.splice(i, 1)
      }
    }
  }

  function applyScreenShake() {
    if (settings.reduceAnimations) return
    
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake)
      screenShake *= 0.9
      if (screenShake < 0.5) screenShake = 0
    }
  }

  function showLevelIndicator() {
    if (settings.reduceAnimations) return
    
    const indicator = document.createElement("div")
    indicator.className = "level-indicator"
    indicator.textContent = `NIVEL ${level}`
    indicator.style.animation = "fadeInScale 0.5s ease, fadeOut 0.5s ease 1.5s forwards"
    document.querySelector(".game-container").appendChild(indicator)

    setTimeout(() => {
      indicator.remove()
    }, 2000)
  }

  function initGame() {
    paddle.x = canvas.width / 2 - paddle.width / 2
    paddle.y = canvas.height - (isMobile() ? 80 : 40)

    ball.x = canvas.width / 2
    ball.y = paddle.y - ball.radius - 2
    ball.dx = 0
    ball.dy = -ballBaseSpeed
    ballAttached = true

    balls.length = 0
    balls.push({ ...ball })

    powerUps.length = 0
    bullets.length = 0
    gunActive = false
    gunActiveUntil = 0

    combo = 1
    updateComboDisplay()

    createBricks()
    animateBricksEntrance()

    showLevelIndicator()
  }

  function isMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      "ontouchstart" in window ||
      window.innerWidth <= 768
    )
  }

  function createBricks() {
    bricks = []
    const cols = Math.min(brickColumnCount, Math.floor((canvas.width - 40) / (brickWidth + brickPadding)))
    const totalBricksWidth = cols * brickWidth + (cols - 1) * brickPadding
    brickOffsetLeft = (canvas.width - totalBricksWidth) / 2

    let rows = brickRowCount
    if (difficulty === "easy") rows = Math.max(3, rows - 1)
    if (difficulty === "hard") rows = rows + 1

    const colors = getCurrentColors()

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Determinar si este bloque debe estar visible según el patrón del nivel
        const shouldBeVisible = isBrickVisibleInPattern(row, col, cols, rows)
        
        if (!shouldBeVisible) continue // Saltar este bloque si no debe estar visible
        
        const brickX = brickOffsetLeft + col * (brickWidth + brickPadding)
        const brickY = brickOffsetTop + row * (brickHeight + brickPadding)

        // NUEVA LÓGICA: Determinar golpes requeridos según el nivel
        let hitsRequired = 1
        
        if (level >= 2) {
          // A partir del nivel 2, algunos bloques requieren más golpes
          if (level === 2) {
            // Nivel 2: 70% bloques de 1 golpe, 30% de 2 golpes
            hitsRequired = Math.random() < 0.7 ? 1 : 2
          } else if (level === 3) {
            // Nivel 3: 50% de 1 golpe, 40% de 2 golpes, 10% de 3 golpes
            const rand = Math.random()
            if (rand < 0.5) hitsRequired = 1
            else if (rand < 0.9) hitsRequired = 2
            else hitsRequired = 3
          } else if (level >= 4) {
            // Nivel 4+: 40% de 1 golpe, 40% de 2 golpes, 20% de 3 golpes
            const rand = Math.random()
            if (rand < 0.4) hitsRequired = 1
            else if (rand < 0.8) hitsRequired = 2
            else hitsRequired = 3
          }
        }

        bricks.push({
          x: brickX,
          y: brickY,
          originalY: brickY,
          width: brickWidth,
          height: brickHeight,
          color: colors[row % colors.length],
          visible: true,
          hitsRequired: hitsRequired,
          hits: 0,
        })
      }
    }
  }

  // Nueva función para determinar patrones de bloques por nivel
  function isBrickVisibleInPattern(row, col, cols, rows) {
    // Patrón para nivel 1: todos los bloques visibles
    if (level === 1) {
      return true;
    }
    
    // Patrón para nivel 2: patrón de tablero de ajedrez
    if (level === 2) {
      return (row + col) % 2 === 0;
    }
    
    // Patrón para nivel 3: forma de pirámide
    if (level === 3) {
      const middle = Math.floor(cols / 2);
      const distanceFromMiddle = Math.abs(col - middle);
      return row >= distanceFromMiddle && row < rows - distanceFromMiddle;
    }
    
    // Patrón para nivel 4: forma de cruz
    if (level === 4) {
      const middleRow = Math.floor(rows / 2);
      const middleCol = Math.floor(cols / 2);
      return row === middleRow || col === middleCol;
    }
    
    // Patrón para nivel 5: forma de círculo
    if (level === 5) {
      const centerRow = (rows - 1) / 2;
      const centerCol = (cols - 1) / 2;
      const distance = Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
      return distance < Math.min(rows, cols) / 2;
    }
    
    // Para niveles más altos, patrones aleatorios
    if (level > 5) {
      // Patrones específicos para niveles 6-10
      const patterns = [
        () => col % 3 === 0, // Columnas cada 3
        () => row % 2 === 0, // Filas pares
        () => (row + col) % 3 === 0, // Diagonal cada 3
        () => col < row + 1, // Triángulo inferior derecho
        () => col + row >= cols - 1, // Triángulo superior izquierdo
      ];
      
      const patternIndex = (level - 6) % patterns.length;
      return patterns[patternIndex]();
    }
    
    // Por defecto, todos visibles
    return true;
  }

  function animateBricksEntrance() {
    if (settings.reduceAnimations) {
      bricks.forEach(brick => {
        brick.y = brick.originalY;
        brick.visible = true;
      });
      return;
    }
    
    // Animar solo los bloques que son visibles según el patrón
    let visibleIndex = 0;
    bricks.forEach((brick, index) => {
      // Iniciar todos los bloques fuera de pantalla
      brick.y = -50;
      
      // Animar solo los que deben ser visibles
      if (brick.visible) {
        setTimeout(() => {
          animateBrickToPosition(brick, brick.originalY);
        }, visibleIndex * 30); // Animación más rápida
        visibleIndex++;
      }
    });
  }

  function animateBrickToPosition(brick, targetY) {
    const startY = brick.y
    const duration = 400
    const startTime = Date.now()

    function animate() {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeProgress = 1 - Math.pow(1 - progress, 3)
      brick.y = startY + (targetY - startY) * easeProgress

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }

  function createPowerUp(x, y) {
    if (Math.random() < 0.2) {
      const types = Object.keys(powerUpTypes)
      const randomType = types[Math.floor(Math.random() * types.length)]

      powerUps.push({
        x: x,
        y: y,
        width: 30,
        height: 30,
        type: randomType,
        color: powerUpTypes[randomType].color,
        speed: 2,
      })
    }
  }

  function applyPowerUp(powerUp) {
    sounds.powerUp()

    switch (powerUp.type) {
      case "EXTRA_LIFE":
        lives++
        createParticles(powerUp.x, powerUp.y, powerUp.color, 15)
        break

      case "EXPAND_PADDLE":
        paddle.width = paddle.originalWidth * 1.5
        createParticles(powerUp.x, powerUp.y, powerUp.color, 15)
        setTimeout(() => {
          paddle.width = paddle.originalWidth
        }, 10000)
        break

      case "SLOW_BALL":
        balls.forEach((b) => {
          const speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy)
          const newSpeed = Math.max(3, speed * 0.7)
          const ratio = newSpeed / speed
          b.dx *= ratio
          b.dy *= ratio
        })
        createParticles(powerUp.x, powerUp.y, powerUp.color, 15)
        break

      case "MULTI_BALL":
        for (let i = 0; i < 2; i++) {
          const newBall = {
            x: ball.x,
            y: ball.y,
            radius: ball.radius,
            dx: (Math.random() - 0.5) * 6,
            dy: -Math.abs(ball.dy),
            color: ball.color,
          }
          balls.push(newBall)
        }
        createParticles(powerUp.x, powerUp.y, powerUp.color, 20)
        break

      case "GUN_POWER": // NUEVO CASO
        gunActive = true
        gunActiveUntil = Date.now() + 50000 // 5 segundos
        createParticles(powerUp.x, powerUp.y, powerUp.color, 20)
        
        // Sonido especial para activar pistola
        if (soundEnabled && !settings.muteAll) {
          playSound("powerup", 1200, 0.2, "sawtooth")
        }
        break
    }

    updateDisplay()
  }

  // Función para disparar balas
  function shootBullets() {
    if (!gunActive || Date.now() > gunActiveUntil) {
      gunActive = false
      return
    }

    // Disparar automáticamente cada 300ms
    if (Date.now() % 300 < 16) { // Aproximadamente 3 balas por segundo
      // Crear bala desde el extremo izquierdo de la paleta
      bullets.push({
        x: paddle.x + 5,
        y: paddle.y - 5,
        width: bulletWidth,
        height: bulletHeight,
        color: "#ff0000",
        speed: bulletSpeed
      })
      
      // Crear bala desde el extremo derecho de la paleta
      bullets.push({
        x: paddle.x + paddle.width - 5 - bulletWidth,
        y: paddle.y - 5,
        width: bulletWidth,
        height: bulletHeight,
        color: "#ff0000",
        speed: bulletSpeed
      })
      
      // Sonido de disparo
      if (soundEnabled && !settings.muteAll && Math.random() < 0.3) {
        playSound("shoot", 800, 0.05, "square")
      }
    }
  }

  // Función para actualizar y dibujar balas
  function updateBullets() {
    // Disparar si el power-up está activo
    shootBullets()
    
    // Actualizar posición de las balas
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i]
      
      // Mover bala hacia arriba
      bullet.y -= bullet.speed
      
      // Dibujar bala con efecto de partículas
      ctx.shadowBlur = 15
      ctx.shadowColor = bullet.color
      ctx.fillStyle = bullet.color
      
      // Balas con forma de bala (punta redondeada)
      if (!ctx.roundRect) {
        // Si no existe roundRect, usar rectángulo normal
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      } else {
        ctx.beginPath()
        ctx.roundRect(bullet.x, bullet.y, bullet.width, bullet.height, [bullet.height/2, bullet.height/2, 2, 2])
        ctx.fill()
      }
      
      // Efecto de estela
      if (settings.showParticles && Math.random() < 0.5) {
        createParticles(bullet.x + bullet.width/2, bullet.y + bullet.height, "#ff5555", 1)
      }
      
      ctx.shadowBlur = 0
      
      // Detectar colisión con bloques
      bricks.forEach((brick) => {
        if (brick.visible &&
            bullet.x < brick.x + brick.width &&
            bullet.x + bullet.width > brick.x &&
            bullet.y < brick.y + brick.height &&
            bullet.y + bullet.height > brick.y) {
          
          brick.hits++
          
          if (brick.hits >= brick.hitsRequired) {
            brick.visible = false
            score += 10
            createPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2)
            createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 8)
          } else {
            createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 3)
          }
          
          // Eliminar la bala
          bullets.splice(i, 1)
          createParticles(bullet.x + bullet.width/2, bullet.y + bullet.height/2, "#ff0000", 5)
          updateDisplay()
          return
        }
      })
      
      // Eliminar bala si sale de la pantalla
      if (bullet.y + bullet.height < 0) {
        bullets.splice(i, 1)
      }
    }
    
    // Dibujar indicador visual de pistola activa
    if (gunActive) {
      const timeLeft = Math.max(0, gunActiveUntil - Date.now())
      const alpha = 0.3 + 0.3 * Math.sin(Date.now() / 200)
      
      // Resplandor rojo en los extremos de la paleta
      ctx.globalAlpha = alpha
      ctx.shadowBlur = 20
      ctx.shadowColor = "#ff0000"
      ctx.fillStyle = "#ff0000"
      
      // Extremo izquierdo
      ctx.beginPath()
      ctx.arc(paddle.x + 5, paddle.y + paddle.height/2, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // Extremo derecho
      ctx.beginPath()
      ctx.arc(paddle.x + paddle.width - 5, paddle.y + paddle.height/2, 8, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }
  }

  // Helper function para rectángulos redondeados (si no existe)
  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, width, height, radii) {
      if (typeof radii === 'number') {
        radii = [radii, radii, radii, radii]
      }
      
      this.beginPath()
      this.moveTo(x + radii[0], y)
      this.lineTo(x + width - radii[1], y)
      this.quadraticCurveTo(x + width, y, x + width, y + radii[1])
      this.lineTo(x + width, y + height - radii[2])
      this.quadraticCurveTo(x + width, y + height, x + width - radii[2], y + height)
      this.lineTo(x + radii[3], y + height)
      this.quadraticCurveTo(x, y + height, x, y + height - radii[3])
      this.lineTo(x, y + radii[0])
      this.quadraticCurveTo(x, y, x + radii[0], y)
      this.closePath()
      return this
    }
  }

  function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i]
      p.y += p.speed

      ctx.shadowBlur = 15
      ctx.shadowColor = p.color

      drawPowerUpIcon(p)

      ctx.shadowBlur = 0

      if (
        p.y + p.height / 2 > paddle.y &&
        p.x > paddle.x &&
        p.x < paddle.x + paddle.width &&
        p.y - p.height / 2 < paddle.y + paddle.height
      ) {
        applyPowerUp(p)
        powerUps.splice(i, 1)
        continue
      }

      if (p.y > canvas.height) {
        powerUps.splice(i, 1)
      }
    }
  }

  function drawPowerUpIcon(p) {
    const x = p.x
    const y = p.y
    const size = p.width / 2

    ctx.fillStyle = p.color
    ctx.strokeStyle = p.color
    ctx.lineWidth = 3

    switch (p.type) {
      case "EXTRA_LIFE":
        // Corazón más grande y definido
        drawHeart(x, y, size * 1.2)
        break
      case "EXPAND_PADDLE":
        // Paleta con flechas indicando expansión
        ctx.fillRect(x - size * 1.2, y - size / 3, size * 2.4, size * 0.66)
        // Flecha izquierda
        ctx.beginPath()
        ctx.moveTo(x - size * 1.5, y)
        ctx.lineTo(x - size * 1.1, y - size * 0.4)
        ctx.lineTo(x - size * 1.1, y + size * 0.4)
        ctx.closePath()
        ctx.fill()
        // Flecha derecha
        ctx.beginPath()
        ctx.moveTo(x + size * 1.5, y)
        ctx.lineTo(x + size * 1.1, y - size * 0.4)
        ctx.lineTo(x + size * 1.1, y + size * 0.4)
        ctx.closePath()
        ctx.fill()
        break
      case "SLOW_BALL":
        // Copo de nieve más detallado
        drawSnowflake(x, y, size * 1.1)
        break
      case "MULTI_BALL":
        // Tres bolas más grandes y mejor distribuidas
        ctx.beginPath()
        ctx.arc(x - size * 0.6, y - size * 0.4, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x + size * 0.6, y - size * 0.4, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y + size * 0.5, size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        break
      case "GUN_POWER":
        // Pistola más detallada y reconocible
        drawGunIcon(x, y, size * 1.3)
        break
    }
  }

  // Función mejorada para dibujar ícono de pistola
  function drawGunIcon(x, y, size) {
    ctx.save()
    ctx.translate(x, y)
    
    // Cañón principal (más grueso)
    ctx.fillStyle = ctx.strokeStyle
    ctx.fillRect(-size * 0.6, -size * 0.35, size * 1.2, size * 0.4)
    
    // Punta del cañón (más pronunciada)
    ctx.beginPath()
    ctx.moveTo(size * 0.6, -size * 0.35)
    ctx.lineTo(size * 0.9, -size * 0.2)
    ctx.lineTo(size * 0.9, size * 0.2)
    ctx.lineTo(size * 0.6, size * 0.05)
    ctx.closePath()
    ctx.fill()
    
    // Empuñadura (más definida)
    ctx.beginPath()
    ctx.moveTo(-size * 0.6, size * 0.05)
    ctx.lineTo(-size * 0.4, size * 0.05)
    ctx.lineTo(-size * 0.4, size * 0.6)
    ctx.lineTo(-size * 0.7, size * 0.6)
    ctx.lineTo(-size * 0.7, size * 0.3)
    ctx.lineTo(-size * 0.6, size * 0.3)
    ctx.closePath()
    ctx.fill()
    
    // Gatillo
    ctx.beginPath()
    ctx.arc(-size * 0.5, size * 0.15, size * 0.15, 0, Math.PI * 2)
    ctx.fill()
    
    // Detalles adicionales (líneas en el cañón)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-size * 0.3, -size * 0.25)
    ctx.lineTo(-size * 0.3, -size * 0.05)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -size * 0.25)
    ctx.lineTo(0, -size * 0.05)
    ctx.stroke()
    
    ctx.restore()
  }

  function drawHeart(x, y, size) {
    ctx.save()
    ctx.translate(x, y)
    
    ctx.beginPath()
    ctx.moveTo(0, size * 0.3)
    
    // Lado izquierdo
    ctx.bezierCurveTo(
      -size * 0.5, -size * 0.3,
      -size * 1.2, -size * 0.3,
      -size * 1.2, size * 0.1
    )
    ctx.bezierCurveTo(
      -size * 1.2, size * 0.4,
      -size * 0.8, size * 0.7,
      0, size * 1.1
    )
    
    // Lado derecho
    ctx.bezierCurveTo(
      size * 0.8, size * 0.7,
      size * 1.2, size * 0.4,
      size * 1.2, size * 0.1
    )
    ctx.bezierCurveTo(
      size * 1.2, -size * 0.3,
      size * 0.5, -size * 0.3,
      0, size * 0.3
    )
    
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.restore()
  }

  function drawSnowflake(x, y, size) {
    ctx.save()
    ctx.translate(x, y)

    // 6 brazos principales
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((Math.PI / 3) * i)
      
      // Brazo principal
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -size)
      ctx.stroke()

      // Ramas del brazo (más pronunciadas)
      for (let j = 1; j <= 3; j++) {
        const branchY = (-size / 4) * j
        const branchSize = size / 4
        
        // Rama derecha
        ctx.beginPath()
        ctx.moveTo(0, branchY)
        ctx.lineTo(branchSize * 0.7, branchY + branchSize * 0.5)
        ctx.stroke()
        
        // Rama izquierda
        ctx.beginPath()
        ctx.moveTo(0, branchY)
        ctx.lineTo(-branchSize * 0.7, branchY + branchSize * 0.5)
        ctx.stroke()
      }
      
      ctx.restore()
    }
    
    // Círculo central
    ctx.beginPath()
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }

  function updateCombo() {
    const currentTime = Date.now()

    if (currentTime - lastBrickHitTime > 2000 && combo > 1) {
      combo = 1
      updateComboDisplay()
    }

    lastBrickHitTime = currentTime

    if (comboTimeout) {
      clearTimeout(comboTimeout)
    }

    comboTimeout = setTimeout(() => {
      if (combo > 1) {
        createParticles(canvas.width / 2, 50, "#ff0000", 10)
      }
      combo = 1
      updateComboDisplay()
    }, 2000)
  }

  function updateComboDisplay() {
    document.getElementById("combo-display").textContent = combo + "x"

    if (combo >= 3) {
      document.getElementById("combo-display").style.color = "#ff00ff"
      document.getElementById("combo-display").style.textShadow = "0 0 15px rgba(255, 0, 255, 0.9)"
    } else {
      document.getElementById("combo-display").style.color = "#00f5ff"
      document.getElementById("combo-display").style.textShadow = "0 0 10px rgba(0, 245, 255, 0.8)"
    }
  }

  function showComboText(x, y) {
    if (settings.reduceAnimations) return
    
    const comboText = document.createElement("div")
    comboText.className = "combo-display"
    comboText.textContent = `COMBO ${combo}x!`
    comboText.style.left = x + "px"
    comboText.style.top = y + "px"
    document.querySelector(".game-container").appendChild(comboText)

    setTimeout(() => {
      comboText.remove()
    }, 1000)
  }

  function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.fill()
  }

  function drawPaddle() {
    const glowIntensity = Math.abs(paddle.dx) * 2
    ctx.shadowBlur = 15 + glowIntensity
    ctx.shadowColor = paddle.color
    ctx.fillStyle = paddle.color

    drawRoundedRect(paddle.x, paddle.y, paddle.width, paddle.height, paddle.height / 2)

    ctx.shadowBlur = 0

    if (settings.showTrail && Math.abs(paddle.dx) > 0) {
      ctx.globalAlpha = 0.3
      ctx.fillStyle = paddle.color
      const trailWidth = Math.abs(paddle.dx) * 1.5
      const direction = paddle.dx > 0 ? -1 : 1
      drawRoundedRect(paddle.x + direction * trailWidth, paddle.y, paddle.width, paddle.height, paddle.height / 2)
      ctx.globalAlpha = 1
    }
  }

  function drawBall(ballObj) {
    if (settings.showTrail) {
      ctx.globalAlpha = 0.4
      ctx.shadowBlur = 8
      ctx.shadowColor = ballObj.color
      ctx.beginPath()
      ctx.arc(ballObj.x - ballObj.dx * 0.5, ballObj.y - ballObj.dy * 0.5, ballObj.radius * 0.8, 0, Math.PI * 2)
      ctx.fillStyle = ballObj.color
      ctx.fill()
    }

    ctx.globalAlpha = 1
    ctx.shadowBlur = 15
    ctx.shadowColor = ballObj.color
    ctx.beginPath()
    ctx.arc(ballObj.x, ballObj.y, ballObj.radius, 0, Math.PI * 2)
    ctx.fillStyle = ballObj.color
    ctx.fill()
    ctx.closePath()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }

  function drawBalls() {
    balls.forEach((ballObj) => {
      drawBall(ballObj)
    })
  }

  function drawBricks() {
    bricks.forEach((brick) => {
      if (brick.visible) {
        let brickColor = brick.color
        if (brick.hitsRequired > 1) {
          const intensity = 1 - (brick.hits / brick.hitsRequired) * 0.5
          brickColor = adjustColorBrightness(brick.color, intensity)
        }

        ctx.shadowBlur = 10
        ctx.shadowColor = brickColor
        ctx.fillStyle = brickColor

        drawRoundedRect(brick.x, brick.y, brick.width, brick.height, brick.height / 2)

        ctx.shadowBlur = 0
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
        drawRoundedRect(brick.x + 4, brick.y + 3, brick.width - 8, brick.height / 3, brick.height / 4)

        if (brick.hitsRequired > 1) {
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(
            brick.hitsRequired - brick.hits,
            brick.x + brick.width / 2,
            brick.y + brick.height / 2,
          )
        }
      }
    })
  }

  function adjustColorBrightness(hex, intensity) {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)

    r = Math.floor(r * intensity)
    g = Math.floor(g * intensity)
    b = Math.floor(b * intensity)

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }

  function movePaddle() {
    paddle.x += paddle.dx

    if (paddle.x < 0) paddle.x = 0
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width
  }

  function moveBall(ballObj) {
    if (ballAttached && ballObj === balls[0]) {
      ballObj.x = paddle.x + paddle.width / 2
      ballObj.y = paddle.y - ballObj.radius - 2
      return true
    }

    ballObj.x += ballObj.dx
    ballObj.y += ballObj.dy

    if (ballObj.x + ballObj.radius > canvas.width || ballObj.x - ballObj.radius < 0) {
      ballObj.dx *= -1
      sounds.wallHit()
      createParticles(ballObj.x, ballObj.y, ballObj.color, 3)
    }

    if (ballObj.y - ballObj.radius < 0) {
      ballObj.dy *= -1
      sounds.wallHit()
      createParticles(ballObj.x, ballObj.y, ballObj.color, 3)
    }

    if (
      ballObj.y + ballObj.radius > paddle.y &&
      ballObj.x > paddle.x &&
      ballObj.x < paddle.x + paddle.width &&
      ballObj.dy > 0
    ) {
      const hitPos = (ballObj.x - paddle.x) / paddle.width
      const angle = ((hitPos - 0.5) * Math.PI) / 3
      const speed = Math.sqrt(ballObj.dx * ballObj.dx + ballObj.dy * ballObj.dy)

      ballObj.dx = speed * Math.sin(angle)
      ballObj.dy = -speed * Math.cos(angle)

      sounds.paddleHit()
      createParticles(ballObj.x, ballObj.y, paddle.color, 5)
    }

    if (ballObj.y + ballObj.radius > canvas.height) {
      screenShake = 15
      sounds.loseLife()
      createParticles(ballObj.x, ballObj.y, "#ff0000", 10)
      return false
    }

    if (settings.showTrail && Math.random() < 0.3 && !ballAttached) {
      createParticles(ballObj.x, ballObj.y, ballObj.color, 1)
    }

    return true
  }

  function moveBalls() {
    let mainBallAlive = true

    for (let i = balls.length - 1; i >= 0; i--) {
      const ballAlive = moveBall(balls[i])

      if (i === 0 && !ballAlive) {
        mainBallAlive = false
      }

      if (i > 0 && !ballAlive) {
        balls.splice(i, 1)
      }
    }

    return mainBallAlive
  }

  function detectBrickCollision() {
    bricks.forEach((brick) => {
      if (brick.visible) {
        balls.forEach((ballObj) => {
          if (
            ballObj.x + ballObj.radius > brick.x &&
            ballObj.x - ballObj.radius < brick.x + brick.width &&
            ballObj.y + ballObj.radius > brick.y &&
            ballObj.y - ballObj.radius < brick.y + brick.height
          ) {
            const ballCenterX = ballObj.x
            const ballCenterY = ballObj.y
            const brickCenterX = brick.x + brick.width / 2
            const brickCenterY = brick.y + brick.height / 2

            const dx = ballCenterX - brickCenterX
            const dy = ballCenterY - brickCenterY
            const width = brick.width / 2 + ballObj.radius
            const height = brick.height / 2 + ballObj.radius

            if (Math.abs(dx / width) > Math.abs(dy / height)) {
              ballObj.dx *= -1
            } else {
              ballObj.dy *= -1
            }

            brick.hits++

            if (brick.hits >= brick.hitsRequired) {
              brick.visible = false

              updateCombo()

              const points = 10 * combo
              score += points

              createPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2)

              sounds.brickHit()
              createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 8)

              if (combo >= 3) {
                showComboText(brick.x + brick.width / 2, brick.y)
                sounds.combo()
              }

              combo++
              updateComboDisplay()
            } else {
              sounds.brickHit()
              createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color, 3)
            }

            updateDisplay()
          }
        })
      }
    })
  }

  function updateDisplay() {
    document.getElementById("level-display").textContent = level
    document.getElementById("score-display").textContent = score
    document.getElementById("lives-display").textContent = lives
    document.getElementById("current-level-data").textContent = level
    updateHighScore()
  }

  function checkWin() {
    return bricks.every((brick) => !brick.visible)
  }

  function togglePause() {
    if (gameState !== "playing") return

    isPaused = !isPaused
    document.getElementById("pause-overlay").classList.toggle("hidden", !isPaused)

    if (!isPaused) {
      gameLoop()
    }
  }

  function nextLevel() {
  level++
  score += 100 * level
  // Restablecer vidas a 3 en cada nuevo nivel
  lives = 3
  initGame()
  gameState = "playing"
  hideAllMenus()
  gameLoop()
}

  function gameLoop() {
    if (gameState !== "playing" || isPaused) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    applyScreenShake()

    drawBricks()
    drawPaddle()
    drawBalls()
    updateParticles()
    updatePowerUps()
    updateBullets()

    movePaddle()

    const ballAlive = moveBalls()

    if (!ballAlive) {
      lives--
      updateDisplay()

      if (lives <= 0) {
        sounds.gameOver()
        gameState = "gameOver"
        showGameOver()
      } else {
        balls[0].x = canvas.width / 2
        balls[0].y = paddle.y - balls[0].radius - 2
        balls[0].dx = 0
        balls[0].dy = -ballBaseSpeed
        ballAttached = true

        balls.splice(1)
      }
    }

    detectBrickCollision()

    if (checkWin()) {
      sounds.win()
      for (let i = 0; i < 20; i++) {
        const colors = getCurrentColors()
        createParticles(
          canvas.width / 2,
          canvas.height / 2,
          colors[Math.floor(Math.random() * colors.length)],
          3,
        )
      }
      gameState = "win"
      showWin()
    }

    ctx.restore()

    requestAnimationFrame(gameLoop)
  }

  function showMenu(menuId) {
    document.querySelectorAll(".menu-overlay").forEach((menu) => {
      menu.classList.add("hidden")
    })
    document.getElementById(menuId).classList.remove("hidden")
  }

  function hideAllMenus() {
    document.querySelectorAll(".menu-overlay").forEach((menu) => {
      menu.classList.add("hidden")
    })
    document.getElementById("pause-overlay").classList.add("hidden")
  }

  function showWin() {
    const comboBonus = (combo - 1) * 50
    document.getElementById("completed-level").textContent = level
    document.getElementById("win-score").textContent = `Puntuación: ${score}`
    document.getElementById("combo-bonus").textContent = `Bonus por combo: ${comboBonus}`
    showMenu("win-menu")
  }

  function showGameOver() {
    document.getElementById("final-score").textContent = `Puntuación final: ${score}`
    showMenu("game-over-menu")
  }

  function startGame() {
    initAudioContext();
    
    hideAllMenus()
    gameState = "playing"
    score = 0
    lives = 3
    level = 1
    isPaused = false
    
    // Resetear sistema de balas
    bullets.length = 0
    gunActive = false
    gunActiveUntil = 0
    
    initGame()
    updateDisplay()
    gameLoop()
  }

  function launchBall() {
    if (ballAttached) {
      ballAttached = false
      sounds.launch()
      balls[0].dx = 0
      balls[0].dy = -ballBaseSpeed
    }
  }

  function setupKeyboardControls() {
    window.addEventListener("keydown", (e) => {
      if (gameState !== "playing") return

      if (e.key === "ArrowLeft" || e.key === "Left") {
        paddle.dx = -paddle.speed
      } else if (e.key === "ArrowRight" || e.key === "Right") {
        paddle.dx = paddle.speed
      } else if (e.key === "ArrowUp" || e.key === "Up") {
        e.preventDefault()
        launchBall()
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault()
        launchBall()
      } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault()
        togglePause()
      }
    })

    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "ArrowRight" || e.key === "Right") {
        paddle.dx = 0
      }
    })
  }

  function setupTouchControls() {
    let touchStartX = 0
    let touchCurrentX = 0
    let touchStartY = 0

    canvas.addEventListener("touchstart", (e) => {
      if (gameState !== "playing") return
      
      initAudioContext()
      
      touchStartX = e.touches[0].clientX
      touchCurrentX = touchStartX
      touchStartY = e.touches[0].clientY
    })

    canvas.addEventListener("touchmove", (e) => {
      if (gameState !== "playing") return
      e.preventDefault()

      touchCurrentX = e.touches[0].clientX
      const deltaX = touchCurrentX - touchStartX

      paddle.x += deltaX * 0.5

      if (paddle.x < 0) paddle.x = 0
      if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width

      touchStartX = touchCurrentX
    })

    canvas.addEventListener("touchend", (e) => {
      if (gameState !== "playing") return
      paddle.dx = 0

      const touchEndY = e.changedTouches[0].clientY
      const deltaY = touchStartY - touchEndY

      if (deltaY > 30 && ballAttached) {
        launchBall()
      }
    })
  }

  // ========================================
  // CONFIGURAR EVENT LISTENERS DE SETTINGS
  // ========================================
  function setupSettings() {
    // Audio - Volumen SFX
    document.getElementById("sfx-volume-slider").addEventListener("input", (e) => {
      settings.sfxVolume = e.target.value / 100
      document.getElementById('sfx-volume-value').textContent = e.target.value + '%'
      saveSettings()
      sounds.buttonClick()
    })

    // Audio - Volumen Música
    document.getElementById("music-volume-slider").addEventListener("input", (e) => {
      settings.musicVolume = e.target.value / 100;
      document.getElementById('music-volume-value').textContent = e.target.value + '%';
      
      // Actualizar volumen de la música en tiempo real
      if (bgMusic) {
        bgMusic.volume = settings.musicVolume;
      }
      
      saveSettings();
    });

    // Audio - Silenciar todo
    document.getElementById("mute-all-checkbox").addEventListener("change", (e) => {
      settings.muteAll = e.target.checked
      soundEnabled = !settings.muteAll
      const toggleBtn = document.getElementById("sound-toggle")
      toggleBtn.textContent = soundEnabled ? "🔊" : "🔇"
      toggleBtn.classList.toggle("muted", !soundEnabled)
      
      // Aplicar inmediatamente a la música
      if (bgMusic) {
        bgMusic.muted = settings.muteAll;
      }
      
      saveSettings()
      
      // Probar sonido si se está activando
      if (soundEnabled) {
        setTimeout(() => {
          sounds.buttonClick();
        }, 100);
      }
    })

    // Jugabilidad - Dificultad
    document.getElementById("difficulty-select").addEventListener("change", (e) => {
      settings.difficulty = e.target.value
      difficulty = settings.difficulty
      saveSettings()
    })

    // Visual - Brillo
    document.getElementById("brightness-slider").addEventListener("input", (e) => {
      settings.brightness = e.target.value / 100
      canvas.style.filter = `brightness(${settings.brightness})`
      document.getElementById('brightness-value').textContent = e.target.value + '%'
      saveSettings()
    })

    // Visual - Mostrar estela
    document.getElementById("trail-checkbox").addEventListener("change", (e) => {
      settings.showTrail = e.target.checked
      saveSettings()
    })

    // Visual - Mostrar partículas
    document.getElementById("particles-checkbox").addEventListener("change", (e) => {
      settings.showParticles = e.target.checked
      if (!e.target.checked) {
        particles.length = 0
      }
      saveSettings()
    })

    // Accesibilidad - Modo daltónico
    document.getElementById("colorblind-mode-checkbox").addEventListener("change", (e) => {
      settings.colorblindMode = e.target.checked
      saveSettings()
      if (gameState === "playing") {
        const colors = getCurrentColors()
        bricks.forEach((brick, index) => {
          const row = Math.floor(index / brickColumnCount)
          brick.color = colors[row % colors.length]
        })
      }
    })

    // Accesibilidad - Reducir animaciones
    document.getElementById("reduce-animations-checkbox").addEventListener("change", (e) => {
      settings.reduceAnimations = e.target.checked
      saveSettings()
    })

    // Datos - Reiniciar récord
    document.getElementById("reset-highscore-btn").addEventListener("click", () => {
      if (confirm('¿Estás seguro de que quieres reiniciar tu récord?')) {
        settings.highScore = 0
        saveSettings()
        document.getElementById('high-score-data').textContent = '0'
        sounds.buttonClick()
      }
    })
  }

  // ========================================
  // BOTONES Y CONTROLES DE AUDIO MEJORADOS
  // ========================================
  
  function toggleSound() {
    settings.muteAll = !settings.muteAll;
    soundEnabled = !settings.muteAll;
    const toggleBtn = document.getElementById("sound-toggle");
    toggleBtn.textContent = soundEnabled ? "🔊" : "🔇";
    toggleBtn.classList.toggle("muted", !soundEnabled);
    document.getElementById("mute-all-checkbox").checked = settings.muteAll;
    
    // Controlar la música inmediatamente
    if (bgMusic) {
      bgMusic.muted = settings.muteAll;
      if (!settings.muteAll) {
        // Si se está activando el sonido, reproducir música si está en menú
        if (gameState === "menu" && bgMusic.paused) {
          playBackgroundMusic();
        }
        // Probar un sonido inmediatamente
        setTimeout(() => {
          sounds.buttonClick();
        }, 100);
      }
    }
    
    saveSettings();

    // Inicializar audio si se está activando
    if (soundEnabled) {
      initAudioContext();
      // Probar sonido de confirmación
      setTimeout(() => {
        sounds.buttonClick();
      }, 150);
    }
  }

  // Event listeners para botones
  document.getElementById("start-btn").addEventListener("click", () => {
    initAudioContext();
    pauseBackgroundMusic(); // Pausar música al empezar juego
    startGame();
  });

  document.getElementById("settings-btn").addEventListener("click", () => {
    updateSettingsUI();
    showMenu("settings-menu");
  });

  document.getElementById("back-from-settings-btn").addEventListener("click", () => {
    playBackgroundMusic(); // Reanudar música al volver al menú
    showMenu("start-menu");
  });

  document.getElementById("menu-from-win-btn").addEventListener("click", () => {
    playBackgroundMusic(); // Reanudar música al volver al menú
    showMenu("start-menu");
  });

  document.getElementById("menu-from-gameover-btn").addEventListener("click", () => {
    playBackgroundMusic(); // Reanudar música al volver al menú
    showMenu("start-menu");
  });
  
  document.getElementById("next-level-btn").addEventListener("click", () => {
    initAudioContext();
    sounds.buttonClick();
    nextLevel();
  });

  document.getElementById("restart-btn").addEventListener("click", () => {
    initAudioContext();
    sounds.buttonClick();
    startGame();
  });
  
  document.getElementById("sound-toggle").addEventListener("click", toggleSound)

  // Agregar sonidos a los botones
  document.querySelectorAll(".btn-menu").forEach((button) => {
    button.addEventListener("mouseenter", () => {
      sounds.buttonHover()
    })
    button.addEventListener("click", () => {
      initAudioContext()
      sounds.buttonClick()
    })
  })

  // ========================================
  // INICIALIZACIÓN FINAL CON SISTEMA DE AUDIO
  // ========================================
  
  setupKeyboardControls()
  setupTouchControls()
  setupSettings()
  setupTabs()
  
  // Cargar configuraciones y inicializar música
  loadSettings();
  initBackgroundMusic();
  
  // Configurar sistema de activación de audio
  setupAudioActivation();
  
  // Verificar estado del audio después de un breve retraso
  setTimeout(() => {
    checkAudioStatus();
    
    // Intentar reproducir música automáticamente si es posible
    if (bgMusic && gameState === "menu" && !settings.muteAll) {
      bgMusic.play().then(() => {
        // Si la música se reproduce automáticamente, ocultar mensaje
        audioInteractionRequired = false;
        audioActivated = true;
        const audioMessage = document.getElementById('audio-interaction-message');
        if (audioMessage) {
          audioMessage.classList.add('hidden');
        }
        console.log("Música reproducida automáticamente");
      }).catch(e => {
        // Si falla, mostrar mensaje de interacción
        console.log("Se requiere interacción del usuario para el audio");
        audioInteractionRequired = true;
      });
    }
  }, 500);
})