// ---------- Game settings (change these to adjust the game) ----------
const GOAL_CANS = 20;        // cans needed to win
const GAME_TIME = 30;        // seconds per round
const SPAWN_MS = 900;        // how often something new pops up (milliseconds)
const OBSTACLE_CHANCE = 0.2; // chance each pop-up is dirty water (0.2 = 1 in 5)
const OBSTACLE_PENALTY = 2;  // cans lost when you tap dirty water

// When the player collects this many cans, show the message.
// If you change GOAL_CANS, update these numbers to match.
const MILESTONES = {
  5: "Great start! Keep going!",
  10: "Halfway there!",
  15: "Almost there, you've got this!"
};

// Confetti uses the brand colors
const CONFETTI_COLORS = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C', '#F16061'];

// ---------- Game state ----------
let currentCans = 0;      // cans collected this round
let timeLeft = GAME_TIME; // seconds remaining
let gameActive = false;   // is a round running?
let spawnInterval;        // repeating timer that spawns items
let timerInterval;        // repeating timer that counts down
let messageTimeout;       // hides a message after a moment

// ---------- Page elements ----------
const grid = document.querySelector('.game-grid');
const cansDisplay = document.getElementById('current-cans');
const timerDisplay = document.getElementById('timer');
const messageBox = document.getElementById('achievements');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');
document.getElementById('goal-cans').textContent = GOAL_CANS;

// ---------- Grid ----------
// Creates the 3x3 game grid where items will appear
function createGrid() {
  grid.innerHTML = ''; // clear any existing cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    grid.appendChild(cell);
  }
}

// ---------- Display helpers ----------
// Updates the score and timer on the page
function updateStats() {
  cansDisplay.textContent = currentCans;
  timerDisplay.textContent = timeLeft;
  // Turn the timer red for the last 5 seconds
  timerDisplay.classList.toggle('low', gameActive && timeLeft <= 5);
}

// Shows a message. Unless "sticky" is true, it fades after 2 seconds.
// "style" is an optional extra class: "win" or "warn"
function showMessage(text, sticky, style) {
  clearTimeout(messageTimeout);
  messageBox.textContent = text;
  messageBox.className = 'achievement show' + (style ? ' ' + style : '');
  if (!sticky) {
    messageTimeout = setTimeout(function () {
      messageBox.className = 'achievement';
      messageBox.textContent = '';
    }, 2000);
  }
}

// Briefly adds a class to an element, then removes it (used for flashes)
function flash(element, className) {
  element.classList.add(className);
  setTimeout(function () { element.classList.remove(className); }, 400);
}

// ---------- Confetti ----------
function launchConfetti() {
  removeConfetti();
  const box = document.createElement('div');
  box.className = 'confetti';

  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDuration = 2.5 + Math.random() * 2 + 's';
    piece.style.animationDelay = Math.random() * 0.8 + 's';
    piece.style.setProperty('--drift', (Math.random() * 200 - 100) + 'px');
    box.appendChild(piece);
  }

  document.body.appendChild(box);
  setTimeout(removeConfetti, 6000); // clean up when it's done
}

function removeConfetti() {
  const old = document.querySelector('.confetti');
  if (old) old.remove();
}

// ---------- Gameplay ----------
// Pops up a can (or sometimes dirty water) in a random grid cell
function spawnItem(isFirst) {
  if (!gameActive) return;
  const cells = document.querySelectorAll('.grid-cell');

  // Clear all cells so only one item shows at a time
  cells.forEach(function (cell) { cell.innerHTML = ''; });

  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // The first item is always a can, after that it's random
  const isObstacle = !isFirst && Math.random() < OBSTACLE_CHANCE;

  if (isObstacle) {
    randomCell.innerHTML = `
      <div class="water-can-wrapper">
        <button class="obstacle" aria-label="Dirty water, avoid"></button>
      </div>
    `;
  } else {
    randomCell.innerHTML = `
      <div class="water-can-wrapper">
        <button class="water-can" aria-label="Collect water can"></button>
      </div>
    `;
  }
}

// Runs when the player taps a can
function collectCan(can) {
  const cell = can.closest('.grid-cell');
  currentCans++;

  cell.innerHTML = '';          // the can disappears
  flash(cell, 'hit');           // the cell flashes blue
  flash(cansDisplay, 'bump');   // the score number pops
  updateStats();

  if (currentCans >= GOAL_CANS) {
    endGame(true);
  } else if (MILESTONES[currentCans]) {
    showMessage(MILESTONES[currentCans]);
  }
}

// Runs when the player taps dirty water: lose points (never below 0)
function hitObstacle(obstacle) {
  const cell = obstacle.closest('.grid-cell');
  currentCans = Math.max(0, currentCans - OBSTACLE_PENALTY);

  cell.innerHTML = '';
  flash(cell, 'penalty');       // the cell flashes red
  flash(cansDisplay, 'shake');  // the score shakes
  updateStats();
  showMessage('Oops! Dirty water. -' + OBSTACLE_PENALTY + ' cans', false, 'warn');
}

// One handler on the grid catches taps on anything inside it (event delegation)
grid.addEventListener('click', function (event) {
  if (!gameActive) return;
  const can = event.target.closest('.water-can');
  const obstacle = event.target.closest('.obstacle');
  if (can) {
    collectCan(can);
  } else if (obstacle) {
    hitObstacle(obstacle);
  }
});

// Runs once per second
function tick() {
  timeLeft--;
  updateStats();
  if (timeLeft <= 0) {
    endGame(false);
  }
}

// Starts a new round
function startGame() {
  if (gameActive) return;
  gameActive = true;
  currentCans = 0;
  timeLeft = GAME_TIME;

  removeConfetti();
  createGrid();
  updateStats();
  showMessage('Go! Tap the cans, avoid the dirty water!');

  startButton.disabled = true;
  startButton.textContent = 'Playing...';

  spawnItem(true); // first item right away (always a can)
  spawnInterval = setInterval(spawnItem, SPAWN_MS);
  timerInterval = setInterval(tick, 1000);
}

// Ends the round. "won" is true if the player reached the goal.
function endGame(won) {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  createGrid(); // remove anything left on the board
  updateStats();

  if (won) {
    showMessage('You did it! You collected all ' + GOAL_CANS +
      ' cans. Every person deserves clean, safe water.', true, 'win');
    launchConfetti();
  } else {
    showMessage("Time's up! You collected " + currentCans + ' of ' +
      GOAL_CANS + ' cans. Play again and go for it!', true);
  }

  startButton.disabled = false;
  startButton.textContent = 'Play Again';
}

// Reset button: stop everything and go back to the starting screen
function resetGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(messageTimeout);

  currentCans = 0;
  timeLeft = GAME_TIME;

  removeConfetti();
  createGrid();
  updateStats();

  messageBox.className = 'achievement';
  messageBox.textContent = '';
  startButton.disabled = false;
  startButton.textContent = 'Start Game';
}

// ---------- Setup ----------
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
createGrid();
updateStats();