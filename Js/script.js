const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Estado del juego
let gameState = "menu" // menu, playing, gameOver, win
let score = 0
let lives = 3

// Paleta (personaje principal) - Más ancha como blockbreaker.io
const paddle = {
  width: 120, // Paleta más ancha
  height: 18, // Un poco más alta
  x: 0,
  y: 0,
  speed: 8,
  dx: 0,
}

// Pelota
const ball = {
  x: 0,
  y: 0,
  radius: 8,
  dx: 4,
  dy: -4,
}

// Bloques - Tamaño similar a blockbreaker.io
let brickRowCount = 5
let brickColumnCount = 7
let brickWidth = 90 // Bloques más grandes como en blockbreaker.io
let brickHeight = 35 // Más altos para mejor visibilidad
const brickPadding = 12 // Más espacio entre bloques
const brickOffsetTop = 70 // Bajado para dar más espacio arriba
let bricks = []

// Colores
const colors = ["#00d4ff", "#ff006e", "#8338ec", "#ffbe0b", "#06ffa5"]

// Dimensiones dinámicas del canvas
let canvasWidth = 800
let canvasHeight = 600

function resizeCanvas() {
  const isMobile = window.innerWidth <= 768

  // Ajustar tamaño según dispositivo (similar a blockbreaker.io)
  if (isMobile) {
    brickColumnCount = 6 // 6 columnas en móvil
    brickWidth = 50 // Bloques visibles y grandes
    brickHeight = 28
  } else {
    brickColumnCount = 7 // 7 columnas en escritorio
    brickWidth = 90 // Bloques grandes como blockbreaker.io
    brickHeight = 35
  }

  // Calcular el ancho necesario para los bloques
  const sideMargin = isMobile ? 10 : 40
  const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding
  const minCanvasWidth = totalBricksWidth + (sideMargin * 2)
  
  let canvasWidthTarget, canvasHeightTarget

  if (isMobile) {
    // En móvil, usar el ancho disponible
    canvasWidthTarget = Math.min(window.innerWidth - 20, 400)
    canvasHeightTarget = Math.min(window.innerHeight - 180, 600)
  } else {
    // En escritorio, tamaño generoso como blockbreaker.io
    canvasWidthTarget = Math.min(window.innerWidth - 100, 800)
    canvasHeightTarget = Math.min(window.innerHeight - 200, 650)
  }

  // Asegurar que el canvas es lo suficientemente ancho para los bloques
  canvasWidth = Math.max(canvasWidthTarget, minCanvasWidth)
  canvasHeight = canvasHeightTarget

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  // Recalcular elementos del juego basados en el nuevo tamaño del canvas
  if (gameState === "playing") {
    updateGameDimensions()
  }
}

function updateGameDimensions() {
  // Actualizar posición de la paleta proporcionalmente
  const paddleRatio = paddle.x / (canvas.width || canvasWidth)
  paddle.x = canvasWidth * paddleRatio
  paddle.y = canvasHeight - paddle.height - 35 // Mantener más separación del borde

  // Actualizar posición de la pelota proporcionalmente
  const ballXRatio = ball.x / (canvas.width || canvasWidth)
  const ballYRatio = ball.y / (canvas.height || canvasHeight)
  ball.x = canvasWidth * ballXRatio
  ball.y = canvasHeight * ballYRatio

  // Calcular posiciones de bloques centradas (tamaños fijos)
  const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding
  const newBrickOffsetLeft = (canvasWidth - totalBricksWidth) / 2

  bricks.forEach((brick, index) => {
    const row = Math.floor(index / brickColumnCount)
    const col = index % brickColumnCount
    brick.x = newBrickOffsetLeft + col * (brickWidth + brickPadding)
    brick.y = brickOffsetTop + row * (brickHeight + brickPadding)
  })
}

// Inicializar juego
function initGame() {
  // Reiniciar posición de la paleta (más abajo)
  paddle.x = canvasWidth / 2 - paddle.width / 2
  paddle.y = canvasHeight - paddle.height - 35 // Más separación del borde inferior
  paddle.dx = 0

  // Reiniciar pelota (más abajo también)
  ball.x = canvasWidth / 2
  ball.y = canvasHeight - 80 // Más espacio desde el fondo
  ball.dx = 4
  ball.dy = -4

  bricks = []
  // Calcular posiciones de bloques centrados (tamaños fijos)
  const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding
  const brickOffsetLeft = (canvasWidth - totalBricksWidth) / 2

  for (let row = 0; row < brickRowCount; row++) {
    for (let col = 0; col < brickColumnCount; col++) {
      bricks.push({
        x: brickOffsetLeft + col * (brickWidth + brickPadding),
        y: brickOffsetTop + row * (brickHeight + brickPadding),
        width: brickWidth,
        height: brickHeight,
        visible: true,
        color: colors[row % colors.length],
      })
    }
  }
}

// Función auxiliar para dibujar rectángulos redondeados
function roundRect(ctx, x, y, width, height, radius) {
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
}

