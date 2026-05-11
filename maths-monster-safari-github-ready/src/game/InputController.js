export class InputController {
  constructor({ canvas, touchControls }) {
    this.canvas = canvas;
    this.touchControls = touchControls;
    this.handlers = new Map();
    this.touchStart = null;
    this.pointerDownAt = null;
  }

  start() {
    window.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.touchControls.querySelector('#touch-left').addEventListener('click', () => this.emit('move', -1));
    this.touchControls.querySelector('#touch-right').addEventListener('click', () => this.emit('move', 1));
    this.touchControls.querySelector('#touch-jump').addEventListener('click', () => this.emit('jump'));
  }

  on(event, callback) {
    this.handlers.set(event, callback);
  }

  setRunnerControlsVisible(isVisible) {
    this.touchControls.classList.toggle('hidden', !isVisible);
  }

  emit(event, payload) {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(payload);
    }
  }

  onKeyDown = (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      this.emit('move', -1);
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      this.emit('move', 1);
    } else if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
      this.emit('jump');
    } else if (event.key.toLowerCase() === 'p') {
      this.emit('pause');
    }
  };

  onPointerDown = (event) => {
    this.touchStart = { x: event.clientX, y: event.clientY };
    this.pointerDownAt = performance.now();
  };

  onPointerUp = (event) => {
    if (!this.touchStart) {
      return;
    }

    const dx = event.clientX - this.touchStart.x;
    const dy = event.clientY - this.touchStart.y;
    const elapsed = performance.now() - this.pointerDownAt;

    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
      this.emit('move', dx > 0 ? 1 : -1);
    } else if (dy < -30 || elapsed < 180) {
      this.emit('jump');
    }

    this.touchStart = null;
    this.pointerDownAt = null;
  };

  onPointerCancel = () => {
    this.touchStart = null;
    this.pointerDownAt = null;
  };
}
