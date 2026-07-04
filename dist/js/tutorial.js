// tutorial.js — 新手教程系统
/* ============== 新手教程系统 ============== */
const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutStepEl = document.getElementById('tut-step');
const tutTitleEl = document.getElementById('tut-title');
const tutDescEl = document.getElementById('tut-desc');

const TUT_DATA = [
  { title: '欢迎来到星界回响', titleEn: 'Welcome to Stellar Resonance',
    desc: '本游戏采用鼠标无限锁定视角，类似飞行模拟。如果你感觉迷失方向，只需记住：<b>鼠标往前推，机头向上；往后拉，机头向下。</b><br><br>小贴士：随时按 <kbd>ESC</kbd> 可以暂停游戏并解锁鼠标。准备好开始了吗？',
    descEn: 'This game uses infinite mouse-lock view, like a flight sim. If you lose orientation, remember: <b>push the mouse forward to pitch up; pull back to pitch down.</b><br><br>Tip: press <kbd>ESC</kbd> anytime to pause and release the mouse. Ready to begin?' },
  { title: '基础移动', titleEn: 'Basic Movement',
    desc: '使用 <kbd>W</kbd> <kbd>S</kbd> 前进后退，<kbd>A</kbd> <kbd>D</kbd> 左右侧移并带动机身滚转。试着飞一段距离吧！',
    descEn: 'Use <kbd>W</kbd> <kbd>S</kbd> to move forward/back, <kbd>A</kbd> <kbd>D</kbd> to strafe and roll. Try flying around!' },
  { title: '视角控制', titleEn: 'View Control',
    desc: '现在滑动鼠标，环顾四周的星空。试着做一个360度翻转。<br>鼠标的移动幅度决定了转向的速度。',
    descEn: 'Now move the mouse to look around the starscape. Try a full 360° flip.<br>The mouse movement magnitude controls turn speed.' },
  { title: '认识你的战机', titleEn: 'Know Your Fighter',
    desc: '屏幕左下角显示着你的核心状态：<br>• <b style="color:#ff3355">红色血条</b> — 生命值，归零则阵亡<br>• <b style="color:#ffb547">黄色谐振条</b> — 用于加速和突进<br>• <b style="color:#00aaff">蓝色护盾条</b> — 右键开启能量护盾<br><br>底部中央是当前武器栏，按数字键 <kbd>1</kbd>~<kbd>5</kbd> 或滚轮切换。',
    descEn: 'The bottom-left shows your core stats:<br>• <b style="color:#ff3355">Red bar</b> — HP, you die when it hits zero<br>• <b style="color:#ffb547">Yellow bar</b> — Resonance, for boost and dash<br>• <b style="color:#00aaff">Blue bar</b> — Shield, hold right-click to activate<br><br>The bottom-center is the weapon bar — switch with <kbd>1</kbd>~<kbd>5</kbd> or the scroll wheel.' },
  { title: '机关枪射击', titleEn: 'Machine Gun Fire',
    desc: '前方出现了靶机！按住 <kbd>鼠标左键</kbd> 即可持续射击。击毁所有的靶机来继续。',
    descEn: 'Targets ahead! Hold <kbd>Left Mouse</kbd> to keep firing. Destroy all targets to continue.' },
  { title: '武器切换', titleEn: 'Weapon Switching',
    desc: '战机配备了5种武器！按 <kbd>2</kbd>~<kbd>5</kbd> 键尝试切换不同武器，感受各自的射击特性。击毁所有靶机即可通过本关！<br><br>提示：滚轮也可以快速切换武器。',
    descEn: 'Your fighter has 5 weapons! Press <kbd>2</kbd>~<kbd>5</kbd> to try each one and feel its characteristics. Destroy all targets to pass!<br><br>Tip: the scroll wheel also switches weapons quickly.' },
  { title: '导弹锁定', titleEn: 'Missile Lock-On',
    desc: '面对高速敌人时，你需要精准的火力！按下 <kbd>2</kbd> 键切换至导弹发射器。准心对准前方的靶机按住左键锁定1秒，发射追踪导弹将其摧毁！',
    descEn: 'Against fast enemies you need precise firepower! Press <kbd>2</kbd> to switch to the missile launcher. Aim the crosshair at the target, hold left-click to lock on for 1s, and fire a homing missile to destroy it!' },
  { title: '护盾防御', titleEn: 'Shield Defense',
    desc: '敌人开始射击了！按住 <kbd>鼠标右键</kbd> 开启能量护盾，可以抵挡子弹伤害。但护盾会消耗蓝色能量，注意在间隙中关闭以恢复能量。<br><br>在护盾保护下存活一段时间！',
    descEn: 'Enemies are firing now! Hold <kbd>Right Mouse</kbd> to activate the energy shield and block bullets. The shield drains blue energy — release it between volleys to recharge.<br><br>Survive for a while under shield protection!' },
  { title: '完美格挡', titleEn: 'Perfect Block',
    desc: '进阶技巧：<b>在敌人子弹即将命中你的瞬间按下右键</b>开启护盾，可触发<b style="color:#00ffff">完美格挡</b>！<br><br>• 完美格挡<b>不消耗能量</b><br>• 释放蓝色能量波<b>清除周围弹幕</b><br>• 时机要精准 — 按下太早未受到攻击会进入冷却<br><br>试着完美格挡一次敌人的子弹！',
    descEn: 'Advanced technique: <b>press right-click the instant before an enemy bullet hits you</b> to trigger a <b style="color:#00ffff">Perfect Block</b>!<br><br>• Costs <b>no energy</b><br>• Releases a blue energy wave that <b>clears nearby bullets</b><br>• Timing must be precise — pressing too early without taking a hit triggers a cooldown<br><br>Try to perfectly block an enemy bullet once!' },
  { title: '引擎加速', titleEn: 'Engine Boost',
    desc: '遇到危险需要快速脱身时？按住 <kbd>Shift</kbd> 键可以消耗谐振值进行持续加速。试着加速飞行一会！',
    descEn: 'Need to escape danger fast? Hold <kbd>Shift</kbd> to consume resonance for sustained boost. Try boosting for a bit!' },
  { title: '谐振突进 (无敌)', titleEn: 'Resonance Dash (Invincible)',
    desc: '最关键的保命技巧！按下 <kbd>Space</kbd> 键，消耗大量谐振值瞬间向前突进，并获得短暂无敌时间，可以穿透敌人的弹幕。试着突进一次！',
    descEn: 'The most crucial survival skill! Press <kbd>Space</kbd> to consume a large chunk of resonance and dash forward instantly, gaining brief invincibility that lets you pass through enemy bullet patterns. Try dashing once!' },
  { title: '躲避弹幕', titleEn: 'Bullet Hell Evasion',
    desc: '真正的考验来了！前方将出现大量敌机弹幕，尝试利用你学到的移动、护盾和突进来存活 <b>10秒</b>。如果阵亡，则会重新开始本关！',
    descEn: 'The real test begins! A massive bullet pattern lies ahead. Use the movement, shield, and dash skills you learned to survive <b>10 seconds</b>. If you die, the stage restarts!' },
  { title: '教程完成', titleEn: 'Tutorial Complete',
    desc: '你已经掌握了所有基本操作！<br><br>• 每清空一波敌人可获得 <b>3选1强化奖励</b><br>• 每5波将遭遇强大的 <b>Boss</b><br>• 战斗获得的 <b>星晶</b> 可用于永久升级战机<br><br>现在，去正式征服星界吧！',
    descEn: 'You have mastered all the basics!<br><br>• Clear each wave to earn a <b>3-pick-1 buff</b><br>• Every 5 waves a powerful <b>Boss</b> appears<br>• <b>Stellar Crystals</b> earned in battle permanently upgrade your fighter<br><br>Now go conquer the stars!' }
];