// Dibujar paleta con bordes redondeados
function drawPaddle() {
  ctx.fillStyle = "#00d4ff"
  roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 8)
  ctx.fill()
  
  // Agregar brillo a la paleta
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
  roundRect(ctx, paddle.x + 5, paddle.y + 3, paddle.width - 10, paddle.height / 2, 5)
  ctx.fill()
}

// Dibujar pelota
function drawBall() {
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = "#ff006e"
  ctx.fill()
  ctx.closePath()
}

// Dibujar bloques con bordes redondeados (estilo blockbreaker.io)
function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      // Dibujar bloque con bordes redondeados
      ctx.fillStyle = brick.color
      roundRect(ctx, brick.x, brick.y, brick.width, brick.height, 5)
      ctx.fill()

      // Agregar brillo más sutil
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
      roundRect(ctx, brick.x + 3, brick.y + 3, brick.width - 6, brick.height / 2.5, 3)
      ctx.fill()
    }
  })
}

// Mover paleta
function movePaddle() {
  paddle.x += paddle.dx

  // Detección de colisión con paredes para la paleta
  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvasWidth) {
    paddle.x = canvasWidth - paddle.width
  }
}

// Mover pelota
function moveBall() {
  ball.x += ball.dx
  ball.y += ball.dy

  // Detección de colisión con paredes
  if (ball.x + ball.radius > canvasWidth || ball.x - ball.radius < 0) {
    ball.dx *= -1
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1
  }

  // Detección de colisión con la paleta
  if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
    // Calcular ángulo basado en dónde golpea la pelota a la paleta
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = ((hitPos - 0.5) * Math.PI) / 3
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = speed * Math.sin(angle)
    ball.dy = -speed * Math.cos(angle)
  }

  // Colisión inferior - perder vida
  if (ball.y + ball.radius > canvasHeight) {
    lives--
    updateDisplay()

    if (lives <= 0) {
      gameState = "gameOver"
      showGameOver()
    } else {
      // Reiniciar pelota con más espacio
      ball.x = canvasWidth / 2
      ball.y = canvasHeight - 80
      ball.dx = 4
      ball.dy = -4
    }
  }
}

// Detección de colisión con bloques
function detectBrickCollision() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        ball.dy *= -1
        brick.visible = false
        score += 10
        updateDisplay()
      }
    }
  })
}

// Verificar condición de victoria
function checkWin() {
  const allBricksDestroyed = bricks.every((brick) => !brick.visible)
  if (allBricksDestroyed) {
    gameState = "win"
    showWin()
  }
}

// Actualizar pantalla
function updateDisplay() {
  document.getElementById("score-display").textContent = score
  document.getElementById("lives-display").textContent = lives
}

// Mostrar/ocultar menús
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
}

function showGameOver() {
  document.getElementById("final-score").textContent = `Puntuación final: ${score}`
  showMenu("game-over-menu")
}

function showWin() {
  document.getElementById("win-score").textContent = `Puntuación final: ${score}`
  showMenu("win-menu")
}

// Bucle del juego
function gameLoop() {
  if (gameState !== "playing") return

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  drawBricks()
  drawPaddle()
  drawBall()

  movePaddle()
  moveBall()
  detectBrickCollision()
  checkWin()

  requestAnimationFrame(gameLoop)
}

// Iniciar juego
function startGame() {
  score = 0
  lives = 3
  hideAllMenus()
  initGame()
  updateDisplay()
  gameState = "playing"
  gameLoop()
}

// Listeners de eventos
document.getElementById("start-btn").addEventListener("click", startGame)
document.getElementById("restart-btn").addEventListener("click", startGame)
document.getElementById("play-again-btn").addEventListener("click", startGame)

// Controles de teclado
document.addEventListener("keydown", (e) => {
  if (gameState !== "playing") return

  if (e.key === "ArrowLeft" || e.key === "Left") {
    paddle.dx = -paddle.speed
  } else if (e.key === "ArrowRight" || e.key === "Right") {
    paddle.dx = paddle.speed
  }
})

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "ArrowRight" || e.key === "Right") {
    paddle.dx = 0
  }
})

// Controles táctiles para móvil
let touchStartX = 0
let isTouching = false

canvas.addEventListener("touchstart", (e) => {
  if (gameState !== "playing") return
  e.preventDefault()
  isTouching = true
  const rect = canvas.getBoundingClientRect()
  touchStartX = e.touches[0].clientX - rect.left
})

canvas.addEventListener("touchmove", (e) => {
  if (gameState !== "playing" || !isTouching) return
  e.preventDefault()

  const rect = canvas.getBoundingClientRect()
  const touchX = e.touches[0].clientX - rect.left

  // Posicionamiento directo basado en el toque
  paddle.x = touchX - paddle.width / 2

  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvasWidth) {
    paddle.x = canvasWidth - paddle.width
  }
})

canvas.addEventListener("touchend", () => {
  isTouching = false
  paddle.dx = 0
})

// Inicializar pantalla
updateDisplay()
resizeCanvas()

// Llamar al resize al cargar y al redimensionar ventana
window.addEventListener("resize", resizeCanvas)
window.addEventListener("load", resizeCanvas)