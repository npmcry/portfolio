export function initMinecraft() {
  const container = document.getElementById('minecraftContainer');
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  const projectsSection = document.querySelector('.projects');
  const bounds = projectsSection.getBoundingClientRect();
  const camera = new THREE.PerspectiveCamera(90, bounds.width / bounds.height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  
  renderer.setSize(bounds.width, bounds.height);
  renderer.setClearColor(0x000000, 0);
  
  container.appendChild(renderer.domElement);

  camera.position.set(18, 15, 22);
  camera.lookAt(0, 5, 0);

  // Create Minecraft-style textures
  function createMinecraftTexture(baseColor, blockType = 'default') {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (blockType === 'grass') {
      // Grass block top texture - multiple shades of green
      const greens = ['#5C8A3B', '#628B3E', '#5A8839', '#65913F', '#5E8C3D', '#5B893A'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (blockType === 'wood') {
      // Oak wood texture - brown rings
      const browns = ['#9C7F4E', '#A68858', '#927748', '#8B6F42'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = browns[Math.floor(Math.random() * browns.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (blockType === 'water') {
      // Water texture - animated blue
      const blues = ['#3F76E4', '#4178E6', '#3D74E2', '#4379E5'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = blues[Math.floor(Math.random() * blues.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (blockType === 'leaves') {
      // Pink leaves texture
      const pinks = ['#F38BAA', '#F9B3CD', '#F195B3', '#EE85A0'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = pinks[Math.floor(Math.random() * pinks.length)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else {
      // Default solid color
      ctx.fillStyle = '#' + baseColor.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, 16, 16);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Pixelated look
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // Lighting - Minecraft style (brighter, more ambient)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);

  // Voxel/block creation with Minecraft-style appearance
  function createBlock(x, y, z, color, blockType = 'default') {
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    
    // Create textured material like Minecraft
    const texture = createMinecraftTexture(color, blockType);
    const material = new THREE.MeshLambertMaterial({ 
      map: texture,
      flatShading: true,
    });
    
    const cube = new THREE.Mesh(geometry, material);
    
    cube.position.set(x * 3, y * 3, z * 3);
    cube.scale.set(0, 0, 0);
    
    return cube;
  }

  // Build design: Cherry blossom trees and river - COMPACT
  const buildPlan = [];
  
  // Grass base - smaller 11x11
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      buildPlan.push({ x, y: 0, z, color: 0x5C8A3B, type: 'grass' });
    }
  }

  // River - single stream
  for (let z = -5; z <= 5; z++) {
    buildPlan.push({ x: 0, y: 0.5, z, color: 0x3F76E4, type: 'water' });
  }

  // Bridge across the water - wooden planks
  for (let z = -1; z <= 1; z++) {
    buildPlan.push({ x: 0, y: 1, z, color: 0x9C7F4E, type: 'wood' });
  }
  // Bridge railings
  buildPlan.push({ x: -1, y: 1, z: -1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: -1, y: 2, z: -1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: 1, y: 1, z: -1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: 1, y: 2, z: -1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: -1, y: 1, z: 1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: -1, y: 2, z: 1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: 1, y: 1, z: 1, color: 0x8B6F42, type: 'wood' });
  buildPlan.push({ x: 1, y: 2, z: 1, color: 0x8B6F42, type: 'wood' });

  // Tree 1 - Puffy cherry blossom with multiple layers
  const tree1X = -3;
  const tree1Z = -2;
  buildPlan.push({ x: tree1X, y: 1, z: tree1Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree1X, y: 2, z: tree1Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree1X, y: 3, z: tree1Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree1X, y: 4, z: tree1Z, color: 0x9C7F4E, type: 'wood' });
  
  // Layer 1 - bottom (largest)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 3) {
        buildPlan.push({ x: tree1X + dx, y: 4, z: tree1Z + dz, color: 0xF38BAA, type: 'leaves' });
      }
    }
  }
  // Layer 2 - middle
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      buildPlan.push({ x: tree1X + dx, y: 5, z: tree1Z + dz, color: 0xF38BAA, type: 'leaves' });
    }
  }
  // Layer 3 - top (small cap)
  buildPlan.push({ x: tree1X, y: 6, z: tree1Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree1X + 1, y: 6, z: tree1Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree1X - 1, y: 6, z: tree1Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree1X, y: 6, z: tree1Z + 1, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree1X, y: 6, z: tree1Z - 1, color: 0xF38BAA, type: 'leaves' });

  // Tree 2 - Puffy cherry blossom with multiple layers
  const tree2X = 3;
  const tree2Z = 1;
  buildPlan.push({ x: tree2X, y: 1, z: tree2Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree2X, y: 2, z: tree2Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree2X, y: 3, z: tree2Z, color: 0x9C7F4E, type: 'wood' });
  buildPlan.push({ x: tree2X, y: 4, z: tree2Z, color: 0x9C7F4E, type: 'wood' });
  
  // Layer 1 - bottom (largest)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 3) {
        buildPlan.push({ x: tree2X + dx, y: 4, z: tree2Z + dz, color: 0xF38BAA, type: 'leaves' });
      }
    }
  }
  // Layer 2 - middle
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      buildPlan.push({ x: tree2X + dx, y: 5, z: tree2Z + dz, color: 0xF38BAA, type: 'leaves' });
    }
  }
  // Layer 3 - top (small cap)
  buildPlan.push({ x: tree2X, y: 6, z: tree2Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree2X + 1, y: 6, z: tree2Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree2X - 1, y: 6, z: tree2Z, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree2X, y: 6, z: tree2Z + 1, color: 0xF38BAA, type: 'leaves' });
  buildPlan.push({ x: tree2X, y: 6, z: tree2Z - 1, color: 0xF38BAA, type: 'leaves' });


  // Flowers
  const flowers = [
    { x: -4, z: -3 }, { x: -2, z: 2 }, { x: 2, z: -2 },
    { x: 4, z: 3 }, { x: -3, z: 4 }, { x: 3, z: -4 }
  ];
  flowers.forEach(pos => {
    const color = Math.random() > 0.5 ? 0xFF0000 : 0xFFFF00;
    buildPlan.push({ x: pos.x, y: 1, z: pos.z, color: color, type: 'default' });
  });

  // Build animation
  const blocks = [];
  let currentBlockIndex = 0;

  function buildNextBlock() {
    if (currentBlockIndex < buildPlan.length) {
      const plan = buildPlan[currentBlockIndex];
      const block = createBlock(plan.x, plan.y, plan.z, plan.color, plan.type);
      scene.add(block);
      blocks.push(block);
      
      const startTime = Date.now();
      function scaleUp() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 200, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        block.scale.set(eased, eased, eased);
        
        if (progress < 1) {
          requestAnimationFrame(scaleUp);
        }
      }
      scaleUp();
      
      currentBlockIndex++;
      setTimeout(buildNextBlock, 80);
    } else {
      setTimeout(() => {
        blocks.forEach(block => scene.remove(block));
        blocks.length = 0;
        currentBlockIndex = 0;
        buildNextBlock();
      }, 5000);
    }
  }

  buildNextBlock();

  // Camera rotation
  let angle = 0;
  function animate() {
    requestAnimationFrame(animate);
    
    angle += 0.0003;
    camera.position.x = Math.cos(angle) * 22;
    camera.position.z = Math.sin(angle) * 22;
    camera.lookAt(0, 5, 0);
    
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    const projectsSection = document.querySelector('.projects');
    const bounds = projectsSection.getBoundingClientRect();
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height);
  });

  animate();

  return () => {
    container.removeChild(renderer.domElement);
  };
}
