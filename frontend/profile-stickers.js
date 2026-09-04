/* LinkBio built-in animated sticker catalog */
window.LinkBioStickers = {
  none: { label: 'ไม่มีสติ๊กเกอร์', emoji: '', className: 'sticker-none' },
  sparkle: { label: 'ประกายวิ้ง', emoji: '✨', className: 'sticker-sparkle' },
  heart: { label: 'หัวใจลอย', emoji: '💗', className: 'sticker-heart' },
  star: { label: 'ดาวน่ารัก', emoji: '⭐', className: 'sticker-star' },
  bunny: { label: 'กระต่าย', emoji: '🐰', className: 'sticker-bunny' },
  bear: { label: 'หมีน้อย', emoji: '🧸', className: 'sticker-bear' },
  cat: { label: 'แมวน้อย', emoji: '🐱', className: 'sticker-cat' },
  duck: { label: 'เป็ดน้อย', emoji: '🐥', className: 'sticker-duck' },
  flower: { label: 'ดอกไม้', emoji: '🌸', className: 'sticker-flower' },
  butterfly: { label: 'ผีเสื้อ', emoji: '🦋', className: 'sticker-butterfly' },
  cloud: { label: 'ก้อนเมฆ', emoji: '☁️', className: 'sticker-cloud' },
  moon: { label: 'พระจันทร์', emoji: '🌙', className: 'sticker-moon' },
  planet: { label: 'ดาวเคราะห์', emoji: '🪐', className: 'sticker-planet' },
  rainbow: { label: 'สายรุ้ง', emoji: '🌈', className: 'sticker-rainbow' },
  mushroom: { label: 'เห็ดน้อย', emoji: '🍄', className: 'sticker-mushroom' },
  cupcake: { label: 'คัพเค้ก', emoji: '🧁', className: 'sticker-cupcake' },
  ghost: { label: 'ผีน้อย', emoji: '👻', className: 'sticker-ghost' },
  alien: { label: 'เอเลี่ยนน้อย', emoji: '👽', className: 'sticker-alien' }
};

window.renderLinkBioSticker = function (settings = {}) {
  const root = document.querySelector('.profile-card');
  if (!root) return;

  root.querySelector('.profile-sticker')?.remove();

  const item =
    window.LinkBioStickers[settings.preset] ||
    window.LinkBioStickers.none;

  if (!settings.enabled || !item.emoji) return;

  const el = document.createElement('div');

  el.className = `profile-sticker ${item.className}`;
  el.textContent = item.emoji;
  el.setAttribute('aria-hidden', 'true');

  const size = Math.max(16, Math.min(140, Number(settings.size) || 42));
  const x = Math.max(-240, Math.min(240, Number(settings.x) || 0));
  const y = Math.max(-240, Math.min(240, Number(settings.y) || 0));
  const rotation = Math.max(
    -180,
    Math.min(180, Number(settings.rotation) || 0)
  );

  const opacity = Math.max(
    0,
    Math.min(1, Number(settings.opacity ?? 1))
  );

  const speed = Math.max(
    0.2,
    Math.min(4, Number(settings.animationSpeed) || 1)
  );

  el.style.setProperty('--sticker-size', `${size}px`);
  el.style.setProperty('--sticker-x', `${x}px`);
  el.style.setProperty('--sticker-y', `${y}px`);
  el.style.setProperty('--sticker-rotation', `${rotation}deg`);
  el.style.setProperty('--sticker-opacity', opacity);
  el.style.setProperty('--sticker-speed', `${speed}s`);

  root.appendChild(el);
};