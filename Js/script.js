const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Estado del juego
let gameState = "menu" // menu, playing, gameOver, win
let score = 0
let lives = 3

// Paleta (personaje principal)
const paddle = {
  width: 100,
  height: 15,
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

// Bloques
const brickRowCount = 5
const brickColumnCount = 7
const brickHeight = 30
const brickPadding = 10
const brickOffsetTop = 60
let brickWidth = 90 // Se recalculará según el ancho del canvas
let bricks = []

// Colores
const colors = ["#00d4ff", "#ff006e", "#8338ec", "#ffbe0b", "#06ffa5"]

// Dimensiones dinámicas del canvas
let canvasWidth = 800
let canvasHeight = 600

function resizeCanvas() {
  const isMobile = window.innerWidth <= 768

  let maxWidth, maxHeight

  if (isMobile) {
    // En móvil, usar casi todo el ancho y más altura
    maxWidth = Math.min(window.innerWidth - 30, 500)
    maxHeight = Math.min(window.innerHeight - 200, 700)
  } else {
    // En escritorio, mantener tamaño razonable
    maxWidth = Math.min(window.innerWidth - 60, 800)
    maxHeight = Math.min(window.innerHeight - 250, 600)
  }

  // Mantener proporción de aspecto
  const aspectRatio = isMobile ? 3 / 4 : 4 / 3 // Proporción más alta para móvil

  if (maxWidth / maxHeight > aspectRatio) {
    canvasHeight = maxHeight
    canvasWidth = maxHeight * aspectRatio
  } else {
    canvasWidth = maxWidth
    canvasHeight = maxWidth / aspectRatio
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  // Calcular ancho de bloques con espaciado lateral apropiado (10% de márgenes totales)
  const sideMargin = canvasWidth * 0.05
  const availableWidth = canvasWidth - (sideMargin * 2)
  brickWidth = (availableWidth - (brickColumnCount - 1) * brickPadding) / brickColumnCount

  // Recalcular elementos del juego basados en el nuevo tamaño del canvas
  if (gameState === "playing") {
    updateGameDimensions()
  }
}

function updateGameDimensions() {
  // Actualizar posición de la paleta proporcionalmente
  const paddleRatio = paddle.x / (canvas.width || canvasWidth)
  paddle.x = canvasWidth * paddleRatio
  paddle.y = canvasHeight - paddle.height - 20

  // Actualizar posición de la pelota proporcionalmente
  const ballXRatio = ball.x / (canvas.width || canvasWidth)
  const ballYRatio = ball.y / (canvas.height || canvasHeight)
  ball.x = canvasWidth * ballXRatio
  ball.y = canvasHeight * ballYRatio

  // Calcular posiciones de bloques centradas con márgenes
  const sideMargin = canvasWidth * 0.05
  const newBrickOffsetLeft = sideMargin

  bricks.forEach((brick, index) => {
    const row = Math.floor(index / brickColumnCount)
    const col = index % brickColumnCount
    brick.x = newBrickOffsetLeft + col * (brickWidth + brickPadding)
    brick.y = brickOffsetTop + row * (brickHeight + brickPadding)
    brick.width = brickWidth // Actualizar ancho del bloque
  })
}

// Inicializar juego
function initGame() {
  // Reiniciar posición de la paleta
  paddle.x = canvasWidth / 2 - paddle.width / 2
  paddle.y = canvasHeight - paddle.height - 20
  paddle.dx = 0

  // Reiniciar pelota
  ball.x = canvasWidth / 2
  ball.y = canvasHeight - 50
  ball.dx = 4
  ball.dy = -4

  bricks = []
  // Calcular posiciones de bloques con márgenes (5% en cada lado)
  const sideMargin = canvasWidth * 0.05
  const brickOffsetLeft = sideMargin

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

// Dibujar paleta
function drawPaddle() {
  ctx.fillStyle = "#00d4ff"
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
}

// Dibujar pelota
function drawBall() {
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = "#ff006e"
  ctx.fill()
  ctx.closePath()
}

// Dibujar bloques
function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      ctx.fillStyle = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

      // Agregar brillo
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 3)
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
      // Reiniciar pelota
      ball.x = canvasWidth / 2
      ball.y = canvasHeight - 50
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