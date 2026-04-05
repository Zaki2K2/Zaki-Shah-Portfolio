(() => {
const canvas = document.getElementById('bg');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = reducedMotionQuery.matches;
const compactViewport = window.innerWidth < 768;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactViewport ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
if ('outputColorSpace' in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
if ('toneMapping' in renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = compactViewport ? 0.92 : 0.98;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010204, compactViewport ? 0.02 : 0.017);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 160);
camera.position.set(0, 0.35, 6.2);

const palette = {
  sky: new THREE.Color(0x010204),
  cyan: new THREE.Color(0x6ed5ff),
  violet: new THREE.Color(0x756dff),
  blue: new THREE.Color(0x0b1630),
  gold: new THREE.Color(0xffc15a),
  core: new THREE.Color(0xeef4ff),
};

function createGlowSphere(radius, color, opacity, segments = 26) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, segments),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
}

function createGalaxyLayer({
  count,
  arms = 4,
  innerRadius = 1,
  outerRadius = 10,
  spin = 1.2,
  verticalScale = 0.26,
  depthSpread = 2.2,
  jitter = 0.35,
  size = 0.045,
  opacity = 0.18,
}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  const tint = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const arm = i % arms;
    const radialBias = Math.pow(Math.random(), 1.4);
    const radius = innerRadius + radialBias * (outerRadius - innerRadius);
    const baseAngle = (arm / arms) * Math.PI * 2 + radius * spin;
    const angle = baseAngle + (Math.random() - 0.5) * (0.24 + radius * 0.03);

    positions[i * 3] =
      Math.cos(angle) * radius + (Math.random() - 0.5) * jitter;
    positions[i * 3 + 1] =
      Math.sin(angle) * radius * verticalScale + (Math.random() - 0.5) * 0.45;
    positions[i * 3 + 2] = (Math.random() - 0.5) * depthSpread;

    tint
      .copy(Math.random() > 0.5 ? palette.cyan : palette.violet)
      .lerp(palette.core, Math.random() * 0.22);

    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      transparent: true,
      opacity,
      vertexColors: true,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

function createPlanet({
  radius,
  color,
  emissive,
  position,
  glowColor,
  glowOpacity,
  ring = null,
  opacity = 1,
}) {
  const group = new THREE.Group();

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, compactViewport ? 26 : 34, compactViewport ? 26 : 34),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.34,
      roughness: 0.78,
      metalness: 0.08,
      transparent: opacity < 1,
      opacity,
    }),
  );

  const atmosphere = createGlowSphere(radius * 1.18, glowColor, glowOpacity, 22);
  atmosphere.scale.set(1, 0.96, 1);

  group.add(atmosphere);
  group.add(planet);

  let ringMesh = null;
  if (ring) {
    ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius * ring.radiusScale, ring.tube, 10, 180),
      new THREE.MeshBasicMaterial({
        color: ring.color,
        transparent: true,
        opacity: ring.opacity,
      }),
    );
    ringMesh.rotation.set(ring.rotation[0], ring.rotation[1], ring.rotation[2]);
    ringMesh.scale.set(ring.scale[0], ring.scale[1], ring.scale[2]);
    group.add(ringMesh);
  }

  group.position.set(position[0], position[1], position[2]);

  return {
    group,
    planet,
    atmosphere,
    ring: ringMesh,
    basePosition: group.position.clone(),
  };
}

const galaxyGroup = new THREE.Group();
galaxyGroup.position.set(-0.3, 0.4, -18);
galaxyGroup.rotation.x = -0.3;
galaxyGroup.rotation.z = 0.16;
scene.add(galaxyGroup);

const galaxyMain = createGalaxyLayer({
  count: prefersReducedMotion ? 240 : compactViewport ? 460 : 820,
  arms: 4,
  innerRadius: 1.2,
  outerRadius: compactViewport ? 8.4 : 10.2,
  spin: 1.42,
  verticalScale: 0.2,
  depthSpread: 2.2,
  jitter: 0.28,
  size: compactViewport ? 0.035 : 0.04,
  opacity: prefersReducedMotion ? 0.08 : 0.12,
});
const galaxyDust = createGalaxyLayer({
  count: prefersReducedMotion ? 180 : compactViewport ? 320 : 620,
  arms: 5,
  innerRadius: 2,
  outerRadius: compactViewport ? 10 : 12.4,
  spin: 1.05,
  verticalScale: 0.26,
  depthSpread: 3,
  jitter: 0.5,
  size: compactViewport ? 0.024 : 0.03,
  opacity: prefersReducedMotion ? 0.05 : 0.08,
});
galaxyGroup.add(galaxyDust);
galaxyGroup.add(galaxyMain);

const sunGroup = new THREE.Group();
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(compactViewport ? 0.68 : 0.82, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffd26c,
  }),
);
const sunAura = createGlowSphere(compactViewport ? 1.3 : 1.65, 0xffb347, 0.06, 28);
const sunOuterAura = createGlowSphere(compactViewport ? 1.9 : 2.35, 0xff9f43, 0.025, 24);
sunGroup.add(sunOuterAura);
sunGroup.add(sunAura);
sunGroup.add(sun);
sunGroup.position.set(compactViewport ? 3.8 : 5.1, compactViewport ? 1.75 : 2.35, compactViewport ? -10.5 : -13.2);
scene.add(sunGroup);

