export function initGalaxy() {
  const container = document.getElementById('galaxyContainer');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  camera.position.z = 120;

  // Galaxy creation
  const galaxyGeometry = new THREE.BufferGeometry();
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  
  const colorOptions = [
    new THREE.Color(0xFFD860), // Gold
    new THREE.Color(0xFFB347), // Orange
    new THREE.Color(0xFF7F50), // Coral
    new THREE.Color(0xFF6B9D), // Pink
    new THREE.Color(0xC77DFF), // Purple
    new THREE.Color(0x7209B7), // Dark Purple
    new THREE.Color(0xFFFFFF), // White
  ];

  // Create spiral galaxy with realistic distribution
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 180;
    
    // Spiral pattern - more realistic
    const spiralAngle = angle + (distance / 180) * Math.PI * 2.5;
    
    positions[i * 3] = Math.cos(spiralAngle) * distance;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40 * (1 - distance / 180); // Flatter at edges
    positions[i * 3 + 2] = Math.sin(spiralAngle) * distance;

    // Random color from palette
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Vary sizes - core stars bigger
    const sizeVariation = 1 - (distance / 180) * 0.6;
    sizes[i] = Math.random() * 1.5 * sizeVariation + 0.3;
  }

  galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  galaxyGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starMaterial = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });

  const stars = new THREE.Points(galaxyGeometry, starMaterial);
  scene.add(stars);

  // Animation loop - auto rotate and slight tilt
  let time = 0;
  
  function animate() {
    requestAnimationFrame(animate);

    time += 0.0005;

    // Smooth rotation
    stars.rotation.x = Math.sin(time * 0.5) * 0.3;
    stars.rotation.z = time;

    // Animate colors - cycle through palette
    const colorShift = Math.floor(time * 100) % colorOptions.length;
    for (let i = 0; i < starCount; i++) {
      const colorIndex = (i + colorShift) % colorOptions.length;
      const color = colorOptions[colorIndex];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    galaxyGeometry.attributes.color.needsUpdate = true;

    // Subtle camera movement - gentle orbit
    camera.position.x = Math.sin(time) * 30;
    camera.position.y = Math.cos(time * 0.7) * 20;
    camera.position.z = 120 + Math.sin(time * 0.3) * 20;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();

  return () => {
    container.removeChild(renderer.domElement);
  };
}


