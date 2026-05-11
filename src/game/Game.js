import * as THREE from 'three';
import {
  COLLECTIBLE_TYPES,
  ENEMY_BLUEPRINTS,
  FOOD_TYPES,
  LANES,
  PORTAL_COIN_COST,
  SCENES,
  TROPHY_LEVELS,
} from './constants.js';
import { createQuestion } from './math.js';
import { InputController } from './InputController.js';
import {
  addCollectible,
  captureMonster,
  createInitialState,
  feedEgg,
  feedMonster,
  selectedMonster,
} from './state.js';
import {
  createBarrier,
  createBasket,
  createCoin,
  createEgg,
  createFood,
  createMonster,
  createPortal,
  createSlicer,
  createTrainer,
  createTree,
  createWaterGap,
} from './entities.js';

const clockFace = new THREE.Clock();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatInventory(inventory) {
  return Object.entries(FOOD_TYPES)
    .map(([key, food]) => `${food.label}: ${inventory[key]}`)
    .join(' | ');
}

function latestTrophy(mathState) {
  const trophy = mathState.trophies.at(-1);
  return trophy ? TROPHY_LEVELS.find((level) => level.id === trophy) : null;
}

function toonMaterial(color) {
  return new THREE.MeshToonMaterial({ color });
}

export class MathsMonsterSafari {
  constructor({ canvas, hud, panel, mathModal, pauseModal, mathFeedback, toast, touchControls }) {
    this.canvas = canvas;
    this.hud = hud;
    this.panel = panel;
    this.mathModal = mathModal;
    this.pauseModal = pauseModal;
    this.mathFeedback = mathFeedback;
    this.toast = toast;
    this.renderer = null;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 220);
    this.scene = new THREE.Scene();
    this.sceneName = SCENES.PATHWAY;
    this.state = createInitialState();
    this.input = new InputController({ canvas, touchControls });
    this.pathObjects = [];
    this.pathMarkers = [];
    this.runner = null;
    this.sceneActors = {};
    this.effects = [];
    this.spawnClock = { collectible: 0, hazard: 0, gap: 0 };
    this.toastTimer = null;
    this.feedbackTimer = null;
    this.mathTimer = null;
    this.enemyTurnTimer = null;
    this.isPaused = false;
    this.isMathActive = false;
  }

  start() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    this.input.on('move', (direction) => this.moveRunner(direction));
    this.input.on('jump', () => this.jumpRunner());
    this.input.on('pause', () => this.togglePause());
    this.input.start();

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.switchScene(SCENES.PATHWAY);
    this.animate();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer?.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  switchScene(sceneName) {
    if (this.enemyTurnTimer) {
      clearTimeout(this.enemyTurnTimer);
      this.enemyTurnTimer = null;
    }

    this.sceneName = sceneName;
    this.scene = new THREE.Scene();
    this.pathObjects = [];
    this.pathMarkers = [];
    this.sceneActors = {};
    this.effects = [];
    this.spawnClock = { collectible: 0, hazard: 0, gap: 0 };

    if (sceneName === SCENES.PATHWAY) {
      this.buildPathway();
    } else if (sceneName === SCENES.HUB) {
      this.buildHub();
    } else {
      this.buildSafari();
    }

    this.renderHud();
  }

  addLights() {
    const ambient = new THREE.AmbientLight('#ffffff', 2.8);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight('#fff3bf', 2.1);
    sun.position.set(5, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 45;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    this.scene.add(sun);
  }

  buildPathway() {
    this.input.setRunnerControlsVisible(true);
    this.scene.background = new THREE.Color('#9ed8ff');
    this.scene.fog = new THREE.Fog('#9ed8ff', 34, 92);
    this.addLights();

    this.camera.position.set(0, 6.6, 10);
    this.camera.lookAt(0, 1, -11);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 130),
      toonMaterial('#d79a55'),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -25;
    ground.receiveShadow = true;
    this.scene.add(ground);

    [-1.6, 1.6].forEach((x) => {
      for (let index = 0; index < 18; index += 1) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.035, 2.2),
          toonMaterial('#ffdd94'),
        );
        dash.position.set(x, 0.03, -62 + index * 5);
        this.pathMarkers.push(dash);
        this.scene.add(dash);
      }
    });

    const trainer = createTrainer();
    const buddy = createMonster(selectedMonster(this.state));
    buddy.scale.setScalar(0.6 * selectedMonster(this.state).size);
    buddy.position.set(1.08, 0, 0.25);

    const runnerGroup = new THREE.Group();
    runnerGroup.add(trainer, buddy);
    runnerGroup.position.set(LANES[1], 0, 1.55);
    this.scene.add(runnerGroup);

    this.runner = {
      group: runnerGroup,
      laneIndex: 1,
      targetX: LANES[1],
      verticalSpeed: 0,
      invulnerableUntil: 0,
    };

    this.spawnPathCollectible(-15);
    this.spawnPathCollectible(-24);
    this.spawnPathHazard(-34);
    this.spawnPathGap(-48);
    this.renderPathwayPanel();
  }

  renderPathwayPanel() {
    this.panel.className = 'scene-panel pathway-panel';
    this.panel.innerHTML = `
      <div class="panel-row">
        <button id="go-hub" class="primary-button" type="button">Car Park</button>
        <button id="go-safari-fast" class="ghost-button" type="button">Safari</button>
        <button id="math-coins" class="primary-button bright" type="button">Maths Coins</button>
      </div>
      <div class="small-meter">
        Portal coins <strong>${this.state.coins}/${PORTAL_COIN_COST}</strong>
      </div>
    `;

    this.panel.querySelector('#go-hub').addEventListener('click', () => this.switchScene(SCENES.HUB));
    this.panel.querySelector('#go-safari-fast').addEventListener('click', () => this.tryPortalFromPath());
    this.panel.querySelector('#math-coins').addEventListener('click', () => this.earnMathCoins());
  }

  tryPortalFromPath() {
    if (this.state.coins >= PORTAL_COIN_COST) {
      this.state.coins -= PORTAL_COIN_COST;
      this.showToast('Portal paid');
      this.switchScene(SCENES.SAFARI);
      return;
    }

    this.showToast('Visit the Car Park portal');
    this.switchScene(SCENES.HUB);
  }

  moveRunner(direction) {
    if (this.sceneName !== SCENES.PATHWAY || !this.runner) {
      return;
    }

    this.runner.laneIndex = clamp(this.runner.laneIndex + direction, 0, LANES.length - 1);
    this.runner.targetX = LANES[this.runner.laneIndex];
  }

  jumpRunner() {
    if (this.sceneName !== SCENES.PATHWAY || !this.runner) {
      return;
    }

    if (this.runner.group.position.y < 0.05) {
      this.runner.verticalSpeed = 7.3;
    }
  }

  spawnPathCollectible(forcedZ = -62) {
    const roll = Math.random();
    const type = roll < 0.48 ? 'coin' : randomItem(Object.keys(FOOD_TYPES));
    const mesh =
      type === 'coin'
        ? createCoin()
        : createFood(type, COLLECTIBLE_TYPES[type].color);

    mesh.position.set(randomItem(LANES), 0.9, forcedZ);
    mesh.userData = { kind: 'collectible', type };
    this.pathObjects.push(mesh);
    this.scene.add(mesh);
  }

  spawnPathHazard(forcedZ = -68) {
    const isSlicer = Math.random() > 0.52;
    const mesh = isSlicer ? createSlicer() : createBarrier();
    mesh.position.set(randomItem(LANES), 0, forcedZ);
    mesh.userData = { kind: 'hazard', type: isSlicer ? 'slicer' : 'barrier' };
    this.pathObjects.push(mesh);
    this.scene.add(mesh);
  }

  spawnPathGap(forcedZ = -76) {
    const mesh = createWaterGap();
    mesh.position.set(0, 0, forcedZ);
    mesh.userData = { kind: 'gap', type: 'water', scored: false, hit: false };
    this.pathObjects.push(mesh);
    this.scene.add(mesh);
  }

  updatePathway(dt) {
    if (!this.runner) {
      return;
    }

    const speed = 15.5;
    this.spawnClock.collectible += dt;
    this.spawnClock.hazard += dt;
    this.spawnClock.gap += dt;

    if (this.spawnClock.collectible > 0.68) {
      this.spawnClock.collectible = 0;
      this.spawnPathCollectible();
    }

    if (this.spawnClock.hazard > 2.05) {
      this.spawnClock.hazard = 0;
      this.spawnPathHazard();
    }

    if (this.spawnClock.gap > 5.6) {
      this.spawnClock.gap = 0;
      this.spawnPathGap();
    }

    this.runner.group.position.x = THREE.MathUtils.lerp(
      this.runner.group.position.x,
      this.runner.targetX,
      1 - Math.pow(0.001, dt),
    );

    this.runner.verticalSpeed -= 18 * dt;
    this.runner.group.position.y = Math.max(0, this.runner.group.position.y + this.runner.verticalSpeed * dt);
    if (this.runner.group.position.y === 0 && this.runner.verticalSpeed < 0) {
      this.runner.verticalSpeed = 0;
    }

    this.runner.group.rotation.z = THREE.MathUtils.lerp(
      this.runner.group.rotation.z,
      (this.runner.targetX - this.runner.group.position.x) * -0.08,
      0.18,
    );

    this.pathMarkers.forEach((marker) => {
      marker.position.z += speed * dt;
      if (marker.position.z > 8) {
        marker.position.z -= 90;
      }
    });

    const toRemove = [];
    this.pathObjects.forEach((object) => {
      object.position.z += speed * dt;
      object.rotation.y += dt * 2.4;
      if (object.userData.type === 'slicer') {
        object.rotation.z += dt * 5;
      }
      if (object.userData.type === 'water') {
        object.rotation.set(0, 0, 0);
      }

      if (object.position.z > 8) {
        toRemove.push(object);
        return;
      }

      const hitX = object.userData.kind === 'gap' || Math.abs(object.position.x - this.runner.group.position.x) < 1.02;
      const hitZ = Math.abs(object.position.z - this.runner.group.position.z) < 0.82;
      if (!hitX || !hitZ) {
        return;
      }

      if (object.userData.kind === 'gap') {
        if (this.runner.group.position.y > 0.72) {
          if (!object.userData.scored) {
            object.userData.scored = true;
            this.state.score += 20;
            this.showToast('Water cleared');
            this.renderHud();
          }
          return;
        }

        if (!object.userData.hit && performance.now() > this.runner.invulnerableUntil) {
          object.userData.hit = true;
          this.runner.invulnerableUntil = performance.now() + 1200;
          this.runner.verticalSpeed = 4.5;
          this.state.coins = Math.max(0, this.state.coins - 2);
          this.state.score = Math.max(0, this.state.score - 15);
          this.showToast('Splash');
          this.renderHud();
          this.renderPathwayPanel();
        }
        return;
      }

      if (object.userData.kind === 'collectible') {
        const label = addCollectible(this.state, object.userData.type);
        this.showToast(`${label} collected`);
        toRemove.push(object);
        this.renderHud();
        this.renderPathwayPanel();
        return;
      }

      if (this.runner.group.position.y < 0.54 && performance.now() > this.runner.invulnerableUntil) {
        this.runner.invulnerableUntil = performance.now() + 1200;
        this.state.coins = Math.max(0, this.state.coins - 3);
        this.state.score = Math.max(0, this.state.score - 20);
        this.showToast('Careful');
        toRemove.push(object);
        this.renderHud();
        this.renderPathwayPanel();
      }
    });

    toRemove.forEach((object) => {
      this.scene.remove(object);
      this.pathObjects = this.pathObjects.filter((item) => item !== object);
    });
  }

  buildHub() {
    this.input.setRunnerControlsVisible(false);
    this.state.battle = null;
    this.scene.background = new THREE.Color('#cfe7fb');
    this.addLights();

    this.camera.position.set(0, 7.4, 8.6);
    this.camera.lookAt(0, 0.7, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 20),
      toonMaterial('#9da7b3'),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (let index = -3; index <= 3; index += 1) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.025, 4.6),
        toonMaterial('#e9f2fb'),
      );
      stripe.position.set(index * 1.15, 0.03, 3.2);
      this.scene.add(stripe);
    }

    const trainer = createTrainer();
    trainer.position.set(-4.4, 0, 1.1);
    this.scene.add(trainer);

    const activeMonster = createMonster(selectedMonster(this.state));
    activeMonster.position.set(-2.7, 0, 0.9);
    activeMonster.scale.setScalar(selectedMonster(this.state).size);
    this.scene.add(activeMonster);
    this.sceneActors.activeMonster = activeMonster;

    const basket = createBasket();
    basket.position.set(-4.1, 0.05, -2.3);
    this.scene.add(basket);

    this.state.eggs.forEach((egg, index) => {
      const x = -1.15 + index * 1.18;
      if (egg.hatched) {
        const baby = createMonster({ color: egg.color, accent: '#fff2a3', size: 0.45 });
        baby.position.set(x, 0, -2.4);
        this.scene.add(baby);
      } else {
        const eggMesh = createEgg(egg.color);
        eggMesh.position.set(x, 0, -2.4);
        this.scene.add(eggMesh);
      }
    });

    const portal = createPortal();
    portal.position.set(4.2, 0, -1.6);
    this.scene.add(portal);
    this.sceneActors.portal = portal;

    this.renderHubPanel();
  }

  renderHubPanel() {
    const monster = selectedMonster(this.state);
    const foodOptions = Object.entries(FOOD_TYPES)
      .map(([key, food]) => {
        const selected = this.state.selectedFood === key ? ' selected' : '';
        return `
          <button class="food-chip${selected}" draggable="true" data-food="${key}" type="button">
            <span class="swatch" style="background:${food.color}"></span>
            <span>${food.label}</span>
            <strong>${this.state.inventory[key]}</strong>
          </button>
        `;
      })
      .join('');

    const monsterCards = this.state.monsters
      .map((item) => {
        const selected = item.id === this.state.selectedMonsterId ? ' selected' : '';
        return `
          <button class="monster-card${selected}" data-monster="${item.id}" type="button">
            <span class="swatch" style="background:${item.color}"></span>
            <strong>${item.name}</strong>
            <span>Lv ${item.level ?? 1} | HP ${item.hp}/${item.maxHp}</span>
          </button>
        `;
      })
      .join('');

    const eggCards = this.state.eggs
      .map((egg) => {
        const food = FOOD_TYPES[egg.food];
        const status = egg.hatched ? egg.monster : `${egg.progress}/${egg.needed}`;
        const disabled = egg.hatched ? ' disabled' : '';
        return `
          <button class="egg-card" data-egg="${egg.id}" type="button"${disabled}>
            <span class="egg-dot" style="background:${egg.color}"></span>
            <strong>${egg.label}</strong>
            <span>${status}</span>
            <small>${food.label}</small>
          </button>
        `;
      })
      .join('');

    this.panel.className = 'scene-panel hub-panel';
    this.panel.innerHTML = `
      <div class="hub-grid">
        <section class="tool-surface">
          <h2>Car Park</h2>
          <div class="food-row">${foodOptions}</div>
          <div class="panel-row">
            <button id="feed-monster" class="primary-button" type="button">Feed ${monster.name}</button>
            <button id="to-pathway" class="ghost-button" type="button">Pathway</button>
          </div>
        </section>
        <section class="tool-surface compact">
          <h2>Monsters</h2>
          <div class="monster-list">${monsterCards}</div>
        </section>
        <section class="tool-surface compact">
          <h2>Eggs</h2>
          <div class="egg-list">${eggCards}</div>
        </section>
        <section class="tool-surface compact">
          <h2>Portal</h2>
          <div class="portal-count">${this.state.coins}/${PORTAL_COIN_COST} coins</div>
          <div class="panel-row">
            <button id="pay-portal" class="primary-button" type="button"${this.state.coins < PORTAL_COIN_COST ? ' disabled' : ''}>Pay</button>
            <button id="math-portal" class="ghost-button" type="button">Maths</button>
          </div>
        </section>
      </div>
    `;

    this.panel.querySelectorAll('.food-chip').forEach((button) => {
      button.addEventListener('click', () => {
        this.state.selectedFood = button.dataset.food;
        this.renderHubPanel();
      });
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', button.dataset.food);
        this.state.selectedFood = button.dataset.food;
      });
    });

    this.panel.querySelectorAll('.monster-card').forEach((button) => {
      button.addEventListener('click', () => {
        this.state.selectedMonsterId = button.dataset.monster;
        this.switchScene(SCENES.HUB);
      });
    });

    this.panel.querySelectorAll('.egg-card').forEach((button) => {
      button.addEventListener('dragover', (event) => event.preventDefault());
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        this.placeFoodOnEgg(button.dataset.egg, event.dataTransfer.getData('text/plain'));
      });
      button.addEventListener('click', () => this.placeFoodOnEgg(button.dataset.egg, this.state.selectedFood));
    });

    this.panel.querySelector('#feed-monster').addEventListener('click', () => {
      const fed = feedMonster(this.state, this.state.selectedFood);
      this.showToast(fed ? `${fed.name} grew` : 'No food ready');
      this.switchScene(SCENES.HUB);
    });

    this.panel.querySelector('#to-pathway').addEventListener('click', () => this.switchScene(SCENES.PATHWAY));
    this.panel.querySelector('#pay-portal').addEventListener('click', () => {
      if (this.state.coins >= PORTAL_COIN_COST) {
        this.state.coins -= PORTAL_COIN_COST;
        this.showToast('Portal open');
        this.switchScene(SCENES.SAFARI);
      }
    });
    this.panel.querySelector('#math-portal').addEventListener('click', () => {
      this.askMathQuestion('Portal Charge', (correct) => {
        if (correct) {
          this.showToast('Portal open');
          this.switchScene(SCENES.SAFARI);
        } else {
          this.showToast('Portal fizzled');
        }
      });
    });
  }

  placeFoodOnEgg(eggId, foodType) {
    const result = feedEgg(this.state, eggId, foodType);
    if (!result.egg || !result.changed) {
      this.showToast('No food ready');
      return;
    }
    this.showToast(result.hatched ? `${result.monster.name} hatched` : `${result.egg.label} glowed`);
    this.switchScene(SCENES.HUB);
  }

  updateHub(dt) {
    if (this.sceneActors.portal) {
      this.sceneActors.portal.rotation.y += dt * 1.5;
      this.sceneActors.portal.scale.setScalar(1 + Math.sin(clockFace.elapsedTime * 4) * 0.035);
    }

    if (this.sceneActors.activeMonster) {
      this.sceneActors.activeMonster.position.y = Math.sin(clockFace.elapsedTime * 3) * 0.05;
    }
  }

  buildSafari() {
    this.input.setRunnerControlsVisible(false);
    this.scene.background = new THREE.Color('#bce8ff');
    this.scene.fog = new THREE.Fog('#bce8ff', 30, 88);
    this.addLights();

    this.camera.position.set(0, 5.8, 8.2);
    this.camera.lookAt(0, 0.8, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 24),
      toonMaterial('#7fca55'),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (let index = 0; index < 13; index += 1) {
      const tree = createTree();
      tree.position.set(randomItem([-9, -7, 7, 9]) + Math.random(), 0, -8 + Math.random() * 16);
      tree.scale.setScalar(0.75 + Math.random() * 0.45);
      this.scene.add(tree);
    }

    if (!this.state.battle) {
      this.state.battle = this.createBattle();
    }

    const player = createMonster(selectedMonster(this.state));
    player.position.set(-2.4, 0, 0.1);
    player.scale.setScalar(selectedMonster(this.state).size);
    this.scene.add(player);

    const enemy = createMonster(this.state.battle.enemy);
    enemy.position.set(2.35, 0, -0.05);
    enemy.scale.setScalar(1.08);
    enemy.rotation.y = Math.PI;
    this.scene.add(enemy);

    this.sceneActors.playerMonster = player;
    this.sceneActors.enemyMonster = enemy;

    this.renderBattlePanel();
  }

  createBattle() {
    const monster = selectedMonster(this.state);
    const blueprint = randomItem(ENEMY_BLUEPRINTS);
    const level = Math.max(1, Math.floor(this.state.battleWins / 2) + Math.ceil(this.state.monsters.length / 2));
    const enemyMaxHp = blueprint.baseHp + level * 5 + Math.floor(Math.random() * 5);
    const isRival = Math.random() > 0.52;
    return {
      phase: 'player',
      message: 'Your turn',
      enemy: {
        name: isRival ? `${blueprint.trainer}'s ${blueprint.species} Lv ${level}` : `Wild ${blueprint.species} Lv ${level}`,
        captureName: `${blueprint.species} Lv ${level}`,
        species: blueprint.species,
        level,
        color: blueprint.color,
        accent: blueprint.accent,
        maxHp: enemyMaxHp,
        hp: enemyMaxHp,
        attack: blueprint.attack + Math.floor(level / 2),
      },
      playerHp: monster.hp,
    };
  }

  renderBattlePanel() {
    const battle = this.state.battle;
    const monster = selectedMonster(this.state);
    const enemy = battle.enemy;
    const playerPct = clamp((monster.hp / monster.maxHp) * 100, 0, 100);
    const enemyPct = clamp((enemy.hp / enemy.maxHp) * 100, 0, 100);
    const isPlayerTurn = battle.phase === 'player';
    const isResolution = battle.phase === 'resolution';

    this.panel.className = 'scene-panel battle-panel';
    this.panel.innerHTML = `
      <div class="battle-grid">
        <section class="battle-card">
          <strong>${monster.name}</strong>
          <div class="hp-bar"><span style="width:${playerPct}%"></span></div>
          <small>${monster.hp}/${monster.maxHp} HP</small>
        </section>
        <section class="battle-card enemy-card">
          <strong>${enemy.name}</strong>
          <div class="hp-bar enemy"><span style="width:${enemyPct}%"></span></div>
          <small>${enemy.hp}/${enemy.maxHp} HP</small>
        </section>
      </div>
      <div class="battle-message">${battle.message}</div>
      <div class="battle-actions">
        <button id="battle-attack" class="primary-button" type="button"${isPlayerTurn ? '' : ' disabled'}>Attack</button>
        <button id="battle-power" class="primary-button bright" type="button"${isPlayerTurn ? '' : ' disabled'}>Power Charge</button>
        <button id="next-battle" class="ghost-button" type="button"${isResolution ? '' : ' disabled'}>Next</button>
        <button id="battle-hub" class="ghost-button" type="button">Car Park</button>
      </div>
    `;

    this.panel.querySelector('#battle-attack').addEventListener('click', () => this.playerAttack(1));
    this.panel.querySelector('#battle-power').addEventListener('click', () => {
      this.askMathQuestion('Power Charge', (correct, question) => {
        this.playerAttack(correct ? question.powerMultiplier : 1);
      });
    });
    this.panel.querySelector('#next-battle').addEventListener('click', () => {
      this.state.battle = this.createBattle();
      this.switchScene(SCENES.SAFARI);
    });
    this.panel.querySelector('#battle-hub').addEventListener('click', () => this.switchScene(SCENES.HUB));
  }

  playerAttack(powerMultiplier = 1) {
    const battle = this.state.battle;
    const monster = selectedMonster(this.state);
    if (!battle || battle.phase !== 'player') {
      return;
    }

    const variance = Math.floor(Math.random() * 3);
    const baseDamage = monster.attack + variance;
    const multiplier = Math.max(1, Number(powerMultiplier) || 1);
    const powered = multiplier > 1;
    const damage = Math.round(baseDamage * multiplier);
    battle.enemy.hp = Math.max(0, battle.enemy.hp - damage);
    battle.message = powered ? `Super hit for ${damage}` : `Hit for ${damage}`;

    if (powered) {
      this.spawnPowerEffect();
    }

    if (battle.enemy.hp <= 0) {
      const captured = captureMonster(this.state, battle.enemy);
      this.state.coins += 5;
      battle.phase = 'resolution';
      battle.message = `${captured.name} joined you`;
      this.renderHud();
      this.renderBattlePanel();
      return;
    }

    battle.phase = 'enemy';
    this.renderBattlePanel();
    this.enemyTurnTimer = setTimeout(() => this.enemyTurn(), 900);
  }

  enemyTurn() {
    const battle = this.state.battle;
    const monster = selectedMonster(this.state);
    if (!battle || battle.phase !== 'enemy') {
      return;
    }

    const damage = battle.enemy.attack + Math.floor(Math.random() * 3);
    monster.hp = Math.max(0, monster.hp - damage);
    battle.playerHp = monster.hp;

    if (monster.hp <= 0) {
      monster.hp = Math.ceil(monster.maxHp * 0.45);
      battle.phase = 'resolution';
      battle.message = `${monster.name} needs snacks`;
    } else {
      battle.phase = 'player';
      battle.message = `${battle.enemy.name} hit for ${damage}`;
    }

    this.renderHud();
    this.renderBattlePanel();
  }

  spawnPowerEffect() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({ color: '#f7f06d', transparent: true, opacity: 0.8 }),
    );
    ring.position.set(-2.4, 1.1, 0.1);
    ring.rotation.x = Math.PI / 2;
    ring.userData.life = 0.8;
    this.effects.push(ring);
    this.scene.add(ring);
  }

  earnMathCoins() {
    this.askMathQuestion('Maths Coins', (correct, question) => {
      if (!correct) {
        return;
      }

      this.state.coins += question.reward;
      this.showToast(`+${question.reward} coins`);
      this.renderHud();
      if (this.sceneName === SCENES.PATHWAY) {
        this.renderPathwayPanel();
      } else if (this.sceneName === SCENES.HUB) {
        this.renderHubPanel();
      }
    });
  }

  updateSafari(dt) {
    if (this.sceneActors.playerMonster) {
      this.sceneActors.playerMonster.position.y = Math.sin(clockFace.elapsedTime * 3.2) * 0.04;
    }

    if (this.sceneActors.enemyMonster) {
      this.sceneActors.enemyMonster.position.y = Math.sin(clockFace.elapsedTime * 2.7 + 1) * 0.04;
      if (this.state.battle?.enemy.hp <= 0) {
        this.sceneActors.enemyMonster.scale.lerp(new THREE.Vector3(0.2, 0.2, 0.2), 0.08);
      }
    }
  }

  askMathQuestion(title, onAnswer) {
    if (this.mathTimer) {
      clearInterval(this.mathTimer);
    }

    const question = createQuestion();
    let remaining = 10;
    let resolved = false;
    this.isMathActive = true;
    this.mathModal.classList.remove('hidden');
    this.mathModal.innerHTML = `
      <div class="math-card">
        <h2>${title}</h2>
        <div class="math-reward">${question.kind} | +${question.reward} coins | x${question.powerMultiplier} power</div>
        <div class="question">${question.prompt} = ?</div>
        <div class="timer-bar"><span style="width:100%"></span></div>
        <div class="choice-grid">
          ${question.choices
            .map((choice) => `<button type="button" data-choice="${choice}">${choice}</button>`)
            .join('')}
        </div>
      </div>
    `;

    const finish = (correct) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearInterval(this.mathTimer);
      this.mathTimer = null;
      this.isMathActive = false;
      this.mathModal.classList.add('hidden');
      this.mathModal.innerHTML = '';
      const trophy = this.recordMathResult(correct, question);
      this.showMathFeedback(correct, question, trophy);
      onAnswer(correct, question);
    };

    this.mathModal.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => finish(button.dataset.choice === String(question.answer)));
    });

    this.mathTimer = setInterval(() => {
      remaining = Math.max(0, remaining - 0.1);
      const pct = (remaining / 10) * 100;
      const bar = this.mathModal.querySelector('.timer-bar span');
      if (bar) {
        bar.style.width = `${pct}%`;
      }
      if (remaining <= 0) {
        finish(false);
      }
    }, 100);
  }

  updateEffects(dt) {
    this.effects.forEach((effect) => {
      effect.userData.life -= dt;
      effect.scale.addScalar(dt * 2.2);
      effect.material.opacity = Math.max(0, effect.userData.life);
    });

    this.effects
      .filter((effect) => effect.userData.life <= 0)
      .forEach((effect) => {
        this.scene.remove(effect);
        this.effects = this.effects.filter((item) => item !== effect);
      });
  }

  recordMathResult(correct, question) {
    if (!correct) {
      this.state.math.streak = 0;
      this.renderHud();
      return null;
    }

    this.state.math.correct += 1;
    this.state.math.streak += 1;
    this.state.score += question.points;

    const trophy = TROPHY_LEVELS.find(
      (level) => this.state.math.correct >= level.correct && !this.state.math.trophies.includes(level.id),
    );

    if (trophy) {
      this.state.math.trophies.push(trophy.id);
    }

    this.renderHud();
    return trophy ?? null;
  }

  showMathFeedback(correct, question, trophy) {
    clearTimeout(this.feedbackTimer);
    const trophyLine = trophy ? `<strong>New trophy: ${trophy.label}</strong>` : '';
    this.mathFeedback.className = `math-feedback ${correct ? 'correct' : 'incorrect'}`;
    this.mathFeedback.innerHTML = correct
      ? `<strong>Correct</strong><span>+${question.points} points | Streak ${this.state.math.streak}</span>${trophyLine}`
      : '<strong>Try again</strong><span>Streak reset</span>';
    this.feedbackTimer = setTimeout(() => this.mathFeedback.classList.add('hidden'), 1800);
  }

  togglePause(force) {
    if (this.isMathActive) {
      return;
    }

    this.isPaused = typeof force === 'boolean' ? force : !this.isPaused;
    this.pauseModal.classList.toggle('hidden', !this.isPaused);

    if (this.isPaused) {
      this.pauseModal.innerHTML = `
        <div class="pause-card">
          <h2>Paused</h2>
          <div class="pause-stats">Coins ${this.state.coins} | Score ${this.state.score}</div>
          <button id="resume-game" class="primary-button" type="button">Continue</button>
        </div>
      `;
      this.pauseModal.querySelector('#resume-game').addEventListener('click', () => this.togglePause(false));
    } else {
      this.pauseModal.innerHTML = '';
    }

    this.renderHud();
  }

  renderHud() {
    const monster = selectedMonster(this.state);
    const trophy = latestTrophy(this.state.math);
    this.hud.innerHTML = `
      <div class="brand-block">
        <span>Maths Monster Safari</span>
        <strong>${this.sceneName}</strong>
      </div>
      <div class="hud-stats">
        <span>Coins <strong>${this.state.coins}</strong></span>
        <span>Score <strong>${this.state.score}</strong></span>
        <span>${monster.name} <strong>${monster.hp}/${monster.maxHp}</strong></span>
        <span>Maths <strong>${this.state.math.correct}</strong></span>
        <span>Streak <strong>${this.state.math.streak}</strong></span>
        <span>Trophy <strong>${trophy?.label ?? 'None'}</strong></span>
      </div>
      <button id="pause-game" class="pause-button" type="button">${this.isPaused ? 'Resume' : 'Pause'}</button>
      <div class="inventory-line">${formatInventory(this.state.inventory)}</div>
    `;
    this.hud.querySelector('#pause-game').addEventListener('click', () => this.togglePause());
  }

  showToast(message) {
    clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.remove('hidden');
    this.toastTimer = setTimeout(() => this.toast.classList.add('hidden'), 1200);
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(clockFace.getDelta(), 0.05);

    if (!this.isPaused && !this.isMathActive) {
      if (this.sceneName === SCENES.PATHWAY) {
        this.updatePathway(dt);
      } else if (this.sceneName === SCENES.HUB) {
        this.updateHub(dt);
      } else {
        this.updateSafari(dt);
      }

      this.updateEffects(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
