const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/* snow: 80 twinkling flakes, drifting down (a still sky when motion is reduced) */
(() => {
  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
  const COUNT = 80;
  let w = 0, h = 0, flakes = null, frame = 0;

  const spawn = (top) => ({
    x: Math.random() * w,
    y: top ? -10 : Math.random() * h,
    r: Math.random() * 1.8 + 0.8,
    vy: Math.random() * 0.6 + 0.3,
    vx: Math.random() * 0.4 - 0.2,
    phase: Math.random() * Math.PI * 2,
    tw: Math.random() * 0.04 + 0.01,
  });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    for (const f of flakes) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(f.phase * 3);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const nw = innerWidth, nh = innerHeight;
    canvas.width = Math.round(nw * dpr);
    canvas.height = Math.round(nh * dpr);
    canvas.style.width = nw + "px";
    canvas.style.height = nh + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flakes && w && h) {
      // keep the flakes where they were, stretched to the new size
      for (const f of flakes) { f.x *= nw / w; f.y *= nh / h; }
      w = nw; h = nh;
    } else {
      w = nw; h = nh;
      flakes = Array.from({ length: COUNT }, () => spawn(false));
    }
    draw();
  }

  function tick() {
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.x += f.vx + Math.sin(f.phase) * 0.15;
      f.y += f.vy;
      f.phase += f.tw;
      if (f.y > h + 10 || f.x < -10 || f.x > w + 10) flakes[i] = spawn(true);
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  const sync = () => {
    cancelAnimationFrame(frame);
    if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
  };

  addEventListener("resize", resize);
  reducedMotion.addEventListener("change", sync);
  resize();
  sync();
})();

/* live discord presence via lanyard (avatar, status, custom status, activities)
   plus my local time. Everything stays hidden if lanyard can't be reached. */
