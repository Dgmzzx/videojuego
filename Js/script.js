const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Game state
let gameState = "menu" // menu, playing, gameOver, win
let score = 0
let lives = 3

// Paddle (main character)
const paddle = {
  width: 100,
  height: 15,
  x: 0,
  y: 0,
  speed: 8,
  dx: 0,
}

// Ball
const ball = {
  x: 0,
  y: 0,
  radius: 8,
  dx: 4,
  dy: -4,
}

// Bricks
const brickRowCount = 5
const brickColumnCount = 7
const brickHeight = 30
const brickPadding = 10
const brickOffsetTop = 60
let brickWidth = 90 // Will be recalculated based on canvas width
let bricks = []

// Colors
const colors = ["#00d4ff", "#ff006e", "#8338ec", "#ffbe0b", "#06ffa5"]

// Dynamic canvas dimensions
let canvasWidth = 800
let canvasHeight = 600

function resizeCanvas() {
  const container = document.querySelector(".game-container")
  const maxWidth = Math.min(window.innerWidth - 40, 800)
  const maxHeight = Math.min(window.innerHeight - 250, 600)

  // Maintain aspect ratio
  const aspectRatio = 4 / 3

  if (maxWidth / maxHeight > aspectRatio) {
    canvasHeight = maxHeight
    canvasWidth = maxHeight * aspectRatio
  } else {
    canvasWidth = maxWidth
    canvasHeight = maxWidth / aspectRatio
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const availableWidth = canvasWidth * 0.9 // Use 90% of canvas width
  brickWidth = (availableWidth - (brickColumnCount - 1) * brickPadding) / brickColumnCount

  // Recalculate game elements based on new canvas size
  if (gameState === "playing") {
    updateGameDimensions()
  }
}

function updateGameDimensions() {
  // Update paddle position proportionally
  const paddleRatio = paddle.x / (canvas.width || canvasWidth)
  paddle.x = canvasWidth * paddleRatio
  paddle.y = canvasHeight - paddle.height - 20

  // Update ball position proportionally
  const ballXRatio = ball.x / (canvas.width || canvasWidth)
  const ballYRatio = ball.y / (canvas.height || canvasHeight)
  ball.x = canvasWidth * ballXRatio
  ball.y = canvasHeight * ballYRatio

  const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding
  const newBrickOffsetLeft = (canvasWidth - totalBricksWidth) / 2

  bricks.forEach((brick, index) => {
    const row = Math.floor(index / brickColumnCount)
    const col = index % brickColumnCount
    brick.x = newBrickOffsetLeft + col * (brickWidth + brickPadding)
    brick.y = brickOffsetTop + row * (brickHeight + brickPadding)
    brick.width = brickWidth // Update brick width
  })
}

// Initialize game
function initGame() {
  // Reset paddle position
  paddle.x = canvasWidth / 2 - paddle.width / 2
  paddle.y = canvasHeight - paddle.height - 20
  paddle.dx = 0

  // Reset ball
  ball.x = canvasWidth / 2
  ball.y = canvasHeight - 50
  ball.dx = 4
  ball.dy = -4

  bricks = []
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

// Draw paddle
function drawPaddle() {
  ctx.fillStyle = "#00d4ff"
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
}

// Draw ball
function drawBall() {
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = "#ff006e"
  ctx.fill()
  ctx.closePath()
}

// Draw bricks
function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      ctx.fillStyle = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

      // Add highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 3)
    }
  })
}

// Move paddle
function movePaddle() {
  paddle.x += paddle.dx

  // Wall collision detection for paddle
  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvasWidth) {
    paddle.x = canvasWidth - paddle.width
  }
}

// Move ball
function moveBall() {
  ball.x += ball.dx
  ball.y += ball.dy

  // Wall collision detection
  if (ball.x + ball.radius > canvasWidth || ball.x - ball.radius < 0) {
    ball.dx *= -1
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1
  }

  // Paddle collision detection
  if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
    // Calculate angle based on where ball hits paddle
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = ((hitPos - 0.5) * Math.PI) / 3
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = speed * Math.sin(angle)
    ball.dy = -speed * Math.cos(angle)
  }

  // Bottom collision - lose life
  if (ball.y + ball.radius > canvasHeight) {
    lives--
    updateDisplay()

    if (lives <= 0) {
      gameState = "gameOver"
      showGameOver()
    } else {
      // Reset ball
      ball.x = canvasWidth / 2
      ball.y = canvasHeight - 50
      ball.dx = 4
      ball.dy = -4
    }
  }
}

// Brick collision detection
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

// Check win condition
function checkWin() {
  const allBricksDestroyed = bricks.every((brick) => !brick.visible)
  if (allBricksDestroyed) {
    gameState = "win"
    showWin()
  }
}

// Update display
function updateDisplay() {
  document.getElementById("score-display").textContent = score
  document.getElementById("lives-display").textContent = lives
}

// Show/hide menus
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

// Game loop
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

// Start game
function startGame() {
  score = 0
  lives = 3
  hideAllMenus()
  initGame()
  updateDisplay()
  gameState = "playing"
  gameLoop()
}

// Event listeners
document.getElementById("start-btn").addEventListener("click", startGame)
document.getElementById("restart-btn").addEventListener("click", startGame)
document.getElementById("play-again-btn").addEventListener("click", startGame)

// Keyboard controls
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

// Touch controls for mobile
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

  // Direct positioning based on touch
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

// Initialize display
updateDisplay()
resizeCanvas()

// Call resize on load and window resize
window.addEventListener("resize", resizeCanvas)
window.addEventListener("load", resizeCanvas)
