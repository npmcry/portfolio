export function initSkillsNetwork() {
  console.log('initSkillsNetwork called');
  const container = document.getElementById('skillsNetworkContainer');
  console.log('Container found:', container);
  if (!container) {
    console.error('skillsNetworkContainer not found');
    return;
  }

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0.1);
  container.appendChild(renderer.domElement);

  camera.position.z = 50;

  // Skills data - organized by category
  const skillsData = [
    { name: 'TypeScript', category: 'frontend', color: 0x78FFD6 },
    { name: 'React', category: 'frontend', color: 0x78FFD6 },
    { name: 'JavaScript', category: 'frontend', color: 0x78FFD6 },
    { name: 'CSS/SCSS', category: 'frontend', color: 0x78FFD6 },
    
    { name: 'Node.js', category: 'backend', color: 0x8B5CF6 },
    { name: 'Python', category: 'backend', color: 0x8B5CF6 },
    { name: 'MongoDB', category: 'backend', color: 0x8B5CF6 },
    { name: 'REST APIs', category: 'backend', color: 0x8B5CF6 },
    
    { name: 'Psychology', category: 'domain', color: 0xEC4899 },
    { name: 'Mental Health', category: 'domain', color: 0xEC4899 },
    { name: 'UX/UI', category: 'domain', color: 0xEC4899 },
    { name: 'Problem Solving', category: 'domain', color: 0xEC4899 },
  ];

  // Create nodes
  const nodes = [];
  const nodeObjects = [];
  const positions = [];

  // Generate positions in a sphere
  skillsData.forEach((skill, index) => {
    const phi = Math.acos(-1 + (2 * index) / skillsData.length);
    const theta = Math.sqrt(skillsData.length * Math.PI) * phi;

    const x = 25 * Math.cos(theta) * Math.sin(phi);
    const y = 25 * Math.sin(theta) * Math.sin(phi);
    const z = 25 * Math.cos(phi);

    positions.push({ x, y, z, index });

    // Create node geometry
    const geometry = new THREE.SphereGeometry(1.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: skill.color,
      emissive: skill.color,
      emissiveIntensity: 0.5,
      wireframe: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.userData = skill;
    mesh.userData.index = index;

    scene.add(mesh);
    nodeObjects.push(mesh);

    nodes.push({
      name: skill.name,
      category: skill.category,
      color: skill.color,
      position: { x, y, z },
      mesh: mesh,
    });
  });

  // Create connecting lines
  const lineGeometry = new THREE.BufferGeometry();
  const lines = [];

  // Connect nodes within same category and nearby nodes
  nodeObjects.forEach((node1, i) => {
    nodeObjects.forEach((node2, j) => {
      if (i < j) {
        const sameCategory = node1.userData.category === node2.userData.category;
        const distance = node1.position.distanceTo(node2.position);

        if (sameCategory || distance < 20) {
          const lineMaterial = new THREE.LineBasicMaterial({
            color: sameCategory ? node1.userData.color : 0x4B5563,
            opacity: sameCategory ? 0.6 : 0.2,
            transparent: true,
          });

          const points = [node1.position, node2.position];
          const geom = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geom, lineMaterial);
          scene.add(line);
          lines.push({ line, node1, node2, sameCategory });
        }
      }
    });
  });

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x78FFD6, 0.8);
  pointLight.position.set(30, 30, 30);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x8B5CF6, 0.6);
  pointLight2.position.set(-30, -20, 20);
  scene.add(pointLight2);

  // Mouse interaction
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let rotation = { x: 0, y: 0 };

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  container.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      rotation.y += deltaX * 0.01;
      rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });

  container.addEventListener('mouseup', () => {
    isDragging = false;
  });

  container.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Raycasting for hover effects
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  container.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX - container.getBoundingClientRect().left) / container.clientWidth * 2 - 1;
    mouse.y = -(event.clientY - container.getBoundingClientRect().top) / container.clientHeight * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeObjects);

    nodeObjects.forEach((node) => {
      node.scale.set(1, 1, 1);
      node.material.emissiveIntensity = 0.5;
    });

    if (intersects.length > 0) {
      intersects[0].object.scale.set(1.4, 1.4, 1.4);
      intersects[0].object.material.emissiveIntensity = 1;
    }
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Apply rotation
    scene.rotation.x = rotation.x;
    scene.rotation.y = rotation.y;

    // Gentle auto-rotation when not dragging
    if (!isDragging) {
      rotation.y += 0.0005;
    }

    // Pulse effect on nodes
    nodeObjects.forEach((node, index) => {
      const time = Date.now() * 0.001;
      const pulse = 1 + Math.sin(time + index) * 0.1;
      if (!node.scale.equals(new THREE.Vector3(1.4, 1.4, 1.4))) {
        node.scale.set(pulse, pulse, pulse);
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // Handle window resize
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  });
}
