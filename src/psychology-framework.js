export function initPsychologyFramework() {
  const container = document.getElementById('psychologyContainer');
  if (!container) return;

  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  `;

  const data = [
    { emoji: '🌱', name: 'Resilience', desc: 'Bouncing back from challenges and growing stronger.' },
    { emoji: '❤️', name: 'Compassion', desc: 'Deep empathy and kindness toward others.' },
    { emoji: '✨', name: 'Growth', desc: 'Continuous learning in psychology and technology.' },
    { emoji: '🧠', name: 'Understanding', desc: 'Deep comprehension of human behavior.' },
    { emoji: '💎', name: 'Self-Awareness', desc: 'Knowing your thoughts and emotions deeply.' },
    { emoji: '🤝', name: 'Connection', desc: 'Building meaningful relationships and community.' }
  ];

  // Grid container
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 20px;
    width: 100%;
    max-width: 500px;
    margin: 20px auto;
  `;

  let selectedCard = null;

  data.forEach((item, idx) => {
    const card = document.createElement('div');
    card.style.cssText = `
      aspect-ratio: 1;
      background: linear-gradient(135deg, rgba(120,255,214,0.1), rgba(139,92,246,0.1));
      border: 2px solid rgba(120,255,214,0.3);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 15px;
      text-align: center;
    `;

    const emoji = document.createElement('div');
    emoji.textContent = item.emoji;
    emoji.style.cssText = `
      font-size: 40px;
      filter: drop-shadow(0 0 8px rgba(120,255,214,0.2));
    `;

    const name = document.createElement('div');
    name.textContent = item.name;
    name.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: rgba(120,255,214,0.9);
      letter-spacing: 0.02em;
    `;

    card.appendChild(emoji);
    card.appendChild(name);

    card.addEventListener('mouseenter', () => {
      card.style.cssText = `
        aspect-ratio: 1;
        background: linear-gradient(135deg, rgba(120,255,214,0.2), rgba(139,92,246,0.2));
        border: 2px solid #78FFD6;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 15px;
        text-align: center;
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(120,255,214,0.2);
      `;
    });

    card.addEventListener('mouseleave', () => {
      if (selectedCard !== card) {
        card.style.cssText = `
          aspect-ratio: 1;
          background: linear-gradient(135deg, rgba(120,255,214,0.1), rgba(139,92,246,0.1));
          border: 2px solid rgba(120,255,214,0.3);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 15px;
          text-align: center;
        `;
      }
    });

    card.addEventListener('click', () => {
      // Deselect previous
      if (selectedCard) {
        selectedCard.style.cssText = `
          aspect-ratio: 1;
          background: linear-gradient(135deg, rgba(120,255,214,0.1), rgba(139,92,246,0.1));
          border: 2px solid rgba(120,255,214,0.3);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 15px;
          text-align: center;
        `;
      }

      selectedCard = card;

      // Select this card
      card.style.cssText = `
        aspect-ratio: 1;
        background: linear-gradient(135deg, rgba(120,255,214,0.3), rgba(139,92,246,0.3));
        border: 2px solid #78FFD6;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        padding: 15px;
        text-align: center;
        transform: scale(1.15);
        box-shadow: 0 0 30px rgba(120,255,214,0.3);
      `;

      // Show info
      if (infoPanel) {
        infoPanel.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 12px; filter: drop-shadow(0 0 12px rgba(120,255,214,0.4));">${item.emoji}</div>
          <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #78FFD6; font-weight: 700; letter-spacing: 0.02em;">${item.name}</h3>
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: rgba(234, 240, 255, 0.85);">${item.desc}</p>
        `;
        infoPanel.style.cssText = `
          background: linear-gradient(135deg, rgba(120,255,214,0.08), rgba(139,92,246,0.08));
          border: 1.5px solid rgba(120,255,214,0.4);
          border-radius: 20px;
          padding: 28px;
          max-width: 450px;
          color: #EAF0FF;
          font-family: Manrope, sans-serif;
          text-align: center;
          box-shadow: 0 8px 32px rgba(120, 255, 214, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          margin-top: 20px;
          animation: slideUp 0.3s ease;
        `;
      }
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);

  // Info panel
  const infoPanel = document.createElement('div');
  infoPanel.style.cssText = `
    font-family: Manrope, sans-serif;
    width: 100%;
  `;
  container.appendChild(infoPanel);

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}




