// ── Scene Setup ──────────────────────────────────────────────
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

// ── Blob Geometry (non-indexed for reliable vertex morphing) ──
const baseGeo = new THREE.IcosahedronGeometry(1.8, 4);
const geometry = baseGeo.toNonIndexed();
geometry.computeVertexNormals();

const posAttr = geometry.attributes.position;
const originalPositions = new Float32Array(posAttr.array);

const blobMaterial = new THREE.MeshStandardMaterial({
  color: 0x7b2fff,
  emissive: 0x2a0080,
  roughness: 0.3,
  metalness: 0.6,
});
const blob = new THREE.Mesh(geometry, blobMaterial);
blob.position.set(2.2, 0, 0);
scene.add(blob);

// Wireframe overlay shares same geometry
const wireMat = new THREE.MeshBasicMaterial({
  color: 0x00d4ff,
  wireframe: true,
  transparent: true,
  opacity: 0.1,
});
const wireBlob = new THREE.Mesh(geometry, wireMat);
wireBlob.position.copy(blob.position);
scene.add(wireBlob);

// Orbital accents around the main energy sphere
const orbitGroup = new THREE.Group();
orbitGroup.position.copy(blob.position);
scene.add(orbitGroup);

const orbitRingConfigs = [
  { radius: 2.45, tube: 0.014, color: 0x6fd6ff, opacity: 0.16, rx: 1.22, ry: 0.22, speed: 0.0032 },
  { radius: 3.2, tube: 0.01, color: 0x8b5cff, opacity: 0.1, rx: 1.02, ry: -0.34, speed: -0.0022 },
];

const orbitRings = orbitRingConfigs.map((config) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(config.radius, config.tube, 10, 180),
    new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
    }),
  );
  ring.rotation.x = config.rx;
  ring.rotation.y = config.ry;
  orbitGroup.add(ring);
  return { mesh: ring, speed: config.speed, baseX: config.rx, baseY: config.ry };
});

const orbiter1 = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 20, 20),
  new THREE.MeshBasicMaterial({
    color: 0x8ef3ff,
    transparent: true,
    opacity: 0.9,
  }),
);
const orbiter2 = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 18, 18),
  new THREE.MeshBasicMaterial({
    color: 0xc388ff,
    transparent: true,
    opacity: 0.78,
  }),
);
orbitGroup.add(orbiter1);
orbitGroup.add(orbiter2);

const distantPlanet = new THREE.Mesh(
  new THREE.SphereGeometry(0.95, 28, 28),
  new THREE.MeshBasicMaterial({
    color: 0x15284d,
    transparent: true,
    opacity: 0.14,
  }),
);
distantPlanet.position.set(-4.8, 2.25, -7.5);
scene.add(distantPlanet);

// ── Floating Particles ────────────────────────────────────────
const particleCount = 1000;
const pGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  pPositions[i] = (Math.random() - 0.5) * 20;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMat = new THREE.PointsMaterial({ color: 0x7b2fff, size: 0.03, transparent: true, opacity: 0.55 });
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ── Lighting ──────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const light1 = new THREE.PointLight(0x7b2fff, 5, 15);
light1.position.set(3, 3, 3);
scene.add(light1);

const light2 = new THREE.PointLight(0x00d4ff, 4, 15);
light2.position.set(-3, -2, 2);
scene.add(light2);

const light3 = new THREE.PointLight(0xff4488, 2, 10);
light3.position.set(0, -4, -2);
scene.add(light3);

// ── Mouse ─────────────────────────────────────────────────────
const mouse  = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  mouse.x =  (e.clientX / window.innerWidth  - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Scroll ────────────────────────────────────────────────────
const blobTarget  = { x: 2.2, y: 0 };
const blobCurrent = { x: 2.2, y: 0 };

window.addEventListener('scroll', () => {
  if (isDragging) return;
  const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  blobTarget.x = 2.2 - scrollFraction * 4.4;
});

// ── Drag ──────────────────────────────────────────────────────
const raycaster  = new THREE.Raycaster();
const dragPlane  = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragPoint  = new THREE.Vector3();
const pointerVec = new THREE.Vector2();

let isDragging   = false;
let dragOffsetX  = 0;
let dragOffsetY  = 0;

// Spring physics for snap-back
const spring = { vx: 0, vy: 0, stiffness: 0.12, damping: 0.72 };

function getScrollRestX() {
  const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
  return 2.2 - scrollFraction * 4.4;
}

canvas.addEventListener('mousedown', (e) => {
  pointerVec.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  pointerVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerVec, camera);
  const hits = raycaster.intersectObject(blob);
  if (hits.length > 0) {
    isDragging  = true;
    spring.vx   = 0;
    spring.vy   = 0;
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    dragOffsetX = blobCurrent.x - dragPoint.x;
    dragOffsetY = blobCurrent.y - dragPoint.y;
    canvas.style.cursor = 'grabbing';
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  pointerVec.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  pointerVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointerVec, camera);
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  blobCurrent.x = dragPoint.x + dragOffsetX;
  blobCurrent.y = dragPoint.y + dragOffsetY;
});

