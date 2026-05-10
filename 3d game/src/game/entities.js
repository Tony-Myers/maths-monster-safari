import * as THREE from 'three';

function material(color, options = {}) {
  return new THREE.MeshToonMaterial({
    color,
    flatShading: true,
    ...options,
  });
}

function markCartoonMesh(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      const isFlatEffect = child.material?.transparent && child.material?.depthWrite === false;
      child.castShadow = !isFlatEffect;
      child.receiveShadow = !isFlatEffect;
    }
  });
  return object;
}

function cylinderBetween(start, end, radius, mat, radialSegments = 8) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return mesh;
}

function createBike() {
  const group = new THREE.Group();
  const frameMat = material('#8e98a6');
  const darkMat = material('#202634');
  const tyreMat = material('#171b23');
  const handleMat = material('#dfe6ef');

  [-0.64, 0.62].forEach((z) => {
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 14), tyreMat);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(0, 0.32, z);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 10), handleMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(tyre.position);
    group.add(tyre, hub);
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 1.35), frameMat);
  deck.position.set(0, 0.58, 0);
  group.add(deck);

  group.add(cylinderBetween(new THREE.Vector3(0, 0.6, -0.54), new THREE.Vector3(0, 1.2, -0.82), 0.045, frameMat));
  group.add(cylinderBetween(new THREE.Vector3(0, 1.2, -0.82), new THREE.Vector3(0, 1.55, -0.82), 0.04, handleMat));
  group.add(cylinderBetween(new THREE.Vector3(-0.38, 1.55, -0.82), new THREE.Vector3(0.38, 1.55, -0.82), 0.045, handleMat));
  group.add(cylinderBetween(new THREE.Vector3(-0.24, 1.5, -0.75), new THREE.Vector3(0.24, 1.5, -0.75), 0.03, darkMat));

  return markCartoonMesh(group);
}

export function createTrainer() {
  const group = new THREE.Group();
  const skin = material('#b97952');
  const hair = material('#252933');
  const band = material('#ffd84b');
  const jacket = material('#2376ef');
  const jacketDark = material('#1756b8');
  const red = material('#f24f45');
  const shorts = material('#f2f4f8');
  const shoe = material('#263142');

  const bike = createBike();
  group.add(bike);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.36), jacket);
  body.position.set(0, 1.23, -0.05);
  group.add(body);

  const jacketZip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.04), red);
  jacketZip.position.set(0, 1.23, -0.24);
  group.add(jacketZip);

  [-0.36, 0.36].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.18), jacketDark);
    arm.position.set(x, 1.2, -0.2);
    arm.rotation.x = -0.42;
    arm.rotation.z = x < 0 ? -0.16 : 0.16;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), skin);
    hand.position.set(x * 0.92, 0.98, -0.49);
    group.add(arm, hand);
  });

  [-0.16, 0.16].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.18), shorts);
    leg.position.set(x, 0.86, 0.05);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), shoe);
    foot.position.set(x, 0.62, -0.08);
    group.add(leg, foot);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 9), skin);
  head.position.set(0, 1.86, -0.06);
  head.scale.set(1, 1.08, 0.96);
  group.add(head);

  const foreheadBand = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 18), band);
  foreheadBand.position.set(0, 1.88, -0.06);
  foreheadBand.rotation.x = Math.PI / 2;
  group.add(foreheadBand);

  [-0.18, 0, 0.18].forEach((x, index) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 5), hair);
    spike.position.set(x, 2.22, -0.08 + index * 0.035);
    spike.rotation.z = x * -1.4;
    group.add(spike);
  });

  [-0.14, 0.14].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), material('#111722'));
    eye.position.set(x, 1.9, -0.41);
    group.add(eye);
  });

  group.scale.setScalar(1.04);
  return markCartoonMesh(group);
}

export function createMonster({ color = '#7fd879', accent = '#ffe36d', size = 1 } = {}) {
  if (color === '#7fd879') {
    return createScorpionCrabMonster(size);
  }

  return createWildMonster({ color, accent, size });
}