const planets = [
  createPlanet({
    radius: compactViewport ? 0.44 : 0.56,
    color: 0x385ea7,
    emissive: 0x173e7e,
    position: [compactViewport ? 2.8 : 3.35, compactViewport ? 0.55 : 0.82, compactViewport ? -7.6 : -8.8],
    glowColor: 0x7fdcff,
    glowOpacity: 0.09,
  }),
  createPlanet({
    radius: compactViewport ? 0.54 : 0.68,
    color: 0x233e6d,
    emissive: 0x132c58,
    position: [compactViewport ? -3.9 : -5.1, compactViewport ? 1.1 : 1.35, compactViewport ? -11.8 : -13.8],
    glowColor: 0x9fa8ff,
    glowOpacity: 0.07,
    ring: {
      radiusScale: 1.7,
      tube: compactViewport ? 0.014 : 0.018,
      color: 0x7fdcff,
      opacity: 0.18,
      rotation: [1.24, 0.2, 0.32],
      scale: [1.26, 0.42, 1],
    },
  }),
  createPlanet({
    radius: compactViewport ? 0.22 : 0.28,
    color: 0x6b79ff,
    emissive: 0x3d4eff,
    position: [compactViewport ? -0.9 : -1.2, compactViewport ? 2.45 : 3.1, compactViewport ? -15 : -18],
    glowColor: 0xaeb8ff,
    glowOpacity: 0.06,
  }),
  createPlanet({
    radius: compactViewport ? 0.18 : 0.24,
    color: 0x314f88,
    emissive: 0x183261,
    position: [compactViewport ? 0.8 : 1.2, compactViewport ? 1.65 : 2.15, compactViewport ? -12.5 : -15.5],
    glowColor: 0x7be5ff,
    glowOpacity: 0.05,
  }),
];
planets.forEach((entry) => scene.add(entry.group));

const starfieldCount = prefersReducedMotion ? 280 : compactViewport ? 480 : 840;
const starfieldGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starfieldCount * 3);
for (let i = 0; i < starfieldCount; i += 1) {
  starPositions[i * 3] = (Math.random() - 0.5) * 26;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
  starPositions[i * 3 + 2] = -4 - Math.random() * 26;
}
starfieldGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starfield = new THREE.Points(
  starfieldGeometry,
  new THREE.PointsMaterial({
    color: 0x5667cc,
    size: compactViewport ? 0.02 : 0.024,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
);
scene.add(starfield);

scene.add(new THREE.AmbientLight(0xffffff, 0.32));

const keyLight = new THREE.PointLight(0x7fe2ff, 3.6, 22);
keyLight.position.set(3.8, 2.2, 3.8);
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x7a72ff, 2.2, 22);
fillLight.position.set(-4.5, 0.2, 2.8);
scene.add(fillLight);

const sunLight = new THREE.PointLight(0xffc76a, 4.2, 40);
sunLight.position.copy(sunGroup.position);
scene.add(sunLight);

const mouse = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  smooth.x += (mouse.x - smooth.x) * 0.035;
  smooth.y += (mouse.y - smooth.y) * 0.035;

  sunGroup.position.x = (compactViewport ? 3.8 : 5.1) + smooth.x * 0.38;
  sunGroup.position.y = (compactViewport ? 1.75 : 2.35) + smooth.y * 0.18;
  sunAura.scale.setScalar(1 + Math.sin(t * 0.9) * 0.06);
  sunOuterAura.scale.setScalar(1 + Math.cos(t * 0.6) * 0.08);
  sunLight.position.copy(sunGroup.position);
  sunLight.intensity = 4 + Math.sin(t * 0.85) * 0.24;

  planets.forEach((entry, index) => {
    const drift = t * (0.08 + index * 0.018) + index * 1.4;
    entry.group.position.x = entry.basePosition.x + Math.cos(drift) * 0.12;
    entry.group.position.y = entry.basePosition.y + Math.sin(drift) * 0.16;
    entry.group.rotation.y += 0.0018 + index * 0.0004;
    entry.planet.rotation.y += 0.0014 + index * 0.00035;
    entry.atmosphere.material.opacity =
      (index === 0 ? 0.09 : index === 1 ? 0.07 : 0.055) +
      Math.sin(drift * 1.4) * 0.01;
    if (entry.ring) {
      entry.ring.rotation.z += 0.0016;
    }
  });

  galaxyGroup.position.x = -0.3 + smooth.x * 0.22;
  galaxyGroup.position.y = 0.4 + smooth.y * 0.14;
  galaxyGroup.rotation.z = 0.16 + t * (prefersReducedMotion ? 0.0016 : 0.0032);
  galaxyMain.rotation.z = t * 0.008;
  galaxyDust.rotation.z = -t * 0.004;
  galaxyDust.rotation.y = Math.sin(t * 0.08) * 0.04;

  starfield.rotation.y = t * 0.006;
  starfield.rotation.x = t * 0.0025;

  camera.position.x = smooth.x * 0.22;
  camera.position.y = 0.28 + smooth.y * 0.14;
  camera.lookAt(smooth.x * 0.32, smooth.y * 0.12, -11.5);

  keyLight.position.x = 3.8 + smooth.x * 0.36;
  keyLight.position.y = 2.2 + smooth.y * 0.22;
  fillLight.position.x = -4.5 - smooth.x * 0.28;
  fillLight.position.y = 0.2 - smooth.y * 0.16;

  renderer.render(scene, camera);
}

animate();
})();
