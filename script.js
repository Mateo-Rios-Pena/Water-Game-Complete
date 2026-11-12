// ---------- Difficulty settings (change these numbers to tune the game) ----------
// Each difficulty changes the goal, the time, how fast things pop up,
// how often dirty water shows up, and how many cans a dirty drop costs.
const DIFFICULTY = {
  easy:   { goal: 15, time: 40, spawnMs: 1100, obstacleChance: 0.1, penalty: 1 },
  normal: { goal: 20, time: 35, spawnMs: 900,  obstacleChance: 0.2, penalty: 2 },
  hard:   { goal: 25, time: 30, spawnMs: 700,  obstacleChance: 0.3, penalty: 3 }
};

// ---------- Milestone messages ----------
// An array of milestones. "at" is how far toward the goal the player is
// (0.25 = 25%), so the same messages work on every difficulty.
// Add or change messages here and the game picks them up.
const MILESTONE_MESSAGES = [
  { at: 0.25, text: "Great start! Keep going!" },
  { at: 0.5,  text: "Halfway there!" },
  { at: 0.75, text: "Almost there, you've got this!" }
];

// ---------- Sound effects ----------
// These files live in the "sounds" folder. To use your own clips, save them
// there with these names (or change the file names below).
const SOUNDS = {
  collect: new Audio('sounds/collect.mp3'), // collecting a can
  miss:    new Audio('sounds/miss.mp3'),    // missing a can or tapping dirty water
  click:   new Audio('sounds/click.mp3'),   // clicking a button
  win:     new Audio('sounds/win.mp3')      // winning the game
};

// Plays one of the sounds above, unless sound is turned off
function playSound(name) {
  const sound = SOUNDS[name];
  sound.currentTime = 0;               // start from the beginning, even if it's still playing
  sound.play().catch(function () {});  // ignore errors, like a missing file
}

// Confetti uses the brand colors
const CONFETTI_COLORS = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C', '#F16061'];

// ---------- Page elements ----------
const grid = document.querySelector('.game-grid');
const cansDisplay = document.getElementById('current-cans');
const timerDisplay = document.getElementById('timer');
const nextMilestoneDisplay = document.getElementById('next-milestone');
const goalDisplay = document.getElementById('goal-cans');
const messageBox = document.getElementById('achievements');
const startButton = document.getElementById('start-game');
const resetButton = document.getElementById('reset-game');
const difficultySelector = document.getElementById('difficulty-selector');

// ---------- Game state ----------
// DIFFICULTY[difficultySelector.value] looks up "easy", "normal", or "hard"
// using whatever the dropdown currently says (bracket notation).
let settings = DIFFICULTY[difficultySelector.value]; // the rules for this round
let milestones = [];                                 // this round's milestones (see buildMilestones)
let currentCans = 0;                                 // cans collected this round
let timeLeft = settings.time;                        // seconds remaining
let gameActive = false;                              // is a round running?
let spawnInterval;                                   // repeating timer that spawns items
let timerInterval;                                   // repeating timer that counts down
let messageTimeout;                                  // hides a message after a moment

// ---------- Difficulty ----------
// Reads the dropdown and updates the goal, timer, and milestones on the page
function applyDifficulty() {
  settings = DIFFICULTY[difficultySelector.value];
  timeLeft = settings.time;
  goalDisplay.textContent = settings.goal;
  buildMilestones();
  updateStats();
}

// The name shown in messages, like "Hard"
function difficultyName() {
  return difficultySelector.options[difficultySelector.selectedIndex].text;
}

// ---------- Milestones ----------
// Turns the message array into this round's milestones. Each one gets a
// score to reach (count) and starts out not reached yet.
function buildMilestones() {
  milestones = MILESTONE_MESSAGES.map(function (item) {
    return {
      count: Math.round(settings.goal * item.at), // e.g. 25% of 20 cans = 5
      message: item.text,
      reached: false
    };
  });
}

// Checks every milestone. If the score has reached one that hasn't been
// celebrated yet, show its message (only once per round).
function checkMilestones() {
  milestones.forEach(function (milestone) {
    if (!milestone.reached && currentCans >= milestone.count) {
      milestone.reached = true;
      showMessage(milestone.message + ' (' + milestone.count + ' cans)', false, 'milestone');
    }
  });
}

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
// Updates the score, timer, and next milestone on the page
function updateStats() {
  cansDisplay.textContent = currentCans;
  timerDisplay.textContent = timeLeft;
  // Turn the timer red for the last 5 seconds
  timerDisplay.classList.toggle('low', gameActive && timeLeft <= 5);

  // The next milestone is the first one not reached yet.
  // If they're all reached, the next target is the goal itself.
  let nextTarget = settings.goal;
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].reached) {
      nextTarget = milestones[i].count;
      break;
    }
  }
  nextMilestoneDisplay.textContent = nextTarget;
}

