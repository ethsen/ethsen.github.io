function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

function drawFunction(canvas, a) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Plot bounds
  const xmin = -3, xmax = 3;
  const ymin = -3, ymax = 3;

  const xToPx = x => (x - xmin) / (xmax - xmin) * W;
  const yToPx = y => (1 - (y - ymin) / (ymax - ymin)) * H;

  // Axes
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(xToPx(xmin), yToPx(0));
  ctx.lineTo(xToPx(xmax), yToPx(0));
  ctx.moveTo(xToPx(0), yToPx(ymin));
  ctx.lineTo(xToPx(0), yToPx(ymax));
  ctx.stroke();

  // f(x) = a*sin(x) + 0.4*x
  ctx.strokeStyle = "rgba(139,211,255,0.85)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  const N = 600;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = xmin + t * (xmax - xmin);
    const y = a * Math.sin(x) + 0.4 * x;
    const px = xToPx(x);
    const py = yToPx(clamp(y, ymin, ymax));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Labels (minimal)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace";
  ctx.fillText("x", xToPx(xmax) - 12, yToPx(0) - 6);
  ctx.fillText("y", xToPx(0) + 6, yToPx(ymax) + 14);
}

document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("aSlider");
  const aVal = document.getElementById("aVal");
  const eq = document.getElementById("eq");
  const canvas = document.getElementById("demoCanvas");

  if (!slider || !aVal || !eq || !canvas) return;

  const render = () => {
    const a = Number(slider.value);
    aVal.textContent = a.toFixed(2);
    eq.textContent = `f(x) = ${a.toFixed(2)}\\sin(x) + 0.4x`;
    drawFunction(canvas, a);

    // re-render KaTeX if present
    if (window.renderMathInElement) {
      window.renderMathInElement(eq, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    }
  };

  slider.addEventListener("input", render);
  render();
});