function startTutorial() {
  initAudio();
  initAudioContext(); // 初始化 Web Audio 上下文
  overlay.style.display = 'none';
  resetGame();
  STATE.isTutorial = true;
  STATE.started = true;
  TUTORIAL.active = true;
  TUTORIAL.step = 0;
  document.body.classList.add('in-game');
  
  showTutorialStep();
}

function showTutorialStep() {
  if (TUTORIAL.step >= TUT_DATA.length) {
    exitTutorial();
    return;
  }
  
  STATE.paused = true;
  if (document.pointerLockElement === document.body) document.exitPointerLock();
  
  const stepData = TUT_DATA[TUTORIAL.step];
  tutStepEl.textContent = tf('tut.step', { n: TUTORIAL.step + 1, total: TUT_DATA.length }, 'STEP {n} / {total}');
  tutTitleEl.innerHTML = trTitle(stepData);
  tutDescEl.innerHTML = trDesc(stepData);
  tutorialOverlay.classList.add('show');

  document.getElementById('btn-tut-exit').style.display = TUTORIAL.step === 0 ? 'inline-flex' : 'none';
  document.getElementById('btn-tut-next').textContent = (TUTORIAL.step === TUT_DATA.length - 1) ? t('tut.finish', '返回主菜单') : t('tut.next', '开始练习 ▸');
}

