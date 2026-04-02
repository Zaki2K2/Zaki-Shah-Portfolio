// ── Preloader ─────────────────────────────────────────────────
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);

window.addEventListener("beforeunload", () => {
  window.scrollTo(0, 0);
});

window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
});

const preloader = document.getElementById("preloader");
const preloaderCanvas = document.getElementById("preloaderCanvas");
const preloaderCore = document.getElementById("preloaderCore");
const preloaderPhase = document.getElementById("preloaderPhase");
const preloaderProgress = document.getElementById("preloaderProgress");
const preloaderSkip = document.getElementById("preloaderSkip");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let preloaderWindowLoaded = false;
let preloaderFinishTimer = 0;
let preloaderSafetyTimer = 0;
let preloaderRaf = 0;
let preloaderEnded = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - ((-2 * value + 2) ** 3) / 2;
}

function easeOutExpo(value) {
  return value === 1 ? 1 : 1 - 2 ** (-10 * value);
}

function createPreloaderConfig() {
  const reduced = reducedMotionQuery.matches;
  const compact = window.innerWidth < 768;

  return {
    compact,
    duration: reduced ? 1450 : compact ? 3650 : 4300,
    darkEnd: reduced ? 220 : compact ? 620 : 800,
    singularityEnd: reduced ? 620 : compact ? 1360 : 1600,
    burstEnd: reduced ? 980 : compact ? 2260 : 2800,
    settleEnd: reduced ? 1220 : compact ? 3020 : 3800,
    safetyEnd: reduced ? 2200 : compact ? 4700 : 5600,
    starCount: reduced ? 20 : compact ? 30 : 70,
    particleCount: reduced ? 14 : compact ? 28 : 92,
    ringOffsets: reduced ? [0, 180] : compact ? [0, 170, 340] : [0, 150, 310],
    centerYFactor: reduced ? 0.46 : compact ? 0.41 : 0.48,
    haloScale: reduced ? 0.3 : compact ? 0.34 : 0.42,
    waveScale: reduced ? 0.18 : compact ? 0.19 : 0.24,
    textSafeTop: reduced ? 0.56 : compact ? 0.5 : 0.62,
    textSafeAlpha: reduced ? 0.84 : compact ? 0.92 : 0.58,
    burstJitter: reduced ? 1.5 : compact ? 2.2 : 4,
    particleTravel: reduced ? 0.2 : compact ? 0.22 : 0.3,
  };
}