(() => {
  const DISCORD_ID = "894170177330098217";
  const TIME_ZONE = "Asia/Jakarta"; // WIB
  const MAX_ACTIVITIES = 2;

  const $ = (s) => document.querySelector(s);
  const avatar = $(".avatar-img");
  const dot = $(".status-dot");
  const statusWrap = $(".now-status");
  const nowDot = $(".now-dot");
  const statusText = $(".now-status-text");
  const custom = $(".custom-status");
  const customEmoji = $(".custom-emoji");
  const customText = $(".custom-text");
  const list = $(".activities");
  const clock = $("#local-time");

  const STATUS = { online: "Online", idle: "Idle", dnd: "Do not disturb", offline: "Offline" };
  const KIND = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching", 5: "Competing in" };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  // discord asset keys -> image urls
  const assetUrl = (appId, key) => {
    if (!key) return null;
    if (key.startsWith("mp:external/")) return "https://media.discordapp.net/external/" + key.slice(12);
    if (key.startsWith("mp:")) return "https://media.discordapp.net/" + key.slice(3);
    if (key.startsWith("spotify:")) return "https://i.scdn.co/image/" + key.slice(8);
    if (appId && /^\d+$/.test(key)) return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`;
    return null;
  };

  const mmss = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const since = (ms) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    if (m < 1) return "just started";
    const h = Math.floor(m / 60);
    return h ? `for ${h}h ${m % 60}m` : `for ${m}m`;
  };

  /* ---- clock + timers, one tick per second ---- */
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
  function tick() {
    const now = Date.now();
    clock.textContent = timeFmt.format(now).toLowerCase();
    clock.dateTime = new Date(now).toISOString();
    list.querySelectorAll(".activity").forEach((card) => {
      const start = +card.dataset.start || 0;
      const end = +card.dataset.end || 0;
      const bar = card.querySelector(".activity-bar span");
      const times = card.querySelector(".activity-times");
      if (start && end && bar) {
        const p = Math.min(1, Math.max(0, (now - start) / (end - start)));
        bar.style.width = (p * 100).toFixed(2) + "%";
        times.firstChild.textContent = mmss(Math.min(now, end) - start);
      } else if (start && times) {
        times.firstChild.textContent = since(now - start);
      }
    });
  }

  /* ---- rendering ---- */
  let avatarHash = null;
  function setAvatar(user) {
    const hash = user && user.avatar;
    if (!hash || hash === avatarHash) return;
    avatarHash = hash;
    const ext = hash.startsWith("a_") ? "gif" : "png";
    const src = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${hash}.${ext}?size=256`;
    const pre = new Image();
    pre.onload = () => (avatar.src = src); // swap only once it has loaded
    pre.src = src;
  }

  function activityCard(a) {
    const card = el("div", "activity");
    const art = el("div", "activity-art");
    const large = assetUrl(a.application_id, a.assets && a.assets.large_image);
    const small = assetUrl(a.application_id, a.assets && a.assets.small_image);
    if (large) {
      const img = el("img");
      img.src = large;
      img.alt = (a.assets && a.assets.large_text) || "";
      img.loading = "lazy";
      img.onerror = () => img.remove();
      art.append(img);
      if (small) {
        const s = el("img", "small");
        s.src = small;
        s.alt = (a.assets && a.assets.small_text) || "";
        s.onerror = () => s.remove();
        art.append(s);
      }
    }

    const body = el("div", "activity-body");
    let kind, title, sub;
    if (a.type === 2) {
      kind = `Listening to ${a.name}`;
      title = a.details || a.name;
      sub = a.state ? "by " + a.state.replace(/; /g, ", ") : "";
    } else {
      kind = KIND[a.type] || "Doing";
      title = a.name;
      sub = [a.details, a.state].filter(Boolean).join(" · ");
    }
    const titleEl = el("p", "activity-title", title);
    titleEl.title = title; // full text on hover when it gets cut off
    body.append(el("p", "activity-kind", kind), titleEl);
    if (sub) {
      const subEl = el("p", "activity-sub", sub);
      subEl.title = sub;
      body.append(subEl);
    }

    const ts = a.timestamps || {};
    if (ts.start) card.dataset.start = ts.start;
    if (ts.start && ts.end) {
      card.dataset.end = ts.end;
      const bar = el("div", "activity-bar");
      bar.append(el("span"));
      const times = el("div", "activity-times");
      times.append(el("span", "", "0:00"), el("span", "", mmss(ts.end - ts.start)));
      body.append(bar, times);
    } else if (ts.start) {
      const times = el("div", "activity-times");
      times.append(el("span"));
      body.append(times);
    }

    card.append(art, body);
    return card;
  }

  function render(data) {
    if (!data) return;
    setAvatar(data.discord_user);

    const status = STATUS[data.discord_status] ? data.discord_status : "offline";
    dot.dataset.status = nowDot.dataset.status = status;
    dot.title = statusText.textContent = STATUS[status];
    dot.hidden = statusWrap.hidden = false;

    const acts = data.activities || [];
    const c = acts.find((a) => a.type === 4);
    customEmoji.replaceChildren();
    if (c && c.emoji) {
      if (c.emoji.id) {
        const img = el("img");
        img.src = `https://cdn.discordapp.com/emojis/${c.emoji.id}.${c.emoji.animated ? "gif" : "png"}?size=48`;
        img.alt = c.emoji.name || "";
        customEmoji.append(img);
      } else if (c.emoji.name) {
        customEmoji.textContent = c.emoji.name;
      }
    }
    customText.textContent = (c && c.state) || "";
    custom.hidden = !(c && (c.state || c.emoji));

    const shown = acts
      .filter((a) => a.type !== 4 && a.name)
      .sort((a, b) => (a.type === 0 ? -1 : 0) - (b.type === 0 ? -1 : 0)) // games first
      .slice(0, MAX_ACTIVITIES);
    list.replaceChildren(...shown.map(activityCard));
    tick();
  }

  /* ---- data: one REST fetch for a fast first paint, then a live socket ---- */
  fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then(({ data }) => render(data))
    .catch(() => {});

  let ws, heartbeat, retry = 0;
  function connect() {
    try { ws = new WebSocket("wss://api.lanyard.rest/socket"); } catch (_) { return; }
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (_) { return; }
      if (msg.op === 1) {
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
        }, msg.d.heartbeat_interval);
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      } else if (msg.op === 0 && (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")) {
        retry = 0;
        render(msg.d);
      }
    };
    ws.onclose = () => {
      clearInterval(heartbeat);
      setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++));
    };
  }
  connect();

  tick();
  setInterval(tick, 1000);
})();

/* copy discord username */
(() => {
  const btn = document.getElementById("discord");
  const status = document.getElementById("copy-status");
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
    if (status) status.textContent = "Discord username copied";
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.dataset.tooltip = label;
      if (status) status.textContent = "";
    }, 1500);
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

/* fuzzy name: re-seed the noise ~16fps, with random bursts of heavy distortion.
   Only runs while the name is on screen and the tab is visible. */
(() => {
  const name = document.querySelector(".glitch");
  const noise = document.getElementById("fuzz-noise");
  const map = document.getElementById("fuzz-map");
  if (!name || !noise || !map) return;
  let burst = 0, timer = 0, onScreen = true;

  const step = () => {
    noise.setAttribute("seed", String((Math.random() * 1000) | 0));
    if (burst > 0) burst--;
    else if (Math.random() < 0.05) burst = 3 + ((Math.random() * 4) | 0);
    const scale = burst > 0 ? 9 + Math.random() * 10 : 2 + Math.random() * 2.5;
    map.setAttribute("scale", scale.toFixed(1));
    noise.setAttribute("baseFrequency", burst > 0 ? "0.5 0.12" : "0.9 0.04");
  };

  const sync = () => {
    const run = onScreen && !document.hidden && !reducedMotion.matches;
    if (run && !timer) timer = setInterval(step, 60);
    else if (!run && timer) { clearInterval(timer); timer = 0; }
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(name);
  }
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
  sync();
})();

/* about card tabs */
(() => {
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  if (!tabs.length) return;
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      panel.classList.toggle("active", on);
      panel.inert = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
})();
