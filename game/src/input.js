// Keyboard and mouse state. One clear job: turn DOM events into a plain
// input snapshot the world update reads every frame.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pressed: new Set(),
    // Touch: left-half drag is a virtual joystick, right-half touch aims
    // and auto-fires. Both are plain state the world reads each frame.
    joy: { active: false, id: null, x: 0, y: 0, ox: 0, oy: 0 },
    touchAim: { active: false, id: null, x: 0, y: 0 },
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

  // Touch controls: a drag starting on the left half steers (joystick
  // relative to where the finger landed); a touch on the right half aims
  // at the finger and auto-fires while held.
  function touchPoint(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
      y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    for (const t of event.changedTouches) {
      const p = touchPoint(t);
      if (p.x < canvas.width / 2 && !input.joy.active) {
        input.joy.active = true;
        input.joy.id = t.identifier;
        input.joy.ox = p.x;
        input.joy.oy = p.y;
        input.joy.x = 0;
        input.joy.y = 0;
      } else if (!input.touchAim.active) {
        input.touchAim.active = true;
        input.touchAim.id = t.identifier;
        input.touchAim.x = p.x;
        input.touchAim.y = p.y;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    for (const t of event.changedTouches) {
      const p = touchPoint(t);
      if (input.joy.active && t.identifier === input.joy.id) {
        const dx = p.x - input.joy.ox;
        const dy = p.y - input.joy.oy;
        const len = Math.hypot(dx, dy);
        const max = 60;
        const s = len > max ? max / len : 1;
        input.joy.x = (dx * s) / max;
        input.joy.y = (dy * s) / max;
      } else if (input.touchAim.active && t.identifier === input.touchAim.id) {
        input.touchAim.x = p.x;
        input.touchAim.y = p.y;
      }
    }
  }, { passive: false });
  function touchEnd(event) {
    for (const t of event.changedTouches) {
      if (input.joy.active && t.identifier === input.joy.id) {
        input.joy.active = false;
        input.joy.id = null;
        input.joy.x = 0;
        input.joy.y = 0;
      }
      if (input.touchAim.active && t.identifier === input.touchAim.id) {
        input.touchAim.active = false;
        input.touchAim.id = null;
      }
    }
  }
  canvas.addEventListener('touchend', touchEnd);
  canvas.addEventListener('touchcancel', touchEnd);

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