function initCosmicPreloader() {
  if (!preloader || !preloaderCanvas || !preloaderCore || !preloaderPhase) {
    document.body.classList.remove("preloading");
    return;
  }

  const ctx = preloaderCanvas.getContext("2d");

  if (!ctx) {
    document.body.classList.remove("preloading");
    return;
  }

  let config = createPreloaderConfig();
  let width = 0;
  let height = 0;
  let centerX = 0;
  let centerY = 0;
  let textSafeTopPx = 0;
  let startTime = performance.now();
  let currentPhase = "";

  let stars = [];
  let particles = [];

  function rebuildPreloaderElements() {
    stars = Array.from({ length: config.starCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.6 + 0.35,
      alpha: Math.random() * 0.45 + 0.12,
      twinkle: Math.random() * 1.3 + 0.3,
      drift: (Math.random() - 0.5) * 0.0025,
    }));

    particles = Array.from({ length: config.particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;

      return {
        angle,
        spread: Math.random() * 0.85 + 0.35,
        delay: Math.random() * (reducedMotionQuery.matches ? 90 : 260),
        size: Math.random() * 2.2 + 0.9,
        alpha: Math.random() * 0.4 + 0.28,
        tint: Math.random() > 0.55 ? "cyan" : "violet",
      };
    });
  }

  function resizePreloader() {
    config = createPreloaderConfig();
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      reducedMotionQuery.matches ? 1.2 : 1.6,
    );

    width = window.innerWidth;
    height = window.innerHeight;
    centerX = width / 2;
    centerY = height * config.centerYFactor;
    textSafeTopPx = height * config.textSafeTop;
    preloaderCanvas.width = Math.floor(width * dpr);
    preloaderCanvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    preloader.style.setProperty("--core-x", "50%");
    preloader.style.setProperty("--core-y", `${config.centerYFactor * 100}%`);
    rebuildPreloaderElements();
  }

  function setPhaseLabel(elapsed) {
    let nextPhase = "World Revealing";

    if (elapsed < config.darkEnd) {
      nextPhase = "Primordial Darkness";
    } else if (elapsed < config.singularityEnd) {
      nextPhase = "Singularity Forming";
    } else if (elapsed < config.burstEnd) {
      nextPhase = "Radiant Expansion";
    } else if (elapsed < config.settleEnd) {
      nextPhase = "Cosmic Settling";
    }

    if (nextPhase !== currentPhase) {
      currentPhase = nextPhase;
      preloaderPhase.textContent = nextPhase;
    }

    if (preloaderProgress) {
      const progress = clamp((elapsed / config.duration) * 100, 0, 100);
      preloaderProgress.textContent = `${String(Math.round(progress)).padStart(2, "0")}%`;
    }
  }

  function finishPreloader(skipped = false) {
    if (preloaderEnded) return;

    preloaderEnded = true;
    clearTimeout(preloaderFinishTimer);
    clearTimeout(preloaderSafetyTimer);
    cancelAnimationFrame(preloaderRaf);
    window.removeEventListener("resize", resizePreloader);
    window.removeEventListener("keydown", onPreloaderKeydown);
    preloaderSkip?.removeEventListener("click", onPreloaderSkip);

    document.body.classList.remove("preloading");
    preloader.classList.add("is-hiding");
    if (skipped) {
      preloader.classList.add("is-skipping");
    }

    window.setTimeout(() => {
      preloader.classList.add("is-hidden");
      preloader.remove();
    }, skipped ? 440 : 820);
  }

  function requestPreloaderFinish() {
    if (preloaderEnded || !preloaderWindowLoaded) return;

    const elapsed = performance.now() - startTime;

    if (elapsed >= config.duration) {
      finishPreloader(false);
      return;
    }

    clearTimeout(preloaderFinishTimer);
    preloaderFinishTimer = window.setTimeout(
      () => finishPreloader(false),
      config.duration - elapsed,
    );
  }

  function onPreloaderSkip() {
    finishPreloader(true);
  }

  function onPreloaderKeydown(event) {
    if (event.key === "Escape") {
      finishPreloader(true);
    }
  }

  function drawBackdrop(elapsed, burstProgress, settleProgress) {
    const minDim = Math.min(width, height);
    const haloRadius = lerp(minDim * 0.09, minDim * config.haloScale, burstProgress);
    const haloAlpha = 0.06 + burstProgress * 0.16 - settleProgress * 0.06;
    const bloom = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      haloRadius,
    );

    bloom.addColorStop(0, `rgba(165, 240, 255, ${0.2 + burstProgress * 0.08})`);
    bloom.addColorStop(0.18, `rgba(82, 135, 255, ${haloAlpha})`);
    bloom.addColorStop(0.42, `rgba(123, 47, 255, ${0.08 + burstProgress * 0.08})`);
    bloom.addColorStop(1, "rgba(4, 6, 16, 0)");

    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    const dust = ctx.createRadialGradient(
      centerX,
      centerY,
      minDim * 0.04,
      centerX,
      centerY,
      minDim * 0.62,
    );
    dust.addColorStop(0, `rgba(255, 255, 255, ${0.016 + burstProgress * 0.04})`);
    dust.addColorStop(0.28, `rgba(0, 212, 255, ${0.028 + burstProgress * 0.04})`);
    dust.addColorStop(0.62, `rgba(123, 47, 255, ${0.024 + settleProgress * 0.03})`);
    dust.addColorStop(1, "rgba(123, 47, 255, 0)");
    ctx.fillStyle = dust;
    ctx.fillRect(0, 0, width, height);

    const safeZone = ctx.createLinearGradient(0, textSafeTopPx - height * 0.1, 0, height);
    safeZone.addColorStop(0, "rgba(3, 5, 13, 0)");
    safeZone.addColorStop(0.25, `rgba(3, 5, 13, ${config.textSafeAlpha * 0.36})`);
    safeZone.addColorStop(0.65, `rgba(3, 5, 13, ${config.textSafeAlpha * 0.72})`);
    safeZone.addColorStop(1, `rgba(2, 3, 9, ${config.textSafeAlpha})`);
    ctx.fillStyle = safeZone;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "lighter";
    stars.forEach((star, index) => {
      const twinkle = 0.4 + Math.sin(elapsed * 0.001 * star.twinkle + index) * 0.5;
      const alpha =
        star.alpha *
        (0.4 + burstProgress * 0.9 + settleProgress * 0.4) *
        twinkle;
      const x = (star.x + elapsed * star.drift * 0.01) * width;
      const y = star.y * height;
      const textZoneFade =
        y > textSafeTopPx
          ? config.compact
            ? 0.16
            : 0.42
          : y > textSafeTopPx - height * 0.08
            ? 0.45
            : 1;

      ctx.fillStyle =
        star.size > 1.3
          ? `rgba(174, 235, 255, ${alpha * textZoneFade})`
          : `rgba(215, 220, 255, ${alpha * 0.85 * textZoneFade})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function drawBurst(elapsed, burstProgress, settleProgress, revealProgress) {
    if (elapsed < config.singularityEnd - 120) return;

    const minDim = Math.min(width, height);

    config.ringOffsets.forEach((offset, index) => {
      const ringProgress = clamp(
        (elapsed - (config.singularityEnd + offset)) /
          (reducedMotionQuery.matches ? 720 : 1100),
        0,
        1,
      );

      if (ringProgress <= 0 || ringProgress >= 1) return;

      const radius = lerp(minDim * 0.02, minDim * (0.13 + index * 0.06), easeOutExpo(ringProgress));
      const alpha =
        (1 - ringProgress) *
        (config.compact ? 0.22 : 0.32 - index * 0.06) *
        (1 - revealProgress * 0.75);

      ctx.strokeStyle =
        index % 2 === 0
          ? `rgba(120, 228, 255, ${alpha})`
          : `rgba(167, 131, 255, ${alpha})`;
      ctx.lineWidth = 1.1 + (1 - ringProgress) * 2.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.globalCompositeOperation = "lighter";
    particles.forEach((particle, index) => {
      const particleProgress = clamp(
        (elapsed - config.singularityEnd - particle.delay) /
          (reducedMotionQuery.matches ? 720 : 1450),
        0,
        1,
      );

      if (particleProgress <= 0 || particleProgress >= 1) return;

      const travel =
        minDim *
        (0.06 + particle.spread * config.particleTravel) *
        easeOutCubic(particleProgress);
      const x =
        centerX +
        Math.cos(particle.angle) * travel +
        Math.sin(elapsed * 0.0012 + index) * config.burstJitter;
      const y =
        centerY +
        Math.sin(particle.angle) * travel +
        Math.cos(elapsed * 0.0014 + index) * config.burstJitter;
      const textZoneFade =
        y > textSafeTopPx
          ? config.compact
            ? 0.08
            : 0.28
          : y > textSafeTopPx - height * 0.08
            ? 0.38
            : 1;
      const alpha =
        particle.alpha *
        (1 - particleProgress) ** 1.35 *
        (1 - revealProgress * 0.82) *
        textZoneFade;
      const size =
        particle.size *
        (1 + burstProgress * (config.compact ? 0.24 : 0.45)) *
        (1 - particleProgress * 0.38);

      ctx.fillStyle =
        particle.tint === "cyan"
          ? `rgba(132, 238, 255, ${alpha})`
          : `rgba(186, 142, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";

    const waveAlpha =
      (0.06 + burstProgress * 0.24 - settleProgress * 0.1) *
      (1 - revealProgress);
    const wave = ctx.createRadialGradient(
      centerX,
      centerY,
      minDim * 0.01,
      centerX,
      centerY,
      minDim * config.waveScale,
    );
    wave.addColorStop(0, `rgba(255, 255, 255, ${0.05 + burstProgress * 0.08})`);
    wave.addColorStop(0.18, `rgba(0, 212, 255, ${waveAlpha})`);
    wave.addColorStop(0.42, `rgba(123, 47, 255, ${waveAlpha * 0.7})`);
    wave.addColorStop(1, "rgba(123, 47, 255, 0)");
    ctx.fillStyle = wave;
    ctx.fillRect(0, 0, width, height);
  }

  function renderPreloader(now) {
    const elapsed = now - startTime;
    const singularityProgress = clamp(
      (elapsed - config.darkEnd) / (config.singularityEnd - config.darkEnd),
      0,
      1,
    );
    const burstProgress = clamp(
      (elapsed - config.singularityEnd) /
        (config.burstEnd - config.singularityEnd),
      0,
      1,
    );
    const settleProgress = clamp(
      (elapsed - config.burstEnd) / (config.settleEnd - config.burstEnd),
      0,
      1,
    );
    const revealProgress = clamp(
      (elapsed - config.settleEnd) / (config.duration - config.settleEnd),
      0,
      1,
    );
    const corePulse =
      singularityProgress > 0
        ? 1 + Math.sin(elapsed * 0.018) * (burstProgress > 0 ? 0.18 : 0.08)
        : 0.9;
    const coreScale =
      0.06 +
      easeInOutCubic(singularityProgress) * 0.48 +
      burstProgress * 1.16 -
      settleProgress * 0.34;
    const ringScale =
      0.24 +
      singularityProgress * 0.55 +
      burstProgress * 2.7 -
      revealProgress * 1.35;
    const ringOpacity =
      0.03 +
      singularityProgress * 0.18 +
      burstProgress * 0.28 -
      revealProgress * 0.24;
    const coreOpacity =
      0.04 +
      singularityProgress * 0.62 +
      burstProgress * 0.32 -
      revealProgress * 0.56;

    setPhaseLabel(elapsed);

    ctx.clearRect(0, 0, width, height);
    drawBackdrop(elapsed, burstProgress, settleProgress);
    drawBurst(elapsed, burstProgress, settleProgress, revealProgress);

    preloader.style.setProperty(
      "--core-scale",
      (coreScale * corePulse).toFixed(3),
    );
    preloader.style.setProperty(
      "--core-opacity",
      clamp(coreOpacity, 0.03, 1).toFixed(3),
    );
    preloader.style.setProperty(
      "--ring-scale",
      clamp(ringScale, 0.22, 3.1).toFixed(3),
    );
    preloader.style.setProperty(
      "--ring-opacity",
      clamp(ringOpacity, 0.02, 0.42).toFixed(3),
    );

    if (!preloaderEnded) {
      preloaderRaf = requestAnimationFrame(renderPreloader);
    }
  }

  resizePreloader();
  window.addEventListener("resize", resizePreloader, { passive: true });
  window.addEventListener("keydown", onPreloaderKeydown);
  preloaderSkip?.addEventListener("click", onPreloaderSkip);
  preloaderSafetyTimer = window.setTimeout(
    () => finishPreloader(false),
    config.safetyEnd,
  );
  preloaderRaf = requestAnimationFrame(renderPreloader);

  window.signalPreloaderReady = requestPreloaderFinish;
}

initCosmicPreloader();

window.addEventListener("load", () => {
  window.scrollTo(0, 0);
  preloaderWindowLoaded = true;
  if (typeof window.signalPreloaderReady === "function") {
    window.signalPreloaderReady();
  }
});

// ── Hamburger menu ────────────────────────────────────────────
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

hamburger.addEventListener("click", () => {
  const open = hamburger.classList.toggle("open");
  mobileMenu.classList.toggle("open", open);
  document.body.style.overflow = open ? "hidden" : "";
});

document.querySelectorAll(".mob-link").forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("open");
    mobileMenu.classList.remove("open");
    document.body.style.overflow = "";
  });
});

