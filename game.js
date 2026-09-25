// ============================================================================
// 🎮 BHONDHU & GHOCHUMAN'S 8-BIT PIXEL LOVE QUEST — MAIN GAME ENGINE
// ============================================================================

(function () {
  "use strict";

  const STORAGE_KEY_PROGRESS = "bg_love_quest_progress_v1";
  const STORAGE_KEY_PHOTOS = "bg_love_quest_photos_v1";

  // Keep a deep copy of default photos so user can reset anytime
  const DEFAULT_PHOTOS = JSON.parse(
    JSON.stringify(window.GAME_CONFIG.PHOTO_MEMORIES)
  );

  // ==========================================================================
  // 🎵 8-BIT WEB AUDIO SYNTHESIZER + <AUDIO> FALLBACK ENGINE
  // ==========================================================================
  const SoundEngine = {
    ctx: null,
    musicEnabled: true,
    musicTimer: null,
    melodyStep: 0,

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    },

    enableDefaultMusic() {
      this.musicEnabled = true;
      const btn = document.getElementById("btn-music-toggle");
      if (btn) btn.textContent = "🔊 Music: ON";
      this.initContext();
      this.startChiptuneLoop();

      // Ensure mobile/desktop browsers that block audio before first tap immediately resume on first touch/click
      const unlockAudio = () => {
        if (!this.musicEnabled) return;
        this.initContext();
        if (!this.musicTimer) {
          this.startChiptuneLoop();
        }
      };
      ["pointerdown", "touchstart", "click", "keydown"].forEach((evt) => {
        window.addEventListener(evt, unlockAudio, { once: true, passive: true });
      });
    },

    playHtmlAudio(id) {
      const el = document.getElementById(id);
      if (el && el.getAttribute("src")) {
        try {
          el.currentTime = 0;
          const p = el.play();
          if (p && typeof p.catch === "function") {
            p.catch(() => {});
          }
        } catch (e) {}
      }
    },

    playTone(freq, type, duration, delay = 0, vol = 0.12) {
      this.initContext();
      if (!this.ctx) return;

      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    },

    sfxClick() {
      this.playTone(587.33, "square", 0.06, 0, 0.08);
      this.playTone(880.0, "square", 0.08, 0.04, 0.08);
    },

    sfxBounce(isLeftToRight) {
      if (isLeftToRight) {
        this.playTone(392.0, "triangle", 0.08, 0, 0.11);
        this.playTone(523.25, "square", 0.09, 0.06, 0.09);
        this.playTone(659.25, "square", 0.12, 0.12, 0.09);
      } else {
        this.playTone(659.25, "triangle", 0.08, 0, 0.11);
        this.playTone(523.25, "square", 0.09, 0.06, 0.09);
        this.playTone(783.99, "square", 0.12, 0.12, 0.09);
      }
    },

    sfxTypewriter() {
      const freqs = [440, 493.88, 523.25, 587.33, 659.25];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this.playTone(f, "square", 0.028, 0, 0.035);
    },

    sfxCrunch() {
      this.playTone(220, "sawtooth", 0.06, 0, 0.12);
      this.playTone(330, "square", 0.06, 0.05, 0.12);
      this.playTone(660, "triangle", 0.1, 0.1, 0.12);
    },

    sfxJump() {
      this.playHtmlAudio("sfx-jump");
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    },

    sfxHit() {
      this.playHtmlAudio("sfx-hit");
      this.playTone(180, "sawtooth", 0.12, 0, 0.15);
      this.playTone(130, "sawtooth", 0.18, 0.1, 0.15);
    },

    sfxRing() {
      this.playHtmlAudio("sfx-ring");
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, i) => {
        this.playTone(n, "square", 0.14, i * 0.07, 0.12);
      });
    },

    sfxAchievement() {
      this.playHtmlAudio("sfx-achievement");
      const notes = [587.33, 739.99, 880.0, 1174.66];
      notes.forEach((n, i) => {
        this.playTone(n, "square", 0.15, i * 0.08, 0.12);
      });
    },

    sfxDodge() {
      this.playTone(700, "triangle", 0.05, 0, 0.09);
      this.playTone(420, "square", 0.07, 0.04, 0.09);
    },

    sfxVictory() {
      this.playHtmlAudio("sfx-victory");
      const fanfare = [
        { f: 523.25, d: 0.14, t: 0.0 },
        { f: 523.25, d: 0.14, t: 0.15 },
        { f: 523.25, d: 0.14, t: 0.3 },
        { f: 523.25, d: 0.32, t: 0.45 },
        { f: 415.3, d: 0.28, t: 0.8 },
        { f: 466.16, d: 0.28, t: 1.1 },
        { f: 523.25, d: 0.2, t: 1.4 },
        { f: 466.16, d: 0.14, t: 1.65 },
        { f: 523.25, d: 0.55, t: 1.82 }
      ];
      fanfare.forEach((note) => {
        this.playTone(note.f, "square", note.d, note.t, 0.13);
      });
    },

    toggleMusic() {
      this.musicEnabled = !this.musicEnabled;
      const btn = document.getElementById("btn-music-toggle");
      const bgmEl = document.getElementById("bgm-chiptune");

      if (this.musicEnabled) {
        if (btn) btn.textContent = "🔊 Music: ON";
        this.initContext();
        if (bgmEl) {
          bgmEl.volume = 0.35;
          const p = bgmEl.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
        this.startChiptuneLoop();
      } else {
        if (btn) btn.textContent = "🔊 Music: OFF";
        if (bgmEl) {
          try {
            bgmEl.pause();
          } catch (e) {}
        }
        this.stopChiptuneLoop();
      }
    },

    startChiptuneLoop() {
      this.stopChiptuneLoop();
      // Sweet romantic 8-bit chiptune arpeggio
      const melody = [
        523.25, 659.25, 783.99, 659.25,
        587.33, 698.46, 880.0, 698.46,
        493.88, 587.33, 783.99, 587.33,
        523.25, 659.25, 1046.5, 783.99
      ];
      this.melodyStep = 0;
      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled) return;
        const note = melody[this.melodyStep % melody.length];
        this.playTone(note, "triangle", 0.22, 0, 0.045);
        if (this.melodyStep % 4 === 0) {
          this.playTone(note / 2, "square", 0.35, 0, 0.025);
        }
        this.melodyStep++;
      }, 280);
    },

    stopChiptuneLoop() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }
  };

  // ==========================================================================
  // 🎉 CONFETTI ENGINE (Full-Screen Canvas)
  // ==========================================================================
  const ConfettiEngine = {
    canvas: null,
    ctx: null,
    particles: [],
    animId: null,

    init() {
      this.canvas = document.getElementById("confetti-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      const resize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener("resize", resize);
    },

    burst(count = 130) {
      if (!this.canvas || !this.ctx) this.init();
      if (!this.canvas) return;

      const colors = [
        "#ff7eb3",
        "#ffd666",
        "#95de64",
        "#b37feb",
        "#ff85c0",
        "#69c0ff",
        "#fff3d6"
      ];

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: window.innerWidth * (0.2 + Math.random() * 0.6),
          y: window.innerHeight * 0.35,
          vx: (Math.random() - 0.5) * 14,
          vy: -Math.random() * 14 - 4,
          size: 6 + Math.floor(Math.random() * 8),
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          life: 110 + Math.floor(Math.random() * 60)
        });
      }

      if (!this.animId) {
        this.loop();
      }
    },

    loop() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.rot += p.vRot;
        p.life--;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.ctx.restore();

        if (p.life <= 0 || p.y > this.canvas.height + 40) {
          this.particles.splice(i, 1);
        }
      }

      if (this.particles.length > 0) {
        this.animId = requestAnimationFrame(() => this.loop());
      } else {
        this.animId = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  // ==========================================================================
  // 🕹️ MAIN GAME CONTROLLER
  // ==========================================================================
  const Game = {
    state: {
      level1Done: false,
      level2Done: false,
      level3Done: false,
      secretsFound: []
    },

    // Photo showreel state
    photoReel: {
      startIndex: 0,
      endIndex: 21,
      currentIndex: 0,
      nextScreenAfter: "screen-map",
      autoplay: true,
      timer: null,
      headingText: "📸 BOUNCY MEMORY INTERLUDE",
      subText: "Watch our memories bounce in from Left → Right & Right → Left!"
    },

    // Level 1 RPG Dialogue state
    l1: {
      index: 0,
      typing: false,
      typeTimer: null,
      currentFullText: ""
    },

    // Level 2 Side-Scrolling Runner state
    runner: {
      canvas: null,
      ctx: null,
      running: false,
      animId: null,
      lives: 3,
      score: 0,
      distance: 0,
      maxDistance: 1650, // ~27 seconds to 100% (27 September!)
      player: {
        x: 90,
        y: 220,
        vy: 0,
        w: 56,
        h: 68,
        groundY: 220,
        jumping: false,
        invincibleTimer: 0
      },
      obstacles: [],
      collectibles: [],
      ringObj: null,
      stars: [],
      spawnTimer: 0,
      itemTimer: 0,
      sprites: {
        bhondhu: null,
        ghochuman: null,
        ring: null,
        pringles: null
      }
    },

    // Level 3 Proposal Boss Battle state
    boss: {
      dodgeCount: 0,
      taunts: [
        '"Nice try Ghochuman! That NO button has 99 Agility! 🏃‍♂️💨"',
        '"Error 404: Saying NO to Bhondhu is not supported! 😂"',
        '"Wait... even if you click NO, it still means YES! 💍"',
        '"Miss Motichoor Ki Laddu, your finger slipped toward YES! 🍬"',
        '"Resistance is futile! We have Pringles at home! 🥔💖"',
        '"Our Avengers team already approved this marriage! 🦸‍♂️"'
      ]
    },

    // Draft photo list for the live in-app editor
    editorDraft: [],

    // ------------------------------------------------------------------------
    // INITIALIZATION
    // ------------------------------------------------------------------------
    init() {
      this.loadSavedState();
      this.initAmbientStars();
      ConfettiEngine.init();
      this.preloadSprites();
      this.updateHUD();
      this.updateMapUI();
      this.renderFinalBouncyWall();
      this.bindKeyboardShortcuts();
      SoundEngine.enableDefaultMusic();

      // Update dynamic count badge
      const totalCountEl = document.getElementById("total-photos-count");
      if (totalCountEl) {
        totalCountEl.textContent = String(
          window.GAME_CONFIG.PHOTO_MEMORIES.length
        );
      }
    },

    loadSavedState() {
      try {
        // Clear any old cached photo edits so the final photos-config.js is always used
        localStorage.removeItem(STORAGE_KEY_PHOTOS);
        const rawProg = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (rawProg) {
          const parsed = JSON.parse(rawProg);
          this.state.level1Done = !!parsed.level1Done;
          this.state.level2Done = !!parsed.level2Done;
          this.state.level3Done = !!parsed.level3Done;
          if (Array.isArray(parsed.secretsFound)) {
            this.state.secretsFound = parsed.secretsFound;
          }
        }
      } catch (e) {}
    },

    saveProgress() {
      try {
        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(this.state));
      } catch (e) {}
    },

    initAmbientStars() {
      const container = document.getElementById("ambient-bg");
      if (!container) return;
      container.innerHTML = "";
      const symbols = ["✨", "💖", "⭐", "🌸", "🥔", "💍", "🍬"];
      for (let i = 0; i < 24; i++) {
        const span = document.createElement("span");
        span.className = "ambient-star";
        span.textContent = symbols[i % symbols.length];
        span.style.left = `${Math.random() * 96}%`;
        span.style.top = `${Math.random() * 96}%`;
        span.style.fontSize = `${11 + Math.floor(Math.random() * 10)}px`;
        span.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
        container.appendChild(span);
      }
    },

    preloadSprites() {
      const loadImg = (src) => {
        const img = new Image();
        img.src = src;
        return img;
      };
      this.runner.sprites.bhondhu = loadImg("sprites/bhondhu.png");
      this.runner.sprites.ghochuman = loadImg("sprites/ghochuman.png");
      this.runner.sprites.ring = loadImg("sprites/ring.png");
      this.runner.sprites.pringles = loadImg("sprites/pringles.png");
    },

    bindKeyboardShortcuts() {
      window.addEventListener("keydown", (e) => {
        // Ignore if typing in photo editor inputs
        if (
          e.target &&
          (e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.tagName === "SELECT")
        ) {
          return;
        }

        const activeScreen = document.querySelector(".game-screen.active");
        if (!activeScreen) return;

        if (activeScreen.id === "screen-level1") {
          if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
            e.preventDefault();
            this.advanceDialogue();
          }
        } else if (activeScreen.id === "screen-level2") {
          if (
            e.code === "Space" ||
            e.code === "ArrowUp" ||
            e.code === "KeyW"
          ) {
            e.preventDefault();
            if (this.runner.running) {
              this.runnerJump();
            } else {
              const winBtn = document.getElementById("runner-win-btn");
              if (winBtn && winBtn.style.display !== "none") {
                this.completeLevel2();
              } else {
                this.startRunner();
              }
            }
          }
        } else if (activeScreen.id === "screen-photos") {
          if (e.code === "ArrowRight" || e.code === "Space") {
            e.preventDefault();
            this.nextPhoto();
          } else if (e.code === "ArrowLeft") {
            e.preventDefault();
            this.prevPhoto();
          }
        }
      });
    },

    // ------------------------------------------------------------------------
    // SCREEN NAVIGATION & MAP PROGRESSION
    // ------------------------------------------------------------------------
    showScreen(screenId) {
      SoundEngine.sfxClick();
      this.stopPhotoAutoplayTimer();
      if (screenId !== "screen-level2") {
        this.runner.running = false;
      }

      document.querySelectorAll(".game-screen").forEach((sec) => {
        sec.classList.remove("active");
      });
      const target = document.getElementById(screenId);
      if (target) {
        target.classList.add("active");
      }

      this.updateMapUI();
      this.updateHUD();

      if (screenId === "screen-celebration") {
        this.renderFinalBouncyWall();
        ConfettiEngine.burst(110);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    startQuestFromTitle() {
      // Auto-enable 8-bit music on first start if not enabled yet
      if (!SoundEngine.musicEnabled) {
        SoundEngine.toggleMusic();
      }
      // Show an opening Bouncy Photo Interlude (Photos 1–6) before the Map!
      this.openPhotoInterlude(
        0,
        5,
        "screen-map",
        "📸 CHAPTER 0: BHONDHU & GHOCHUMAN!",
        "Look at these two cuties bouncing in from Left → Right & Right → Left!"
      );
    },

    updateMapUI() {
      const node1 = document.getElementById("map-node-1");
      const node2 = document.getElementById("map-node-2");
      const node3 = document.getElementById("map-node-3");
      const icon2 = document.getElementById("node-icon-2");
      const icon3 = document.getElementById("node-icon-3");
      const btn2 = document.getElementById("node-btn-2");
      const btn3 = document.getElementById("node-btn-3");
      const celBtn = document.getElementById("map-celebration-btn");

      if (node1) {
        node1.className = this.state.level1Done
          ? "level-node completed"
          : "level-node unlocked";
      }

      if (node2) {
        if (this.state.level2Done) {
          node2.className = "level-node completed";
          if (icon2) icon2.textContent = "💍";
          if (btn2) btn2.textContent = "REPLAY LEVEL 2 ▶";
        } else if (this.state.level1Done) {
          node2.className = "level-node unlocked";
          if (icon2) icon2.textContent = "💍";
          if (btn2) btn2.textContent = "PLAY LEVEL 2 ▶";
        } else {
          node2.className = "level-node locked";
          if (icon2) icon2.textContent = "🔒";
          if (btn2) btn2.textContent = "LOCKED 🔒";
        }
      }

      if (node3) {
        if (this.state.level3Done) {
          node3.className = "level-node completed";
          if (icon3) icon3.textContent = "👑";
          if (btn3) btn3.textContent = "REPLAY PROPOSAL ▶";
        } else if (this.state.level2Done) {
          node3.className = "level-node unlocked";
          if (icon3) icon3.textContent = "⚔️";
          if (btn3) btn3.textContent = "ENTER BOSS BATTLE ▶";
        } else {
          node3.className = "level-node locked";
          if (icon3) icon3.textContent = "🔒";
          if (btn3) btn3.textContent = "LOCKED 🔒";
        }
      }

      if (celBtn) {
        celBtn.style.display = this.state.level3Done ? "inline-flex" : "none";
      }
    },

    enterLevel(levelNum) {
      if (levelNum === 1) {
        this.initLevel1();
        this.showScreen("screen-level1");
      } else if (levelNum === 2) {
        if (!this.state.level1Done) {
          SoundEngine.sfxHit();
          return;
        }
        this.initLevel2Screen();
        this.showScreen("screen-level2");
      } else if (levelNum === 3) {
        if (!this.state.level2Done) {
          SoundEngine.sfxHit();
          return;
        }
        this.initLevel3Screen();
        this.showScreen("screen-level3");
      }
    },

    // ------------------------------------------------------------------------
    // 📸 BOUNCY PHOTO INTERLUDES & FULL 22-PHOTO SHOWCASE
    //    (Left-to-Right and Right-to-Left Bouncing Images + Texts!)
    // ------------------------------------------------------------------------
    openPhotoInterlude(startIdx, endIdx, nextScreen, heading, subheading) {
      const photos = window.GAME_CONFIG.PHOTO_MEMORIES;
      const safeStart = Math.max(0, Math.min(startIdx, photos.length - 1));
      const safeEnd = Math.max(safeStart, Math.min(endIdx, photos.length - 1));

      this.photoReel.startIndex = safeStart;
      this.photoReel.endIndex = safeEnd;
      this.photoReel.currentIndex = safeStart;
      this.photoReel.nextScreenAfter = nextScreen || "screen-map";
      this.photoReel.headingText = heading || "📸 BOUNCY MEMORY INTERLUDE";
      this.photoReel.subText =
        subheading ||
        "Watch our photos & texts bounce from Left → Right and Right → Left!";
      this.photoReel.autoplay = true;

      const hEl = document.getElementById("photo-reel-heading");
      const sEl = document.getElementById("photo-reel-subheading");
      if (hEl) hEl.textContent = this.photoReel.headingText;
      if (sEl) sEl.textContent = this.photoReel.subText;

      this.showScreen("screen-photos");
      this.renderCurrentBouncyPhoto();
      this.restartPhotoAutoplayTimer();
    },

    openMemoryShowreel(startIndex = 0, returnScreen = "screen-map") {
      const total = window.GAME_CONFIG.PHOTO_MEMORIES.length;
      this.openPhotoInterlude(
        startIndex,
        total - 1,
        returnScreen,
        "📸 ALL 22 BOUNCY MEMORIES THEATER",
        "Every photo & caption bounces Left ↔ Right! 💖"
      );
    },

    renderCurrentBouncyPhoto() {
      const photos = window.GAME_CONFIG.PHOTO_MEMORIES;
      if (!photos || photos.length === 0) return;

      const idx = this.photoReel.currentIndex;
      const item = photos[idx] || photos[0];

      // Determine direction: alternate cleanly or follow item.direction
      const isLTR = item.direction !== "right-to-left";

      const bannerEl = document.getElementById("between-photo-banner");
      const cardEl = document.getElementById("bouncy-photo-card");
      const textWrapEl = document.getElementById("bouncy-text-wrap");
      const stickerEl = document.getElementById("bouncy-photo-sticker");
      const numEl = document.getElementById("bouncy-photo-num");
      const imgEl = document.getElementById("bouncy-photo-img");
      const titleEl = document.getElementById("bouncy-photo-title");
      const capEl = document.getElementById("bouncy-photo-caption");
      const finishBtn = document.getElementById("btn-finish-interlude");

      // Update content
      if (bannerEl) {
        bannerEl.textContent =
          item.betweenText ||
          (isLTR
            ? "✨ Bouncing Left → Right! ✨"
            : "💖 Bouncing Right → Left! 💖");
      }
      if (stickerEl) stickerEl.textContent = item.sticker || "💖";
      if (numEl) {
        numEl.textContent = `PHOTO #${item.id} (${idx + 1}/${photos.length}) • ${
          isLTR ? "LEFT ➔ RIGHT" : "RIGHT ➔ LEFT"
        }`;
      }
      if (imgEl) {
        imgEl.src = item.file;
        imgEl.alt = item.title || `Photo ${item.id}`;
      }
      if (titleEl) titleEl.textContent = item.title || "";
      if (capEl) capEl.textContent = item.caption || "";

      if (finishBtn) {
        const remaining = this.photoReel.endIndex - idx;
        finishBtn.textContent =
          remaining <= 0
            ? "CONTINUE QUEST ▶"
            : `SKIP TO QUEST (${remaining} left) ▶`;
      }

      // Re-trigger bouncy CSS animations from Left->Right and Right->Left (and vice versa!)
      if (bannerEl && cardEl && textWrapEl) {
        bannerEl.classList.remove("bounce-ltr", "bounce-rtl");
        cardEl.classList.remove("anim-photo-ltr", "anim-photo-rtl");
        textWrapEl.classList.remove("anim-text-ltr", "anim-text-rtl");

        // Force reflow so browser replays the spring keyframes
        void cardEl.offsetWidth;

        if (isLTR) {
          // Photo springs in Left->Right while Text springs in Right->Left (vice versa!)
          bannerEl.classList.add("bounce-ltr");
          cardEl.classList.add("anim-photo-ltr");
          textWrapEl.classList.add("anim-text-rtl");
        } else {
          // Photo springs in Right->Left while Text springs in Left->Right (vice versa!)
          bannerEl.classList.add("bounce-rtl");
          cardEl.classList.add("anim-photo-rtl");
          textWrapEl.classList.add("anim-text-ltr");
        }
      }

      SoundEngine.sfxBounce(isLTR);
    },

    nextPhoto() {
      const photos = window.GAME_CONFIG.PHOTO_MEMORIES;
      if (this.photoReel.currentIndex < this.photoReel.endIndex) {
        this.photoReel.currentIndex++;
        this.renderCurrentBouncyPhoto();
        this.restartPhotoAutoplayTimer();
      } else if (this.photoReel.endIndex < photos.length - 1) {
        // Interlude segment finished -> proceed to next screen
        this.finishPhotoInterlude();
      } else {
        // Wrap around in full showreel mode
        this.photoReel.currentIndex = this.photoReel.startIndex;
        this.renderCurrentBouncyPhoto();
        this.restartPhotoAutoplayTimer();
      }
    },

    prevPhoto() {
      if (this.photoReel.currentIndex > this.photoReel.startIndex) {
        this.photoReel.currentIndex--;
      } else {
        this.photoReel.currentIndex = this.photoReel.endIndex;
      }
      this.renderCurrentBouncyPhoto();
      this.restartPhotoAutoplayTimer();
    },

    togglePhotoAutoplay() {
      this.photoReel.autoplay = !this.photoReel.autoplay;
      const btn = document.getElementById("btn-autoplay-photos");
      if (btn) {
        btn.textContent = this.photoReel.autoplay
          ? "⏸ AUTO-BOUNCE: ON"
          : "▶ AUTO-BOUNCE: PAUSED";
      }
      if (this.photoReel.autoplay) {
        this.restartPhotoAutoplayTimer();
      } else {
        this.stopPhotoAutoplayTimer();
      }
    },

    restartPhotoAutoplayTimer() {
      this.stopPhotoAutoplayTimer();
      const btn = document.getElementById("btn-autoplay-photos");
      if (btn) {
        btn.textContent = this.photoReel.autoplay
          ? "⏸ AUTO-BOUNCE: ON"
          : "▶ AUTO-BOUNCE: PAUSED";
      }
      if (!this.photoReel.autoplay) return;

      this.photoReel.timer = setInterval(() => {
        const activeScreen = document.querySelector(".game-screen.active");
        if (!activeScreen || activeScreen.id !== "screen-photos") {
          this.stopPhotoAutoplayTimer();
          return;
        }
        if (this.photoReel.currentIndex < this.photoReel.endIndex) {
          this.photoReel.currentIndex++;
          this.renderCurrentBouncyPhoto();
        } else {
          // Loop gently between startIndex and endIndex so she can enjoy the photos
          this.photoReel.currentIndex = this.photoReel.startIndex;
          this.renderCurrentBouncyPhoto();
        }
      }, 3800);
    },

    stopPhotoAutoplayTimer() {
      if (this.photoReel.timer) {
        clearInterval(this.photoReel.timer);
        this.photoReel.timer = null;
      }
    },

    finishPhotoInterlude() {
      this.stopPhotoAutoplayTimer();
      this.showScreen(this.photoReel.nextScreenAfter || "screen-map");
    },

    // ------------------------------------------------------------------------
    // 🥔 LEVEL 1: "HOW WE MET" (THE PRINGLES RPG DIALOGUE)
    // ------------------------------------------------------------------------
    initLevel1() {
      this.l1.index = 0;
      const completeBtn = document.getElementById("btn-l1-complete");
      if (completeBtn) {
        completeBtn.style.display = this.state.level1Done
          ? "inline-flex"
          : "none";
      }
      this.renderDialogueLine();
    },

    renderDialogueLine() {
      const lines = window.GAME_CONFIG.LEVEL_1_DIALOGUE;
      const item = lines[this.l1.index] || lines[0];

      const speakerEl = document.getElementById("l1-speaker-name");
      const avatarEl = document.getElementById("l1-speaker-avatar");
      const textEl = document.getElementById("l1-dialogue-text");
      const nextInd = document.getElementById("l1-next-indicator");
      const charBhondhu = document.getElementById("l1-char-bhondhu");
      const charGhochu = document.getElementById("l1-char-ghochuman");

      if (speakerEl) {
        speakerEl.textContent = `${item.speaker.toUpperCase()} (${
          this.l1.index + 1
        }/${lines.length})`;
      }
      if (avatarEl) {
        avatarEl.src = item.avatar;
      }

      // Highlight speaking character sprite
      if (charBhondhu && charGhochu) {
        charBhondhu.classList.toggle(
          "speaking",
          item.speaker.toLowerCase().includes("bhondhu")
        );
        charGhochu.classList.toggle(
          "speaking",
          item.speaker.toLowerCase().includes("ghochuman")
        );
      }

      if (this.l1.typeTimer) {
        clearInterval(this.l1.typeTimer);
        this.l1.typeTimer = null;
      }

      this.l1.currentFullText = item.text;
      this.l1.typing = true;
      if (textEl) textEl.textContent = "";
      if (nextInd) nextInd.textContent = "⏳ TYPING...";

      let charIdx = 0;
      this.l1.typeTimer = setInterval(() => {
        if (!textEl) return;
        charIdx++;
        textEl.textContent = this.l1.currentFullText.slice(0, charIdx);
        if (charIdx % 3 === 0) {
          SoundEngine.sfxTypewriter();
        }
        if (charIdx >= this.l1.currentFullText.length) {
          this.finishTypingCurrentLine();
        }
      }, 24);
    },

    finishTypingCurrentLine() {
      if (this.l1.typeTimer) {
        clearInterval(this.l1.typeTimer);
        this.l1.typeTimer = null;
      }
      this.l1.typing = false;
      const textEl = document.getElementById("l1-dialogue-text");
      const nextInd = document.getElementById("l1-next-indicator");
      const lines = window.GAME_CONFIG.LEVEL_1_DIALOGUE;

      if (textEl) textEl.textContent = this.l1.currentFullText;

      if (this.l1.index >= lines.length - 1) {
        if (nextInd) nextInd.textContent = "✨ STORY COMPLETE! ✨";
        this.state.level1Done = true;
        this.saveProgress();
        this.updateMapUI();
        const completeBtn = document.getElementById("btn-l1-complete");
        if (completeBtn) {
          completeBtn.style.display = "inline-flex";
        }
      } else {
        if (nextInd) nextInd.textContent = "▼ TAP / SPACE FOR NEXT";
      }
    },

    advanceDialogue() {
      if (this.l1.typing) {
        this.finishTypingCurrentLine();
        return;
      }
      const lines = window.GAME_CONFIG.LEVEL_1_DIALOGUE;
      if (this.l1.index < lines.length - 1) {
        SoundEngine.sfxClick();
        this.l1.index++;
        this.renderDialogueLine();
      } else {
        this.completeLevel1();
      }
    },

    crunchPringle() {
      SoundEngine.sfxCrunch();
      ConfettiEngine.burst(35);
    },

    completeLevel1() {
      this.state.level1Done = true;
      this.saveProgress();
      this.updateMapUI();
      // Play Bouncy Photo Interlude #2 (Photos 7 to 14) before Level 2!
      this.openPhotoInterlude(
        6,
        13,
        "screen-map",
        "📸 LEVEL 1 CLEAR! BOUNCY MEMORIES (PART 2)",
        "From sharing Pringles to Avengers, rooftops & bike rides — watch them bounce!"
      );
    },

    // ------------------------------------------------------------------------
    // 💍 LEVEL 2: "CATCH THE RING" (SIDE-SCROLLING ENDLESS RUNNER)
    // ------------------------------------------------------------------------
    initLevel2Screen() {
      this.runner.canvas = document.getElementById("runner-canvas");
      if (!this.runner.canvas) return;
      this.runner.ctx = this.runner.canvas.getContext("2d");
      this.runner.running = false;

      // Initialize parallax background stars
      this.runner.stars = [];
      for (let i = 0; i < 36; i++) {
        this.runner.stars.push({
          x: Math.random() * 800,
          y: Math.random() * 210,
          size: 2 + Math.floor(Math.random() * 3),
          speed: 0.4 + Math.random() * 1.1
        });
      }

      const overlay = document.getElementById("runner-overlay");
      const title = document.getElementById("runner-overlay-title");
      const desc = document.getElementById("runner-overlay-desc");
      const actionBtn = document.getElementById("runner-action-btn");
      const winBtn = document.getElementById("runner-win-btn");

      if (overlay) overlay.classList.remove("hidden");
      if (title) title.textContent = "💍 READY TO CATCH THE RING?";
      if (desc) {
        desc.textContent =
          "Help Bhondhu jump over spiky thorns, grab crispy Pringles & hearts, and catch the sparkling ring at 100% distance!";
      }
      if (actionBtn) {
        actionBtn.style.display = "inline-flex";
        actionBtn.textContent = "▶ START RUNNER";
      }
      if (winBtn) {
        winBtn.style.display = this.state.level2Done ? "inline-flex" : "none";
      }

      // Tap directly on canvas to jump
      this.runner.canvas.onclick = () => {
        if (this.runner.running) this.runnerJump();
      };
      this.runner.canvas.ontouchstart = (e) => {
        if (this.runner.running) {
          e.preventDefault();
          this.runnerJump();
        }
      };

      this.drawRunnerIdleFrame();
    },

    startRunner() {
      SoundEngine.sfxClick();
      const overlay = document.getElementById("runner-overlay");
      if (overlay) overlay.classList.add("hidden");

      this.runner.running = true;
      this.runner.lives = 3;
      this.runner.score = 0;
      this.runner.distance = 0;
      this.runner.obstacles = [];
      this.runner.collectibles = [];
      this.runner.ringObj = null;
      this.runner.spawnTimer = 50;
      this.runner.itemTimer = 35;

      this.runner.player.y = this.runner.player.groundY;
      this.runner.player.vy = 0;
      this.runner.player.jumping = false;
      this.runner.player.invincibleTimer = 0;

      this.updateRunnerHUD();
      if (this.runner.animId) cancelAnimationFrame(this.runner.animId);
      this.runnerLoop();
    },

    runnerJump() {
      if (!this.runner.running) return;
      const p = this.runner.player;
      if (!p.jumping) {
        p.vy = -13.2;
        p.jumping = true;
        SoundEngine.sfxJump();
      }
    },

    updateRunnerHUD() {
      const livesEl = document.getElementById("runner-lives");
      const scoreEl = document.getElementById("runner-score");
      const progEl = document.getElementById("runner-progress");

      if (livesEl) {
        livesEl.textContent =
          "❤️".repeat(Math.max(0, this.runner.lives)) +
          "🖤".repeat(Math.max(0, 3 - this.runner.lives));
      }
      if (scoreEl) scoreEl.textContent = String(this.runner.score);
      if (progEl) {
        const pct = Math.min(
          100,
          Math.floor((this.runner.distance / this.runner.maxDistance) * 100)
        );
        progEl.textContent = `${pct}%`;
      }
    },

    runnerLoop() {
      if (!this.runner.running) return;

      const ctx = this.runner.ctx;
      const canvas = this.runner.canvas;
      const p = this.runner.player;

      // 1. Update progress
      this.runner.distance += 2.2;
      if (p.invincibleTimer > 0) p.invincibleTimer--;

      // 2. Player physics
      p.y += p.vy;
      p.vy += 0.68; // gravity
      if (p.y >= p.groundY) {
        p.y = p.groundY;
        p.vy = 0;
        p.jumping = false;
      }

      // 3. Spawn obstacles (until 90% distance so the ring is clear to catch)
      const pct = this.runner.distance / this.runner.maxDistance;
      this.runner.spawnTimer--;
      if (this.runner.spawnTimer <= 0 && pct < 0.88) {
        this.runner.obstacles.push({
          x: 820,
          y: 252,
          w: 34,
          h: 36,
          label: Math.random() > 0.5 ? "🌵" : "🪨"
        });
        this.runner.spawnTimer = 68 + Math.floor(Math.random() * 55);
      }

      // 4. Spawn collectible Pringles & Hearts
      this.runner.itemTimer--;
      if (this.runner.itemTimer <= 0 && pct < 0.92) {
        const isPringles = Math.random() > 0.45;
        this.runner.collectibles.push({
          x: 820,
          y: 135 + Math.floor(Math.random() * 85),
          w: 34,
          h: 34,
          type: isPringles ? "pringles" : "heart"
        });
        this.runner.itemTimer = 45 + Math.floor(Math.random() * 40);
      }

      // 5. Spawn the Sparkling Ring at 92% distance!
      if (pct >= 0.92 && !this.runner.ringObj) {
        this.runner.ringObj = {
          x: 820,
          y: 165,
          w: 58,
          h: 58
        };
      }

      // 6. Move & collide obstacles
      for (let i = this.runner.obstacles.length - 1; i >= 0; i--) {
        const obs = this.runner.obstacles[i];
        obs.x -= 6.2;

        // AABB collision with generous hitbox
        if (
          p.invincibleTimer <= 0 &&
          p.x + 12 < obs.x + obs.w - 6 &&
          p.x + p.w - 12 > obs.x + 6 &&
          p.y + 12 < obs.y + obs.h &&
          p.y + p.h - 6 > obs.y + 6
        ) {
          this.runner.lives--;
          p.invincibleTimer = 45;
          SoundEngine.sfxHit();
          this.runner.obstacles.splice(i, 1);
          this.updateRunnerHUD();

          if (this.runner.lives <= 0) {
            this.handleRunnerGameOver();
            return;
          }
          continue;
        }

        if (obs.x < -60) {
          this.runner.obstacles.splice(i, 1);
          this.runner.score += 10;
        }
      }

      // 7. Move & collect Pringles / Hearts
      for (let i = this.runner.collectibles.length - 1; i >= 0; i--) {
        const item = this.runner.collectibles[i];
        item.x -= 6.0;

        if (
          p.x < item.x + item.w &&
          p.x + p.w > item.x &&
          p.y < item.y + item.h &&
          p.y + p.h > item.y
        ) {
          this.runner.score += item.type === "pringles" ? 50 : 30;
          SoundEngine.sfxCrunch();
          this.runner.collectibles.splice(i, 1);
          continue;
        }

        if (item.x < -50) {
          this.runner.collectibles.splice(i, 1);
        }
      }

      // 8. Move & catch the Ring!
      if (this.runner.ringObj) {
        const r = this.runner.ringObj;
        r.x -= 5.2;
        // Bob up and down gently
        r.y = 165 + Math.sin(this.runner.distance * 0.08) * 18;

        // Check catch or automatic catch when reaching player X
        if (
          (p.x < r.x + r.w &&
            p.x + p.w > r.x &&
            p.y < r.y + r.h &&
            p.y + p.h > r.y) ||
          r.x <= p.x + 10
        ) {
          this.handleRunnerVictory();
          return;
        }
      }

      this.updateRunnerHUD();
      this.drawRunnerScene(ctx, canvas);

      this.runner.animId = requestAnimationFrame(() => this.runnerLoop());
    },

    drawRunnerScene(ctx, canvas) {
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, "#120724");
      grad.addColorStop(0.7, "#2a124c");
      grad.addColorStop(1, "#3b1963");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Twinkling stars
      ctx.fillStyle = "#fff3d6";
      this.runner.stars.forEach((s) => {
        s.x -= s.speed;
        if (s.x < 0) s.x = canvas.width;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });

      // Distant pixel hills
      ctx.fillStyle = "#24103e";
      for (let hx = 0; hx < canvas.width + 160; hx += 160) {
        const offset = (this.runner.distance * 0.8) % 160;
        ctx.beginPath();
        ctx.arc(hx - offset, 288, 95, Math.PI, 0);
        ctx.fill();
      }

      // Pixel ground & grass strip
      ctx.fillStyle = "#52c41a";
      ctx.fillRect(0, 286, canvas.width, 8);
      ctx.fillStyle = "#3a1f3d";
      ctx.fillRect(0, 294, canvas.width, 46);

      // Moving ground pixel dashes
      ctx.fillStyle = "#613466";
      const dashOffset = (this.runner.distance * 4) % 48;
      for (let gx = -dashOffset; gx < canvas.width; gx += 48) {
        ctx.fillRect(gx, 308, 22, 6);
      }

      // Draw Collectibles (Pringles & Hearts)
      this.runner.collectibles.forEach((item) => {
        if (
          item.type === "pringles" &&
          this.runner.sprites.pringles &&
          this.runner.sprites.pringles.complete
        ) {
          ctx.drawImage(
            this.runner.sprites.pringles,
            item.x,
            item.y,
            item.w,
            item.h
          );
        } else {
          ctx.font = "24px sans-serif";
          ctx.fillText(
            item.type === "pringles" ? "🥔" : "💖",
            item.x,
            item.y + 26
          );
        }
      });

      // Draw Obstacles
      this.runner.obstacles.forEach((obs) => {
        ctx.font = "30px sans-serif";
        ctx.fillText(obs.label, obs.x, obs.y + 30);
      });

      // Draw Sparkling Ring at the end
      if (this.runner.ringObj) {
        const r = this.runner.ringObj;
        // Golden aura glow
        ctx.save();
        ctx.strokeStyle = "#ffd666";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (
          this.runner.sprites.ring &&
          this.runner.sprites.ring.complete
        ) {
          ctx.drawImage(this.runner.sprites.ring, r.x, r.y, r.w, r.h);
        } else {
          ctx.font = "40px sans-serif";
          ctx.fillText("💍", r.x, r.y + 42);
        }
      }

      // Draw Player (Bhondhu Sprite with running bob)
      const p = this.runner.player;
      if (p.invincibleTimer % 4 < 2) {
        const runBob = p.jumping
          ? 0
          : Math.sin(this.runner.distance * 0.35) * 4;
        if (
          this.runner.sprites.bhondhu &&
          this.runner.sprites.bhondhu.complete
        ) {
          ctx.drawImage(
            this.runner.sprites.bhondhu,
            p.x,
            p.y + runBob,
            p.w,
            p.h
          );
        } else {
          ctx.fillStyle = "#ffd666";
          ctx.fillRect(p.x, p.y, p.w, p.h);
        }
      }
    },

    drawRunnerIdleFrame() {
      if (!this.runner.ctx || !this.runner.canvas) return;
      this.drawRunnerScene(this.runner.ctx, this.runner.canvas);
    },

    handleRunnerGameOver() {
      this.runner.running = false;
      const overlay = document.getElementById("runner-overlay");
      const title = document.getElementById("runner-overlay-title");
      const desc = document.getElementById("runner-overlay-desc");
      const actionBtn = document.getElementById("runner-action-btn");

      if (overlay) overlay.classList.remove("hidden");
      if (title) title.textContent = "💥 OOPS! THORNS GOT BHONDHU!";
      if (desc) {
        desc.textContent =
          "Don't worry! True love (and Pringles energy) never gives up. Tap Try Again to catch Ghochuman's ring!";
      }
      if (actionBtn) {
        actionBtn.style.display = "inline-flex";
        actionBtn.textContent = "🔁 TRY AGAIN";
      }
    },

    handleRunnerVictory() {
      this.runner.running = false;
      this.runner.distance = this.runner.maxDistance;
      this.runner.score += 500;
      this.updateRunnerHUD();

      this.state.level2Done = true;
      this.saveProgress();
      this.updateMapUI();

      SoundEngine.sfxRing();
      ConfettiEngine.burst(100);

      const overlay = document.getElementById("runner-overlay");
      const title = document.getElementById("runner-overlay-title");
      const desc = document.getElementById("runner-overlay-desc");
      const actionBtn = document.getElementById("runner-action-btn");
      const winBtn = document.getElementById("runner-win-btn");

      if (overlay) overlay.classList.remove("hidden");
      if (title) title.textContent = "💍 RING CAUGHT!! LEVEL 2 COMPLETE! 🎉";
      if (desc) {
        desc.textContent =
          "Bhondhu caught the sparkling ring for Ghochuman! Ready for more bouncy memories and the Final Boss Proposal?";
      }
      if (actionBtn) {
        actionBtn.textContent = "🔁 PLAY AGAIN";
      }
      if (winBtn) {
        winBtn.style.display = "inline-flex";
      }
    },

    stopRunnerAndMap() {
      this.runner.running = false;
      if (this.runner.animId) cancelAnimationFrame(this.runner.animId);
      this.showScreen("screen-map");
    },

    completeLevel2() {
      this.state.level2Done = true;
      this.saveProgress();
      this.updateMapUI();
      // Play Bouncy Photo Interlude #3 (Photos 15 to 22) before Level 3!
      this.openPhotoInterlude(
        14,
        window.GAME_CONFIG.PHOTO_MEMORIES.length - 1,
        "screen-map",
        "📸 LEVEL 2 CLEAR! BOUNCY MEMORIES (PART 3)",
        "Galleria naps, late-night Google Meets & mountain hugs — now onto the Final Boss!"
      );
    },

    // ------------------------------------------------------------------------
    // ⚔️ LEVEL 3: "THE PROPOSAL" JRPG BOSS BATTLE + PRANK "NO" BUTTON
    // ------------------------------------------------------------------------
    initLevel3Screen() {
      this.boss.dodgeCount = 0;
      const gotchaModal = document.getElementById("gotcha-modal");
      if (gotchaModal) gotchaModal.classList.add("hidden");

      const noBtn = document.getElementById("btn-no-prank");
      if (noBtn) {
        noBtn.textContent = "No";
        noBtn.style.position = "relative";
        noBtn.style.left = "auto";
        noBtn.style.top = "auto";
        noBtn.classList.remove("gold-btn");
        noBtn.classList.add("secondary");
      }

      const tauntEl = document.getElementById("boss-taunt-text");
      if (tauntEl) {
        tauntEl.textContent = '"Try clicking NO... I dare you! 😏"';
      }
    },

    dodgeNoButton(event) {
      const noBtn = document.getElementById("btn-no-prank");
      const wrap = document.getElementById("boss-menu-zone");
      if (!noBtn || !wrap) return;

      // After 6 dodges, let her click it if she really tries — because clicking NO turns into YES anyway!
      if (this.boss.dodgeCount >= 6) {
        const tauntEl = document.getElementById("boss-taunt-text");
        if (tauntEl) {
          tauntEl.textContent =
            '"Okay fine, go ahead and click NO... see what happens! 😆💍"';
        }
        return;
      }

      if (event && event.type === "touchstart") {
        event.preventDefault();
      }

      this.boss.dodgeCount++;
      SoundEngine.sfxDodge();

      const wrapRect = wrap.getBoundingClientRect();
      const maxX = Math.max(20, wrapRect.width - 120);
      const maxY = Math.max(10, wrapRect.height - 52);

      const randX = Math.floor(Math.random() * maxX);
      const randY = Math.floor(Math.random() * maxY);

      noBtn.style.position = "absolute";
      noBtn.style.left = `${randX}px`;
      noBtn.style.top = `${randY}px`;
      noBtn.style.zIndex = "35";

      const tauntEl = document.getElementById("boss-taunt-text");
      if (tauntEl) {
        const msg =
          this.boss.taunts[
            (this.boss.dodgeCount - 1) % this.boss.taunts.length
          ];
        tauntEl.textContent = msg;
      }
    },

    clickNoPrank(event) {
      if (event) event.preventDefault();
      const noBtn = document.getElementById("btn-no-prank");
      if (noBtn) {
        // Turn the NO button into a giant YES!
        noBtn.textContent = "YES 💍 (No = YES!)";
        noBtn.classList.remove("secondary");
        noBtn.classList.add("gold-btn");
      }
      this.triggerProposalWin("no-prank");
    },

    triggerProposalWin(mode) {
      this.state.level3Done = true;
      this.saveProgress();
      this.updateMapUI();

      SoundEngine.sfxVictory();
      ConfettiEngine.burst(180);

      const gotchaModal = document.getElementById("gotcha-modal");
      const headline = document.getElementById("gotcha-headline");
      const subtext = document.getElementById("gotcha-subtext");

      if (headline) {
        headline.textContent =
          "GOT YOUUU 😆 WE'RE GETTING MARRIED! 💍💖";
      }
      if (subtext) {
        if (mode === "no-prank") {
          subtext.textContent =
            'You clicked "No"?! Plot twist: In Bhondhu\'s game, "No" is programmed to mean "1000% YES"! 😂💍 Happy 27 September Birthday, my Ghochuman!';
        } else {
          subtext.textContent =
            "SHE SAID YES!! Best 27 September Birthday ever! From sharing Pringles to forever together with my Ghochuman! 🎂💖";
        }
      }

      if (gotchaModal) {
        gotchaModal.classList.remove("hidden");
      }
    },

    goToFinalCelebration() {
      const gotchaModal = document.getElementById("gotcha-modal");
      if (gotchaModal) gotchaModal.classList.add("hidden");
      this.showScreen("screen-celebration");
    },

    // ------------------------------------------------------------------------
    // 🏆 5 SECRET ACHIEVEMENTS SYSTEM
    // ------------------------------------------------------------------------
    unlockSecret(secretId) {
      const secrets = window.GAME_CONFIG.SECRET_MESSAGES;
      const secret = secrets.find((s) => s.id === secretId);
      if (!secret) return;

      const isNew = !this.state.secretsFound.includes(secretId);
      if (isNew) {
        this.state.secretsFound.push(secretId);
        this.saveProgress();
      }

      SoundEngine.sfxAchievement();
      ConfettiEngine.burst(75);
      this.updateHUD();

      const modal = document.getElementById("secret-modal");
      const content = document.getElementById("secret-modal-content");
      if (!modal || !content) return;

      const allFound = this.state.secretsFound.length >= secrets.length;

      content.innerHTML = `
        <div style="font-size: 11px; color: var(--pastel-mint); margin-bottom: 6px;">
          ${isNew ? "✨ SECRET ACHIEVEMENT UNLOCKED! ✨" : "🏆 SECRET MEMORY VIEWER 🏆"}
        </div>
        <h3 style="font-size: 14px; color: var(--pastel-gold); margin-bottom: 10px;">
          ${secret.icon} ${secret.badgeTitle}
        </h3>
        <div style="background: #fff9f2; padding: 10px 10px 14px; border: 4px solid #000; display: inline-block; max-width: 320px;">
          <img src="${secret.photo}" alt="${secret.badgeTitle}" style="width: 100%; max-height: 260px; object-fit: cover; border: 2px solid #221036;" />
        </div>
        <p style="font-family: var(--font-retro); font-size: 24px; color: var(--pastel-cream); margin-top: 12px; line-height: 1.3;">
          "${secret.message}"
        </p>
        <div style="font-size: 10px; color: var(--pastel-rose); margin-top: 8px;">
          Secrets Found: ${this.state.secretsFound.length} / ${secrets.length}
          ${allFound ? "<br/><span style='color: var(--pastel-mint);'>🎉 You found every secret ❤️</span>" : ""}
        </div>
      `;

      modal.classList.remove("hidden");
    },

    openSecretsGallery() {
      SoundEngine.sfxClick();
      const secrets = window.GAME_CONFIG.SECRET_MESSAGES;
      const modal = document.getElementById("secret-modal");
      const content = document.getElementById("secret-modal-content");
      if (!modal || !content) return;

      const cardsHtml = secrets
        .map((s) => {
          const found = this.state.secretsFound.includes(s.id);
          if (found) {
            return `
              <div style="background: rgba(20, 8, 36, 0.9); border: 3px solid var(--pastel-mint); padding: 10px; display: flex; gap: 12px; align-items: center; text-align: left;">
                <img src="${s.photo}" alt="${s.badgeTitle}" style="width: 68px; height: 68px; object-fit: cover; border: 2px solid var(--pastel-gold); flex-shrink: 0;" />
                <div>
                  <div style="font-size: 10px; color: var(--pastel-gold);">${s.icon} ${s.badgeTitle}</div>
                  <div style="font-family: var(--font-retro); font-size: 20px; color: var(--pastel-cream); margin-top: 4px;">
                    "${s.message}"
                  </div>
                </div>
              </div>
            `;
          } else {
            return `
              <div style="background: rgba(20, 8, 36, 0.6); border: 3px dashed #6e568a; padding: 10px; display: flex; justify-content: space-between; align-items: center; text-align: left;">
                <div>
                  <div style="font-size: 10px; color: #9c88b8;">🔒 Secret #${s.id} (Hidden on ${s.screenHint})</div>
                  <div style="font-family: var(--font-retro); font-size: 19px; color: #b7a2cf; margin-top: 4px;">
                    Tap the glowing ${s.icon} badge in the corner of the ${s.screenHint}, or unlock right here!
                  </div>
                </div>
                <button class="pixel-btn small-btn" onclick="Game.unlockSecret(${s.id})">
                  Reveal ${s.icon}
                </button>
              </div>
            `;
          }
        })
        .join("");

      content.innerHTML = `
        <h3 style="font-size: 13px; color: var(--pastel-gold); margin-bottom: 6px;">
          🏆 BHONDHU &amp; GHOCHUMAN'S 5 SECRET MESSAGES (${this.state.secretsFound.length}/5)
        </h3>
        <p style="font-family: var(--font-retro); font-size: 20px; color: var(--pastel-rose); margin-bottom: 10px;">
          Find the 5 glowing badges across the screens — or tap Reveal below!
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 56vh; overflow-y: auto; padding-right: 4px;">
          ${cardsHtml}
        </div>
      `;

      modal.classList.remove("hidden");
    },

    closeSecretModal() {
      SoundEngine.sfxClick();
      const modal = document.getElementById("secret-modal");
      if (modal) modal.classList.add("hidden");
    },

    updateHUD() {
      const totalSecrets = window.GAME_CONFIG.SECRET_MESSAGES.length;
      const foundCount = this.state.secretsFound.length;

      const countEl = document.getElementById("secret-count-text");
      if (countEl) {
        countEl.textContent = `${foundCount}/${totalSecrets}`;
      }

      // Update corner badge styling
      for (let i = 1; i <= totalSecrets; i++) {
        const badgeBtn = document.getElementById(`badge-btn-${i}`);
        if (badgeBtn) {
          badgeBtn.classList.toggle(
            "found",
            this.state.secretsFound.includes(i)
          );
        }
      }

      // Show "You found every secret ❤️" banner on final screen when 5/5 found
      const allBanner = document.getElementById("all-secrets-banner");
      if (allBanner) {
        allBanner.style.display =
          foundCount >= totalSecrets ? "block" : "none";
      }
    },

    // ------------------------------------------------------------------------
    // 🎉 FINAL CELEBRATION BOUNCY 22-PHOTO WALL
    // ------------------------------------------------------------------------
    renderFinalBouncyWall() {
      const wall = document.getElementById("final-bouncy-wall");
      if (!wall) return;

      const photos = window.GAME_CONFIG.PHOTO_MEMORIES;
      wall.innerHTML = photos
        .map((item, idx) => {
          const isLTR = item.direction !== "right-to-left";
          const dirClass = isLTR ? "dir-ltr" : "dir-rtl";
          const textBounceClass = isLTR ? "bounce-ltr" : "bounce-rtl";
          const dirBadge = isLTR ? "⬅️➔➡️ L-to-R" : "➡️⬅️ R-to-L";

          return `
            <div class="wall-card ${dirClass}" onclick="Game.openMemoryShowreel(${idx}, 'screen-celebration')" style="cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="background: #221036; color: var(--pastel-gold); font-size: 8px; padding: 3px 6px;">
                  #${idx + 1} (IMG ${item.id}.jpg)
                </span>
                <span style="font-size: 9px; color: #7a2048; font-family: var(--font-retro); font-weight: bold;">
                  ${item.sticker || "💖"} ${dirBadge}
                </span>
              </div>
              <img src="${item.file}" alt="${item.title}" loading="lazy" />
              <div class="wall-card-text">
                <div style="font-size: 9px; color: #d41c5c; margin-bottom: 4px;">
                  ${item.betweenText || ""}
                </div>
                <h4 class="${textBounceClass}">${item.title}</h4>
                <p>${item.caption}</p>
              </div>
            </div>
          `;
        })
        .join("");
    },

    // ------------------------------------------------------------------------
    // 🔁 PLAY AGAIN / FULL QUEST RESET
    // ------------------------------------------------------------------------
    resetAndPlayAgain() {
      SoundEngine.sfxClick();
      this.state.level1Done = false;
      this.state.level2Done = false;
      this.state.level3Done = false;
      this.saveProgress();
      this.updateMapUI();
      this.showScreen("screen-title");
    },

    toggleMusic() {
      SoundEngine.toggleMusic();
    }
  };

  // Expose globally for inline HTML handlers
  window.Game = Game;

  window.addEventListener("DOMContentLoaded", () => {
    Game.init();
  });
})();
