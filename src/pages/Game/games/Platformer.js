import kaplay from 'kaplay';

/**
 * Precision platformer using Kaplay.
 * @param {Object} opts
 * @param {string} opts.canvasId - CSS selector for the canvas element.
 * @param {Function} opts.onComplete - Callback receiving { coinsCollected, duration, totalGold } when the level is finished.
 * @param {number} opts.width - canvas width
 * @param {number} opts.height - canvas height
 */
export function playPlatformer({
  canvasId = '#game-canvas',
  onComplete = () => {},
  width = 960,
  height = 540,
} = {}) {
  const canvas = document.querySelector(canvasId);
  if (!canvas) return;

  const k = kaplay({
    width,
    height,
    font: 'sans-serif',
    canvas,
    background: [138, 180, 248],
  });

  const {
    setGravity,
    scene,
    add,
    go,
    pos,
    rect,
    color,
    area,
    body,
    anchor,
    text,
    onKeyPress,
    onKeyDown,
    onCollide,
    outline,
    time,
    shake,
    dt,
  } = k;

  scene('game', () => {
    setGravity(1900);

    const levelWidth = 2200;
    const groundHeight = 32;
    const playerSpeed = 360;
    const jumpForce = 680;
    const dashForce = 780;
    const dashCooldown = 0.4;
    const coyoteTime = 0.12;
    const jumpBuffer = 0.14;
    const jumpCutMultiplier = 0.45;

    let canDash = true;
    let coinsCollected = 0;
    const startTime = time();
    let coyoteTimer = 0;
    let bufferTimer = 0;

    const makePlatform = (x, y, w, h = groundHeight) =>
      add([
        rect(w, h),
        pos(x, y),
        area(),
        body({ isStatic: true }),
        color(60, 60, 70),
        outline(2, color(90, 90, 110)),
        'platform',
      ]);

    const makeSpike = (x, y, size = 26) =>
      add([
        rect(size, size, { radius: 6 }),
        pos(x, y),
        area(),
        color(200, 60, 60),
        outline(2, color(120, 20, 20)),
        'spike',
      ]);

    const makeCoin = (x, y) =>
      add([
        rect(18, 18, { radius: 6 }),
        pos(x, y),
        area(),
        color(255, 215, 0),
        outline(2, color(180, 140, 0)),
        'coin',
      ]);

    // Level layout
    makePlatform(0, height - 40, levelWidth, groundHeight);
    makePlatform(180, height - 110, 240, 20);
    makePlatform(520, height - 160, 180, 20);
    makePlatform(760, height - 220, 120, 20);
    makePlatform(980, height - 260, 200, 20);
    makePlatform(1280, height - 300, 260, 20);
    makePlatform(1600, height - 240, 200, 20);
    makePlatform(1850, height - 180, 140, 20);

    // Spikes
    makeSpike(360, height - 56);
    makeSpike(620, height - 176);
    makeSpike(1040, height - 272);
    makeSpike(1480, height - 316);

    // Coins
    makeCoin(200, height - 150);
    makeCoin(560, height - 200);
    makeCoin(820, height - 260);
    makeCoin(1100, height - 300);
    makeCoin(1350, height - 340);
    makeCoin(1700, height - 220);

    // Goal
    add([
      rect(40, 80, { radius: 6 }),
      pos(levelWidth - 100, height - 120),
      area(),
      color(90, 200, 120),
      outline(3, color(60, 140, 80)),
      'goal',
    ]);

    // Player
    const player = add([
      rect(26, 32, { radius: 4 }),
      pos(40, height - 80),
      area(),
      body(),
      color(240, 240, 255),
      outline(3, color(60, 80, 140)),
      'player',
      { dashing: false },
    ]);

    const camera = { x: 0 };
    const updateCamera = () => {
      camera.x = Math.max(
        0,
        Math.min(player.pos.x - width / 2.2, levelWidth - width),
      );
      k.camPos(camera.x + width / 2, height / 2);
    };

    const tryJump = () => {
      bufferTimer = jumpBuffer;
    };

    onKeyPress('space', tryJump);
    onKeyPress('up', tryJump);

    onKeyPress('shift', () => {
      if (!canDash) return;
      canDash = false;
      player.dashing = true;
      const dir = k.isKeyDown('left') ? -1 : 1;
      player.move(dir * dashForce, -120);
      shake(4);
      setTimeout(() => {
        player.dashing = false;
      }, 180);
      setTimeout(() => {
        canDash = true;
      }, dashCooldown * 1000);
    });

    onKeyDown('left', () => {
      if (player.dashing) return;
      player.move(-playerSpeed, 0);
    });
    onKeyDown('right', () => {
      if (player.dashing) return;
      player.move(playerSpeed, 0);
    });

    onKeyPress('space', () => {
      // handled via buffer / coyote
    });

    onKeyPress('shift', () => {
      // handled above
    });

    onCollide('player', 'spike', () => {
      player.pos = k.vec2(40, height - 80);
      player.vel = k.vec2(0, 0);
      shake(6);
    });

    onCollide('player', 'coin', (_playerRef, coinRef) => {
      coinsCollected += 1;
      coinRef.destroy();
      shake(2);
    });

    onCollide('player', 'goal', () => {
      const duration = time() - startTime;
      const baseGold = 15;
      const coinGold = coinsCollected * 5;
      const timeBonus = Math.max(0, Math.round(30 - duration));
      const totalGold = Math.max(
        0,
        Math.round(baseGold + coinGold + timeBonus),
      );

      onComplete({
        coinsCollected,
        duration: Math.round(duration),
        totalGold,
      });

      go('win');
    });

    k.onUpdate(() => {
      // timers
      const delta = dt();
      if (bufferTimer > 0) bufferTimer -= delta;
      if (coyoteTimer > 0) coyoteTimer -= delta;

      // coyote timer
      if (player.isGrounded()) {
        coyoteTimer = coyoteTime;
      }

      // jump resolve
      if (bufferTimer > 0 && (player.isGrounded() || coyoteTimer > 0)) {
        player.jump(jumpForce);
        bufferTimer = 0;
        coyoteTimer = 0;
      }

      // jump cut for shorter hops
      if (player.vel.y < 0 && !k.isKeyDown('space')) {
        player.vel.y *= jumpCutMultiplier;
      }

      updateCamera();
      if (player.pos.y > height + 400) {
        player.pos = k.vec2(40, height - 80);
        player.vel = k.vec2(0, 0);
      }
    });
  });

  scene('win', () => {
    add([
      text('Level Complete!', { size: 36, width: 600, align: 'center' }),
      pos(k.camPos().x, k.camPos().y - 40),
      anchor('center'),
    ]);
    add([
      text('Press R to replay', { size: 20 }),
      pos(k.camPos().x, k.camPos().y + 10),
      anchor('center'),
    ]);

    onKeyPress('r', () => {
      go('game');
    });
  });

  go('game');
}

export default playPlatformer;