// ── Custom Cursor — uses translate3d (GPU, zero layout cost) ──
const dot = document.querySelector(".cursor-dot");
const ring = document.querySelector(".cursor-ring");
let dotX = 0,
  dotY = 0,
  ringX = 0,
  ringY = 0;
let cursorVisible = false;

window.addEventListener(
  "mousemove",
  (e) => {
    dotX = e.clientX;
    dotY = e.clientY;
    if (!cursorVisible) {
      cursorVisible = true;
      dot.style.opacity = ring.style.opacity = "1";
    }
  },
  { passive: true },
);

document.addEventListener("mouseleave", () => {
  dot.style.opacity = ring.style.opacity = "0";
  cursorVisible = false;
});

(function cursorLoop() {
  // dot follows instantly
  dot.style.transform = `translate3d(calc(${dotX}px - 50%), calc(${dotY}px - 50%), 0)`;
  // ring lerps smoothly — higher factor = snappier
  ringX += (dotX - ringX) * 0.18;
  ringY += (dotY - ringY) * 0.18;
  ring.style.transform = `translate3d(calc(${ringX}px - 50%), calc(${ringY}px - 50%), 0)`;
  requestAnimationFrame(cursorLoop);
})();

// Ring grows on interactive elements
document
  .querySelectorAll(
    "a, button, .card, .service-card, .stat-box, .profile-card, .contact-panel, .skills-panel, .signature-panel, .signature-principle, .now-panel, .now-card, .credibility-item, .contact-availability__item",
  )
  .forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hovered"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hovered"));
  });

