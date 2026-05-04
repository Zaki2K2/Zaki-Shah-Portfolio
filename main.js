(() => {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  window.scrollTo(0, 0);

  const body = document.body;
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navPanel = document.getElementById("mobileMenu");
  const preloader = document.getElementById("preloader");
  const preloaderCanvas = document.getElementById("preloaderCanvas");
  const preloaderPhase = document.getElementById("preloaderPhase");
  const preloaderProgress = document.getElementById("preloaderProgress");
  const preloaderBar = document.getElementById("preloaderBar");
  const preloaderCore = document.getElementById("preloaderCore");
  const preloaderSkip = document.getElementById("preloaderSkip");
  const ambientAudio = document.getElementById("ambientAudio");
  const soundToggle = document.getElementById("soundToggle");
  const soundMenuToggle = document.getElementById("soundMenuToggle");
  const audioMenu = document.getElementById("audioMenu");
  const soundModeLabel = document.getElementById("soundModeLabel");
  const audioModeButtons = document.querySelectorAll("[data-audio-mode]");
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  const revealNodes = document.querySelectorAll("[data-reveal]");
  const countNodes = document.querySelectorAll(".count-up");
  const magneticNodes = document.querySelectorAll(".magnetic");
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const sceneSections = document.querySelectorAll(".scene-section");
  const filterChips = document.querySelectorAll(".filter-chip");
  const projectTiles = document.querySelectorAll(".project-tile");
  const heroDeck = document.getElementById("heroDeck");
  const interactiveGlowNodes = document.querySelectorAll(".project-feature, .project-tile, .contact-card, .skill-panel");
  const interactiveNodes = document.querySelectorAll(
    "a, button, .project-feature, .project-tile, .about-panel, .ai-card, .skill-panel, .contact-card, .hero-proof__item, #heroDeck",
  );
  const stageLabels = [
    "Initializing Universe",
    "Forming Interface",
    "Launching Portfolio",
  ];
  const SOUND_STORAGE_KEY = "portfolio-sound-enabled";
  const SOUND_MODE_STORAGE_KEY = "portfolio-sound-mode";
  const AUDIO_TRACKS = {
    piano: {
      label: "Piano",
      src: "assets/audio/piano-ambient.mp3",
      fallback: "assets/audio/piano-ambient.wav",
    },
    violin: {
      label: "Violin",
      src: "assets/audio/violin-ambient.mp3",
      fallback: "assets/audio/violin-ambient.wav",
    },
    guitar: {
      label: "Guitar",
      src: "assets/audio/guitar-ambient.mp3",
      fallback: "assets/audio/guitar-ambient.wav",
    },
    jazz: {
      label: "Jazz",
      src: "assets/audio/jazz-ambient.mp3",
      fallback: "assets/audio/jazz-ambient.wav",
    },
    classical: {
      label: "Classical",
      src: "assets/audio/classical-ambient.mp3",
      fallback: "assets/audio/classical-ambient.wav",
    },
    pop: {
      label: "Pop",
      src: "assets/audio/pop-ambient.mp3",
      fallback: "assets/audio/pop-ambient.wav",
    },
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const closeMenu = () => {
    navToggle?.setAttribute("aria-expanded", "false");
    navPanel?.classList.remove("is-open");
    body.classList.remove("menu-open");
  };

  navToggle?.addEventListener("click", () => {
    const isOpen = navPanel?.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    body.classList.toggle("menu-open", Boolean(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!navPanel?.classList.contains("is-open")) return;
    if (navbar?.contains(event.target)) return;
    closeMenu();
  });

  let finishPreloader = () => {};

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      finishPreloader(true);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      navbar?.classList.toggle("is-scrolled", window.scrollY > 28);
    },
    { passive: true },
  );

  const initActiveNav = () => {
    if (!sceneSections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const isMatch = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("is-active", isMatch);
          });
        });
      },
      {
        threshold: 0.45,
        rootMargin: "-12% 0px -30% 0px",
      },
    );

    sceneSections.forEach((section) => observer.observe(section));
  };

  const initReveal = () => {
    if (prefersReducedMotion()) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.14 },
    );

    revealNodes.forEach((node) => observer.observe(node));
  };

  const initCounters = () => {
    const runCounter = (node) => {
      const target = Number(node.dataset.count || 0);
      if (!target) return;

      if (prefersReducedMotion()) {
        node.textContent = String(target);
        return;
      }

      const duration = 1200;
      const startedAt = performance.now();

      const tick = (now) => {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        const eased = 1 - (1 - progress) ** 3;
        node.textContent = String(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.45 },
    );

    countNodes.forEach((node) => observer.observe(node));
  };

  const initCursor = () => {
    if (!cursorDot || !cursorRing || coarsePointer) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let visible = false;

    window.addEventListener(
      "mousemove",
      (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
        if (!visible) {
          visible = true;
          cursorDot.style.opacity = "1";
          cursorRing.style.opacity = "1";
        }
      },
      { passive: true },
    );

    document.addEventListener("mouseleave", () => {
      visible = false;
      cursorDot.style.opacity = "0";
      cursorRing.style.opacity = "0";
    });

    interactiveNodes.forEach((node) => {
      node.addEventListener("mouseenter", () => cursorRing.classList.add("is-active"));
      node.addEventListener("mouseleave", () => cursorRing.classList.remove("is-active"));
    });

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  const initMagnetic = () => {
    if (prefersReducedMotion() || coarsePointer) return;

    magneticNodes.forEach((node) => {
      node.addEventListener("mousemove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.14;
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });

      node.addEventListener("mouseleave", () => {
        node.style.transform = "";
      });
    });
  };

  const initPointerGlow = () => {
    if (prefersReducedMotion() || coarsePointer) return;

    interactiveGlowNodes.forEach((node) => {
      node.addEventListener("mousemove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        node.style.setProperty("--glow-x", `${x}%`);
        node.style.setProperty("--glow-y", `${y}%`);
      });
    });
  };

  const initHeroDeckTilt = () => {
    if (!heroDeck || prefersReducedMotion() || coarsePointer) return;

    heroDeck.addEventListener("mousemove", (event) => {
      const panel = heroDeck.querySelector(".deck-panel");
      if (!panel) return;
      const rect = heroDeck.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      panel.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`;
    });

    heroDeck.addEventListener("mouseleave", () => {
      const panel = heroDeck.querySelector(".deck-panel");
      if (!panel) return;
      panel.style.transform = "";
    });
  };

  const initProjectFilters = () => {
    if (!filterChips.length || !projectTiles.length) return;

    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const filter = chip.dataset.filter || "all";

        filterChips.forEach((item) => {
          const isActive = item === chip;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-pressed", String(isActive));
        });

        projectTiles.forEach((tile) => {
          const categories = (tile.dataset.category || "").split(/\s+/).filter(Boolean);
          const matches = filter === "all" || categories.includes(filter);
          tile.classList.toggle("is-hidden", !matches);
        });
      });
    });
  };

  const initSound = () => {
    if (!ambientAudio || !soundToggle || !soundMenuToggle || !audioMenu) return;

    let soundEnabled = localStorage.getItem(SOUND_STORAGE_KEY) === "true";
    let currentMode = localStorage.getItem(SOUND_MODE_STORAGE_KEY) || "piano";
    if (!AUDIO_TRACKS[currentMode]) currentMode = "piano";
    let interactionArmed = false;
    let fadeInterval = 0;
    let audioUnavailable = false;
    let menuOpen = false;
    let sourceAttempt = 0;
    let pendingSource = "";
    const preferFallback = ambientAudio.dataset.preferFormat === "wav";

    ambientAudio.volume = 0;
    ambientAudio.preload = "none";

    const closeSoundMenu = () => {
      menuOpen = false;
      audioMenu.classList.remove("is-open");
      soundMenuToggle.setAttribute("aria-expanded", "false");
      soundToggle.classList.remove("is-open");
    };

    const openSoundMenu = () => {
      menuOpen = true;
      audioMenu.classList.add("is-open");
      soundMenuToggle.setAttribute("aria-expanded", "true");
      soundToggle.classList.add("is-open");
    };

    const setModeUi = () => {
      const track = AUDIO_TRACKS[currentMode];
      if (soundModeLabel && track) {
        soundModeLabel.textContent = track.label;
      }
      audioModeButtons.forEach((button) => {
        const isActive = button.dataset.audioMode === currentMode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    };

    const setSoundUi = (enabled, label) => {
      soundToggle.classList.toggle("is-on", enabled);
      soundToggle.setAttribute("aria-pressed", String(enabled));
      soundToggle.setAttribute(
        "aria-label",
        audioUnavailable
          ? "Selected music file is unavailable"
          : enabled
            ? "Turn background music off"
            : "Enable background music",
      );
      const text = soundToggle.querySelector(".sound-toggle__label");
      if (text) {
        text.textContent = label || (enabled ? "Music On" : "Enable Music");
      }
      setModeUi();
    };

    const clearFade = () => {
      if (fadeInterval) {
        window.clearInterval(fadeInterval);
        fadeInterval = 0;
      }
    };

    const fadeTo = (target, onComplete) => {
      clearFade();
      fadeInterval = window.setInterval(() => {
        const next = ambientAudio.volume + (target - ambientAudio.volume) * 0.22;
        ambientAudio.volume = Math.abs(next - target) < 0.01 ? target : next;
        if (ambientAudio.volume === target) {
          clearFade();
          if (onComplete) onComplete();
        }
      }, 50);
    };

    const safePause = () => {
      try {
        ambientAudio.pause();
      } catch {
        // Ignore pause failures.
      }
    };

    const setAudioSource = (mode) => {
      const track = AUDIO_TRACKS[mode];
      if (!track) return;
      pendingSource = preferFallback ? track.fallback : track.src;
      sourceAttempt = preferFallback ? 1 : 0;
      ambientAudio.src = pendingSource;
      ambientAudio.setAttribute("data-fallback", track.fallback);
      ambientAudio.load();
    };

    const notifySceneMode = () => {
      if (typeof window.setPortfolioAudioMode === "function") {
        window.setPortfolioAudioMode(currentMode);
      }
    };

    const startAudio = async () => {
      try {
        setAudioSource(currentMode);
        await ambientAudio.play();
        fadeTo(0.22);
        setSoundUi(true, "Music On");
        soundEnabled = true;
        localStorage.setItem(SOUND_STORAGE_KEY, "true");
        localStorage.setItem(SOUND_MODE_STORAGE_KEY, currentMode);
        notifySceneMode();
        return true;
      } catch {
        setSoundUi(false, "Music Off");
        soundEnabled = false;
        localStorage.setItem(SOUND_STORAGE_KEY, "false");
        return false;
      }
    };

    const stopAudio = () => {
      fadeTo(0, () => {
        safePause();
      });
      setSoundUi(false, "Music Off");
      soundEnabled = false;
      localStorage.setItem(SOUND_STORAGE_KEY, "false");
    };

    const switchMode = async (nextMode) => {
      if (!AUDIO_TRACKS[nextMode]) return;
      currentMode = nextMode;
      localStorage.setItem(SOUND_MODE_STORAGE_KEY, currentMode);
      setModeUi();
      notifySceneMode();

      if (!soundEnabled) {
        closeSoundMenu();
        return;
      }

      clearFade();
      fadeTo(0, async () => {
        safePause();
        try {
          setAudioSource(currentMode);
          await ambientAudio.play();
          fadeTo(0.22);
          setSoundUi(true, "Music On");
        } catch {
          audioUnavailable = true;
          soundToggle.setAttribute("disabled", "true");
          soundMenuToggle.setAttribute("disabled", "true");
          setSoundUi(false, "Audio Missing");
          soundEnabled = false;
          localStorage.setItem(SOUND_STORAGE_KEY, "false");
        }
      });

      closeSoundMenu();
    };

    const attemptResumeAfterInteraction = async () => {
      if (!soundEnabled || interactionArmed) return;
      interactionArmed = true;
      await startAudio();
      window.removeEventListener("pointerdown", attemptResumeAfterInteraction);
      window.removeEventListener("keydown", attemptResumeAfterInteraction);
    };

    soundToggle.addEventListener("click", async () => {
      if (audioUnavailable) return;
      if (ambientAudio.paused || !soundEnabled) {
        await startAudio();
      } else {
        stopAudio();
      }
    });

    soundMenuToggle.addEventListener("click", () => {
      if (audioUnavailable) return;
      if (menuOpen) {
        closeSoundMenu();
      } else {
        openSoundMenu();
      }
    });

    audioModeButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const nextMode = button.dataset.audioMode;
        await switchMode(nextMode);
      });
    });

    document.addEventListener("click", (event) => {
      if (!menuOpen) return;
      if (event.target instanceof Node && event.target.closest(".audio-widget")) return;
      closeSoundMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSoundMenu();
      }
    });

    ambientAudio.addEventListener("error", () => {
      const fallback = ambientAudio.getAttribute("data-fallback");
      if (
        sourceAttempt === 0 &&
        fallback &&
        pendingSource &&
        ambientAudio.currentSrc.includes(".mp3")
      ) {
        sourceAttempt = 1;
        ambientAudio.src = fallback;
        ambientAudio.load();
        if (soundEnabled) {
          ambientAudio.play().then(() => fadeTo(0.22)).catch(() => {});
        }
        return;
      }

      clearFade();
      audioUnavailable = true;
      soundToggle.classList.remove("is-on");
      soundToggle.setAttribute("aria-pressed", "false");
      soundToggle.setAttribute("disabled", "true");
      soundMenuToggle.setAttribute("disabled", "true");
      setSoundUi(false, "Audio Missing");
      soundEnabled = false;
      localStorage.setItem(SOUND_STORAGE_KEY, "false");
    });

    if (soundEnabled) {
      setSoundUi(false, "Music Off");
      window.addEventListener("pointerdown", attemptResumeAfterInteraction, { once: true });
      window.addEventListener("keydown", attemptResumeAfterInteraction, { once: true });
    } else {
      setSoundUi(false, "Enable Music");
    }

    setModeUi();
    notifySceneMode();

    window.showSoundToggle = () => {
      const audioWidget = document.getElementById("audioWidget");
      if (!audioWidget) return;
      audioWidget.hidden = false;
      requestAnimationFrame(() => {
        audioWidget.classList.add("is-visible");
      });
    };
  };

  let preloaderDone = false;
  let preloaderRaf = 0;
  let preloaderFinishTimeout = 0;

  finishPreloader = (skipped = false) => {
    if (!preloader || preloaderDone) return;
    preloaderDone = true;
    cancelAnimationFrame(preloaderRaf);
    clearTimeout(preloaderFinishTimeout);
    if (typeof window.setPortfolioIntroProgress === "function") {
      window.setPortfolioIntroProgress(1);
    }
    if (typeof window.setPortfolioSceneReady === "function") {
      window.setPortfolioSceneReady();
    }
    body.classList.remove("is-preloading");
    body.classList.add("is-scene-ready");
    preloader.classList.add("is-hidden");

    window.setTimeout(() => {
      preloader.remove();
      if (skipped) body.classList.remove("menu-open");
      if (typeof window.showSoundToggle === "function") {
        window.showSoundToggle();
      }
    }, prefersReducedMotion() ? 80 : 760);
  };

  const initPreloader = () => {
    if (!preloader || !preloaderCanvas || !preloaderPhase || !preloaderProgress || !preloaderBar || !preloaderCore) {
      body.classList.remove("is-preloading");
      return;
    }

    if (prefersReducedMotion()) {
      preloaderProgress.textContent = "100%";
      preloaderBar.style.width = "100%";
      preloaderPhase.textContent = stageLabels[2];
      if (typeof window.setPortfolioIntroProgress === "function") {
        window.setPortfolioIntroProgress(1);
      }
      preloaderFinishTimeout = window.setTimeout(() => finishPreloader(false), 280);
      preloaderSkip?.addEventListener("click", () => finishPreloader(true), { once: true });
      return;
    }

    const ctx = preloaderCanvas.getContext("2d");
    if (!ctx) {
      finishPreloader(false);
      return;
    }

    let width = 0;
    let height = 0;
    let stars = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      width = window.innerWidth;
      height = window.innerHeight;
      preloaderCanvas.width = Math.floor(width * dpr);
      preloaderCanvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: width < 768 ? 72 : 140 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.5,
        alpha: Math.random() * 0.6 + 0.16,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const duration = width < 768 ? 900 : 1200;
    const startedAt = performance.now();

    const draw = (now) => {
      const elapsed = now - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const phaseIndex = Math.min(stageLabels.length - 1, Math.floor(progress * stageLabels.length));
      const centerX = width / 2;
      const centerY = height * 0.46;
      const glowRadius = Math.min(width, height) * (0.08 + progress * 0.12);

      preloaderPhase.textContent = stageLabels[phaseIndex];
      preloaderProgress.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
      preloaderBar.style.width = `${progress * 100}%`;
      preloaderCore.style.setProperty("--core-scale", String(0.82 + progress * 0.22));
      if (typeof window.setPortfolioIntroProgress === "function") {
        window.setPortfolioIntroProgress(progress);
      }

      ctx.clearRect(0, 0, width, height);

      const baseGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius * 3.8);
      baseGlow.addColorStop(0, `rgba(255,255,255,${0.08 + progress * 0.08})`);
      baseGlow.addColorStop(0.18, `rgba(136,228,255,${0.12 + progress * 0.12})`);
      baseGlow.addColorStop(0.42, `rgba(141,121,255,${0.08 + progress * 0.08})`);
      baseGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = baseGlow;
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star, index) => {
        const pulse = 0.72 + Math.sin(now * 0.0012 + star.phase + index * 0.18) * 0.22;
        ctx.fillStyle = `rgba(232,242,255,${star.alpha * pulse * (0.4 + progress * 0.6)})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const singularity = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      singularity.addColorStop(0, `rgba(255,255,255,${0.9 - progress * 0.2})`);
      singularity.addColorStop(0.2, `rgba(136,228,255,${0.42 + progress * 0.12})`);
      singularity.addColorStop(0.5, `rgba(141,121,255,${0.18 + progress * 0.08})`);
      singularity.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = singularity;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      preloaderRaf = requestAnimationFrame(draw);
      if (progress >= 1) finishPreloader(false);
    };

    preloaderSkip?.addEventListener("click", () => finishPreloader(true), { once: true });
    preloaderRaf = requestAnimationFrame(draw);
  };

  initPreloader();
  initActiveNav();
  initReveal();
  initCounters();
  initCursor();
  initMagnetic();
  initPointerGlow();
  initHeroDeckTilt();
  initProjectFilters();
  initSound();

  window.addEventListener("load", () => {
    if (prefersReducedMotion() || preloaderDone) return;
    preloaderFinishTimeout = window.setTimeout(() => finishPreloader(false), 450);
  });
})();