document.getElementById('btn-tut-next').addEventListener('click', () => {
  // 如果是最后一步，直接退出
  if (TUTORIAL.step === TUT_DATA.length - 1) {
    exitTutorial();
    return;
  }

  // 关键修复：如果是欢迎界面(step 0)，点击后显示 step 1 的说明面板，不直接进入操作
  if (TUTORIAL.step === 0) {
    TUTORIAL.step = 1;
    showTutorialStep(); // 显示"基础移动"的说明面板
    return;
  }

  // 纯信息步骤：直接跳到下一步，不进入游戏检测
  if (TUTORIAL.step === 3) { // HUD介绍
    TUTORIAL.step = 4;
    showTutorialStep(); // 显示"机关枪射击"面板
    return;
  }

  tutorialOverlay.classList.remove('show');
  STATE.paused = false;
  document.body.requestPointerLock();
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }

  // 根据当前步骤初始化检测条件
  if (TUTORIAL.step === 1) {
    TUTORIAL.movementTracker = 0;
  } else if (TUTORIAL.step === 2) {
    TUTORIAL.mouseMoveTracker = 0;
    TUTORIAL.mouseLookTimer = 0;
  } else if (TUTORIAL.step === 4) {
    spawnTutorialTargets(false); // 机关枪：静止靶机
  } else if (TUTORIAL.step === 5) {
    TUTORIAL.originalWeapon = STATE.weapon;
    TUTORIAL.weaponSwitched = false;
    spawnTutorialTargets(false); // 武器切换：静止靶机
  } else if (TUTORIAL.step === 6) {
    spawnTutorialTargets(true);  // 导弹：高速移动靶机
  } else if (TUTORIAL.step === 7) {
    TUTORIAL.shieldUsed = false;
    TUTORIAL.shieldTimer = 0;
    spawnTutorialShieldEnemy();  // 护盾：生成射击敌人
  } else if (TUTORIAL.step === 8) {
    // 完美格挡：生成慢速射击炮台供玩家练习时机
    TUTORIAL.perfectBlockDone = false;
    spawnTutorialPerfectBlockEnemy();
  } else if (TUTORIAL.step === 9) {
    TUTORIAL.boostTracker = 0;
  } else if (TUTORIAL.step === 10) {
    TUTORIAL.dashed = false;
    TUTORIAL.dashEndTimer = 0;
  } else if (TUTORIAL.step === 11) {
    spawnTutorialBulletHell();
  }
});

document.getElementById('btn-tut-exit').addEventListener('click', exitTutorial);

function exitTutorial() {
  tutorialOverlay.classList.remove('show');
  TUTORIAL.active = false;
  STATE.isTutorial = false;
  returnToMenu();
}

function spawnTutorialTargets(isFast = false) {
  TUTORIAL.targets = [];
  for(let i=0; i<3; i++) {
    const e = createEnemyShip(0);
    const angle = (i - 1) * 0.5;
    const dir = new THREE.Vector3(Math.sin(angle), 0, -1).normalize();
    e.mesh.position.copy(player.position).add(dir.multiplyScalar(40));
    e.maxSpeed = isFast ? 2.5 : 0; // 如果是第四步，速度设为 2.5 高速移动
    e.maxFireTimer = 999999; // 靶机不射击
    scene.add(e.mesh);
    enemies.push(e);
    TUTORIAL.targets.push(e);
  }
}