// ── Typewriter ────────────────────────────────────────────────
const phrases = [
  "Frontend Developer",
  "Angular Developer",
  "Frontend-First, Backend-Aware",
  "Building Connected Web Interfaces",
];
let pIdx = 0,
  cIdx = 0,
  deleting = false;
const typeEl = document.getElementById("typewriter");

function typeWriter() {
  const phrase = phrases[pIdx];
  if (!deleting) {
    typeEl.textContent = phrase.slice(0, ++cIdx);
    if (cIdx === phrase.length) {
      deleting = true;
      setTimeout(typeWriter, 1800);
      return;
    }
  } else {
    typeEl.textContent = phrase.slice(0, --cIdx);
    if (cIdx === 0) {
      deleting = false;
      pIdx = (pIdx + 1) % phrases.length;
    }
  }
  setTimeout(typeWriter, deleting ? 40 : 85);
}
setTimeout(typeWriter, 2400);

// ── Letter split + magnetic + glow ripple ────────────────────
document.querySelectorAll(".word").forEach((word) => {
  const text = word.textContent;
  word.textContent = "";
  text.split("").forEach((char) => {
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = char === " " ? "\u00A0" : char;
    word.appendChild(span);
  });
});

// Magnetic: each letter drifts toward cursor when nearby
const titleLetters = [...document.querySelectorAll(".title .letter")];
const ATTRACT_RADIUS = 120; // px — how close cursor needs to be
const ATTRACT_STRENGTH = 0.35; // 0–1, how far they move

