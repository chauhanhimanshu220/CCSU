export function generateCaptchaText(length = 6) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let text = "";

  for (let index = 0; index < length; index += 1) {
    text += characters[Math.floor(Math.random() * characters.length)];
  }

  return text;
}

export function drawCaptcha(canvas, captchaValue) {
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#e4e7eb";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 28; index += 1) {
    context.fillStyle = `rgba(120, 128, 136, ${Math.random() * 0.28 + 0.08})`;
    context.beginPath();
    context.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
    context.fill();
  }

  for (let index = 0; index < 6; index += 1) {
    context.strokeStyle = `rgba(135, 141, 148, ${Math.random() * 0.35 + 0.1})`;
    context.beginPath();
    context.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
    context.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
    context.stroke();
  }

  context.font = "28px Georgia, serif";
  context.fillStyle = "#444444";
  context.textBaseline = "middle";
  context.setTransform(1, 0, 0, 1, 0, 0);

  [...captchaValue].forEach((character, index) => {
    const x = 38 + index * 46;
    const y = 31 + (Math.random() * 6 - 3);
    const angle = Math.random() * 0.24 - 0.12;

    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillText(character, 0, 0);
    context.restore();
  });
}
