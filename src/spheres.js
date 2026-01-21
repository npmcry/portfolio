export function initSpheres() {
  const container = document.getElementById('spheresContainer');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  camera.position.z = 50;

  // Sphere colors - using vibrant palette
  const sphereColors = [
    0xFFD860, // Gold
    0xFFB347, // Orange
    0xFF7F50, // Coral
    0xFF6B9D, // Pink
    0xC77DFF, // Purple
    0x7209B7, // Dark Purple
    0xFFFFFF, // White
  ];

  // Create floating spheres
  const spheres = [];
  const sphereCount = 6;

  for (let i = 0; i < sphereCount; i++) {
    const radius = Math.random() * 1.5 + 1; // Vary size between 1 and 2.5
    const geometry = new THREE.SphereGeometry(radius, 32, 32); // 32 segments in both directions for perfect sphere
    const color = sphereColors[Math.floor(Math.random() * sphereColors.length)];
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      wireframe: false,
      shininess: 100,
    });

    const sphere = new THREE.Mesh(geometry, material);
    
    // Ensure sphere scale is uniform (no stretching)
    sphere.scale.set(1, 1, 1);
    
    // Random initial positions
    sphere.position.x = (Math.random() - 0.5) * 150;
    sphere.position.y = (Math.random() - 0.5) * 100;
    sphere.position.z = (Math.random() - 0.5) * 50;

    // Store velocity for floating motion
    sphere.velocity = {
      x: (Math.random() - 0.5) * 0.05,
      y: (Math.random() - 0.5) * 0.05,
      z: (Math.random() - 0.5) * 0.05,
    };

    // Store initial position for looping
    sphere.initialPos = {
      x: sphere.position.x,
      y: sphere.position.y,
      z: sphere.position.z,
    };

    // Rotation
    sphere.rotation.x = Math.random() * Math.PI;
    sphere.rotation.y = Math.random() * Math.PI;
    sphere.rotation.z = Math.random() * Math.PI;

    sphere.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.002,
      y: (Math.random() - 0.5) * 0.002,
      z: (Math.random() - 0.5) * 0.002,
    };

    scene.add(sphere);
    spheres.push(sphere);
  }

  // Lighting
  const light1 = new THREE.PointLight(0xFFD860, 1, 200);
  light1.position.set(50, 50, 50);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xC77DFF, 0.8, 200);
  light2.position.set(-50, -50, 50);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    spheres.forEach((sphere) => {
      // Float movement
      sphere.position.x += sphere.velocity.x;
      sphere.position.y += sphere.velocity.y;
      sphere.position.z += sphere.velocity.z;

      // Wrap around bounds
      const bounds = 80;
      if (Math.abs(sphere.position.x) > bounds) sphere.velocity.x *= -1;
      if (Math.abs(sphere.position.y) > bounds) sphere.velocity.y *= -1;
      if (Math.abs(sphere.position.z) > bounds) sphere.velocity.z *= -1;

      // Rotation
      sphere.rotation.x += sphere.rotationSpeed.x;
      sphere.rotation.y += sphere.rotationSpeed.y;
      sphere.rotation.z += sphere.rotationSpeed.z;
    });

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
