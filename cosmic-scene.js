(() => {
  const canvas = document.getElementById("bg");
  if (!canvas || typeof THREE === "undefined") return;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sections = [...document.querySelectorAll("[data-scene]")];
  const isCompact = () => window.innerWidth < 768;
  const prefersReducedMotion = () => reducedMotionQuery.matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isCompact(),
    powerPreference: "high-performance",
  });

  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  if ("toneMapping" in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 140);
  const clock = new THREE.Clock();

  const pointer = { x: 0, y: 0 };
  const smoothPointer = { x: 0, y: 0 };
  let activeScene = "hero";
  let audioMode = "piano";

  const sceneStates = {
    hero: {
      cameraX: -0.34,
      cameraY: 0.04,
      cameraZ: 8.6,
      starOpacity: 1,
      brightOpacity: 1,
      dustOpacity: 0.16,
      hazeOpacity: 0.12,
      nodeOpacity: 0.07,
      clusterOpacity: 0.15,
      twinkle: 0.28,
      cyan: 0.18,
      violet: 0.16,
      gold: 0.03,
    },
    about: {
      cameraX: 0.04,
      cameraY: 0.02,
      cameraZ: 9.2,
      starOpacity: 0.82,
      brightOpacity: 0.72,
      dustOpacity: 0.1,
      hazeOpacity: 0.06,
      nodeOpacity: 0.02,
      clusterOpacity: 0.05,
      twinkle: 0.12,
      cyan: 0.08,
      violet: 0.06,
      gold: 0.015,
    },
    ai: {
      cameraX: 0.16,
      cameraY: 0.02,
      cameraZ: 8.95,
      starOpacity: 0.9,
      brightOpacity: 0.82,
      dustOpacity: 0.12,
      hazeOpacity: 0.08,
      nodeOpacity: 0.12,
      clusterOpacity: 0.08,
      twinkle: 0.16,
      cyan: 0.15,
      violet: 0.18,
      gold: 0.015,
    },
    work: {
      cameraX: 0.22,
      cameraY: -0.02,
      cameraZ: 9.45,
      starOpacity: 0.76,
      brightOpacity: 0.64,
      dustOpacity: 0.08,
      hazeOpacity: 0.05,
      nodeOpacity: 0.035,
      clusterOpacity: 0.12,
      twinkle: 0.1,
      cyan: 0.08,
      violet: 0.07,
      gold: 0.012,
    },
    skills: {
      cameraX: 0.12,
      cameraY: -0.06,
      cameraZ: 9.7,
      starOpacity: 0.68,
      brightOpacity: 0.54,
      dustOpacity: 0.06,
      hazeOpacity: 0.03,
      nodeOpacity: 0.018,
      clusterOpacity: 0.04,
      twinkle: 0.08,
      cyan: 0.05,
      violet: 0.04,
      gold: 0.008,
    },
    contact: {
      cameraX: -0.12,
      cameraY: 0,
      cameraZ: 9.05,
      starOpacity: 0.86,
      brightOpacity: 0.74,
      dustOpacity: 0.11,
      hazeOpacity: 0.06,
      nodeOpacity: 0.03,
      clusterOpacity: 0.06,
      twinkle: 0.12,
      cyan: 0.12,
      violet: 0.1,
      gold: 0.03,
    },
  };

  const audioModeColorMap = {
    piano: { cyanBoost: 0.015, violetBoost: 0.018, goldBoost: 0.004 },
    violin: { cyanBoost: 0.004, violetBoost: 0.04, goldBoost: 0.004 },
    guitar: { cyanBoost: 0.005, violetBoost: 0.008, goldBoost: 0.03 },
    jazz: { cyanBoost: 0.01, violetBoost: 0.01, goldBoost: 0.03 },
    classical: { cyanBoost: 0.01, violetBoost: 0.03, goldBoost: 0.012 },
    pop: { cyanBoost: 0.03, violetBoost: 0.015, goldBoost: 0.008 },
  };

  const currentState = { ...sceneStates.hero };
  const lerp = (start, end, alpha) => start + (end - start) * alpha;
  const rand = (min, max) => min + Math.random() * (max - min);

  const setRendererSize = () => {
    const compact = isCompact();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.7));
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  setRendererSize();

  const ambient = new THREE.AmbientLight(0xd6e4ff, 0.4);
  scene.add(ambient);

  const cyanLight = new THREE.PointLight(0x88e4ff, 2.1, 34);
  cyanLight.position.set(3.6, 1.6, 2.4);
  scene.add(cyanLight);

  const violetLight = new THREE.PointLight(0x8d79ff, 1.7, 28);
  violetLight.position.set(-3.8, -1.1, 2.6);
  scene.add(violetLight);

  const goldLight = new THREE.PointLight(0xd7b069, 0.8, 22);
  goldLight.position.set(0.4, 0.3, -8.4);
  scene.add(goldLight);

  const makeStarLayer = ({ count, spreadX, spreadY, depthMin, depthMax, size, opacity, colors }) => {
    const positions = new Float32Array(count * 3);
    const colorBuffer = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const brightness = new Float32Array(count);
    const colorPool = colors.map((value) => new THREE.Color(value));

    for (let index = 0; index < count; index += 1) {
      const i = index * 3;
      positions[i] = rand(-spreadX, spreadX);
      positions[i + 1] = rand(-spreadY, spreadY);
      positions[i + 2] = rand(depthMin, depthMax);
      phases[index] = Math.random() * Math.PI * 2;
      brightness[index] = rand(0.6, 1.1);
      const picked = colorPool[Math.floor(Math.random() * colorPool.length)];
      colorBuffer[i] = picked.r;
      colorBuffer[i + 1] = picked.g;
      colorBuffer[i + 2] = picked.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorBuffer, 3));

    const material = new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    return {
      points: new THREE.Points(geometry, material),
      colors: colorBuffer,
      phases,
      brightness,
      palette: colorPool,
      material,
    };
  };

  const starLayers = [
    makeStarLayer({
      count: prefersReducedMotion() ? 220 : isCompact() ? 420 : 720,
      spreadX: 12,
      spreadY: 7.5,
      depthMin: -8,
      depthMax: -1.8,
      size: isCompact() ? 0.044 : 0.058,
      opacity: 0.42,
      colors: [0xf6fbff, 0xd6efff, 0x88e4ff, 0xf0d8a8],
    }),
    makeStarLayer({
      count: prefersReducedMotion() ? 520 : isCompact() ? 980 : 1700,
      spreadX: 18,
      spreadY: 10.5,
      depthMin: -22,
      depthMax: -7,
      size: isCompact() ? 0.022 : 0.028,
      opacity: 0.28,
      colors: [0xd7e8ff, 0xabc8ff, 0x88e4ff, 0x9e8fff],
    }),
    makeStarLayer({
      count: prefersReducedMotion() ? 1200 : isCompact() ? 2400 : 4200,
      spreadX: 28,
      spreadY: 16,
      depthMin: -52,
      depthMax: -16,
      size: isCompact() ? 0.01 : 0.013,
      opacity: 0.15,
      colors: [0x8ea7df, 0xb9d1ff, 0xdfeeff, 0x9fbbff],
    }),
  ];

  starLayers.forEach((layer) => scene.add(layer.points));

  const dustLayer = makeStarLayer({
    count: prefersReducedMotion() ? 260 : isCompact() ? 520 : 920,
    spreadX: 22,
    spreadY: 13,
    depthMin: -40,
    depthMax: -8,
    size: isCompact() ? 0.016 : 0.022,
    opacity: 0.1,
    colors: [0x88e4ff, 0x8d79ff, 0xcde6ff],
  });
  scene.add(dustLayer.points);

  const heroClusterLayer = makeStarLayer({
    count: prefersReducedMotion() ? 140 : isCompact() ? 260 : 460,
    spreadX: 8.5,
    spreadY: 5.2,
    depthMin: -18,
    depthMax: -6,
    size: isCompact() ? 0.014 : 0.018,
    opacity: 0.18,
    colors: [0xdfeeff, 0x88e4ff, 0x9e8fff, 0xf2dcae],
  });
  heroClusterLayer.points.position.set(0.2, 0.12, -2.2);
  scene.add(heroClusterLayer.points);

  const nodeGeometry = new THREE.BufferGeometry();
  const nodeCount = prefersReducedMotion() ? 14 : isCompact() ? 20 : 30;
  const nodePositions = new Float32Array(nodeCount * 3);
  for (let index = 0; index < nodeCount; index += 1) {
    const i = index * 3;
    nodePositions[i] = -4.3 + (index % 6) * 1.42 + rand(-0.22, 0.22);
    nodePositions[i + 1] = -1.45 + Math.floor(index / 6) * 0.82 + rand(-0.15, 0.15);
    nodePositions[i + 2] = -14 + rand(-1.1, 1.1);
  }
  nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));

  const nodeMaterial = new THREE.PointsMaterial({
    color: 0x9be7ff,
    size: isCompact() ? 0.032 : 0.042,
    transparent: true,
    opacity: sceneStates.hero.nodeOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
  scene.add(nodePoints);

  const nodeLinePoints = [];
  for (let index = 0; index < nodeCount - 1; index += 2) {
    nodeLinePoints.push(
      new THREE.Vector3(nodePositions[index * 3], nodePositions[index * 3 + 1], nodePositions[index * 3 + 2]),
      new THREE.Vector3(
        nodePositions[(index + 1) * 3],
        nodePositions[(index + 1) * 3 + 1],
        nodePositions[(index + 1) * 3 + 2],
      ),
    );
  }

  const nodeLineGeometry = new THREE.BufferGeometry().setFromPoints(nodeLinePoints);
  const nodeLineMaterial = new THREE.LineBasicMaterial({
    color: 0x9be7ff,
    transparent: true,
    opacity: sceneStates.hero.nodeOpacity * 0.44,
  });
  const nodeLines = new THREE.LineSegments(nodeLineGeometry, nodeLineMaterial);
  scene.add(nodeLines);

  const workCluster = new THREE.Group();
  workCluster.position.set(2.8, -0.48, -12.8);
  scene.add(workCluster);

  const clusterLayer = makeStarLayer({
    count: prefersReducedMotion() ? 24 : 44,
    spreadX: 1.8,
    spreadY: 1,
    depthMin: -0.6,
    depthMax: 0.6,
    size: isCompact() ? 0.028 : 0.036,
    opacity: 0.12,
    colors: [0xe4efff, 0x88e4ff, 0x8d79ff],
  });
  workCluster.add(clusterLayer.points);

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        activeScene = entry.target.dataset.scene || "hero";
      });
    },
    { threshold: 0.4, rootMargin: "-8% 0px -28% 0px" },
  );

  sections.forEach((section) => sectionObserver.observe(section));

  window.setPortfolioAudioMode = (mode) => {
    if (audioModeColorMap[mode]) {
      audioMode = mode;
    }
  };

  window.setPortfolioIntroProgress = () => {};
  window.setPortfolioSceneReady = () => {};

  window.addEventListener(
    "mousemove",
    (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  window.addEventListener("resize", setRendererSize, { passive: true });

  const updateLayerTwinkle = (layer, elapsed, intensity, baseOpacity) => {
    const colors = layer.colors;
    const colorAttr = layer.points.geometry.attributes.color;
    for (let index = 0; index < layer.brightness.length; index += 1) {
      const i = index * 3;
      const paletteIndex = index % layer.palette.length;
      const source = layer.palette[paletteIndex];
      const flicker =
        0.78 + Math.sin(elapsed * (0.22 + (index % 7) * 0.03) + layer.phases[index]) * intensity;
      const glow = layer.brightness[index] * flicker;
      colors[i] = source.r * glow;
      colors[i + 1] = source.g * glow;
      colors[i + 2] = source.b * glow;
    }
    colorAttr.needsUpdate = true;
    layer.material.opacity = baseOpacity;
  };

  const render = () => {
    requestAnimationFrame(render);

    const elapsed = clock.getElapsedTime();
    const target = sceneStates[activeScene] || sceneStates.hero;
    const audioTint = audioModeColorMap[audioMode] || audioModeColorMap.piano;
    const stateAlpha = prefersReducedMotion() ? 0.08 : 0.035;

    Object.keys(currentState).forEach((key) => {
      currentState[key] = lerp(currentState[key], target[key], stateAlpha);
    });

    smoothPointer.x += (pointer.x - smoothPointer.x) * 0.024;
    smoothPointer.y += (pointer.y - smoothPointer.y) * 0.024;

    updateLayerTwinkle(starLayers[0], elapsed, currentState.twinkle + 0.08, currentState.brightOpacity * 0.36);
    updateLayerTwinkle(starLayers[1], elapsed, currentState.twinkle, currentState.starOpacity * 0.22);
    updateLayerTwinkle(starLayers[2], elapsed, currentState.twinkle * 0.6, currentState.starOpacity * 0.12);
    updateLayerTwinkle(dustLayer, elapsed, currentState.twinkle * 0.35, currentState.dustOpacity);
    updateLayerTwinkle(heroClusterLayer, elapsed, currentState.twinkle * 0.5, currentState.hazeOpacity + 0.08);
    updateLayerTwinkle(clusterLayer, elapsed, currentState.twinkle + 0.05, currentState.clusterOpacity);

    starLayers[0].points.position.set(smoothPointer.x * 0.44, -smoothPointer.y * 0.3, 0);
    starLayers[1].points.position.set(smoothPointer.x * 0.24, -smoothPointer.y * 0.16, 0);
    starLayers[2].points.position.set(smoothPointer.x * 0.1, -smoothPointer.y * 0.08, 0);
    dustLayer.points.position.set(smoothPointer.x * 0.16, -smoothPointer.y * 0.1, 0);
    heroClusterLayer.points.position.x = 0.2 + smoothPointer.x * 0.18;
    heroClusterLayer.points.position.y = 0.12 - smoothPointer.y * 0.1;
    heroClusterLayer.points.rotation.z = elapsed * 0.008;

    nodeMaterial.opacity = currentState.nodeOpacity;
    nodeLineMaterial.opacity = currentState.nodeOpacity * 0.44;
    nodePoints.position.x = 0.16 + smoothPointer.x * 0.08;
    nodePoints.position.y = -0.12 - smoothPointer.y * 0.04;
    nodeLines.position.copy(nodePoints.position);

    clusterLayer.points.rotation.z = elapsed * 0.01;

    cyanLight.intensity = 1.5 + (currentState.cyan + audioTint.cyanBoost) * 7;
    violetLight.intensity = 1.3 + (currentState.violet + audioTint.violetBoost) * 7;
    goldLight.intensity = 0.46 + (currentState.gold + audioTint.goldBoost) * 4;
    cyanLight.position.x = 3.6 + smoothPointer.x * 0.48;
    cyanLight.position.y = 1.6 + smoothPointer.y * 0.16;
    violetLight.position.x = -3.8 - smoothPointer.x * 0.36;
    violetLight.position.y = -1.1 - smoothPointer.y * 0.14;

    camera.position.x = currentState.cameraX + smoothPointer.x * 0.14;
    camera.position.y = currentState.cameraY - smoothPointer.y * 0.08;
    camera.position.z = currentState.cameraZ;
    camera.lookAt(0, 0, -14);

    renderer.render(scene, camera);
  };

  render();
})();
