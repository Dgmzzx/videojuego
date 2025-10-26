const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Ajustar tamaño del canvas
function resizeCanvas() {
  const maxWidth = Math.min(800, window.innerWidth - 40)
  const maxHeight = window.innerHeight - 200
  canvas.width = maxWidth
  canvas.height = Math.min(600, maxHeight)
}

resizeCanvas()
window.addEventListener("resize", resizeCanvas)

// Variables del juego
let gameState = "menu"
let score = 0
let lives = 3
let ballAttached = true

// Paleta del jugador
const paddle = {
  width: 100,
  height: 15,
  x: 0,
  y: 0,
  speed: 8,
  dx: 0,
  color: "#00f5ff",
}

// Bola
const ball = {
  x: 0,
  y: 0,
  radius: 8,
  dx: 4,
  dy: -4,
  color: "#ff00ff",
}

// Bloques
let bricks = []
const brickColors = ["#00f5ff", "#ff00ff", "#00ff88", "#ffaa00", "#ff0080"]
const brickRowCount = 5
const brickColumnCount = 8
const brickWidth = 75
const brickHeight = 25
const brickPadding = 8
const brickOffsetTop = 80
let brickOffsetLeft = 0

// Inicializar juego
function initGame() {
  paddle.x = canvas.width / 2 - paddle.width / 2
  paddle.y = canvas.height - 30

  ball.x = canvas.width / 2
  ball.y = canvas.height - 50
  ball.dx = 4
  ball.dy = -4
  ballAttached = true

  createBricks()
}

// Crear bloques
function createBricks() {
  bricks = []
  const cols = Math.min(brickColumnCount, 8)
  const totalBricksWidth = cols * brickWidth + (cols - 1) * brickPadding
  brickOffsetLeft = (canvas.width - totalBricksWidth) / 2

  for (let row = 0; row < brickRowCount; row++) {
    for (let col = 0; col < cols; col++) {
      const brickX = brickOffsetLeft + col * (brickWidth + brickPadding)
      const brickY = brickOffsetTop + row * (brickHeight + brickPadding)

      bricks.push({
        x: brickX,
        y: brickY,
        width: brickWidth,
        height: brickHeight,
        color: brickColors[row % brickColors.length],
        visible: true,
      })
    }
  }
}

// Dibujar paleta
function drawPaddle() {
  ctx.shadowBlur = 20
  ctx.shadowColor = paddle.color
  ctx.fillStyle = paddle.color
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
  ctx.shadowBlur = 0
}

// Dibujar bola
function drawBall() {
  ctx.shadowBlur = 15
  ctx.shadowColor = ball.color
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = ball.color
  ctx.fill()
  ctx.closePath()
  ctx.shadowBlur = 0
}

// Dibujar bloques
function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      ctx.shadowBlur = 10
      ctx.shadowColor = brick.color
      ctx.fillStyle = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 2)

      ctx.shadowBlur = 0
    }
  })
}

// Mover paleta
function movePaddle() {
  paddle.x += paddle.dx

  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width
}

// Mover bola
function moveBall() {
  // Si la bola está pegada a la paleta
  if (ballAttached) {
    ball.x = paddle.x + paddle.width / 2
    ball.y = paddle.y - ball.radius - 2
    return true
  }

  ball.x += ball.dx
  ball.y += ball.dy

  // Colisión con paredes laterales
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1
  }

  // Colisión con techo
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1
  }

  // Colisión con paleta
  if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = ((hitPos - 0.5) * Math.PI) / 3
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = speed * Math.sin(angle)
    ball.dy = -speed * Math.cos(angle)
  }

  // Bola cae fuera
  if (ball.y + ball.radius > canvas.height) {
    return false
  }

  return true
}

// Detectar colisión con bloques
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

// Actualizar display
function updateDisplay() {
  document.getElementById("score-display").textContent = score
  document.getElementById("lives-display").textContent = lives
}

// Verificar victoria
function checkWin() {
  return bricks.every((brick) => !brick.visible)
}

// Loop principal del juego
function gameLoop() {
  if (gameState !== "playing") return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  drawBricks()
  drawPaddle()
  drawBall()

  movePaddle()

  const ballAlive = moveBall()

  if (!ballAlive) {
    lives--
    updateDisplay()

    if (lives <= 0) {
      gameState = "gameOver"
      showGameOver()
    } else {
      ball.x = canvas.width / 2
      ball.y = canvas.height - 50
      ball.dx = 4
      ball.dy = -4
      ballAttached = true
    }
  }

  detectBrickCollision()

  if (checkWin()) {
    gameState = "win"
    showWin()
  }

  requestAnimationFrame(gameLoop)
}

// Mostrar menú
function showMenu(menuId) {
  document.querySelectorAll(".menu-overlay").forEach((menu) => {
    menu.classList.add("hidden")
  })
  document.getElementById(menuId).classList.remove("hidden")
}

// Ocultar todos los menús
function hideAllMenus() {
  document.querySelectorAll(".menu-overlay").forEach((menu) => {
    menu.classList.add("hidden")
  })
}

// Mostrar victoria
function showWin() {
  document.getElementById("win-score").textContent = `¡Has roto todos los bloques!\nPuntuación final: ${score}`
  showMenu("win-menu")
}

// Mostrar game over
function showGameOver() {
  document.getElementById("final-score").textContent = `Puntuación final: ${score}`
  showMenu("game-over-menu")
}

// Iniciar juego
function startGame() {
  hideAllMenus()
  gameState = "playing"
  score = 0
  lives = 3
  initGame()
  updateDisplay()
  gameLoop()
}

// Lanzar bola
function launchBall() {
  if (ballAttached) {
    ballAttached = false
  }
}

// Event listeners para botones
document.getElementById("start-btn").addEventListener("click", startGame)
document.getElementById("restart-btn").addEventListener("click", startGame)
document.getElementById("play-again-btn").addEventListener("click", startGame)
document.getElementById("settings-btn").addEventListener("click", () => {
  showMenu("settings-menu")
})
document.getElementById("back-from-settings-btn").addEventListener("click", () => {
  showMenu("start-menu")
})
document.getElementById("credits-btn").addEventListener("click", () => {
  document.getElementById("credits-modal").classList.remove("hidden")
})
document.getElementById("close-credits-btn").addEventListener("click", () => {
  document.getElementById("credits-modal").classList.add("hidden")
})

// Controles de teclado
document.addEventListener("keydown", (e) => {
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
  }
})

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "ArrowRight" || e.key === "Right") {
    paddle.dx = 0
  }
})

// Controles táctiles
let touchStartX = 0
let touchCurrentX = 0
let touchStartY = 0

canvas.addEventListener("touchstart", (e) => {
  if (gameState !== "playing") return
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

// Inicializar display
updateDisplay()
