// ── Preloader ─────────────────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(
    () => document.getElementById("preloader").classList.add("hidden"),
    2000,
  );
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
  .querySelectorAll("a, button, .card, .service-card, .stat-box")
  .forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hovered"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hovered"));
  });

// ── Typewriter ────────────────────────────────────────────────
const phrases = [
  "Frontend Developer",
  "Angular Developer",
  "UI/UX-Focused Web Developer",
  "Web Developer crafting dynamic web apps",
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
    btn.textContent = "Sent! ✓";
    success.classList.add("show");
    e.target.reset();
    setTimeout(() => {
      btn.textContent = "Send Message →";
      btn.disabled = false;
      success.classList.remove("show");
    }, 4000);
  }, 1200);
}
