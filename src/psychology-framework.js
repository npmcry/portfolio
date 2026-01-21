export function initPsychologyFramework() {
  const container = document.getElementById('psychologyContainer');
  if (!container) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  // Set canvas size
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Framework data
  const framework = {
    center: { x: canvas.width / 2, y: canvas.height / 2 },
    coreRadius: 40,
    orbits: [
      {
        radius: 120,
        items: [
          { label: 'Resilience', icon: '🌱', color: '#78FFD6' },
          { label: 'Compassion', icon: '❤️', color: '#EC4899' },
          { label: 'Growth', icon: '✨', color: '#8B5CF6' },
          { label: 'Understanding', icon: '🧠', color: '#78FFD6' }
        ]
      },
      {
        radius: 200,
        items: [
          { label: 'Self-Awareness', detail: 'Know thyself', color: 'rgba(120,255,214,0.3)' },
          { label: 'Empathy', detail: 'Feel with others', color: 'rgba(236,72,153,0.3)' },
          { label: 'Adaptation', detail: 'Learn & evolve', color: 'rgba(139,92,246,0.3)' },
          { label: 'Connection', detail: 'Build bridges', color: 'rgba(120,255,214,0.3)' },
          { label: 'Purpose', detail: 'Why you do it', color: 'rgba(236,72,153,0.3)' },
          { label: 'Balance', detail: 'Mind + Code', color: 'rgba(139,92,246,0.3)' }
        ]
      }
    ]
  };

  let selectedItem = null;
  let mousePos = { x: canvas.width / 2, y: canvas.height / 2 };
  let animationTime = 0;

  // Mouse tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    // Check if hovering over items
    framework.orbits.forEach((orbit, orbitIdx) => {
      orbit.items.forEach((item, itemIdx) => {
        const angle = (itemIdx / orbit.items.length) * Math.PI * 2;
        const x = framework.center.x + Math.cos(angle) * orbit.radius;
        const y = framework.center.y + Math.sin(angle) * orbit.radius;

        const dist = Math.hypot(mousePos.x - x, mousePos.y - y);
        item.hovered = dist < 25;
      });
    });

    // Check core
    const coreDist = Math.hypot(mousePos.x - framework.center.x, mousePos.y - framework.center.y);
    const isHoveringCore = coreDist < framework.coreRadius + 10;
    framework.coreHovered = isHoveringCore;
    canvas.style.cursor = isHoveringCore ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', () => {
    if (framework.coreHovered) {
      selectedItem = null;
    }

    framework.orbits.forEach((orbit) => {
      orbit.items.forEach((item) => {
        if (item.hovered) {
          selectedItem = item;
        }
      });
    });
  });

  // Draw functions
  function drawCore() {
    const radius = framework.coreRadius;
    const pulse = Math.sin(animationTime * 0.003) * 5 + 5;
    
    // Glow
    const gradient = ctx.createRadialGradient(
      framework.center.x,
      framework.center.y,
      0,
      framework.center.x,
      framework.center.y,
      radius + pulse + 10
    );
    gradient.addColorStop(0, 'rgba(120, 255, 214, 0.3)');
    gradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(120, 255, 214, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(framework.center.x, framework.center.y, radius + pulse + 10, 0, Math.PI * 2);
    ctx.fill();

    // Core circle
    ctx.fillStyle = framework.coreHovered
      ? 'rgba(120, 255, 214, 0.8)'
      : 'rgba(120, 255, 214, 0.5)';
    ctx.beginPath();
    ctx.arc(framework.center.x, framework.center.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#78FFD6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#070A12';
    ctx.font = 'bold 16px Manrope';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Well-Being', framework.center.x, framework.center.y - 8);
    ctx.fillText('Framework', framework.center.x, framework.center.y + 12);
  }

  function drawOrbits() {
    framework.orbits.forEach((orbit) => {
      // Orbit circle
      ctx.strokeStyle = 'rgba(120, 255, 214, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(framework.center.x, framework.center.y, orbit.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Items
      orbit.items.forEach((item, idx) => {
        const angle = (idx / orbit.items.length) * Math.PI * 2 - Math.PI / 2;
        const x = framework.center.x + Math.cos(angle) * orbit.radius;
        const y = framework.center.y + Math.sin(angle) * orbit.radius;

        drawItem(item, x, y, item.hovered);
      });
    });
  }

  function drawItem(item, x, y, isHovered) {
    const size = isHovered ? 30 : 22;
    const isFirst = framework.orbits[0].items.includes(item);

    if (isFirst) {
      // First orbit - emoji icons
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, x, y);

      if (isHovered) {
        // Label on hover
        ctx.fillStyle = 'rgba(120, 255, 214, 0.9)';
        ctx.font = 'bold 12px Manrope';
        ctx.fillText(item.label, x, y + 35);
      }
    } else {
      // Second orbit - colored boxes
      const boxSize = isHovered ? 50 : 40;

      // Background
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x - boxSize / 2, y - boxSize / 2, boxSize, boxSize, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered ? '#78FFD6' : 'rgba(120, 255, 214, 0.5)';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#070A12';
      ctx.font = isHovered ? 'bold 11px Manrope' : '10px Manrope';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, x, y - 5);
      if (isHovered) {
        ctx.font = '9px Manrope';
        ctx.fillStyle = 'rgba(7, 10, 18, 0.8)';
        ctx.fillText(item.detail, x, y + 8);
      }
    }

    // Connection lines
    if (isHovered) {
      ctx.strokeStyle = 'rgba(120, 255, 214, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(framework.center.x, framework.center.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function drawSelectedInfo() {
    if (!selectedItem) return;

    const boxWidth = 280;
    const boxHeight = 120;
    const x = canvas.width - boxWidth - 20;
    const y = 20;

    // Background
    ctx.fillStyle = 'rgba(7, 10, 18, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#78FFD6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#78FFD6';
    ctx.font = 'bold 16px Manrope';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(selectedItem.label, x + 15, y + 12);

    // Content
    const content = selectedItem.detail || 'Click to explore this aspect of well-being';
    ctx.fillStyle = 'rgba(234, 240, 255, 0.75)';
    ctx.font = '13px Manrope';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Word wrap
    const words = content.split(' ');
    let line = '';
    let lineY = y + 40;

    words.forEach((word) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > boxWidth - 30 && line) {
        ctx.fillText(line, x + 15, lineY);
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, x + 15, lineY);
  }

  // Polyfill for roundRect if needed
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }

  // Animation loop
  function animate() {
    // Clear canvas
    ctx.fillStyle = 'rgba(7, 10, 18, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animationTime++;

    drawOrbits();
    drawCore();
    drawSelectedInfo();

    requestAnimationFrame(animate);
  }

  animate();
}