window.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }
});

canvas.addEventListener('mouseover', () => { if (!isDragging) canvas.style.cursor = 'grab'; });
canvas.addEventListener('mouseleave', () => { canvas.style.cursor = 'default'; });

// ── Noise ─────────────────────────────────────────────────────
function snoise(x, y, z) {
  return Math.sin(x * 1.2 + y * 0.9) *
         Math.cos(z * 1.1 + y * 0.8) *
         Math.sin(z * 0.7 + x * 1.3);
}

// ── Resize ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animate ───────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Morph vertices
  for (let i = 0; i < posAttr.count; i++) {
    const ox = originalPositions[i * 3];
    const oy = originalPositions[i * 3 + 1];
    const oz = originalPositions[i * 3 + 2];
    const n  = snoise(ox + t * 0.4, oy + t * 0.35, oz + t * 0.3);
    const d  = 1 + 0.28 * n;
    posAttr.setXYZ(i, ox * d, oy * d, oz * d);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  // Smooth mouse
  smooth.x += (mouse.x - smooth.x) * 0.04;
  smooth.y += (mouse.y - smooth.y) * 0.04;

  // Drag spring snap-back / scroll glide
  if (!isDragging) {
    const restX = getScrollRestX();
    const restY = 0;
    // Spring force toward rest position
    spring.vx += (restX - blobCurrent.x) * spring.stiffness;
    spring.vy += (restY - blobCurrent.y) * spring.stiffness;
    // Damping
    spring.vx *= spring.damping;
    spring.vy *= spring.damping;
    blobCurrent.x += spring.vx;
    blobCurrent.y += spring.vy;
  }
  blob.position.x     = blobCurrent.x;
  blob.position.y     = blobCurrent.y;
  wireBlob.position.x = blobCurrent.x;
  wireBlob.position.y = blobCurrent.y;
  orbitGroup.position.x = blobCurrent.x;
  orbitGroup.position.y = blobCurrent.y;

  blob.rotation.x = t * 0.15 + smooth.y * 0.5;
  blob.rotation.y = t * 0.20 + smooth.x * 0.5;
  wireBlob.rotation.copy(blob.rotation);

  orbitRings.forEach(({ mesh, speed, baseX, baseY }, index) => {
    mesh.rotation.x = baseX + Math.sin(t * 0.22 + index) * 0.035;
    mesh.rotation.y = baseY + Math.cos(t * 0.18 + index * 0.7) * 0.045;
    mesh.rotation.z = t * speed * 18;
  });

  const orbitDriftX = smooth.x * 0.12;
  const orbitDriftY = smooth.y * 0.08;
  orbiter1.position.set(
    Math.cos(t * 0.72) * 2.5 + orbitDriftX,
    Math.sin(t * 0.72) * 0.72 + Math.sin(t * 0.24) * 0.18 + orbitDriftY,
    Math.sin(t * 0.72) * 1.12,
  );
  orbiter2.position.set(
    Math.cos(-t * 0.46 + 1.15) * 3.18 - orbitDriftX * 0.7,
    Math.sin(-t * 0.46 + 1.15) * 1.06 - Math.cos(t * 0.2) * 0.14,
    Math.cos(t * 0.46 + 0.55) * 0.86,
  );
  orbiter1.material.opacity = 0.72 + Math.sin(t * 1.4) * 0.14;
  orbiter2.material.opacity = 0.58 + Math.cos(t * 1.1) * 0.12;

  distantPlanet.position.y = 2.25 + Math.sin(t * 0.08) * 0.12;
  distantPlanet.position.x = -4.8 + Math.cos(t * 0.06) * 0.16;
  distantPlanet.material.opacity = 0.12 + Math.sin(t * 0.22) * 0.025;

  // Hue-shift lights
  const hue = (t * 0.05) % 1;
  blobMaterial.emissive.setHSL(hue, 0.8, 0.12);
  light1.color.setHSL(hue, 1, 0.5);
  light2.color.setHSL((hue + 0.33) % 1, 1, 0.5);

  particles.rotation.y = t * 0.02;
  particles.rotation.x = t * 0.01;

  renderer.render(scene, camera);
}

animate();