function spawnTutorialBulletHell() {
  // 清理残留
  for(const e of enemies) {
    if(e.mesh.parent) scene.remove(e.mesh);
    disposeNode(e.mesh);
  }
  enemies.length = 0;
  for(const b of enemyBullets) releaseEnemyBullet(b);
  enemyBullets.length = 0;

  STATE.hp = STATE.maxHp; // 恢复满血
  TUTORIAL.surviveTimer = 0;

  // 生成 3 个固定炮台，疯狂射击
  for(let i=0; i<3; i++) {
    const e = createEnemyShip(0);
    const angle = (i / 3) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), (Math.random()-0.5)*0.5, Math.sin(angle)).normalize();
    e.mesh.position.copy(player.position).add(dir.multiplyScalar(80));
    e.maxSpeed = 0.1; // 几乎不动，当作炮台
    e.maxFireTimer = 25; // 疯狂射击
    e.bulletSpeed = 1.8;
    scene.add(e.mesh);
    enemies.push(e);
  }
}

function spawnTutorialShieldEnemy() {
  // 清理残留
  for(const e of enemies) {
    if(e.mesh.parent) scene.remove(e.mesh);
    disposeNode(e.mesh);
  }
  enemies.length = 0;
  for(const b of enemyBullets) releaseEnemyBullet(b);
  enemyBullets.length = 0;

  STATE.hp = STATE.maxHp;
  STATE.shield = STATE.maxShield;
  TUTORIAL.targets = [];

  // 生成 1 个固定炮台，缓慢射击，供玩家练习开盾
  const e = createEnemyShip(0);
  const dir = new THREE.Vector3(0, 0.2, -1).normalize();
  e.mesh.position.copy(player.position).add(dir.multiplyScalar(60));
  e.maxSpeed = 0; // 固定不动
  e.maxFireTimer = 50; // 较慢射击
  e.bulletSpeed = 1.5;
  e.bulletDmg = 5; // 较低伤害
  scene.add(e.mesh);
  enemies.push(e);
  TUTORIAL.targets.push(e);
}

// 完美格挡练习：生成 1 个慢速射击炮台，子弹速度慢、间隔长，方便玩家掌握时机
function spawnTutorialPerfectBlockEnemy() {
  // 清理残留
  for(const e of enemies) {
    if(e.mesh.parent) scene.remove(e.mesh);
    disposeNode(e.mesh);
  }
  enemies.length = 0;
  for(const b of enemyBullets) releaseEnemyBullet(b);
  enemyBullets.length = 0;

  STATE.hp = STATE.maxHp;
  STATE.shield = STATE.maxShield;
  // 重置完美格挡冷却，确保玩家进入练习时能立即尝试
  STATE.perfectBlockTimer = 0;
  STATE.perfectBlockCooldownTimer = 0;
  STATE.perfectBlockFlash = 0;
  TUTORIAL.targets = [];

  // 生成 1 个固定炮台，慢速射击供玩家练习完美格挡时机
  const e = createEnemyShip(0);
  const dir = new THREE.Vector3(0, 0.2, -1).normalize();
  e.mesh.position.copy(player.position).add(dir.multiplyScalar(50));
  e.maxSpeed = 0;          // 固定不动
  e.maxFireTimer = 80;     // 慢速射击（约 1.3 秒一发），给玩家充分反应时间
  e.bulletSpeed = 1.2;     // 慢速子弹，方便玩家看清时机
  e.bulletDmg = 8;         // 适中伤害（完美格挡不耗血，普通命中也不会一次死）
  scene.add(e.mesh);
  enemies.push(e);
  TUTORIAL.targets.push(e);
}