// Shows a message. Unless "sticky" is true, it fades after 2 seconds.
// "style" is an optional extra class: "win", "warn", or "milestone"
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

// DOM ADD + REMOVE: creates a small "+1" or "-2" over the cell,
// then deletes it from the page once its animation is done.
function floatText(cell, text, kind) {
  const label = document.createElement('span');   // create a new element
  label.className = 'floating-text ' + kind;
  label.textContent = text;
  label.setAttribute('aria-hidden', 'true');      // the message box already announces it
  cell.appendChild(label);                        // add it to the page
  setTimeout(function () { label.remove(); }, 700); // remove it from the page
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

  // MISS: if a can is still on the board, the player didn't tap it in time
  if (document.querySelector('.water-can')) {
    playSound('miss');
  }

  // DOM REMOVE: take away whatever is already on the board
  document.querySelectorAll('.water-can-wrapper').forEach(function (item) {
    item.remove();
  });

  const cells = document.querySelectorAll('.grid-cell');
  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // The first item is always a can, after that it's random.
  // How often dirty water appears depends on the difficulty.
  const isObstacle = isFirst !== true && Math.random() < settings.obstacleChance;

  // DOM ADD: put the new item into the cell
  if (isObstacle) {
    randomCell.insertAdjacentHTML('beforeend', `
      <div class="water-can-wrapper">
        <button class="obstacle" aria-label="Dirty water, avoid"></button>
      </div>
    `);
  } else {
    randomCell.insertAdjacentHTML('beforeend', `
      <div class="water-can-wrapper">
        <button class="water-can" aria-label="Collect water can"></button>
      </div>
    `);
  }
}

// Runs when the player taps a can
function collectCan(can) {
  const cell = can.closest('.grid-cell');
  currentCans++;

  can.closest('.water-can-wrapper').remove(); // DOM REMOVE: the can disappears
  flash(cell, 'hit');                         // the cell flashes blue
  floatText(cell, '+1', 'gain');              // a "+1" floats up
  flash(cansDisplay, 'bump');                 // the score number pops

  checkMilestones();  // did this tap reach a milestone?
  updateStats();

  if (currentCans >= settings.goal) {
    endGame(true);        // the win sound plays inside endGame
  } else {
    playSound('collect');
  }
}

// Runs when the player taps dirty water: lose cans (never below 0)
function hitObstacle(obstacle) {
  const cell = obstacle.closest('.grid-cell');
  const lost = Math.min(currentCans, settings.penalty); // can't go below 0
  currentCans -= lost;

  obstacle.closest('.water-can-wrapper').remove(); // DOM REMOVE: the drop disappears
  flash(cell, 'penalty');                          // the cell flashes red
  floatText(cell, lost > 0 ? '-' + lost : 'Oops!', 'loss');
  flash(cansDisplay, 'shake');                     // the score shakes
  playSound('miss');
  updateStats();

  const cost = lost > 0 ? ' -' + lost + (lost === 1 ? ' can' : ' cans') : '';
  showMessage('Oops! Dirty water.' + cost, false, 'warn');
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
  playSound('click');

  applyDifficulty();   // read the chosen difficulty (sets the goal, time, and fresh milestones)

  gameActive = true;
  currentCans = 0;

  removeConfetti();
  createGrid();
  updateStats();
  showMessage('Go! Tap the cans, avoid the dirty water!');

  difficultySelector.disabled = true; // no changing difficulty mid-round
  startButton.disabled = true;
  startButton.textContent = 'Playing...';

  spawnItem(true); // first item right away (always a can)
  spawnInterval = setInterval(spawnItem, settings.spawnMs); // faster on Hard
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
    playSound('win');
    showMessage('You did it! You collected all ' + settings.goal + ' cans on ' +
      difficultyName() + '. Every person deserves clean, safe water.', true, 'win');
    launchConfetti();
  } else {
    showMessage("Time's up! You collected " + currentCans + ' of ' +
      settings.goal + ' cans on ' + difficultyName() +
      '. Play again, or try a different difficulty!', true);
  }

  difficultySelector.disabled = false;
  startButton.disabled = false;
  startButton.textContent = 'Play Again';
}

// Reset button: stop everything and go back to the starting screen
function resetGame() {
  playSound('click');

  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearTimeout(messageTimeout);

  currentCans = 0;
  removeConfetti();
  createGrid();
  applyDifficulty(); // puts the goal, timer, and milestones back for the chosen difficulty

  messageBox.className = 'achievement';
  messageBox.textContent = '';
  difficultySelector.disabled = false;
  startButton.disabled = false;
  startButton.textContent = 'Start Game';
}

// ---------- Setup ----------
startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
difficultySelector.addEventListener('change', applyDifficulty); // update goal, timer, and milestones when changed
createGrid();
applyDifficulty();