window.addEventListener(
  "mousemove",
  (e) => {
    titleLetters.forEach((letter) => {
      const r = letter.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ATTRACT_RADIUS) {
        const force = (1 - dist / ATTRACT_RADIUS) * ATTRACT_STRENGTH;
        const lx = dx * force;
        const ly = dy * force;
        letter.style.setProperty("--lx", lx + "px");
        letter.style.setProperty("--ly", ly + "px");
        letter.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
        letter.style.transition = "transform 0.1s ease";
      } else {
        letter.style.setProperty("--lx", "0px");
        letter.style.setProperty("--ly", "0px");
        letter.style.transform = "translate3d(0,0,0)";
        letter.style.transition =
          "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
      }
    });
  },
  { passive: true },
);

// Glow ripple: sweeps across all letters on title hover
document.querySelector(".title").addEventListener("mouseenter", () => {
  titleLetters.forEach((letter, i) => {
    setTimeout(() => {
      letter.classList.add("glow");
      setTimeout(() => letter.classList.remove("glow"), 600);
    }, i * 55);
  });
});

// ── Navbar shrink (passive scroll) ───────────────────────────
const navbar = document.getElementById("navbar");
window.addEventListener(
  "scroll",
  () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
  },
  { passive: true },
);

// ── Parallax hero — desktop only ─────────────────────────────
const heroContent = document.querySelector(".hero-content");
const isTouch = window.matchMedia(
  "(hover: none) and (pointer: coarse)",
).matches;
let ticking = false;

