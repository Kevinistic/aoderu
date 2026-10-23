/* snow: 80 twinkling flakes, drifting down */
(() => {
  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
  const COUNT = 80;
  let w, h, flakes;

  const spawn = (top) => ({
    x: Math.random() * w,
    y: top ? -10 : Math.random() * h,
    r: Math.random() * 1.8 + 0.8,
    vy: Math.random() * 0.6 + 0.3,
    vx: Math.random() * 0.4 - 0.2,
    phase: Math.random() * Math.PI * 2,
    tw: Math.random() * 0.04 + 0.01,
  });

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    flakes = Array.from({ length: COUNT }, () => spawn(false));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.x += f.vx + Math.sin(f.phase) * 0.15;
      f.y += f.vy;
      f.phase += f.tw;
      if (f.y > h + 10 || f.x < -10 || f.x > w + 10) flakes[i] = spawn(true);
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(f.phase * 3);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  resize();
  tick();
})();

/* copy discord username */
(() => {
  const btn = document.getElementById("discord");
  const label = btn.dataset.tooltip;
  let timer;

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("aoderu");
    } catch (_) {
      const t = document.createElement("textarea");
      t.value = "aoderu";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    btn.dataset.tooltip = "Copied!";
    clearTimeout(timer);
    timer = setTimeout(() => (btn.dataset.tooltip = label), 1500);
  });
})();

/* reveal cards on scroll */
(() => {
  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.setProperty("--i", i % 4);
    io.observe(el);
  });
})();

/* fuzzy name: re-seed the noise ~16fps, with random bursts of heavy distortion */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const noise = document.getElementById("fuzz-noise");
  const map = document.getElementById("fuzz-map");
  let burst = 0;
  setInterval(() => {
    noise.setAttribute("seed", String((Math.random() * 1000) | 0));
    if (burst > 0) burst--;
    else if (Math.random() < 0.05) burst = 3 + ((Math.random() * 4) | 0);
    const scale = burst > 0 ? 9 + Math.random() * 10 : 2 + Math.random() * 2.5;
    map.setAttribute("scale", scale.toFixed(1));
    noise.setAttribute("baseFrequency", burst > 0 ? "0.5 0.12" : "0.9 0.04");
  }, 60);
})();