function createScorpionCrabMonster(size = 1) {
  const group = new THREE.Group();
  group.scale.setScalar(size);
  const coreMat = material('#322b86');
  const shellMat = material('#26216d');
  const faceMat = material('#ff8a2b');
  const clawMat = material('#ef3f43');
  const yellowMat = material('#ffd84b');
  const eyeMat = material('#101525');

  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(0.98, 28),
    new THREE.MeshBasicMaterial({ color: '#35287d', transparent: true, opacity: 0.22, depthWrite: false }),
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.035;
  aura.receiveShadow = false;

  const auraEdge = new THREE.Mesh(
    new THREE.TorusGeometry(0.99, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color: '#6d55ff', transparent: true, opacity: 0.45, depthWrite: false }),
  );
  auraEdge.rotation.x = Math.PI / 2;
  auraEdge.position.y = 0.045;
  group.add(aura, auraEdge);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), coreMat);
  body.position.set(0, 0.64, 0);
  body.scale.set(1.16, 0.8, 1);
  group.add(body);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 7), faceMat);
  face.position.set(0, 0.66, -0.48);
  face.scale.set(1.3, 0.78, 0.36);
  group.add(face);

  [-0.16, 0.16].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eye.position.set(x, 0.74, -0.68);
    group.add(eye);
  });

  [-0.32, 0.32].forEach((x) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 6), yellowMat);
    horn.position.set(x, 0.98, -0.44);
    horn.rotation.x = -0.62;
    horn.rotation.z = x < 0 ? 0.28 : -0.28;
    group.add(horn);
  });

  [-1, 1].forEach((side) => {
    group.add(cylinderBetween(
      new THREE.Vector3(side * 0.38, 0.53, -0.18),
      new THREE.Vector3(side * 0.76, 0.46, -0.56),
      0.055,
      shellMat,
      7,
    ));

    const clawBase = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), clawMat);
    clawBase.position.set(side * 0.92, 0.43, -0.72);
    clawBase.scale.set(1.25, 0.8, 0.92);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.38), clawMat);
    upper.position.set(side * 1.04, 0.53, -0.9);
    upper.rotation.y = side * 0.28;
    upper.rotation.z = side * 0.42;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.32), clawMat);
    lower.position.set(side * 0.84, 0.33, -0.9);
    lower.rotation.y = side * -0.18;
    lower.rotation.z = side * -0.5;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 5), yellowMat);
    spike.position.set(side * 1.05, 0.66, -0.76);
    spike.rotation.z = side * -0.75;
    group.add(clawBase, upper, lower, spike);
  });

  [-1, 1].forEach((side) => {
    [0.02, 0.22, 0.42].forEach((z, index) => {
      const leg = cylinderBetween(
        new THREE.Vector3(side * 0.34, 0.38, z),
        new THREE.Vector3(side * (0.66 + index * 0.05), 0.2, z + 0.12),
        0.04,
        shellMat,
        6,
      );
      group.add(leg);
    });
  });

  for (let index = 0; index < 5; index += 1) {
    const segment = new THREE.Mesh(new THREE.SphereGeometry(0.18 - index * 0.016, 9, 7), shellMat);
    segment.position.set(0, 0.62 + index * 0.13, 0.48 + index * 0.17);
    segment.scale.set(1, 0.84, 1.18);
    group.add(segment);
  }

  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 6), faceMat);
  stinger.position.set(0, 1.24, 1.22);
  stinger.rotation.x = 0.8;
  group.add(stinger);

  return markCartoonMesh(group);
}

function createWildMonster({ color = '#7fd879', accent = '#ffe36d', size = 1 } = {}) {
  const group = new THREE.Group();
  group.scale.setScalar(size);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), material(color));
  body.position.y = 0.75;
  body.scale.set(1.08, 0.9, 1);
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), material(accent));
  belly.position.set(0, 0.58, 0.42);
  belly.scale.set(1, 0.78, 0.38);
  group.add(belly);

  [-0.24, 0.24].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), material('#1c2430'));
    eye.position.set(x, 0.93, 0.58);
    group.add(eye);
  });

  [-0.42, 0.42].forEach((x) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), material(accent));
    horn.position.set(x, 1.28, 0.08);
    horn.rotation.z = x < 0 ? 0.3 : -0.3;
    group.add(horn);
  });

  return markCartoonMesh(group);
}

export function createCoin() {
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.08, 28),
    material('#f5c84b', { metalness: 0.3, roughness: 0.35 }),
  );
  coin.rotation.x = Math.PI / 2;
  return coin;
}

