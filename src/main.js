import './styles/main.css';
import { MathsMonsterSafari } from './game/Game.js';

const game = new MathsMonsterSafari({
  canvas: document.querySelector('#game-canvas'),
  hud: document.querySelector('#hud'),
  panel: document.querySelector('#scene-panel'),
  mathModal: document.querySelector('#math-modal'),
  pauseModal: document.querySelector('#pause-modal'),
  mathFeedback: document.querySelector('#math-feedback'),
  toast: document.querySelector('#toast'),
  touchControls: document.querySelector('#touch-controls'),
});

game.start();
