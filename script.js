// =========
// THEME TOGGLE
// =========

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");

  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  let currentTheme = storedTheme || (prefersDark ? "dark" : "light");
  root.setAttribute("data-theme", currentTheme);

  const updateThemeToggleLabel = () => {
    if (!themeToggle) return;
    themeToggle.textContent = currentTheme === "dark" ? "☀️" : "🌙";
    themeToggle.setAttribute(
      "aria-label",
      `Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`
    );
  };

  updateThemeToggleLabel();

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", currentTheme);
      localStorage.setItem("theme", currentTheme);
      updateThemeToggleLabel();
    });
  }

  // =========
  // SECTION FADE-IN
  // =========

  const sections = document.querySelectorAll(".section");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.2 }
  );

  sections.forEach((section) => observer.observe(section));

  // =========
  // MINI ORBIT CANVAS (HERO)
  // =========

  const miniCanvas = document.getElementById("mini-orbit");
  if (miniCanvas && miniCanvas.getContext) {
    const ctx = miniCanvas.getContext("2d");
    const resizeMini = () => {
      const width = miniCanvas.clientWidth || 140;
      miniCanvas.width = width;
      miniCanvas.height = width;
    };
    resizeMini();
    window.addEventListener("resize", resizeMini);

    let angle = 0;
    const radius = 35;

    const drawMini = () => {
      const { width, height } = miniCanvas;
      ctx.clearRect(0, 0, width, height);

      // orbit circle
      ctx.beginPath();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = 1;
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();

      // moving dot
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.fillStyle = "#f97316";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(249, 115, 22, 0.9)";
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      angle += 0.015;
      requestAnimationFrame(drawMini);
    };

    drawMini();
  }

  // =========
  // BILLIARD DEMO
  // =========

  const canvas = document.getElementById("billiard-canvas");
  const roughnessSlider = document.getElementById("roughness");
  const roughnessValue = document.getElementById("roughness-value");
  const toggleBtn = document.getElementById("billiard-toggle");
  const resetBtn = document.getElementById("billiard-reset");

  let ctx;
  let ball;
  let running = false;
  let lastTime = null;

  const billiard = {
    width: 1,
    height: 0.6
  };

  const initCanvasSize = () => {
    if (!canvas) return;
    const parentWidth = canvas.parentElement
      ? canvas.parentElement.clientWidth
      : 480;
    const width = Math.min(parentWidth, 520);
    const height = width * billiard.height;
    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext("2d");
    clearCanvas();
    resetBall();
  };

  const clearCanvas = () => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 0.5;
    const step = 30;
    for (let x = step; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = step; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  const resetBall = () => {
    if (!canvas) return;
    ball = {
      x: canvas.width * 0.25 + Math.random() * canvas.width * 0.5,
      y: canvas.height * 0.3 + Math.random() * canvas.height * 0.4,
      vx: (Math.random() * 2 - 1) * 140,
      vy: (Math.random() * 2 - 1) * 140
    };
    lastTime = null;
    clearCanvas();
  };

  const drawBallStep = (dt, roughness) => {
    if (!ctx || !canvas || !ball) return;
    const { width, height } = canvas;
    const oldX = ball.x;
    const oldY = ball.y;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    let collided = false;

    if (ball.x <= 5 || ball.x >= width - 5) {
      ball.vx *= -1;
      collided = true;
      ball.x = Math.max(5, Math.min(width - 5, ball.x));
    }
    if (ball.y <= 5 || ball.y >= height - 5) {
      ball.vy *= -1;
      collided = true;
      ball.y = Math.max(5, Math.min(height - 5, ball.y));
    }

    if (collided && roughness > 0) {
      const maxJitter = 0.3; // radians
      const jitter =
        (Math.random() * 2 - 1) * maxJitter * roughness;
      const speed = Math.hypot(ball.vx, ball.vy) || 140;
      const angle = Math.atan2(ball.vy, ball.vx) + jitter;
      ball.vx = speed * Math.cos(angle);
      ball.vy = speed * Math.sin(angle);
    }

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 1.2;
    ctx.moveTo(oldX, oldY);
    ctx.lineTo(ball.x, ball.y);
    ctx.stroke();
    ctx.restore();
  };

  const animate = (timestamp) => {
    if (!running) return;
    if (!lastTime) lastTime = timestamp;

    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const roughness = roughnessSlider
      ? parseFloat(roughnessSlider.value)
      : 0;

    drawBallStep(Math.min(delta, 0.03), roughness);
    requestAnimationFrame(animate);
  };

  if (canvas) {
    initCanvasSize();
    window.addEventListener("resize", initCanvasSize);
  }

  if (roughnessSlider && roughnessValue) {
    roughnessValue.textContent = Number(roughnessSlider.value).toFixed(2);
    roughnessSlider.addEventListener("input", () => {
      roughnessValue.textContent = Number(roughnessSlider.value).toFixed(2);
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      running = !running;
      toggleBtn.textContent = running ? "❚❚ Pause" : "▶ Start";
      if (running) {
        lastTime = null;
        requestAnimationFrame(animate);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetBall();
    });
  }

  // =========
  // PATH SELECTOR
  // =========

  const pathButtons = document.querySelectorAll(".path-btn");
  const pathOutput = document.getElementById("path-output");

  const pathTexts = {
    math: `
<strong>Math brain 🧮</strong><br/>
• Take / review real analysis, linear algebra, and differential geometry.<br/>
• Learn basic dynamical systems: fixed points, stability, Lyapunov exponents.<br/>
• Work on the <em>theory</em>: monodromy matrices, curvature, and new results for non-standard billiards.<br/>
• You can contribute proofs, examples, and clean write-ups that make the physics side stronger.
`,
    cs: `
<strong>Coder 🧑‍💻</strong><br/>
• Learn a bit of linear algebra and basic quantum gates.<br/>
• Help build simulation tools for billiards and simple ion-trap models (Python, C++, or web).<br/>
• Build visualizations and interactive demos (like this site, but more serious).<br/>
• You can make the math & physics <em>actually usable</em> by other people.
`,
    physics: `
<strong>Physics / ECE ⚡</strong><br/>
• Take quantum mechanics + an intro quantum computing or AMO course.<br/>
• Learn about trapped-ion architectures and noise sources (heating, dephasing).<br/>
• Help translate geometric insights into concrete design rules for traps and control electronics.<br/>
• You can bridge between abstract models and what experimentalists actually see.
`,
    curious: `
<strong>Just curious 👀</strong><br/>
• Start with the quantum + chaos resources below.<br/>
• Try coding a basic billiard or quantum circuit simulator following tutorials.<br/>
• Join a reading group, club, or online community focused on quantum or dynamical systems.<br/>
• Curiosity is literally the main requirement — the rest is learnable.
`
  };

  if (pathButtons && pathOutput) {
    pathButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.path;
        const html = pathTexts[key] || "";
        if (html) {
          pathOutput.innerHTML = `<p class="muted">${html}</p>`;
        }
      });
    });
  }

  // =========
  // QUIZ REVEAL
  // =========

  const quizCards = document.querySelectorAll(".quiz-card");
  quizCards.forEach((card) => {
    const btn = card.querySelector(".reveal-answer");
    const ans = card.querySelector(".quiz-answer");
    if (!btn || !ans) return;

    btn.addEventListener("click", () => {
      const isVisible = ans.classList.toggle("visible");
      btn.textContent = isVisible ? "Hide answer" : "Show answer";
    });
  });
});
