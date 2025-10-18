const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Estado del juego
let gameState = "menu" // menú, jugando, finDelJuego, victoria
let score = 0
let lives = 3

// Paleta (personaje principal)
const paddle = {
  width: 100,
  height: 15,
  x: canvas.width / 2 - 50,
  y: canvas.height - 30,
  speed: 8,
  dx: 0,
}

// Pelota
const ball = {
  x: canvas.width / 2,
  y: canvas.height - 50,
  radius: 8,
  dx: 4,
  dy: -4,
}

// Ladrillos
const brickRowCount = 5
const brickColumnCount = 8
const brickWidth = 90
const brickHeight = 30
const brickPadding = 10
const brickOffsetTop = 60
const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding
const brickOffsetLeft = (canvas.width - totalBricksWidth) / 2

let bricks = []

// Colores
const colors = ["#00d4ff", "#ff006e", "#8338ec", "#ffbe0b", "#06ffa5"]

// Inicializar el juego
function initGame() {
  // Reiniciar posición de la paleta
  paddle.x = canvas.width / 2 - paddle.width / 2
  paddle.dx = 0

  // Reiniciar la pelota
  ball.x = canvas.width / 2
  ball.y = canvas.height - 50
  ball.dx = 4
  ball.dy = -4

  // Crear los ladrillos
  bricks = []
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

// Dibujar la paleta
function drawPaddle() {
  ctx.fillStyle = "#00d4ff"
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
}

// Dibujar la pelota
function drawBall() {
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = "#ff006e"
  ctx.fill()
  ctx.closePath()
}

// Dibujar los ladrillos
function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      ctx.fillStyle = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

      // Agregar reflejo (efecto de brillo)
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 3)
    }
  })
}

// Mover la paleta
function movePaddle() {
  paddle.x += paddle.dx

  // Detección de colisión con las paredes (para la paleta)
  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width
  }
}

// Mover la pelota
function moveBall() {
  ball.x += ball.dx
  ball.y += ball.dy

  // Detección de colisión con las paredes
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1
  }

  // Detección de colisión con la paleta
  if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
    // Calcular el ángulo según el punto de impacto en la paleta
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = ((hitPos - 0.5) * Math.PI) / 3
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = speed * Math.sin(angle)
    ball.dy = -speed * Math.cos(angle)
  }

  // Colisión con la parte inferior - perder una vida
  if (ball.y + ball.radius > canvas.height) {
    lives--
    updateDisplay()

    if (lives <= 0) {
      gameState = "gameOver"
      showGameOver()
    } else {
      // Reiniciar la pelota
      ball.x = canvas.width / 2
      ball.y = canvas.height - 50
      ball.dx = 4
      ball.dy = -4
    }
  }
}

// Detección de colisiones con los ladrillos
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

// Comprobar condición de victoria
function checkWin() {
  const allBricksDestroyed = bricks.every((brick) => !brick.visible)
  if (allBricksDestroyed) {
    gameState = "win"
    showWin()
  }
}

// Actualizar la interfaz (puntuación y vidas)
function updateDisplay() {
  document.getElementById("score-display").textContent = score
  document.getElementById("lives-display").textContent = lives
}

// Mostrar / ocultar menús
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

// Bucle principal del juego
function gameLoop() {
  if (gameState !== "playing") return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  drawBricks()
  drawPaddle()
  drawBall()

  movePaddle()
  moveBall()
  detectBrickCollision()
  checkWin()

  requestAnimationFrame(gameLoop)
}

// Iniciar el juego
function startGame() {
  score = 0
  lives = 3
  hideAllMenus()
  initGame()
  updateDisplay()
  gameState = "playing"
  gameLoop()
}

// Detectores de eventos (botones del menú)
document.getElementById("start-btn").addEventListener("click", startGame)
document.getElementById("restart-btn").addEventListener("click", startGame)
document.getElementById("play-again-btn").addEventListener("click", startGame)

// Controles del teclado
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

// Controles táctiles para móviles
let touchStartX = 0

canvas.addEventListener("touchstart", (e) => {
  if (gameState !== "playing") return
  touchStartX = e.touches[0].clientX
})

canvas.addEventListener("touchmove", (e) => {
  if (gameState !== "playing") return
  e.preventDefault()

  const touchX = e.touches[0].clientX
  const deltaX = touchX - touchStartX

  paddle.x += deltaX * 0.5

  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width
  }

  touchStartX = touchX
})

canvas.addEventListener("touchend", () => {
  paddle.dx = 0
})

// Inicializar la interfaz
updateDisplay()
