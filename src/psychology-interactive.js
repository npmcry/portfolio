export function initPsychologyFramework() {
  const container = document.getElementById('psychologyContainer');
  if (!container) return;

  const concepts = [
    {
      emoji: '🌱',
      name: 'Resilience',
      desc: 'Bouncing back from challenges',
      color: '#78FFD6',
      activity: 'water-plant'
    },
    {
      emoji: '❤️',
      name: 'Compassion',
      desc: 'Deep empathy and kindness',
      color: '#EC4899',
      activity: 'give-hearts'
    },
    {
      emoji: '✨',
      name: 'Growth',
      desc: 'Continuous learning',
      color: '#8B5CF6',
      activity: 'level-up'
    },
    {
      emoji: '🧠',
      name: 'Understanding',
      desc: 'Comprehension of behavior',
      color: '#78FFD6',
      activity: 'puzzle'
    },
    {
      emoji: '💎',
      name: 'Self-Awareness',
      desc: 'Knowing your thoughts',
      color: '#EC4899',
      activity: 'mirror'
    },
    {
      emoji: '🤝',
      name: 'Connection',
      desc: 'Building relationships',
      color: '#8B5CF6',
      activity: 'connect-dots'
    }
  ];

  let selectedConcept = null;

  // Create cards
  container.innerHTML = concepts
    .map(
      (c, i) => `
    <div class="psych-card" data-index="${i}" style="--accent-color: ${c.color}">
      <div class="psych-card-emoji">${c.emoji}</div>
      <h3 class="psych-card-name">${c.name}</h3>
      <p class="psych-card-desc">${c.desc}</p>
    </div>
  `
    )
    .join('');

  // Create activity modal
  const modal = document.createElement('div');
  modal.className = 'psych-modal';
  modal.innerHTML = `
    <div class="psych-modal-content">
      <button class="psych-modal-close">&times;</button>
      <div id="activityContainer"></div>
    </div>
  `;
  container.parentElement.appendChild(modal);

  const closeBtn = modal.querySelector('.psych-modal-close');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    selectedConcept = null;
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      selectedConcept = null;
    }
  });

  // Card click handlers
  document.querySelectorAll('.psych-card').forEach((card, idx) => {
    card.addEventListener('click', () => {
      selectedConcept = concepts[idx];
      showActivity(selectedConcept);
      modal.classList.add('active');
    });
  });

  function showActivity(concept) {
    const activityContainer = document.getElementById('activityContainer');

    switch (concept.activity) {
      case 'water-plant':
        showWaterPlant(activityContainer, concept);
        break;
      case 'give-hearts':
        showGiveHearts(activityContainer, concept);
        break;
      case 'level-up':
        showLevelUp(activityContainer, concept);
        break;
      case 'puzzle':
        showPuzzle(activityContainer, concept);
        break;
      case 'mirror':
        showMirror(activityContainer, concept);
        break;
      case 'connect-dots':
        showConnectDots(activityContainer, concept);
        break;
    }
  }

  function showWaterPlant(container, concept) {
    let health = 50;
    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Water the plant to help it grow!</p>
      </div>
      <div class="water-plant-container">
        <div class="plant" id="plant">🌿</div>
        <p class="health-text">Plant Health: <span id="health">${health}</span>%</p>
        <button class="activity-btn" id="waterBtn">💧 Water Plant</button>
      </div>
    `;

    const plant = container.querySelector('#plant');
    const healthText = container.querySelector('#health');
    const waterBtn = container.querySelector('#waterBtn');

    waterBtn.addEventListener('click', () => {
      health = Math.min(100, health + 20);
      healthText.textContent = health;
      plant.style.transform = 'scale(1.1)';
      plant.textContent = health > 70 ? '🌱' : health > 40 ? '🌿' : '🪀';
      setTimeout(() => (plant.style.transform = 'scale(1)'), 200);

      if (health === 100) {
        plant.textContent = '🌹';
        waterBtn.disabled = true;
        waterBtn.textContent = '✨ Perfect!';
      }
    });
  }

  function showGiveHearts(container, concept) {
    let hearts = 0;
    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Spread kindness by giving hearts!</p>
      </div>
      <div class="give-hearts-container">
        <div class="hearts-display" id="heartsDisplay"></div>
        <p class="hearts-count">Hearts Given: <span id="count">${hearts}</span>/10</p>
        <button class="activity-btn" id="giveHeartBtn">❤️ Give Heart</button>
      </div>
    `;

    const display = container.querySelector('#heartsDisplay');
    const count = container.querySelector('#count');
    const btn = container.querySelector('#giveHeartBtn');

    btn.addEventListener('click', () => {
      if (hearts < 10) {
        hearts++;
        const heart = document.createElement('div');
        heart.textContent = '❤️';
        heart.className = 'floating-heart';
        display.appendChild(heart);

        setTimeout(() => heart.remove(), 1000);

        count.textContent = hearts;

        if (hearts === 10) {
          btn.disabled = true;
          btn.textContent = '✨ You spread joy!';
        }
      }
    });
  }

  function showLevelUp(container, concept) {
    let level = 1;
    let xp = 0;
    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Level up through growth!</p>
      </div>
      <div class="level-up-container">
        <div class="level-display">Level <span id="level">${level}</span></div>
        <div class="xp-bar">
          <div class="xp-fill" id="xpFill" style="width: 0%"></div>
        </div>
        <p class="xp-text">XP: <span id="xp">${xp}</span>/100</p>
        <button class="activity-btn" id="learnBtn">📚 Learn & Grow</button>
      </div>
    `;

    const levelEl = container.querySelector('#level');
    const xpEl = container.querySelector('#xp');
    const xpFill = container.querySelector('#xpFill');
    const btn = container.querySelector('#learnBtn');

    btn.addEventListener('click', () => {
      xp += 25;
      if (xp >= 100) {
        level++;
        xp = 0;
        levelEl.textContent = level;
        xpEl.textContent = xp;
        xpFill.style.width = '0%';

        if (level > 5) {
          btn.disabled = true;
          btn.textContent = '🏆 Master Achieved!';
        }
      } else {
        xpEl.textContent = xp;
        xpFill.style.width = `${xp}%`;
      }
    });
  }

  function showPuzzle(container, concept) {
    let solved = 0;
    const puzzlePieces = ['🧩', '🧩', '🧩', '🧩'];

    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Put the puzzle together!</p>
      </div>
      <div class="puzzle-container">
        <div class="puzzle-pieces" id="puzzlePieces"></div>
        <div class="puzzle-result" id="result"></div>
        <p>Pieces: <span id="solvedCount">${solved}</span>/4</p>
      </div>
    `;

    const piecesContainer = container.querySelector('#puzzlePieces');
    const result = container.querySelector('#result');
    const count = container.querySelector('#solvedCount');

    puzzlePieces.forEach((piece, i) => {
      const btn = document.createElement('button');
      btn.textContent = piece;
      btn.className = 'puzzle-piece';
      btn.addEventListener('click', () => {
        solved++;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        count.textContent = solved;

        if (solved === 4) {
          result.textContent = '✨ Understanding Complete! 🧠✨';
          result.style.opacity = '1';
        }
      });
      piecesContainer.appendChild(btn);
    });
  }

  function showMirror(container, concept) {
    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Reflect on yourself</p>
      </div>
      <div class="mirror-container">
        <div class="mirror">🪞</div>
        <p class="reflection-text">What do you see?</p>
        <textarea id="reflection" placeholder="Write your thoughts..." maxlength="200"></textarea>
        <p class="encouragement-message" id="encouragement"></p>
        <button class="activity-btn" id="reflectBtn">✨ Accept</button>
      </div>
    `;

    const textarea = container.querySelector('#reflection');
    const btn = container.querySelector('#reflectBtn');
    const encouragement = container.querySelector('#encouragement');

    btn.addEventListener('click', () => {
      if (textarea.value.length > 0) {
        btn.textContent = '✨ Self-Aware!';
        btn.disabled = true;
        textarea.disabled = true;
        encouragement.textContent = '🌟 You\'re doing amazing! Self-reflection is a powerful step toward growth and understanding. Keep being mindful! 💫';
        encouragement.style.opacity = '1';
      }
    });
  }

  function showConnectDots(container, concept) {
    let connected = 0;
    container.innerHTML = `
      <div class="activity-header">
        <h2>${concept.emoji} ${concept.name}</h2>
        <p>Connect the dots to build your network!</p>
      </div>
      <div class="connect-dots-container" id="dotsContainer"></div>
      <p>Connected: <span id="connectedCount">${connected}</span>/5</p>
    `;

    const dotsContainer = container.querySelector('#dotsContainer');
    const count = container.querySelector('#connectedCount');

    const dots = ['👤', '👤', '👤', '👤', '👤'];
    dots.forEach((dot, i) => {
      const dotBtn = document.createElement('button');
      dotBtn.textContent = dot;
      dotBtn.className = 'dot-btn';
      dotBtn.addEventListener('click', () => {
        if (!dotBtn.classList.contains('connected')) {
          connected++;
          dotBtn.classList.add('connected');
          count.textContent = connected;

          if (connected === 5) {
            count.textContent = '✨ Network Complete!';
          }
        }
      });
      dotsContainer.appendChild(dotBtn);
    });
  }
}