export function createFood(type, color) {
  const group = new THREE.Group();
  const mat = material(color);

  if (type === 'pizza') {
    const slice = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 3), mat);
    slice.rotation.z = Math.PI / 3;
    slice.position.y = 0.25;
    group.add(slice);
  } else if (type === 'heart') {
    const left = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), mat);
    const right = left.clone();
    left.position.set(-0.12, 0.34, 0);
    right.position.set(0.12, 0.34, 0);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.42, 4), mat);
    point.position.y = 0.12;
    point.rotation.z = Math.PI / 4;
    group.add(left, right, point);
  } else if (type === 'fish') {
    const fish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), mat);
    fish.scale.set(1.45, 0.68, 0.6);
    fish.position.y = 0.28;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.32, 3), mat);
    tail.rotation.z = -Math.PI / 2;
    tail.position.set(-0.42, 0.28, 0);
    group.add(fish, tail);
  } else if (type === 'pig') {
    const pig = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), mat);
    pig.position.y = 0.3;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), material('#f7cad8'));
    snout.position.set(0, 0.3, 0.3);
    snout.rotation.x = Math.PI / 2;
    group.add(pig, snout);
  } else {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.48, 12), material('#f8ead4'));
    bone.rotation.z = Math.PI / 2;
    bone.position.y = 0.26;
    const meat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
    meat.position.set(0.04, 0.26, 0);
    meat.scale.set(1.4, 1, 0.8);
    group.add(bone, meat);
  }

  return group;
}

export function createBarrier() {
  const group = new THREE.Group();
  const postMat = material('#864f36');
  const railMat = material('#f37b5d');

  [-0.44, 0.44].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), postMat);
    post.position.set(x, 0.65, 0);
    group.add(post);
  });

  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.18), railMat);
  rail.position.y = 0.85;
  group.add(rail);

  return group;
}

export function createSlicer() {
  const group = new THREE.Group();
  const bladeMat = material('#cfd6e1', { metalness: 0.45, roughness: 0.25 });
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), material('#293042'));
  hub.position.y = 0.72;
  group.add(hub);

  for (let index = 0; index < 4; index += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.05), bladeMat);
    blade.position.y = 0.72;
    blade.rotation.z = index * (Math.PI / 2);
    group.add(blade);
  }

  return group;
}

export function createWaterGap() {
  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(13.4, 0.05, 2.55),
    new THREE.MeshBasicMaterial({ color: '#38a8f4', transparent: true, opacity: 0.86 }),
  );
  water.position.y = 0.035;
  group.add(water);

  [-1.18, 1.18].forEach((z) => {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.07, 0.12), material('#d7f7ff'));
    foam.position.set(0, 0.085, z);
    group.add(foam);
  });

  [-4.8, -1.6, 1.6, 4.8].forEach((x, index) => {
    const ripple = new THREE.Mesh(
      new THREE.TorusGeometry(0.32 + index * 0.03, 0.018, 6, 18),
      new THREE.MeshBasicMaterial({ color: '#bcefff', transparent: true, opacity: 0.72 }),
    );
    ripple.rotation.x = Math.PI / 2;
    ripple.position.set(x, 0.1, index % 2 === 0 ? -0.34 : 0.46);
    group.add(ripple);
  });

  return markCartoonMesh(group);
}

export function createEgg(color) {
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 18), material(color));
  egg.scale.set(0.82, 1.18, 0.82);
  egg.position.y = 0.55;
  return egg;
}

export function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.3, 10), material('#8b5b37'));
  trunk.position.y = 0.65;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.55, 9), material('#3d9652'));
  leaves.position.y = 1.65;
  group.add(trunk, leaves);
  return group;
}

export function createPortal() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.08, 16, 48),
    material('#45d5ff', { emissive: '#0a7ca0', emissiveIntensity: 0.5 }),
  );
  ring.position.y = 1.1;
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 36),
    new THREE.MeshBasicMaterial({ color: '#7bf3ff', transparent: true, opacity: 0.34 }),
  );
  core.position.y = 1.1;
  core.position.z = -0.01;
  group.add(ring, core);
  return group;
}

export function createBasket() {
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.56), material('#b98445'));
  basket.position.y = 0.25;
  return basket;
}
