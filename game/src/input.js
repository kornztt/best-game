// Keyboard and mouse state. One clear job: turn DOM events into a plain
// input snapshot the world update reads every frame.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pressed: new Set(),
  };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.keys.add(key);
      input.pressed.add(key);
    }
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    input.keys.delete(key);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
    if (event.button === 0) input.mouseDown = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}

/** True while the key is held. Accepts 'w', 'ArrowUp', ' ' and friends. */
export function keyDown(input, key) {
  return input.keys.has(key) || input.keys.has(key.toLowerCase());
}

/** True once for the frame the key went down; call endFrameInput to clear. */
export function keyPressed(input, key) {
  return input.pressed.has(key) || input.pressed.has(key.toLowerCase());
}

export function endFrameInput(input) {
  input.pressed.clear();
}

/** Movement vector from WASD / arrows, normalised. */
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (keyDown(input, 'a') || keyDown(input, 'ArrowLeft')) x -= 1;
  if (keyDown(input, 'd') || keyDown(input, 'ArrowRight')) x += 1;
  if (keyDown(input, 'w') || keyDown(input, 'ArrowUp')) y -= 1;
  if (keyDown(input, 's') || keyDown(input, 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
