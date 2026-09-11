/** Small DOM joystick. Scene code consumes its normalized vector each frame. */
export default class TouchControls {
  constructor(element = document.querySelector('#touch-controls')) {
    this.element = element;
    this.vector = { x: 0, y: 0 };
    this.enabled = false;
    this.pointerId = null;
    this.listeners = [];

    if (!element) return;

    element.innerHTML = `
      <div class="joystick" role="group" aria-label="Movement joystick">
        <div class="joystick__ring" aria-hidden="true"></div>
        <span class="joystick__cross joystick__cross--horizontal" aria-hidden="true"></span>
        <span class="joystick__cross joystick__cross--vertical" aria-hidden="true"></span>
        <div class="joystick__thumb" aria-hidden="true"></div>
      </div>
      <div class="direction-buttons" aria-label="Directional controls">
        <button class="direction-button" data-direction="up" aria-label="Move up" type="button">↑</button>
        <button class="direction-button" data-direction="left" aria-label="Move left" type="button">←</button>
        <button class="direction-button" data-direction="down" aria-label="Move down" type="button">↓</button>
        <button class="direction-button" data-direction="right" aria-label="Move right" type="button">→</button>
      </div>`;

    this.pad = element.querySelector('.joystick');
    this.thumb = element.querySelector('.joystick__thumb');
    this.buttons = [...element.querySelectorAll('.direction-button')];
    this.action = document.createElement('button');
    this.action.type = 'button';
    this.action.className = 'controller-action';
    this.action.innerHTML = '<span aria-hidden="true">A</span><small>상호작용</small>';
    this.action.setAttribute('aria-label', '상호작용');
    this.action.disabled = true;
    element.append(this.action);
    this.on(this.action, 'click', () => {
      if (this.enabled && this.actionAvailable) window.dispatchEvent(new Event('remember:interact'));
    });

    this.on(this.pad, 'pointerdown', (event) => {
      if (!this.enabled || this.pointerId !== null) return;
      event.preventDefault();
      this.pointerId = event.pointerId;
      this.pad.setPointerCapture(event.pointerId);
      this.pad.classList.add('is-dragging');
      this.updatePointer(event);
    });
    this.on(this.pad, 'pointermove', (event) => {
      if (event.pointerId !== this.pointerId) return;
      event.preventDefault();
      this.updatePointer(event);
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.on(this.pad, eventName, (event) => {
        if (event.pointerId === this.pointerId) this.reset();
      });
    }

    const directions = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    for (const button of this.buttons) {
      const press = (event) => {
        if (!this.enabled) return;
        event.preventDefault();
        Object.assign(this.vector, directions[button.dataset.direction]);
        if (event.pointerId !== undefined) button.setPointerCapture(event.pointerId);
        button.classList.add('is-pressed');
      };
      this.on(button, 'pointerdown', press);
      this.on(button, 'keydown', (event) => {
        if (event.code === 'Space' || event.code === 'Enter') press(event);
      });
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
        this.on(button, eventName, () => this.reset());
      }
      this.on(button, 'keyup', (event) => {
        if (event.code === 'Space' || event.code === 'Enter') this.reset();
      });
      this.on(button, 'contextmenu', (event) => event.preventDefault());
    }
    this.on(window, 'blur', () => this.reset());
    this.on(document, 'visibilitychange', () => {
      if (document.hidden) this.reset();
    });
    this.setEnabled(false);
  }

  on(target, name, handler) {
    target.addEventListener(name, handler);
    this.listeners.push(() => target.removeEventListener(name, handler));
  }

  updatePointer(event) {
    const bounds = this.pad.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) * 0.30);
    let x = (event.clientX - bounds.left - bounds.width / 2) / radius;
    let y = (event.clientY - bounds.top - bounds.height / 2) / radius;
    const distance = Math.hypot(x, y);
    if (distance > 1) {
      x /= distance;
      y /= distance;
    }
    // A small dead zone keeps resting fingers from making the character drift.
    if (distance < 0.13) {
      this.vector.x = 0;
      this.vector.y = 0;
    } else {
      this.vector.x = x;
      this.vector.y = y;
    }
    this.thumb.style.transform = `translate(calc(-50% + ${x * radius}px), calc(-50% + ${y * radius}px))`;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.action) this.action.disabled = !enabled || !this.actionAvailable;
    if (this.element) {
      this.element.classList.toggle('is-enabled', enabled);
      this.element.setAttribute('aria-hidden', String(!enabled));
      this.buttons.forEach((button) => { button.disabled = !enabled; });
    }
    if (!enabled) this.reset();
  }

  reset() {
    this.vector.x = 0;
    this.vector.y = 0;
    const capturedPointer = this.pointerId;
    this.pointerId = null;
    if (this.pad) {
      this.pad.classList.remove('is-dragging');
      if (capturedPointer !== null && this.pad.hasPointerCapture(capturedPointer)) {
        this.pad.releasePointerCapture(capturedPointer);
      }
    }
    if (this.thumb) this.thumb.style.transform = 'translate(-50%, -50%)';
    this.buttons?.forEach((button) => button.classList.remove('is-pressed'));
  }

  destroy() {
    this.reset();
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
    if (this.element) this.element.replaceChildren();
  }

  setAction(available, label = '상호작용') {
    this.actionAvailable = available;
    if (!this.action) return;
    this.action.disabled = !this.enabled || !available;
    if (this.action.getAttribute('aria-label') !== label) {
      this.action.setAttribute('aria-label', label);
      this.action.querySelector('small').textContent = label;
    }
  }
}