function updateTutorial() {
  if(!TUTORIAL.active || STATE.paused) return;
  
  let advance = false;
  
    switch(TUTORIAL.step) {
    case 1: // 移动
      if(PLAYER.vel.lengthSq() > 0.05) TUTORIAL.movementTracker = (TUTORIAL.movementTracker||0) + 1;
      if(TUTORIAL.movementTracker > 90) advance = true; // 持续移动约 1.5 秒
      break;
    case 2: // 视角
      if(TUTORIAL.mouseMoveTracker > 6000) advance = true; // 需要大幅转动鼠标
      break;
    case 4: // 机关枪射击
      if(TUTORIAL.targets.length === 0 || TUTORIAL.targets.every(t => t.hp <= 0 || !t.mesh.parent)) {
        TUTORIAL.targets = [];
        advance = true;
      }
      break;
    case 5: // 武器切换
      if(STATE.weapon !== TUTORIAL.originalWeapon) TUTORIAL.weaponSwitched = true;
      if(TUTORIAL.targets.length === 0 || TUTORIAL.targets.every(t => t.hp <= 0 || !t.mesh.parent)) {
        TUTORIAL.targets = [];
        if(TUTORIAL.weaponSwitched) advance = true; // 必须切换过武器且击毁靶机
      }
      break;
    case 6: // 导弹锁定
      if(TUTORIAL.targets.length === 0 || TUTORIAL.targets.every(t => t.hp <= 0 || !t.mesh.parent)) {
        TUTORIAL.targets = [];
        advance = true;
      }
      break;
    case 7: // 护盾防御
      if(STATE.shieldActive) TUTORIAL.shieldUsed = true;
      if(TUTORIAL.shieldUsed) {
        TUTORIAL.shieldTimer = (TUTORIAL.shieldTimer || 0) + 1;
        if(TUTORIAL.shieldTimer > 300) advance = true; // 开盾后存活约 5 秒
      }
      if(STATE.hp <= 0) {
        showToast(t('toast.tut_shield_fail', '阵亡！重新练习护盾防御'), 1000);
        STATE.hp = STATE.maxHp;
        STATE.shield = STATE.maxShield;
        TUTORIAL.shieldUsed = false;
        TUTORIAL.shieldTimer = 0;
        spawnTutorialShieldEnemy();
      }
      break;
    case 8: // 完美格挡 — 必须成功触发一次完美格挡才算通过
      if(TUTORIAL.perfectBlockDone) {
        TUTORIAL.perfectBlockTimer = (TUTORIAL.perfectBlockTimer || 0) + 1;
        // 完美格挡成功后缓冲 60 帧（1秒），让玩家看清能量波效果
        if(TUTORIAL.perfectBlockTimer > 60) advance = true;
      }
      if(STATE.hp <= 0) {
        showToast(t('toast.tut_parblock_fail', '阵亡！重新练习完美格挡'), 1000);
        STATE.hp = STATE.maxHp;
        STATE.shield = STATE.maxShield;
        TUTORIAL.perfectBlockDone = false;
        TUTORIAL.perfectBlockTimer = 0;
        spawnTutorialPerfectBlockEnemy();
      }
      break;
    case 9: // 加速
      if((KEYS['ShiftLeft']||KEYS['ShiftRight']) && STATE.energy < STATE.maxEnergy) {
        TUTORIAL.boostTracker = (TUTORIAL.boostTracker||0) + 1;
      }
      if(TUTORIAL.boostTracker > 180) advance = true; // 持续加速约 3 秒
      break;
    case 10: // 突进
      if(STATE.isDashing || STATE.invincibleTimer > 0) TUTORIAL.dashed = true;
      // 突进后增加 60 帧 (1秒) 的缓冲时间，让玩家看清楚效果
      if(TUTORIAL.dashed) {
        TUTORIAL.dashEndTimer = (TUTORIAL.dashEndTimer || 0) + 1;
        if(TUTORIAL.dashEndTimer > 60) advance = true;
      }
      break;
    case 11: // 躲避弹幕
      if(STATE.hp <= 0) {
        // 阵亡重来
        showToast(t('toast.tut_dodge_fail', '阵亡！重新开始躲避'), 1000);
        spawnTutorialBulletHell();
      } else {
        TUTORIAL.surviveTimer++;
        if(TUTORIAL.surviveTimer > 600) { // 存活 10 秒 (60fps)
          advance = true;
        }
      }
      break;
  }

    if(advance) {
    TUTORIAL.step++;
    // 进入最后一步(教程完成)时，清理场上的敌人和子弹
    if (TUTORIAL.step === TUT_DATA.length - 1) {
      for(const e of enemies) {
        if(e.mesh.parent) scene.remove(e.mesh);
        disposeNode(e.mesh); // <--- 补上这一行，彻底清理教程残留
      }
      enemies.length = 0;
      for(const b of enemyBullets) releaseEnemyBullet(b);
      enemyBullets.length = 0;
    }
    showTutorialStep();
  }

  // 防止靶机飞太远
  for(let i=enemies.length-1; i>=0; i--) {
    const e = enemies[i];
    if(e.mesh.position.distanceTo(player.position) > 100) {
      const dir = player.position.clone().sub(e.mesh.position).normalize();
      e.mesh.position.copy(player.position).sub(dir.multiplyScalar(50));
    }
  }
}

document.getElementById('btn-tutorial').addEventListener('click', startTutorial);