const sceneBySection = {
  hero: {
    x: "0px",
    y: "0px",
    cyan: "0.12",
    violet: "0.14",
    ring: "0.08",
  },
  about: {
    x: "-14px",
    y: "10px",
    cyan: "0.1",
    violet: "0.18",
    ring: "0.07",
  },
  approach: {
    x: "12px",
    y: "-6px",
    cyan: "0.14",
    violet: "0.16",
    ring: "0.09",
  },
  work: {
    x: "-10px",
    y: "16px",
    cyan: "0.11",
    violet: "0.15",
    ring: "0.08",
  },
  "main-work": {
    x: "18px",
    y: "6px",
    cyan: "0.15",
    violet: "0.13",
    ring: "0.1",
  },
  skills: {
    x: "-8px",
    y: "-10px",
    cyan: "0.12",
    violet: "0.16",
    ring: "0.08",
  },
  now: {
    x: "10px",
    y: "-18px",
    cyan: "0.16",
    violet: "0.12",
    ring: "0.09",
  },
  contact: {
    x: "0px",
    y: "12px",
    cyan: "0.14",
    violet: "0.17",
    ring: "0.08",
  },
};

function setSceneAtmosphere(sectionId) {
  const scene = sceneBySection[sectionId];

  if (!scene) return;

  document.body.style.setProperty("--scene-shift-x", scene.x);
  document.body.style.setProperty("--scene-shift-y", scene.y);
  document.body.style.setProperty("--scene-cyan-alpha", scene.cyan);
  document.body.style.setProperty("--scene-violet-alpha", scene.violet);
  document.body.style.setProperty("--scene-ring-alpha", scene.ring);
}

const spotlightTargets = document.querySelectorAll(
  ".card, .service-card, .about-card, .skills-panel, .contact-panel, .signature-panel, .signature-principle, .now-panel, .now-card, .credibility-item, .contact-availability__item",
);

if (!isTouch) {
  spotlightTargets.forEach((surface) => {
    surface.addEventListener("mousemove", (event) => {
      const rect = surface.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      surface.style.setProperty("--spot-x", `${x}%`);
      surface.style.setProperty("--spot-y", `${y}%`);
    });

    surface.addEventListener("mouseleave", () => {
      surface.style.setProperty("--spot-x", "82%");
      surface.style.setProperty("--spot-y", "18%");
    });
  });
}

const narrativeSections = document.querySelectorAll("section[id]");

if (narrativeSections.length) {
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setSceneAtmosphere(entry.target.id);
        }
      });
    },
    { threshold: 0.45 },
  );

  narrativeSections.forEach((section) => sceneObserver.observe(section));
}

if (!isTouch) {
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y < window.innerHeight) {
            heroContent.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
            heroContent.style.opacity = Math.max(
              0,
              1 - y / (window.innerHeight * 0.65),
            );
          }
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );
}

// ── Intersection Observer helper ──────────────────────────────
function onVisible(selector, callback, options = {}) {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) callback(e.target, obs);
      });
    },
    { threshold: 0.12, ...options },
  );
  document.querySelectorAll(selector).forEach((el) => obs.observe(el));
}

// ── Scroll reveal ─────────────────────────────────────────────
onVisible(".reveal", (el) => el.classList.add("visible"));

const editorialItems = document.querySelectorAll(
  ".signature-principle, .credibility-item, .now-card, .contact-availability__item",
);

editorialItems.forEach((item, index) => {
  item.style.opacity = "0";
  item.style.transform = "translate3d(0, 24px, 0)";
  item.style.transition = `opacity 0.55s ease ${index % 4 * 0.08}s, transform 0.55s ease ${index % 4 * 0.08}s`;
});

onVisible(
  ".signature-section, .featured-projects, .now-section, #contact",
  (el) => {
    el.querySelectorAll(
      ".signature-principle, .credibility-item, .now-card, .contact-availability__item",
    ).forEach((item) => {
      item.style.opacity = "1";
      item.style.transform = "translate3d(0, 0, 0)";
    });
  },
  { threshold: 0.2 },
);

// ── Staggered card reveal ─────────────────────────────────────
const cards = document.querySelectorAll(".card");
const cardObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const idx = [...cards].indexOf(e.target);
        setTimeout(() => e.target.classList.add("visible"), idx * 110);
        cardObs.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 },
);
cards.forEach((c) => cardObs.observe(c));

// ── 3D Card Tilt — desktop only ───────────────────────────────
if (isTouch)
  cards.forEach((c) => {
    c.style.transform = "";
  });
cards.forEach((card) => {
  if (isTouch) return;
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -14;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 14;
    card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px) scale(1.02)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
    card.style.transform = "";
    setTimeout(() => (card.style.transition = ""), 500);
  });
  card.addEventListener("mouseenter", () => {
    card.style.transition = "none";
  });
});

// ── Magnetic buttons — desktop only ──────────────────────────
document.querySelectorAll(".cta, .nav-cta").forEach((btn) => {
  if (isTouch) return;
  btn.addEventListener("mousemove", (e) => {
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.22;
    const y = (e.clientY - r.top - r.height / 2) * 0.22;
    btn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    btn.style.transition = "transform 0.15s ease";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transition = "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)";
    btn.style.transform = "translate3d(0,0,0)";
  });
});

// ── Skill bars ────────────────────────────────────────────────
onVisible(
  ".reveal-skill",
  (el, obs) => {
    el.classList.add("visible");
    const fill = el.querySelector(".skill-fill");
    setTimeout(() => {
      fill.style.width = fill.dataset.width + "%";
    }, 200);
    obs.unobserve(el);
  },
  { threshold: 0.4 },
);

// ── Stats counter ─────────────────────────────────────────────
onVisible(
  ".stat-num",
  (el, obs) => {
    const target = +el.dataset.target;
    let cur = 0;
    const inc = target / (1600 / 16);
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        cur = target;
        clearInterval(t);
      }
      el.textContent = Math.floor(cur);
    }, 16);
    obs.unobserve(el);
  },
  { threshold: 0.5 },
);

// ── Service cards stagger ─────────────────────────────────────
const svcCards = document.querySelectorAll(".service-card");
svcCards.forEach((c, i) => {
  c.style.cssText += `opacity:0;transform:translate3d(0,30px,0);transition:opacity 0.5s ease ${i * 0.1}s,transform 0.5s ease ${i * 0.1}s`;
});
onVisible(
  ".services-grid",
  () => {
    svcCards.forEach((c) => {
      c.style.opacity = "1";
      c.style.transform = "translate3d(0,0,0)";
    });
  },
  { threshold: 0.2 },
);

// ── About tags pop-in ─────────────────────────────────────────
const tags = document.querySelectorAll(".about-tags span");
tags.forEach((t, i) => {
  t.style.cssText += `opacity:0;transform:scale(0.7);transition:opacity 0.4s ease ${0.3 + i * 0.07}s,transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.07}s`;
});
onVisible(
  ".about-tags",
  () => {
    tags.forEach((t) => {
      t.style.opacity = "1";
      t.style.transform = "scale(1)";
    });
  },
  { threshold: 0.4 },
);

// ── Contact form ──────────────────────────────────────────────
function handleForm(e) {
  e.preventDefault();
  const btn = e.target.querySelector(".form-btn");
  const success = document.getElementById("formSuccess");
  btn.textContent = "Sending...";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = "Sent!";
    success.classList.add("show");
    e.target.reset();
    setTimeout(() => {
      btn.textContent = "Send Message";
      btn.disabled = false;
      success.classList.remove("show");
    }, 4000);
  }, 1200);
}
