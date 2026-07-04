// main.js — 游戏流程、主循环、所有顶层可执行语句（保持原始相对顺序）

// === 语音合成初始化（顶层语句，原位于 audio.js 区域）===
if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// === 局外成长初始化（顶层语句，原位于 meta.js 区域）===
loadMeta();

/* 初始化难度选择按钮 */
const diffSelectContainer = document.getElementById('diff-select');
Object.keys(DIFFICULTIES).forEach(key => {
  const div = document.createElement('div');
  div.className = 'diff-btn' + (key === 'standard' ? ' active' : '');
  div.dataset.diff = key;
  div.innerHTML = `
    <div class="d-name">${trName(DIFFICULTIES[key])}</div>
    <div class="d-best">BEST: 0</div>
  `;
  div.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    div.classList.add('active');
    STATE.difficulty = key;
  });
  diffSelectContainer.appendChild(div);
});

refreshDifficultyUI(); // 首次加载时读取一次

// initAuthSystem() 移至 AUTH 定义之后调用

// === WebGL 上下文丢失保护（顶层语句，原位于 scene.js 区域）===
// 修复：WebGL 上下文丢失保护。当显卡资源紧张或标签页长时间挂起时，
// 浏览器可能强制回收 WebGL 上下文，未处理会导致渲染循环静默崩溃、画面卡死。
threeCanvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); // 阻止默认行为，允许后续 restore 事件
  STATE.paused = true;
  pauseOverlay.classList.add('show');
  const _pauseText = document.querySelector('.pause-text');
  const _pauseSub = document.querySelector('.pause-sub');
  if (_pauseText) _pauseText.textContent = t('webgl.lost.title', '渲染引擎中断 / WEBGL LOST');
  if (_pauseSub) _pauseSub.textContent = t('webgl.lost.sub', '请刷新页面以恢复游戏');
}, false);

/* ============== 控制与鼠标锁定 ============== */
let isPointerLocked = false;

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === document.body;
  // 剧情模式下完全跳过指针锁状态切换，避免覆盖 startDialogue 设置的 paused 状态
  if (STATE.inCutscene) return;
  if (!isPointerLocked && STATE.started && !STATE.over && !STATE.inReward) {
    // 如果在教程中且教程面板未显示，才显示暂停遮罩
    if (STATE.isTutorial && !tutorialOverlay.classList.contains('show')) {
      STATE.paused = true;
      pauseOverlay.classList.add('show');
    } else if (!STATE.isTutorial) {
      STATE.paused = true;
      pauseOverlay.classList.add('show');
    }
  } else if (isPointerLocked && STATE.paused) {
    STATE.paused = false;
    pauseOverlay.classList.remove('show');
  }
});

pauseOverlay.addEventListener('click', (e) => {
  // 点击暂停面板内的按钮（设置/返回主菜单）时不触发恢复，由按钮自身逻辑处理
  if(e.target.closest('button')) return;
  document.body.requestPointerLock();
});

threeCanvas.addEventListener('click', () => {
  initAudioContext(); // 确保音频上下文已激活
  // 修复：CRT 终端覆盖层显示时由它接管剧情推进点击，避免双监听器同时触发
  const _crtTerm = document.getElementById('crt-terminal');
  if (_crtTerm && _crtTerm.classList.contains('show')) return;
  if(STATE.inCutscene) {
    nextDialogue();
  }
});

// CRT 终端覆盖层点击：推进剧情（剧情期间由本层独占响应）
const crtTerminalEl = document.getElementById('crt-terminal');
if (crtTerminalEl) {
  crtTerminalEl.addEventListener('click', () => {
    initAudioContext();
    if (STATE.inCutscene) nextDialogue();
  });
}

function returnToMenu() {
  STATE.started = false; STATE.over = false; STATE.paused = false; STATE.inReward = false;
  STATE.isTutorial = false; // 清理教程状态
  STATE.inCutscene = false; STATE.victory = false; // 清理剧情/胜利状态
  STATE.bossActive = false; STATE.currentBoss = null;
  TUTORIAL.active = false;  // 清理教程活动状态
  stopTypewriter(); // 停止打字机
  stopSpeech(); // 停止所有语音
  // 清理剧情加载进度条的定时器，防止返回主菜单后回调残留触发 showCurrentDialogue/spawnBoss
  if (STATE.loadingInterval) { clearInterval(STATE.loadingInterval); STATE.loadingInterval = null; }
  if (STATE.loadingTimeout) { clearTimeout(STATE.loadingTimeout); STATE.loadingTimeout = null; }
  const _crt = document.getElementById('crt-terminal');
  if (_crt) _crt.classList.remove('show');
  pauseOverlay.classList.remove('show');
  tutorialOverlay.classList.remove('show'); // 隐藏教程面板
  rewardOverlay.classList.remove('show');
  overlay.style.display = 'flex';
  endScreen.style.display = 'none';
  document.body.classList.remove('in-game');
  if (document.pointerLockElement === document.body) document.exitPointerLock();

  for(const e of enemies) { 
    if (e.type === 3) cleanupBoss(e); // 清理 Boss 特殊状态（引力井、炮塔无人机等）
    scene.remove(e.mesh); 
    disposeNode(e.mesh); // <--- 新增
  }
  enemies.length = 0;
  for(const b of bullets) releaseBullet(b);
  for(const m of missiles) releaseMissile(m);
  missiles.length = 0;
  bullets.length = 0;
  for(const b of enemyBullets) { b.splitPattern=null; b.mesh.scale.set(1,1,1); releaseEnemyBullet(b); }
  enemyBullets.length = 0;
  for(const sw of shockwaves) {
    releaseShockwave(sw);
  }
  shockwaves.length = 0;
  for(const f of activeFlashes) f.mesh.visible=false;
  activeFlashes.length = 0;
  particles.length = 0;
  // 修复：显式清零粒子缓冲区，避免下局开始时旧粒子数据闪现一帧
  particlePos.fill(0);
  particleCol.fill(0);
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
  particleGeo.setDrawRange(0, 0);

  refreshDifficultyUI(); // <--- 加上这一行，返回主菜单时刷新最高分显示
}


document.getElementById('btn-menu').addEventListener('click', returnToMenu);
document.getElementById('btn-end-menu').addEventListener('click', returnToMenu);
document.getElementById('btn-end-meta').addEventListener('click', () => {
  // 不隐藏结束界面，星晶面板覆盖在上面，关闭后自然回到结束界面
  document.getElementById('meta-overlay').classList.add('show');
  renderMetaShop();
});

/* ============== 画质设置面板 ============== */
const settingsOverlay = document.getElementById('settings-overlay');
const qualityGrid = document.getElementById('quality-grid');
const qualityDesc = document.getElementById('quality-desc');
const QUALITY_DESCRIPTIONS = [
  '关闭所有光照、雾效、粒子。敌人/玩家使用纯色无光照材质，适合低端设备。',
  '启用雾效和简单光照。使用 Phong 材质，减少粒子数量，关闭点光源。',
  '标准 PBR 渲染。使用 Standard 材质，保留雾效和适量粒子/光源。推荐配置。',
  '极致物理材质。Boss 晶体/护盾使用 Physical 材质 + transmission 折射 + clearcoat 清漆 + sheen/iridescence；光强与中画质一致，仅材质与粒子更精细。需要高性能显卡。'
];
const QUALITY_DESCRIPTIONS_EN = [
  'Disable all lighting, fog, particles. Enemies/player use flat unlit materials. Suitable for low-end devices.',
  'Enable fog and simple lighting. Phong materials, reduced particles, no point lights.',
  'Standard PBR rendering. Standard materials with fog and moderate particles/lights. Recommended.',
  'Ultra physical material. Boss crystals/shields use Physical material + transmission refraction + clearcoat + sheen/iridescence. Light intensity matches Mid quality; only materials and particles are richer. Requires a high-end GPU.'
];

function renderQualityGrid() {
  qualityGrid.innerHTML = '';
  GRAPHICS_PRESETS.forEach((preset, i) => {
    const btn = document.createElement('div');
    btn.className = 'quality-btn' + (i === STATE.graphicsQuality ? ' active' : '');
    btn.innerHTML = `<span class="q-name">${trGfxName(preset)}</span><span class="q-label">${preset.label || 'MID'}</span>`;
    btn.addEventListener('click', () => {
      STATE.graphicsQuality = i;
      localStorage.setItem('sr_graphicsQuality', i);
      renderQualityGrid();
      qualityDesc.textContent = (STATE.lang === 'en') ? QUALITY_DESCRIPTIONS_EN[i] : QUALITY_DESCRIPTIONS[i];
    });
    qualityGrid.appendChild(btn);
  });
  qualityDesc.textContent = (STATE.lang === 'en') ? QUALITY_DESCRIPTIONS_EN[STATE.graphicsQuality] : QUALITY_DESCRIPTIONS[STATE.graphicsQuality];
}

document.getElementById('btn-settings').addEventListener('click', () => {
  renderQualityGrid();
  syncLangGrid();
  settingsOverlay.classList.add('show');
});

// 主菜单设置按钮：与暂停菜单共用同一面板
document.getElementById('btn-menu-settings').addEventListener('click', () => {
  renderQualityGrid();
  syncLangGrid();
  settingsOverlay.classList.add('show');
});

// 语言选择网格：高亮当前语言并响应切换
const langGrid = document.getElementById('lang-grid');
function syncLangGrid() {
  if (!langGrid) return;
  langGrid.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === STATE.lang);
  });
}
if (langGrid) {
  langGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (!btn) return;
    setLang(btn.dataset.lang);
    syncLangGrid();
  });
}

document.getElementById('btn-settings-close').addEventListener('click', () => {
  settingsOverlay.classList.remove('show');
  // 如果画质有变化且正在游戏中，提示需要重新开始
  const saved = parseInt(localStorage.getItem('sr_graphicsQuality'));
  if (saved !== STATE.graphicsQuality) {
    localStorage.setItem('sr_graphicsQuality', STATE.graphicsQuality);
    if (STATE.started && !STATE.over) {
      showToast(t('toast.gfx_changed_restart', '画质已切换，重新开始生效'), 2000);
      returnToMenu();
    } else {
      showToast(t('toast.gfx_changed', '画质已切换'), 1500);
    }
  }
});

// 复用的鼠标旋转四元数
const _mouseQY = new THREE.Quaternion();
const _mouseQX = new THREE.Quaternion();
const _vRight = new THREE.Vector3(1, 0, 0);
// 敌人开火逻辑专用复用临时量（避免每次开火 new Quaternion / clone Vector3）
const _qFire = new THREE.Quaternion();
const _vFire = new THREE.Vector3();
window.addEventListener('mousemove', e=>{
  if (isPointerLocked && STATE.started && !STATE.over && !STATE.paused) {
    _mouseQY.setFromAxisAngle(_vUp, -e.movementX * 0.0025);
    _mouseQX.setFromAxisAngle(_vRight, -e.movementY * 0.0025);

    PLAYER.quaternion.multiply(_mouseQY);
    PLAYER.quaternion.multiply(_mouseQX);
    PLAYER.quaternion.normalize();

    // 教程进度追踪：鼠标移动
    if (TUTORIAL.active) {
      TUTORIAL.mouseMoveTracker = (TUTORIAL.mouseMoveTracker || 0) + Math.abs(e.movementX) + Math.abs(e.movementY);
    }
  }
});

window.addEventListener('keyup', e=>{ KEYS[e.code]=false; });

// 合并后的键盘事件监听
window.addEventListener('keydown', e=>{ 
  KEYS[e.code]=true; // 这一行必须在最前面，确保所有按键都被记录

  // 阻止方向键和空格的默认行为，防止页面滚动
  if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }

  // ===== 测试后门：按 B 键直接召唤下一个 Boss =====
  if(e.code === 'KeyB' && STATE.started && !STATE.over && !STATE.paused && !STATE.inCutscene) {
    // 1. 清空当前场景的小怪和子弹
    for(let i=enemies.length-1; i>=0; i--) {
      if (enemies[i].type === 3) cleanupBoss(enemies[i]);
      scene.remove(enemies[i].mesh);
      disposeNode(enemies[i].mesh);
      enemies.splice(i, 1);
    }
    for(let i=enemyBullets.length-1; i>=0; i--) { enemyBullets[i].splitPattern=null; enemyBullets[i].mesh.scale.set(1,1,1); releaseEnemyBullet(enemyBullets[i]); }
    enemyBullets.length = 0;
    
    // 2. 强制设置为 Boss 波次 (5的倍数)
    STATE.wave = Math.floor(STATE.wave / 5) * 5 + 5;
    STATE.waveEnemiesLeft = 0;
    
    // 3. 推进 Boss 索引并召唤
    STATE.bossIndex = (STATE.bossIndex || 0) + 1;
    if (STATE.bossIndex > 3) STATE.bossIndex = 0; // 循环测试
    
    spawnBoss();
    showToast(t('toast.test_backdoor', '🚀 测试后门: 强制召唤 BOSS ') + (STATE.bossIndex + 1), 2000);
  }

  if(e.code==='Space') {
    // 触发谐振突进
    if(STATE.started && !STATE.over && !STATE.paused && !STATE.inReward) {
      if(STATE.energy >= 40 && STATE.invincibleTimer <= 0) {
        STATE.energy -= 40;
        STATE.isDashing = true;
        STATE.dashTimer = 6;
        STATE.invincibleTimer = 15;
        STATE.flash = 0.4; STATE.flashColor = 0x00ffe5;
        playDash();
      }
    }
  }
  
  // 数字键切换武器
  if(e.code === 'Digit1' && STATE.started) { STATE.weapon = 0; showWeaponSwitchUI(); STATE.lockTarget = null; STATE.lockTimer = 0; STATE.plasmaCharge = 0; }
  if(e.code === 'Digit2' && STATE.started) { STATE.weapon = 1; showWeaponSwitchUI(); STATE.lockTarget = null; STATE.lockTimer = 0; STATE.plasmaCharge = 0; }
  if(e.code === 'Digit3' && STATE.started) { STATE.weapon = 2; showWeaponSwitchUI(); STATE.lockTarget = null; STATE.lockTimer = 0; STATE.plasmaCharge = 0; }
  if(e.code === 'Digit4' && STATE.started) { STATE.weapon = 3; showWeaponSwitchUI(); STATE.lockTarget = null; STATE.lockTimer = 0; STATE.plasmaCharge = 0; }
  if(e.code === 'Digit5' && STATE.started) { STATE.weapon = 4; showWeaponSwitchUI(); STATE.lockTarget = null; STATE.lockTimer = 0; STATE.plasmaCharge = 0; }
});

// 鼠标滚轮切换武器
window.addEventListener('wheel', (e) => {
  if(!STATE.started || STATE.over || STATE.paused) return;
  if(e.deltaY > 0) STATE.weapon = (STATE.weapon + 1) % STATE.weapons.length;
  else STATE.weapon = (STATE.weapon - 1 + STATE.weapons.length) % STATE.weapons.length;
  showWeaponSwitchUI();
  // 切换武器时取消锁定
  STATE.lockTarget = null; STATE.lockTimer = 0;
});
// 禁用浏览器右键菜单
window.addEventListener('contextmenu', e => e.preventDefault());

// 鼠标按键状态监听 (纯净版，不加 preventDefault，以免影响 pointerlock)
window.addEventListener('mousedown', e=>{ 
  if(e.button===0) MOUSE.down=true; 
  if(e.button===2) MOUSE.rightDown=true; 
});

window.addEventListener('mouseup', e=>{ 
  if(e.button===0) MOUSE.down=false; 
  if(e.button===2) MOUSE.rightDown=false; 
});

// 失焦保护，防止护盾或移动卡住
window.addEventListener('blur', () => {
  MOUSE.down = false;
  MOUSE.rightDown = false;
  for(let k in KEYS) KEYS[k] = false;
});

/* ============== 游戏逻辑 ============== */
let lastFpsTime=0, frames=0;

function startWave(){
  STATE.wave++; STATE.waveInterval = 60;
  
  if(STATE.wave % 5 === 0) {
    // Boss波：waveEnemiesLeft 设为 0，避免 update 里的普通敌人刷新逻辑误刷小怪
    STATE.waveEnemiesLeft = 0;
    STATE.waveInterval = 9999; // Boss 波不使用普通刷怪计时器
    
    const bossVariant = STATE.bossIndex % 4;
    const bossStory = ['boss1', 'boss2', 'boss3', 'boss4'][bossVariant];
    startDialogue(bossStory, () => {
      spawnBoss();
      showToast(t('toast.boss_approach', '⚠ BOSS APPROACHING ⚠'), 1800);
      // 剧情结束后再锁定指针，进入战斗
      document.body.requestPointerLock();
    });
  } else {
    STATE.waveEnemiesLeft = 6 + STATE.wave*3;
    showToast('WAVE ' + String(STATE.wave).padStart(2,'0'), 1200);
  }
  playWave();
}

function spawnBoss() {
  // Boss 轮换：4 种 Boss 循环出现
  const bossVariant = STATE.bossIndex % 4;
  const e = createEnemyShip(3, bossVariant);
  // 在玩家前方生成 Boss，确保可见（前方为 -z 方向）
  const dist = 250; 
  const angle = (Math.random() - 0.5) * 0.6; // 小范围偏角，避免完全正中
  const dir = new THREE.Vector3(Math.sin(angle), (Math.random() - 0.5) * 0.3, -Math.cos(angle));
  dir.normalize();
  e.mesh.position.copy(player.position).add(dir.multiplyScalar(dist));
  e.bossState = 0;
  e.stateTimer = 180;
  e.bossVariant = bossVariant;
  e.isBoss = true;
  scene.add(e.mesh); 
  enemies.push(e);
  // 设置 Boss 活跃状态
  STATE.bossActive = true;
  STATE.currentBoss = e;
  playBossBgm(bossVariant);
  // 显示 Boss 名称
  showToast(t('toast.boss_appear', '⚠ BOSS: ') + trBoss(bossVariant) + ' ⚠', 2000);
}

function triggerReward() {
  STATE.inReward = true;
  
  if (STATE.wave >= 20) {
    // 胜利结局：标记 victory，避免 gameOver 误播 defeat 剧情
    STATE.victory = true;
    STATE.inReward = false; // 胜利分支不走奖励选择，立即清除
    startDialogue('victory', () => {
      // 剧情结束后再进入结算界面
      victoryEnd();
    });
    return;
  }
  
  for(let i=bullets.length-1;i>=0;i--) releaseBullet(bullets[i]);
  bullets.length = 0;
  for(let i=enemyBullets.length-1;i>=0;i--) { enemyBullets[i].splitPattern=null; enemyBullets[i].mesh.scale.set(1,1,1); releaseEnemyBullet(enemyBullets[i]); }
  enemyBullets.length = 0;
    for(let i=shockwaves.length-1;i>=0;i--) {
    releaseShockwave(shockwaves[i]);
  }
  shockwaves.length = 0;
  for(const f of activeFlashes) f.mesh.visible=false;
  activeFlashes.length = 0;
  particles.length = 0;
  // 修复：显式清零粒子缓冲区，避免下局开始时旧粒子数据闪现一帧
  particlePos.fill(0);
  particleCol.fill(0);
  particleGeo.attributes.position.needsUpdate = true;
  particleGeo.attributes.color.needsUpdate = true;
  particleGeo.setDrawRange(0, 0);

  if (document.pointerLockElement === document.body) document.exitPointerLock();
  
  const available = [...REWARDS];
  const choices = [];
  for(let i=0; i<3 && available.length>0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    choices.push(available.splice(idx, 1)[0]);
  }
  
  rewardCardsContainer.innerHTML = '';
  choices.forEach(r => {
    const card = document.createElement('div');
    card.className = 'reward-card';
    card.innerHTML = `
      <div class="r-icon">${r.icon}</div>
      <div class="r-name">${trName(r)}</div>
      <div class="r-desc">${trDesc(r)}</div>
    `;
    card.addEventListener('click', () => selectReward(r.id));
    rewardCardsContainer.appendChild(card);
  });
  
  rewardOverlay.classList.add('show');
}

function selectReward(id) {
  switch(id) {
    case 'bullet_up':
      STATE.bulletLevel = Math.min(5, STATE.bulletLevel + 1);
      break;
    case 'fire_rate':
      STATE.fireRate = Math.max(1, STATE.fireRate * 0.8);
      break;
    case 'heal':
      STATE.hp = Math.min(STATE.maxHp, STATE.hp + 40); // 修改回血量为40
      break;
    case 'max_hp':
      STATE.maxHp += 20;
      STATE.hp = Math.min(STATE.maxHp, STATE.hp + 20);
      break;
    case 'bullet_speed':
      STATE.bulletSpeed *= 1.25;
      break;
    case 'move_speed':
      STATE.moveSpeed *= 1.15;
      break;
    case 'max_energy':
      STATE.maxEnergy += 40;
      STATE.energy = STATE.maxEnergy;
      break;
    case 'energy_regen':
      STATE.energyRegen *= 1.5;
      break;
    case 'crit_up':
      STATE.critChance = Math.min(0.85, STATE.critChance + 0.12);
      break;
    case 'crit_mult':
      STATE.critMult += 0.5;
      break;
    case 'lifesteal':
      STATE.lifesteal = Math.min(0.5, STATE.lifesteal + 0.05);
      break;
    case 'dash_dmg':
      STATE.dashDamage += 30;
      break;
    case 'shield_up':
      STATE.maxShield += 30;
      STATE.shield = STATE.maxShield;
      break;
    case 'dmg_up':
      STATE.bulletDmgBonus += 0.15;
      break;
    case 'plasma_boost':
      STATE.plasmaChargeRate = (STATE.plasmaChargeRate || 2.5) * 1.5;
      break;
    case 'arc_chain':
      STATE.arcChainBonus = (STATE.arcChainBonus || 0) + 2;
      break;
    case 'full_heal':
      STATE.hp = STATE.maxHp;
      STATE.shield = STATE.maxShield;
      break;
    case 'energy_burst':
      STATE.energy = STATE.maxEnergy;
      STATE.energyRegen *= 1.3;
      break;
  }
  
  rewardOverlay.classList.remove('show');
  STATE.inReward = false;
  startWave();
  // 只有当 startWave 没有触发剧情时才立即锁定指针；
  // Boss 波的剧情回调结束后会自行 requestPointerLock
  if (!STATE.inCutscene) {
    document.body.requestPointerLock();
  }
}

function killEnemy(e, idx){
  const pos = e.mesh.position.clone();
  // 各类型基础分数
  const scoreMap = {0:10, 1:25, 2:50, 3:500, 4:35, 5:40, 6:60, 7:30};
  const baseScore = scoreMap[e.type] || 10;
  const gained = baseScore + Math.floor(STATE.combo*0.5);
  STATE.score += gained; STATE.combo++; STATE.comboTimer=120;
  if(STATE.combo > STATE.maxCombo) STATE.maxCombo = STATE.combo;
  const expSize = e.type===3?50:(e.type===2?30:(e.type>=4?22:12));
  explode(pos, e.color, expSize, e.scale);
  
  // Boss 死亡处理：清理 Boss 状态、推进 Boss 轮换索引
  if (e.type === 3) {
    cleanupBoss(e); // 清理引力井、炮塔无人机、预言标记等特殊状态
    STATE.bossActive = false;
    STATE.currentBoss = null;
    STATE.bossIndex = (STATE.bossIndex || 0) + 1;
    stopBossBgm();
    // Boss 死亡大爆炸特效
    explode(pos, 0xffffff, 60, 10, false);
    STATE.flash = 1.0; STATE.flashColor = e.color;
    STATE.shake = 20;
  }
  
  // 分裂者死亡时分裂成 2 个小型突击手
  if (e.behavior === 'splitter' && !e.isChild) {
    for (let k = 0; k < 2; k++) {
      const child = createEnemyShip(0); // 小型突击手
      child.mesh.position.copy(pos);
      child.mesh.position.x += (k === 0 ? -8 : 8);
      child.isChild = true;
      child.hp = 2;
      child.scale = 0.6;
      child.mesh.scale.setScalar(0.6);
      child.radius = 2.0;
      scene.add(child.mesh); enemies.push(child);
    }
  }
  
  scene.remove(e.mesh); 
  disposeNode(e.mesh); // <--- 新增这行：释放敌人网格资源
  enemies.splice(idx,1);
  if(HUD.W) spawnFloater('+'+gained, HUD.W/2+(Math.random()-0.5)*100, HUD.H/2+(Math.random()-0.5)*80, e.color, e.type===2||e.type===3);
  STATE.energy = Math.min(STATE.maxEnergy, STATE.energy+4);
  if(STATE.combo>0 && STATE.combo%10===0){ showToast('RESONANCE ×' + STATE.combo + '!', 900); STATE.flash=0.6; STATE.flashColor=0xffb547; }
}

function gameOver(){
  if (STATE.isTutorial) return;
  stopBossBgm();
  if(STATE.over) return;
  // 应急重生：若有复活次数，半血复活（胜利时不触发复活）
  if (!STATE.victory && STATE.reviveLeft && STATE.reviveLeft > 0) {
    STATE.reviveLeft -= 1;
    STATE.hp = STATE.maxHp * 0.5;
    STATE.shield = STATE.maxShield * 0.5;
    STATE.invincibleTimer = 180;
    STATE.over = false;
    explode(player.position, 0x00ffe5, 30, 1.8);
    STATE.flash = 1.0; STATE.flashColor = 0x00ffe5;
    STATE.shake = 8; // 应急重生震动（explode 已不再自动加 shake）
    showToast(t('toast.revive', '应急重生'), 1200);
    return;
  }
  
  STATE.over=true; STATE.started=false; STATE.paused=false;
  if (document.pointerLockElement === document.body) document.exitPointerLock();
  pauseOverlay.classList.remove('show');
  document.body.classList.remove('in-game');
  explode(player.position, 0x00ffe5, 40, 2.2);
  STATE.shake = 12; // 游戏结束震动（explode 已不再自动加 shake）
  
  // 结算星晶奖励：基于分数、波次、最大连击
  const earned = Math.floor(STATE.score / 100 + STATE.wave * 5 + STATE.maxCombo * 2);
  const crystalBonus = 1 + getMetaBonus('m_crystal');
  const finalEarned = Math.floor(earned * crystalBonus);
  STATE.crystals = finalEarned;
  META.crystals += finalEarned;
  saveMeta();
  
  const record = { score: STATE.score, wave: STATE.wave, maxCombo: STATE.maxCombo };
  const isNewBest = saveBestRecord(STATE.difficulty, record);
  const best = getBestRecord(STATE.difficulty);
  
  // 胜利时不播放 defeat 剧情，直接显示结算界面
  if (STATE.victory) {
    setTimeout(()=>{
      showEndScreen(finalEarned, best, isNewBest);
    }, 600);
    return;
  }
  
  startDialogue('defeat', () => {
    setTimeout(()=>{
      showEndScreen(finalEarned, best, isNewBest);
    }, 600);
  });
}

// 结算界面显示逻辑（胜利/失败共用）
function showEndScreen(finalEarned, best, isNewBest) {
  document.getElementById('end-score').textContent=STATE.score.toLocaleString();
  document.getElementById('end-wave').textContent=String(STATE.wave).padStart(2,'0');
  document.getElementById('end-combo').textContent='×'+STATE.maxCombo;
  document.getElementById('end-best-record').innerHTML =
    tf('end.best_record', { diff: trName(DIFFICULTIES[STATE.difficulty]) + t('diff.suffix', '难度'), score: best.score.toLocaleString(), wave: best.wave },
       `${DIFFICULTIES[STATE.difficulty].name}难度历史最佳：${best.score.toLocaleString()} 分 (第 ${best.wave} 波) `) +
    (isNewBest ? '<span style="color:var(--cyan)">' + t('end.new_record', '[ 新纪录！ ]') + '</span>' : '');
  const crystalEl = document.getElementById('end-crystals');
  if (crystalEl) crystalEl.innerHTML = tf('end.crystals', { n: finalEarned, total: META.crystals },
    `💎 获得 <b style="color:#7ee8fa">+${finalEarned}</b> 星晶（累计 ${META.crystals}）`);
  endScreen.style.display='flex';
}

// 胜利结算入口
function victoryEnd() {
  if (STATE.over) return; // 防止重复调用
  gameOver();
}

function resetGame(){
  stopBossBgm();
  STATE.isTutorial = false;
  TUTORIAL.active = false;

  for(const b of bullets) releaseBullet(b);
  for(const m of missiles) releaseMissile(m);
  missiles.length = 0;
  for(const b of enemyBullets) { b.splitPattern=null; b.mesh.scale.set(1,1,1); releaseEnemyBullet(b); }
  for(const sw of shockwaves) {
    releaseShockwave(sw);
  }
  shockwaves.length = 0;
  for(const e of enemies) { 
    scene.remove(e.mesh); 
    disposeNode(e.mesh); // <--- 新增
  }
  for(const f of activeFlashes) {
    f.mesh.visible=false;
    // 闪光对象池不需要销毁，因为是复用的
  }
  bullets.length=0; enemyBullets.length=0; enemies.length=0; particles.length=0; activeFlashes.length=0;
  
  const diff = DIFFICULTIES[STATE.difficulty];
  STATE.score=0; STATE.wave=0; STATE.combo=0; STATE.maxCombo=0; STATE.comboTimer=0;
  STATE.maxHp = diff.hp; STATE.hp = diff.hp; 
  STATE.maxEnergy = 100; STATE.energy = 100; STATE.energyRegen = 0.2;
  STATE.maxShield = 100; STATE.shield = 100; STATE.shieldActive = false; // 新增这行
  // 完美格挡状态重置
  STATE.perfectBlockTimer = 0; STATE.perfectBlockCooldownTimer = 0; STATE.perfectBlockFlash = 0;
  STATE.shake=0; STATE.flash=0; STATE.flashColor=0x00ffe5; STATE.over=false; STATE.paused=false; STATE.inReward=false;
  if(HUD.flashG) HUD.flashG.clear();
  STATE.bulletLevel = 1; STATE.fireRate = 5; STATE.bulletSpeed = 3.5; STATE.moveSpeed = 1.0;
  STATE.isDashing = false; STATE.dashTimer = 0; STATE.invincibleTimer = 0;
  // 重置新增属性
  STATE.weapon = 0;
  STATE.critChance = 0; STATE.critMult = 2.0; STATE.lifesteal = 0;
  STATE.dashDamage = 0; STATE.bulletDmgBonus = 0; STATE.plasmaCharge = 0;
  STATE.bossIndex = 0; STATE.crystals = 0;
  STATE.bossActive = false; STATE.currentBoss = null;
  STATE.victory = false;
  STATE.rewardDelayTimer = 0; // 重置奖励延迟计时器，防止上局残留触发
  STATE.inCutscene = false; STATE.currentDialogue = null; STATE.dialogueIndex = 0; STATE.dialogueOnComplete = null;
  STATE.currentStoryId = null; STATE.typewriterActive = false;
  stopTypewriter();
  const _crtTerm = document.getElementById('crt-terminal');
  if (_crtTerm) _crtTerm.classList.remove('show');
  const _crtRadar = document.getElementById('crt-radar');
  if (_crtRadar) { _crtRadar.classList.remove('show'); _crtRadar.textContent = ''; }
  STATE.lockTarget = null; STATE.lockTimer = 0;
  // 应用局外成长
  applyMetaToState();
  
  PLAYER.pos.set(0,0,0); PLAYER.vel.set(0,0,0); PLAYER.quaternion.identity(); PLAYER.roll=0;
  player.position.copy(PLAYER.pos); player.quaternion.identity();
  lastHpRatio=-1; lastEnRatio=-1; lastScore=-1; lastWave=-1; lastLevel=-1;
}

// ===== Boss 多阶段攻击系统 =====
// 阶段名称表（用于阶段切换时的 HUD 提示）
const BOSS_PHASE_NAMES = [
  ['凝视阶段', '狂乱阶段', '深渊阶段'],      // 虚空之眼
  ['结晶阶段', '折射阶段', '碎裂阶段'],      // 晶簇巨像
  ['吸积阶段', '视界阶段', '奇点阶段'],      // 深渊吞噬者
  ['运算阶段', '预言阶段', '降临阶段']       // 机械神谕
];

// Boss 阶段切换 HP 阈值（比例）
const BOSS_PHASE2_HP = 0.6;  // 60% HP → 进入阶段 2
const BOSS_PHASE3_HP = 0.3;  // 30% HP → 进入阶段 3

// 每个阶段可用的攻击 ID 列表（按顺序循环）
// 结构: BOSS_ATTACK_LIST[variant][phase-1] = [attackId, ...]
// 机械神谕(variant 3) 新增时间操控攻击:
//   attackId 2: 时间减速(P1) / 时间裂隙(P2) / 时间倒流(P3)
//   attackId 3: 时钟扫描(P2) / 永恒之钟(P3)
//   attackId 4: 未来视(P2) / 时间停止+永恒之钟(P3)
// 晶簇巨像(variant 1) 新增晶体攻击:
//   attackId 2: 晶刺穿刺(P1) / 棱镜折射(P2) / 晶体牢笼(P3)
//   attackId 3: 晶簇共振(P2) / 棱镜万花筒(P3)
const BOSS_ATTACK_LIST = [
  [[0, 1], [0, 1, 2], [0, 1, 2]],  // 虚空之眼
  [[0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3]],  // 晶簇巨像 (含晶体攻击)
  [[0, 1], [0, 1, 2], [0, 1, 2]],  // 深渊吞噬者
  [[0, 1, 2], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]]   // 机械神谕 (含时间操控)
];

// ===== 通用弹幕生成器（复用预分配向量，避免热路径 GC） =====

// 环形弹幕：从 pos 发射 count 发子弹，均匀分布在水平面上
// yTilt: 仰角偏移（弧度），angleOffset: 起始角度偏移
function spawnRingBarrage(pos, count, speed, color, life, yTilt, angleOffset) {
  yTilt = yTilt || 0;
  angleOffset = angleOffset || 0;
  const ct = Math.cos(yTilt), st = Math.sin(yTilt);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + angleOffset;
    _v1.set(Math.cos(ang) * ct, st, Math.sin(ang) * ct);
    const eb = getEnemyBullet(color);
    eb.mesh.position.copy(pos);
    eb.dir.copy(_v1);
    eb.speed = speed;
    eb.life = life;
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
}

// 追踪弹幕：从 pos 发射 count 发追踪子弹
function spawnHomingBarrage(pos, count, speed, color, homingTime) {
  homingTime = homingTime || 60;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang));
    const eb = getEnemyBullet(color);
    eb.mesh.position.copy(pos);
    eb.dir.copy(_v1);
    eb.speed = speed;
    eb.life = 200;
    eb.isHoming = true;
    eb.homingTime = homingTime;
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
}

// 螺旋弹幕：从 pos 发射 count 发子弹，按螺旋角度分布
function spawnSpiralBarrage(pos, count, speed, color, life) {
  life = life || 250;
  const spiralStep = 0.3;
  for (let i = 0; i < count; i++) {
    const ang = i * spiralStep;
    _v1.set(Math.cos(ang), Math.sin(ang * 0.5) * 0.3, Math.sin(ang));
    _v1.normalize();
    const eb = getEnemyBullet(color);
    eb.mesh.position.copy(pos);
    eb.dir.copy(_v1);
    eb.speed = speed;
    eb.life = life;
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
}

// 预判扇形弹幕：以 Boss 位置发射 count 发子弹，朝玩家预判位置扇形分布
// 使用突击手的二次方程预判算法，打提前量
// spreadAngle: 扇形总张角（弧度），默认 0.3
function spawnAimedBarrage(e, count, speed, color, life, spreadAngle) {
  life = life || 250;
  spreadAngle = spreadAngle || 0.3;

  // ===== 突击手预判算法：求解子弹与玩家碰撞时间 t =====
  const Vp = _v1.copy(PLAYER.vel);
  const D = _v2.subVectors(e.mesh.position, player.position);
  const Sb = speed;

  let t = 0;
  const a = Vp.dot(Vp) - Sb * Sb;
  const b = -2 * Vp.dot(D);
  const c = D.dot(D);
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b;
  } else {
    const delta = b * b - 4 * a * c;
    if (delta >= 0) {
      const sqrtDelta = Math.sqrt(delta);
      const t1 = (-b + sqrtDelta) / (2 * a);
      const t2 = (-b - sqrtDelta) / (2 * a);
      if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
      else if (t1 > 0) t = t1;
      else if (t2 > 0) t = t2;
    }
  }

  // 预判位置：玩家当前位置 + 玩家速度 × t
  const aimPoint = _v3.copy(player.position);
  if (t > 0) aimPoint.addScaledVector(Vp, t);

  // 基准方向：Boss → 预判位置
  const baseDir = _v4.subVectors(aimPoint, e.mesh.position).normalize();

  // 扇形发射：count 发子弹以 baseDir 为中心，左右均匀分布
  const halfSpread = spreadAngle * 0.5;
  for (let i = 0; i < count; i++) {
    let offset;
    if (count === 1) {
      offset = 0;
    } else {
      offset = -halfSpread + (i / (count - 1)) * spreadAngle;
    }
    _q1.setFromAxisAngle(_vUp, offset);
    _v5.copy(baseDir).applyQuaternion(_q1).normalize();

    const eb = getEnemyBullet(color);
    eb.mesh.position.copy(e.mesh.position).addScaledVector(_v5, 2);
    eb.dir.copy(_v5);
    eb.speed = speed;
    eb.life = life;
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v5.clone().normalize());
    enemyBullets.push(eb);
  }
}

// 虚空之球：发射一颗大型慢速子弹，命中或到期后分裂为环形弹幕
function spawnVoidOrb(e, count) {
  for (let i = 0; i < count; i++) {
    _v1.copy(player.position).sub(e.mesh.position).normalize();
    _v1.x += (Math.random() - 0.5) * 0.2;
    _v1.y += (Math.random() - 0.5) * 0.1;
    _v1.z += (Math.random() - 0.5) * 0.2;
    _v1.normalize();
    const eb = getEnemyBullet(0x8844ff);
    eb.mesh.position.copy(e.mesh.position);
    eb.dir.copy(_v1);
    eb.speed = 1.5;
    eb.life = 350;
    eb.isBomb = true;
    eb.bombDamage = 25;
    eb.mesh.scale.setScalar(2.5);
    eb.splitPattern = { count: 16, speed: 3.5, color: e.color };
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
  playSniperShot();
}

// 晶体雨：在玩家上方生成 count 颗向下坠落的晶体子弹
function spawnCrystalRain(e, count) {
  for (let i = 0; i < count; i++) {
    _v1.set(
      player.position.x + (Math.random() - 0.5) * 80,
      player.position.y + 60 + Math.random() * 30,
      player.position.z + (Math.random() - 0.5) * 80
    );
    _v2.set(0, -1, 0);
    const eb = getEnemyBullet(e.color);
    eb.mesh.position.copy(_v1);
    eb.dir.copy(_v2);
    eb.speed = 4.0;
    eb.life = 120;
    eb.mesh.scale.set(0.8, 1.5, 0.8);
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v2.clone().normalize());
    enemyBullets.push(eb);
  }
}

// 分裂晶体：发射一颗子弹，到期后分裂为 splitCount 发环形弹幕
function spawnSplitCrystal(e, splitCount) {
  _v1.copy(player.position).sub(e.mesh.position).normalize();
  _v1.x += (Math.random() - 0.5) * 0.3;
  _v1.z += (Math.random() - 0.5) * 0.3;
  _v1.normalize();
  const eb = getEnemyBullet(e.color);
  eb.mesh.position.copy(e.mesh.position);
  eb.dir.copy(_v1);
  eb.speed = 2.0;
  eb.life = 80;
  eb.mesh.scale.setScalar(1.5);
  eb.splitPattern = { count: splitCount, speed: 3.0, color: e.color };
  eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
  enemyBullets.push(eb);
}

// ===== 完美格挡能量波：清除以玩家为中心的敌方弹幕 + 蓝色扩散波视觉 =====
// 由 damagePlayer 的完美格挡分支调用（weapons.js）
function triggerPerfectBlockWave(){
  const radius = STATE.perfectBlockRadius;
  // 1. 清除周围敌方弹幕（含追踪弹/炸弹弹/分裂弹，统一释放）
  for(let i=enemyBullets.length-1; i>=0; i--){
    const b = enemyBullets[i];
    if(b.mesh.position.distanceTo(player.position) < radius){
      // 小型青色爆炸特效（无 shake，避免震动干扰）
      explode(b.mesh.position, 0x00ffff, 6, 0.6, false);
      b.splitPattern = null;
      b.mesh.scale.set(1,1,1);
      releaseEnemyBullet(b);
      enemyBullets.splice(i, 1);
    }
  }
  // 2. 蓝色能量波视觉（复用 shockwave 系统，hit=true 不检测碰撞，damage=0 不造成伤害）
  const sw = getShockwave(0x00ffff);
  sw.mesh.position.copy(player.position);
  shockwaves.push({
    mesh: sw.mesh,
    radius: 3,
    speed: 2.5,
    maxRadius: radius,
    hit: true,        // 玩家自己的波，不检测玩家碰撞
    damage: 0,        // 不造成伤害
    center: player.position.clone()  // clone 必要：center 跨帧存储
  });
}

// ===== Boss 蓄力与阶段切换视觉效果 =====

// 蓄力指示：每帧调用，根据蓄力进度更新 phaseCore 的发光强度
function bossChargeTelegraph(e) {
  if (!e.phaseCore) return;
  const progress = 1 - (e.chargeTimer / e.chargeTotal); // 0→1
  const inner = e.phaseCore.userData.innerCore;
  // 外层球壳：随蓄力进度逐渐显现并放大
  e.phaseCore.material.opacity = 0.15 + progress * 0.35;
  e.phaseCore.scale.setScalar(1.0 + progress * 0.8);
  // 内层核心：快速闪烁，最后阶段极亮
  if (inner) {
    inner.material.opacity = 0.3 + progress * 0.7;
    inner.scale.setScalar(0.5 + progress * 1.5 + Math.sin(STATE.time * 0.5) * 0.1);
  }
  // 蓄力期间向 Boss 汇聚的粒子（每 4 帧一次）
  if (STATE.time % 4 === 0) {
    _v2.set(
      e.mesh.position.x + (Math.random() - 0.5) * 20,
      e.mesh.position.y + (Math.random() - 0.5) * 20,
      e.mesh.position.z + (Math.random() - 0.5) * 20
    );
    explode(_v2.clone(), e.color, 2, 0.4, false);
  }
  // 屏幕闪光逐渐增强
  if (progress > 0.7) {
    STATE.flash = Math.max(STATE.flash, (progress - 0.7) * 0.5);
    STATE.flashColor = e.color;
  }
}

// 重置蓄力视觉效果（蓄力结束或被打断时）
function resetChargeVisual(e) {
  if (!e.phaseCore) return;
  e.phaseCore.material.opacity = 0;
  e.phaseCore.scale.setScalar(1.0);
  const inner = e.phaseCore.userData.innerCore;
  if (inner) {
    inner.material.opacity = 0;
    inner.scale.setScalar(1.0);
  }
}

// Boss 阶段切换：触发大爆炸 + 屏幕震动 + HUD 提示
function bossPhaseTransition(e, newPhase) {
  e.bossPhase = newPhase;
  e.attackIndex = 0;
  e.charging = false;
  e.chargeTimer = 0;
  e.pendingAttack = -1;
  resetChargeVisual(e);

  // 阶段切换大爆炸
  explode(e.mesh.position, e.color, 50, 8, true);
  explode(e.mesh.position, 0xffffff, 30, 5, false);
  STATE.flash = 0.8;
  STATE.flashColor = e.color;
  STATE.shake = 14;

  // 阶段核心闪光
  if (e.phaseCore) {
    e.phaseCore.material.opacity = 1.0;
    e.phaseCore.scale.setScalar(2.0);
    const inner = e.phaseCore.userData.innerCore;
    if (inner) {
      inner.material.opacity = 1.0;
      inner.scale.setScalar(3.0);
    }
  }

  // HUD 提示
  const variant = e.bossVariant || 0;
  const phaseName = trBossPhase(variant, newPhase);
  showToast('⚠ ' + phaseName + ' ⚠', 2200);
  playBossHit();

  // ===== 机械神谕阶段切换时间特效 =====
  // 进入阶段 2：时间减速（展示时间操控能力）
  // 进入阶段 3：时间停止 + 永恒之钟（终极压迫感）
  if (variant === 3) {
    if (newPhase === 2) {
      startTimeSlow(e, 180, 16);
    } else if (newPhase === 3) {
      startTimeStop(e, 90);
      startEternalClock(e, 4);
    }
  }
}

// ===== 引力井系统（深渊吞噬者专属） =====

// 在 pos 处生成一个持续 life 帧的引力井
function spawnGravityWell(e, pos, life) {
  const wellGeo = new THREE.TorusGeometry(7, 0.6, 8, 32);
  const wellMat = new THREE.MeshBasicMaterial({
    color: e.color, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const wellMesh = new THREE.Mesh(wellGeo, wellMat);
  wellMesh.position.copy(pos);
  scene.add(wellMesh);

  // 内层旋转吸积盘
  const diskGeo = new THREE.RingGeometry(2, 5.5, 32);
  const diskMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  });
  const diskMesh = new THREE.Mesh(diskGeo, diskMat);
  diskMesh.rotation.x = Math.PI / 2;
  wellMesh.add(diskMesh);

  e.gravityWells.push({
    pos: pos.clone(),
    life: life,
    maxLife: life,
    mesh: wellMesh,
    disk: diskMesh,
    pullStrength: 0.18
  });

  // 生成时的冲击效果
  explode(pos.clone(), e.color, 25, 3, false);
  STATE.flash = 0.3;
  STATE.flashColor = e.color;
  playWave();
}

// 每帧更新所有活跃引力井
function updateBossGravityWells(e) {
  for (let i = e.gravityWells.length - 1; i >= 0; i--) {
    const w = e.gravityWells[i];
    w.life--;

    // 吸引玩家
    _v1.copy(w.pos).sub(player.position);
    const dist = _v1.length();
    if (dist > 3) {
      _v1.normalize();
      PLAYER.vel.addScaledVector(_v1, w.pullStrength);
    }

    // 动画
    w.mesh.rotation.z += 0.06;
    w.disk.rotation.z += 0.12;
    const pulse = 1 + Math.sin(STATE.time * 0.15) * 0.12;
    w.mesh.scale.setScalar(pulse);
    const lifeRatio = w.life / w.maxLife;
    w.mesh.material.opacity = 0.7 * lifeRatio;
    w.disk.material.opacity = 0.4 * lifeRatio;

    // 偶尔生成吸入粒子
    if (STATE.time % 5 === 0) {
      _v2.set(
        w.pos.x + (Math.random() - 0.5) * 14,
        w.pos.y + (Math.random() - 0.5) * 14,
        w.pos.z + (Math.random() - 0.5) * 14
      );
      explode(_v2.clone(), e.color, 2, 0.5, false);
    }

    // 到期销毁
    if (w.life <= 0) {
      explode(w.pos.clone(), e.color, 30, 4, false);
      scene.remove(w.mesh);
      disposeNode(w.mesh);
      e.gravityWells.splice(i, 1);
    }
  }
}

// ===== 引力波持续引力场系统（深渊吞噬者 phase 1 专属） =====
// 与引力井不同：引力波是包裹 Boss 本体的脉动球壳，持续把玩家强力拉向 Boss
function startGravityWaveField(e, duration) {
  // 若已存在则先清理
  if (e.gravityWaveField) {
    scene.remove(e.gravityWaveField.mesh);
    disposeNode(e.gravityWaveField.mesh);
  }
  // 创建脉动球壳（双层：内层实心 + 外层光晕）
  const fieldGeo = new THREE.SphereGeometry(12, 24, 16);
  const fieldMat = new THREE.MeshBasicMaterial({
    color: e.color, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
  });
  const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
  fieldMesh.position.copy(e.mesh.position);
  scene.add(fieldMesh);

  // 外层光晕（更大更透明）
  const haloGeo = new THREE.SphereGeometry(18, 24, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  fieldMesh.add(haloMesh);

  e.gravityWaveField = {
    mesh: fieldMesh,
    halo: haloMesh,
    timer: duration,
    maxTimer: duration,
    pullStrength: 0.35 // 每帧拉力强度（远大于引力井的 0.18）
  };
  showToast(t('toast.gravity_wave', '⚠ 引力波 ⚠'), 1500);
  STATE.flash = 0.3; STATE.flashColor = e.color;
}

// 每帧更新引力波场
function updateGravityWaveField(e) {
  const f = e.gravityWaveField;
  if (!f) return;
  f.timer--;

  // 跟随 Boss 位置
  f.mesh.position.copy(e.mesh.position);

  // 每帧把玩家拉向 Boss（强拉力，距离越远拉力越强，但有上限）
  _v1.copy(e.mesh.position).sub(player.position);
  const dist = _v1.length();
  if (dist > 2) {
    _v1.normalize();
    // 拉力随距离略微增强，但限制最大值，防止远距离时拉力过大
    const strength = Math.min(f.pullStrength * (1 + dist * 0.002), 0.8);
    PLAYER.vel.addScaledVector(_v1, strength);
  }

  // 脉动动画：球壳周期性缩放 + 透明度变化
  const pulse = 1 + Math.sin((f.maxTimer - f.timer) * 0.15) * 0.15;
  f.mesh.scale.setScalar(pulse);
  const lifeRatio = f.timer / f.maxTimer;
  f.mesh.material.opacity = 0.25 * lifeRatio + 0.1;
  if (f.halo) {
    f.halo.scale.setScalar(pulse * 1.1);
    f.halo.material.opacity = 0.12 * lifeRatio + 0.05;
  }

  // 持续期间轻微屏幕震动
  if (STATE.time % 6 === 0) STATE.shake = Math.max(STATE.shake, 2);

  // 到期清理
  if (f.timer <= 0) {
    scene.remove(f.mesh);
    disposeNode(f.mesh);
    e.gravityWaveField = null;
  }
}

// ===== 激光扫射系统（多 Boss 共用） =====
// 改用真实激光 mesh（类似激光兵）：一条可见的持续光束，追踪玩家方向，连续碰撞检测

// 启动激光扫射：duration 帧内显示真实激光 mesh 并追踪玩家
function startBossLaserSweep(e, color, duration, sweepAxis) {
  // 初始化激光方向：朝向玩家当前位置
  _v1.copy(player.position).sub(e.mesh.position).normalize();
  e.laserSweep = {
    timer: duration,
    duration: duration,
    color: color,
    axis: sweepAxis || 'horizontal',
    targetDir: _v1.clone(),       // 当前激光目标方向（会 lerp 追踪玩家）
    turnSpeed: 0.06,              // 追踪速度（每帧 lerp 系数）
    damage: 1.2,                  // 每帧接触伤害
    sweepAngle: 0,                // 自动扫射偏移角度
    sweepDir: 1
  };

  // 显示 Boss 激光 mesh
  if (e.bossLaserMesh) {
    e.bossLaserMesh.visible = true;
    e.bossLaserMesh.material.color.setHex(color);
    e.bossLaserMesh.material.emissive.setHex(color);
  }
  if (e.bossLaserGlow) {
    e.bossLaserGlow.visible = true;
    e.bossLaserGlow.material.color.setHex(color);
  }

  showToast(t('toast.laser_sweep', '⚠ 激光扫射 ⚠'), 1500);
  playSniperShot();
}

// 每帧更新激光扫射：追踪玩家方向 + 连续碰撞检测 + 自动扫射摆动
function updateBossLaserSweep(e) {
  const ls = e.laserSweep;
  if (!ls) return;
  ls.timer--;

  // 计算朝玩家的基准方向
  _v1.copy(player.position).sub(e.mesh.position).normalize();

  // 自动扫射偏移：在基准方向左右摆动 ±0.5 弧度（约 28°），让激光缓慢扫动
  ls.sweepAngle += 0.012 * ls.sweepDir;
  if (ls.sweepAngle > 0.5 || ls.sweepAngle < -0.5) ls.sweepDir *= -1;

  // 用四元数把基准方向绕 up 轴旋转 sweepAngle，得到最终目标方向
  _q1.setFromAxisAngle(_vUp, ls.sweepAngle);
  _v2.copy(_v1).applyQuaternion(_q1);

  // lerp 追踪（让激光转向目标方向有平滑感）
  ls.targetDir.lerp(_v2, ls.turnSpeed).normalize();

  // 设置 Boss 激光 mesh 的朝向
  // laserMesh 的几何体沿 +Y 方向延伸，需要把 +Y 旋转到 targetDir
  if (e.bossLaserMesh) {
    const targetWorldQuat = _q1.setFromUnitVectors(_v3.set(0, 1, 0), ls.targetDir);
    const invParentQuat = _q2.copy(e.mesh.quaternion).invert();
    e.bossLaserMesh.quaternion.copy(invParentQuat).multiply(targetWorldQuat);
    if (e.bossLaserGlow) e.bossLaserGlow.quaternion.copy(e.bossLaserMesh.quaternion);
  }

  // ===== 连续碰撞检测（参考激光兵实现，防止高速穿透） =====
  const moveVec = _v3.subVectors(PLAYER.pos, PLAYER.prevPos);
  const moveLen = moveVec.length();
  let hitByLaser = false;
  if (moveLen > 0.5) {
    // 高速移动：路径采样多点检测
    const samples = Math.min(Math.ceil(moveLen / 0.4), 6);
    for (let s = 0; s <= samples && !hitByLaser; s++) {
      const t = s / samples;
      const samplePos = _v4.copy(PLAYER.prevPos).addScaledVector(moveVec, t);
      const toSample = _v5.subVectors(samplePos, e.mesh.position);
      const dotS = toSample.dot(ls.targetDir);
      if (dotS > 0) {
        const closest = _v1.copy(e.mesh.position).addScaledVector(ls.targetDir, dotS);
        if (closest.distanceTo(samplePos) < 1.3) {
          hitByLaser = true;
        }
      }
    }
  } else {
    // 低速移动：单点检测
    const toPlayerVec = _v2.subVectors(PLAYER.pos, e.mesh.position);
    const dot = toPlayerVec.dot(ls.targetDir);
    if (dot > 0) {
      const closestPoint = _v3.copy(e.mesh.position).addScaledVector(ls.targetDir, dot);
      if (closestPoint.distanceTo(PLAYER.pos) < 1.3) {
        hitByLaser = true;
      }
    }
  }
  if (hitByLaser) {
    damagePlayer(ls.damage, PLAYER.pos);
  }

  // 激光击毁导弹判定
  for (let j = missiles.length - 1; j >= 0; j--) {
    const m = missiles[j];
    const toMissileVec = _v2.subVectors(m.mesh.position, e.mesh.position);
    const dotM = toMissileVec.dot(ls.targetDir);
    if (dotM > 0) {
      const closestPointM = _v3.copy(e.mesh.position).addScaledVector(ls.targetDir, dotM);
      if (closestPointM.distanceTo(m.mesh.position) < 1.1) {
        explode(m.mesh.position, 0xff8800, 10, 1.0, true);
        releaseMissile(m);
        missiles.splice(j, 1);
      }
    }
  }

  // 激光结束时隐藏 mesh
  if (ls.timer <= 0) {
    e.laserSweep = null;
    e.stateTimer = 60;
    if (e.bossLaserMesh) e.bossLaserMesh.visible = false;
    if (e.bossLaserGlow) e.bossLaserGlow.visible = false;
  }
}
// ===== 虚空风暴系统（虚空之眼专属） =====

// 启动虚空风暴：连续 count 次瞬移 + 环形弹幕
function startVoidStorm(e, count) {
  e.voidStormCount = count;
  e.voidStormTimer = 10; // 10 帧后开始第一次瞬移
  e.teleportCooldown = 999; // 阻止普通瞬移逻辑
  showToast(t('toast.void_storm', '⚠ 虚空风暴 ⚠'), 1800);
}

// 每帧更新虚空风暴
function updateVoidStorm(e) {
  if (e.voidStormCount <= 0) return;
  e.voidStormTimer--;
  if (e.voidStormTimer <= 0) {
    // 执行一次瞬移 + 环形弹幕
    explode(e.mesh.position, 0xff0055, 20, 3, false);
    // 瞬移到玩家附近随机方向
    const ang = Math.random() * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(100 + Math.random() * 60);
    e.mesh.position.copy(player.position).add(_v1);
    explode(e.mesh.position, e.color, 25, 4, false);
    spawnRingBarrage(e.mesh.position, 12, 3.0, e.color, 220, 0.15);
    STATE.flash = 0.3;
    STATE.flashColor = e.color;
    playDash();
    e.voidStormCount--;
    e.voidStormTimer = 28; // 28 帧后下一次瞬移
    if (e.voidStormCount <= 0) {
      e.teleportCooldown = 120; // 恢复正常瞬移冷却
      e.stateTimer = 60; // 虚空风暴结束后设置较短冷却
    }
  }
}

// ===== 晶体爆裂系统（晶簇巨像专属） =====

// 启动晶体爆裂：连续 count 波分裂晶体
function startCrystalBurst(e, count) {
  e.crystalBurstCount = count;
  e.crystalBurstTimer = 15;
  showToast(t('toast.crystal_burst', '⚠ 晶体爆裂 ⚠'), 1500);
}

function updateCrystalBurst(e) {
  if (e.crystalBurstCount <= 0) return;
  e.crystalBurstTimer--;
  if (e.crystalBurstTimer <= 0) {
    spawnSplitCrystal(e, 6);
    playEnemyLaser();
    e.crystalBurstCount--;
    e.crystalBurstTimer = 25;
    if (e.crystalBurstCount <= 0) {
      e.stateTimer = 60; // 晶体爆裂结束后设置较短冷却
    }
  }
}

// ===== 预言锁定系统（机械神谕专属） =====

// 标记玩家当前位置，delay 帧后向该位置发射激光束
function startProphecyLock(e, delay) {
  e.prophecyLockPos = player.position.clone();
  e.prophecyLockTimer = delay;
  // 在标记位置生成可视化标记
  const markGeo = new THREE.RingGeometry(4, 5, 24);
  const markMat = new THREE.MeshBasicMaterial({
    color: 0xff8800, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  });
  const markMesh = new THREE.Mesh(markGeo, markMat);
  markMesh.position.copy(e.prophecyLockPos);
  markMesh.lookAt(camera.position);
  scene.add(markMesh);
  e.prophecyLockMark = markMesh;
  showToast(t('toast.prophecy_lock', '⚠ 预言锁定 ⚠'), 1500);
}

function updateProphecyLock(e) {
  if (e.prophecyLockTimer <= 0) return;
  e.prophecyLockTimer--;

  // 更新标记动画
  if (e.prophecyLockMark) {
    e.prophecyLockMark.lookAt(camera.position);
    e.prophecyLockMark.rotation.z += 0.08;
    const pulse = 1 + Math.sin(STATE.time * 0.3) * 0.2;
    e.prophecyLockMark.scale.setScalar(pulse);
    // 倒计时最后阶段变红闪烁
    if (e.prophecyLockTimer < 30) {
      e.prophecyLockMark.material.color.setHex(0xff0000);
    }
  }

  if (e.prophecyLockTimer <= 0) {
    // 发射激光束：从 Boss 到标记位置的快速子弹流
    _v1.copy(e.prophecyLockPos).sub(e.mesh.position).normalize();
    // 发射一束密集子弹
    for (let i = 0; i < 8; i++) {
      const eb = getEnemyBullet(0xff8800);
      eb.mesh.position.copy(e.mesh.position);
      eb.dir.copy(_v1);
      eb.speed = 10.0;
      eb.life = 60;
      eb.mesh.scale.set(0.5, 0.5, 4.0);
      eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
      enemyBullets.push(eb);
    }
    explode(e.prophecyLockPos.clone(), 0xff8800, 20, 3, false);
    STATE.flash = 0.4;
    STATE.flashColor = 0xff8800;
    playSniperShot();

    // 清理标记
    if (e.prophecyLockMark) {
      scene.remove(e.prophecyLockMark);
      disposeNode(e.prophecyLockMark);
      e.prophecyLockMark = null;
    }
    e.prophecyLockPos = null;
    e.stateTimer = 80; // 预言锁定结束后设置较短冷却，避免过长的攻击间隔
  }
}

// ===== 临时炮塔无人机系统（机械神谕专属） =====

function spawnTurretDrones(e, count) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(30);
    _v1.add(e.mesh.position);

    // 创建简易炮塔网格
    const droneGeo = new THREE.OctahedronGeometry(2, 0);
    const droneMat = makeQualityMaterial({
      color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 1.5,
      metalness: 0.8, roughness: 0.3
    });
    const droneMesh = new THREE.Mesh(droneGeo, droneMat);
    droneMesh.position.copy(_v1);
    scene.add(droneMesh);

    e.turretDrones.push({
      mesh: droneMesh,
      life: 300,
      fireTimer: 30 + i * 10,
      orbitAng: ang,
      orbitRadius: 30
    });
  }
  showToast(t('toast.mech_descent', '⚠ 机械降临 ⚠'), 1800);
  playShieldOn();
}

function updateTurretDrones(e) {
  for (let i = e.turretDrones.length - 1; i >= 0; i--) {
    const d = e.turretDrones[i];
    d.life--;
    d.fireTimer--;

    // 环绕 Boss 运动
    d.orbitAng += 0.02;
    _v1.set(Math.cos(d.orbitAng), 0, Math.sin(d.orbitAng)).multiplyScalar(d.orbitRadius);
    _v1.add(e.mesh.position);
    d.mesh.position.copy(_v1);
    d.mesh.rotation.x += 0.05;
    d.mesh.rotation.y += 0.07;

    // 开火
    if (d.fireTimer <= 0) {
      _v2.copy(player.position).sub(d.mesh.position).normalize();
      const eb = getEnemyBullet(0xff8800);
      eb.mesh.position.copy(d.mesh.position);
      eb.dir.copy(_v2);
      eb.speed = 4.0;
      eb.life = 150;
      eb.mesh.quaternion.setFromUnitVectors(_vForward, _v2.clone().normalize());
      enemyBullets.push(eb);
      d.fireTimer = 50;
      playEnemyLaser();
    }

    // 到期销毁
    if (d.life <= 0) {
      explode(d.mesh.position, 0xff8800, 15, 2, false);
      scene.remove(d.mesh);
      disposeNode(d.mesh);
      e.turretDrones.splice(i, 1);
    }
  }
}

// ===== Boss 攻击调度器 =====

// 检查并执行阶段切换
function checkBossPhaseTransition(e) {
  const hpRatio = e.hp / e.maxHp;
  let newPhase = 1;
  if (hpRatio < BOSS_PHASE3_HP) newPhase = 3;
  else if (hpRatio < BOSS_PHASE2_HP) newPhase = 2;
  if (newPhase !== e.bossPhase) {
    bossPhaseTransition(e, newPhase);
  }
}

// 执行普通攻击（非蓄力）
function executeBossAttack(e) {
  const variant = e.bossVariant || 0;
  const phase = e.bossPhase;
  const attacks = BOSS_ATTACK_LIST[variant][phase - 1];
  const attackId = attacks[e.attackIndex % attacks.length];
  e.attackIndex++;

  if (variant === 0) executeVoidEyeAttack(e, phase, attackId);
  else if (variant === 1) executeCrystalColossusAttack(e, phase, attackId);
  else if (variant === 2) executeAbyssDevourerAttack(e, phase, attackId);
  else if (variant === 3) executeMachineOracleAttack(e, phase, attackId);
}

// 执行蓄力完成的攻击
function executeBossChargedAttack(e) {
  const variant = e.bossVariant || 0;
  const attackId = e.pendingAttack;
  e.pendingAttack = -1;
  resetChargeVisual(e);

  if (variant === 0) executeVoidEyeCharged(e, attackId);
  else if (variant === 1) executeCrystalColossusCharged(e, attackId);
  else if (variant === 2) executeAbyssDevourerCharged(e, attackId);
  else if (variant === 3) executeMachineOracleCharged(e, attackId);
}

// 开始蓄力
function startBossCharge(e, attackId, frames) {
  e.charging = true;
  e.chargeTimer = frames;
  e.chargeTotal = frames;
  e.pendingAttack = attackId;
}
// ===== 虚空之眼攻击（克苏鲁风格：疯狂、虚空、触须） =====
function executeVoidEyeAttack(e, phase, attackId) {
  if (phase === 1) {
    if (attackId === 0) {
      // 虚空凝视：8 发环形弹幕 + 4 发预判直射（打提前量）
      spawnRingBarrage(e.mesh.position, 8, 2.5, e.color, 250, 0.15);
      spawnAimedBarrage(e, 4, 3.2, e.color, 250, 0.25);
      STATE.flash = 0.2; STATE.flashColor = e.color;
      playEnemyLaser();
      e.stateTimer = 150;
    } else {
      // 触须穿刺：5 发追踪弹
      spawnHomingBarrage(e.mesh.position, 5, 3.0, e.color, 70);
      playSniperShot();
      e.stateTimer = 160;
    }
  } else if (phase === 2) {
    if (attackId === 0) {
      // 疯狂之眼：24 发双层旋转环形弹幕
      const offset = STATE.time * 0.08;
      spawnRingBarrage(e.mesh.position, 24, 2.8, e.color, 250, 0.15, offset);
      spawnRingBarrage(e.mesh.position, 24, 2.8, e.color, 250, 0.15, offset + Math.PI / 24);
      STATE.flash = 0.3; STATE.flashColor = e.color;
      playEnemyLaser();
      e.stateTimer = 130;
    } else if (attackId === 1) {
      // 虚空撕裂：蓄力 60 帧后瞬移 + 16 发环形弹幕
      startBossCharge(e, 0, 60);
      showToast(t('toast.void_tear_charge', '⚠ 虚空撕裂蓄力中 ⚠'), 1500);
    } else {
      // 瞳孔聚焦：蓄力 80 帧后发射虚空之球
      startBossCharge(e, 1, 80);
      showToast(t('toast.pupil_focus', '⚠ 瞳孔聚焦 ⚠'), 1500);
    }
  } else { // phase 3
    if (attackId === 0) {
      // 全方位弹幕：32 发螺旋 + 8 发追踪
      spawnSpiralBarrage(e.mesh.position, 32, 3.0, e.color, 300);
      spawnHomingBarrage(e.mesh.position, 8, 3.5, e.color, 50);
      STATE.flash = 0.4; STATE.flashColor = e.color;
      playEnemyLaser();
      e.stateTimer = 110;
    } else if (attackId === 1) {
      // 虚空风暴：连续 3 次瞬移 + 环形弹幕
      startVoidStorm(e, 3);
      e.stateTimer = 120;
    } else {
      // 双重瞳孔聚焦：蓄力后发射 2 颗虚空之球
      startBossCharge(e, 2, 80);
      showToast(t('toast.dual_pupil_focus', '⚠ 双重瞳孔聚焦 ⚠'), 1500);
    }
  }
}

function executeVoidEyeCharged(e, attackId) {
  if (attackId === 0) {
    // 虚空撕裂：瞬移到玩家附近 + 16 发环形弹幕
    explode(e.mesh.position, 0xff0055, 30, 4, false);
    const ang = Math.random() * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(120);
    e.mesh.position.copy(player.position).add(_v1);
    explode(e.mesh.position, e.color, 30, 4, false);
    STATE.flash = 0.5; STATE.flashColor = e.color;
    STATE.shake = 8;
    spawnRingBarrage(e.mesh.position, 16, 3.0, e.color, 250, 0.15);
    playDash();
    e.teleportCooldown = 100;
    e.stateTimer = 80;
  } else if (attackId === 1) {
    // 瞳孔聚焦：发射 1 颗虚空之球
    spawnVoidOrb(e, 1);
    e.stateTimer = 100;
  } else if (attackId === 2) {
    // 双重瞳孔聚焦：发射 2 颗虚空之球
    spawnVoidOrb(e, 2);
    e.stateTimer = 100;
  }
}

// ============================================================================
// ===== 晶簇巨像晶体攻击函数 =====
// ============================================================================

// 晶刺穿刺：发射多根追踪晶刺（高速、追踪、命中后碎裂）
function spawnCrystalSpikeBarrage(e, count) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    _v1.set(Math.cos(ang), Math.sin(ang * 0.5) * 0.3, Math.sin(ang));
    _v1.normalize();
    const eb = getEnemyBullet(e.color);
    eb.mesh.position.copy(e.mesh.position);
    eb.dir.copy(_v1);
    eb.speed = 4.5;
    eb.life = 180;
    eb.isHoming = true;
    eb.homingTime = 90;
    eb.mesh.scale.set(0.6, 0.6, 2.0); // 拉长成晶刺形状
    eb.splitPattern = { count: 6, speed: 3.0, color: e.color }; // 命中后碎裂
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
  playSniperShot();
  showToast(t('toast.crystal_spike', '晶刺穿刺！'), 1500);
}

// 棱镜折射：发射一颗大型棱镜子弹，飞行中周期性折射分裂出小弹幕
function startPrismRefraction(e, duration) {
  e.prismRefractionActive = true;
  e.prismRefractionTimer = duration || 200;
  // 发射 3 颗棱镜子弹，朝不同方向
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    _v1.set(Math.cos(ang), 0, Math.sin(ang));
    const eb = getEnemyBullet(e.color);
    eb.mesh.position.copy(e.mesh.position);
    eb.dir.copy(_v1);
    eb.speed = 2.0;
    eb.life = 250;
    eb.mesh.scale.setScalar(2.0); // 大型棱镜
    eb.isPrism = true; // 标记为棱镜子弹
    eb.prismRefractTimer = 30; // 每 30 帧折射一次
    eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
    enemyBullets.push(eb);
  }
  STATE.flash = 0.3; STATE.flashColor = e.color;
  playEnemyLaser();
  showToast(t('toast.prism_refract', '棱镜折射！'), 1500);
}

// 晶簇共振：展开共振场，玩家进入后移速减半 + 持续伤害
function startCrystalResonance(e, duration, radius) {
  showCrystalResonanceField(e, radius || 14);
  e.crystalResonanceTimer = duration || 240;
  STATE.flash = 0.25; STATE.flashColor = e.color;
  playShieldOn();
  showToast(t('toast.cluster_resonate', '晶簇共振！'), 1500);
}

// 晶体牢笼：在玩家周围生成 8 个晶体，延迟后向中心汇聚
function spawnCrystalPrison(e) {
  const count = 8;
  const radius = 25;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    _v1.set(
      player.position.x + Math.cos(ang) * radius,
      player.position.y,
      player.position.z + Math.sin(ang) * radius
    );
    spawnCrystalPrisonMarker(e, _v1.clone(), i, count);
  }
  STATE.flash = 0.3; STATE.flashColor = e.color;
  playWave();
  showToast(t('toast.crystal_cage', '晶体牢笼！'), 1500);
}

// 棱镜万花筒：多波旋转环形弹幕，每波偏移不同角度
function startPrismKaleidoscope(e, waves) {
  e.prismKaleidoscopeCount = waves || 5;
  e.prismKaleidoscopeTimer = 15;
  STATE.flash = 0.4; STATE.flashColor = e.color;
  showToast(t('toast.prism_kaleido', '棱镜万花筒！'), 1500);
}

// 更新晶体共振场：检测玩家是否在场内，造成减速 + 持续伤害
function updateCrystalResonance(e) {
  if (e.crystalResonanceTimer <= 0) return;
  const dist = player.position.distanceTo(e.mesh.position);
  if (dist < 14) {
    // 减速：直接削减玩家速度
    PLAYER.vel.multiplyScalar(0.92);
    // 持续伤害
    damagePlayer(0.3, e.mesh.position);
  }
}

// 更新晶体牢笼：标记到期后向玩家位置发射汇聚子弹
function updateCrystalPrison(e) {
  if (e.crystalPrisons.length === 0) return;
  // 检查是否有牢笼标记到期（由 enemies.js 的 updateCrystalColossusEffects 处理移除）
  // 这里处理到期时的汇聚发射
  for (let i = e.crystalPrisons.length - 1; i >= 0; i--) {
    const prison = e.crystalPrisons[i];
    if (prison.timer === 1) {
      // 即将到期，向玩家位置发射子弹
      _v1.copy(player.position).sub(prison.pos).normalize();
      const eb = getEnemyBullet(e.color);
      eb.mesh.position.copy(prison.pos);
      eb.dir.copy(_v1);
      eb.speed = 5.0;
      eb.life = 120;
      eb.mesh.scale.set(0.8, 0.8, 1.5);
      eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
      enemyBullets.push(eb);
      explode(prison.pos.clone(), e.color, 8, 1.5, false);
      playEnemyLaser();
    }
  }
}

// 更新棱镜万花筒：按波数发射旋转环形弹幕
function updatePrismKaleidoscope(e) {
  if (e.prismKaleidoscopeCount <= 0) return;
  e.prismKaleidoscopeTimer--;
  if (e.prismKaleidoscopeTimer <= 0) {
    // 每波偏移不同角度，形成万花筒效果
    const offset = (e.prismKaleidoscopeCount % 2) * (Math.PI / 12);
    const wave = 5 - e.prismKaleidoscopeCount; // 0,1,2,3,4
    spawnRingBarrage(e.mesh.position, 16, 3.2, e.color, 220, 0.15, offset + wave * 0.15);
    // 奇数波额外加一层仰角弹幕
    if (e.prismKaleidoscopeCount % 2 === 1) {
      spawnRingBarrage(e.mesh.position, 12, 3.0, e.color, 200, 0.35, offset);
    }
    playEnemyLaser();
    e.prismKaleidoscopeCount--;
    e.prismKaleidoscopeTimer = 30;
  }
}

// 更新棱镜折射子弹：棱镜子弹飞行中周期性折射分裂
function updatePrismRefractionBullets() {
  for (const b of enemyBullets) {
    if (b.isPrism && b.prismRefractTimer !== undefined) {
      b.prismRefractTimer--;
      if (b.prismRefractTimer <= 0) {
        // 折射出 4 发小弹幕
        for (let j = 0; j < 4; j++) {
          const ang = (j / 4) * Math.PI * 2 + Math.random() * 0.5;
          _v1.set(Math.cos(ang), Math.sin(ang * 0.5) * 0.3, Math.sin(ang));
          _v1.normalize();
          const eb = getEnemyBullet(b.mesh.material.color.getHex());
          eb.mesh.position.copy(b.mesh.position);
          eb.dir.copy(_v1);
          eb.speed = 3.0;
          eb.life = 120;
          eb.mesh.scale.setScalar(0.7);
          eb.mesh.quaternion.setFromUnitVectors(_vForward, _v1.clone().normalize());
          enemyBullets.push(eb);
        }
        b.prismRefractTimer = 35;
      }
    }
  }
}

// ============================================================================
// ===== 晶簇巨像攻击（晶体风格：折射、碎裂、几何、共振） =====
function executeCrystalColossusAttack(e, phase, attackId) {
  if (phase === 1) {
    if (attackId === 0) {
      // 棱镜散射：5 发预判扇形（打提前量，玩家移动时会被命中）
      spawnAimedBarrage(e, 5, 3.5, e.color, 200, 0.5);
      playEnemyLaser();
      e.stateTimer = 150;
    } else if (attackId === 1) {
      // 冰晶地雷：3 颗分裂晶体
      for (let i = 0; i < 3; i++) {
        spawnSplitCrystal(e, 8);
      }
      playWave();
      e.stateTimer = 170;
    } else {
      // 晶刺穿刺：6 根追踪晶刺（高速、追踪、命中后碎裂）
      spawnCrystalSpikeBarrage(e, 6);
      e.stateTimer = 160;
    }
  } else if (phase === 2) {
    if (attackId === 0) {
      // 晶簇护盾：3 秒无敌 + 20 发环形弹幕
      e.shieldPhase = 180;
      spawnRingBarrage(e.mesh.position, 20, 3.0, e.color, 250, 0.15);
      playShieldOn();
      showToast(t('toast.cluster_shield', '晶簇护盾激活'), 1500);
      e.stateTimer = 160;
    } else if (attackId === 1) {
      // 钻石风暴：16 发环形 + 8 颗晶体雨
      spawnRingBarrage(e.mesh.position, 16, 3.0, e.color, 250, 0.15);
      spawnCrystalRain(e, 8);
      STATE.flash = 0.3; STATE.flashColor = e.color;
      playEnemyLaser();
      e.stateTimer = 140;
    } else if (attackId === 2) {
      // 棱镜折射：发射 3 颗棱镜子弹，飞行中周期性折射分裂
      startPrismRefraction(e, 200);
      e.stateTimer = 180;
    } else {
      // 晶簇共振：展开共振场，玩家进入后减速 + 持续伤害
      startCrystalResonance(e, 240, 14);
      // 配合一轮环形弹幕施加压力
      spawnRingBarrage(e.mesh.position, 16, 2.8, e.color, 220, 0.12);
      e.stateTimer = 180;
    }
  } else { // phase 3
    if (attackId === 0) {
      // 晶体爆裂：连续 4 波分裂晶体
      startCrystalBurst(e, 4);
      e.stateTimer = 140;
    } else if (attackId === 1) {
      // 终极折射：32 发环形 + 3 颗分裂晶体 + 激光扫射
      spawnRingBarrage(e.mesh.position, 32, 3.2, e.color, 280, 0.15);
      for (let i = 0; i < 3; i++) spawnSplitCrystal(e, 8);
      startBossLaserSweep(e, e.color, 90, 'horizontal');
      STATE.flash = 0.5; STATE.flashColor = e.color;
      e.stateTimer = 150;
    } else if (attackId === 2) {
      // 晶体牢笼：在玩家周围生成 8 个晶体，延迟后向中心汇聚
      spawnCrystalPrison(e);
      e.stateTimer = 200;
    } else {
      // 棱镜万花筒：5 波旋转环形弹幕，每波偏移不同角度
      startPrismKaleidoscope(e, 5);
      e.stateTimer = 200;
    }
  }
}

function executeCrystalColossusCharged(e, attackId) {
  if (attackId === 0) {
    // 棱镜光束：90 帧水平激光扫射
    startBossLaserSweep(e, e.color, 90, 'horizontal');
    e.stateTimer = 120;
  }
}

// ===== 深渊吞噬者攻击（黑洞风格：引力、奇点、吸积） =====
function executeAbyssDevourerAttack(e, phase, attackId) {
  if (phase === 1) {
    if (attackId === 0) {
      // 引力波：在 Boss 周围生成持续强引力场，把玩家持续拉向 Boss + 配合环形弹幕
      startGravityWaveField(e, 150); // 持续 150 帧（2.5 秒）
      spawnRingBarrage(e.mesh.position, 6, 2.5, e.color, 200, 0.1);
      playWave();
      e.stateTimer = 160;
    } else {
      // 螺旋弹幕：12 发螺旋 + 3 发预判直射（打提前量）
      spawnSpiralBarrage(e.mesh.position, 12, 2.8, e.color, 250);
      spawnAimedBarrage(e, 3, 3.5, e.color, 250, 0.15);
      playEnemyLaser();
      e.stateTimer = 150;
    }
  } else if (phase === 2) {
    if (attackId === 0) {
      // 黑洞吞噬：在玩家位置生成引力井 + 12 发螺旋内吸弹幕
      spawnGravityWell(e, player.position.clone(), 180);
      spawnSpiralBarrage(e.mesh.position, 12, 2.0, e.color, 250);
      e.stateTimer = 180;
    } else if (attackId === 1) {
      // 喷流扫射：水平激光
      startBossLaserSweep(e, e.color, 80, 'horizontal');
      e.stateTimer = 130;
    } else {
      // 吸积盘爆发：24 发环形 + 8 发追踪
      spawnRingBarrage(e.mesh.position, 24, 3.0, e.color, 250, 0.15);
      spawnHomingBarrage(e.mesh.position, 8, 3.0, e.color, 60);
      STATE.flash = 0.3; STATE.flashColor = e.color;
      playEnemyLaser();
      e.stateTimer = 140;
    }
  } else { // phase 3
    if (attackId === 0) {
      // 奇点坍缩：大引力井 + 24 发向心弹幕
      spawnGravityWell(e, player.position.clone(), 240);
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        _v1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(80);
        _v1.add(player.position);
        _v2.copy(player.position).sub(_v1).normalize();
        const eb = getEnemyBullet(e.color);
        eb.mesh.position.copy(_v1);
        eb.dir.copy(_v2);
        eb.speed = 1.5;
        eb.life = 200;
        eb.mesh.quaternion.setFromUnitVectors(_vForward, _v2.clone().normalize());
        enemyBullets.push(eb);
      }
      STATE.flash = 0.5; STATE.flashColor = e.color;
      STATE.shake = 6;
      playWave();
      e.stateTimer = 180;
    } else if (attackId === 1) {
      // 多重黑洞：3 个随机位置引力井
      for (let i = 0; i < 3; i++) {
        _v1.set(
          player.position.x + (Math.random() - 0.5) * 120,
          player.position.y + (Math.random() - 0.5) * 30,
          player.position.z + (Math.random() - 0.5) * 120
        );
        spawnGravityWell(e, _v1.clone(), 150);
      }
      e.stateTimer = 200;
    } else {
      // 喷流扫射（强化）：100 帧激光
      startBossLaserSweep(e, e.color, 100, 'horizontal');
      e.stateTimer = 150;
    }
  }
}

function executeAbyssDevourerCharged(e, attackId) {
  // 深渊吞噬者无蓄力攻击（所有攻击即时执行）
  e.stateTimer = 100;
}

// ============================================================================
// ===== 机械神谕时间操控攻击函数 =====
// ============================================================================

// 时间减速场：玩家移速/射速减半，持续 duration 帧
function startTimeSlow(e, duration, radius) {
  showTimeSlowField(e, radius || 14);
  e.timePhase = 1;
  e.timePhaseTimer = duration || 240;
  STATE.flash = 0.25; STATE.flashColor = 0x00ddff;
  playShieldOn();
  showToast(t('toast.time_slow', '时间被减速了！'), 1500);
}

// 时间倒流：所有敌方子弹反向飞行，持续 duration 帧
function startTimeReverse(e, duration) {
  e.timePhase = 2;
  e.timeReverseTimer = duration || 180;
  STATE.flash = 0.35; STATE.flashColor = 0x00ddff;
  // 反转所有现有敌方子弹方向
  for (const b of enemyBullets) {
    if (b.dir) {
      b.dir.negate();
      b.mesh.quaternion.setFromUnitVectors(_vForward, b.dir);
    }
  }
  playWave();
  showToast(t('toast.time_reverse', '时间倒流！子弹反向！'), 1500);
}

// 时间停止：冻结全场敌人与敌方子弹，Boss 蓄力，持续 duration 帧
function startTimeStop(e, duration) {
  e.timeStopActive = true;
  e.timeStopTimer = duration || 90;
  e.timePhase = 3;
  STATE.flash = 0.5; STATE.flashColor = 0x00ddff;
  STATE.shake = 8;
  playShieldOn();
  showToast(t('toast.time_stop', '时间停止！'), 1500);
}

// 时间裂隙攻击：在玩家附近生成多个持续伤害区
function spawnTimeRiftAttack(e) {
  // 在玩家当前位置生成主裂隙
  spawnTimeRift(e, player.position.clone(), 6);
  // 再生成 2-3 个随机位置裂隙
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    _v1.copy(player.position);
    _v1.x += (Math.random() - 0.5) * 35;
    _v1.z += (Math.random() - 0.5) * 35;
    spawnTimeRift(e, _v1.clone(), 5);
  }
  playExplosion();
  showToast(t('toast.time_rift', '时间裂隙！'), 1500);
}

// 时钟扫描攻击：秒针拉长为光束扫射战场
function startClockSweepAttack(e, duration) {
  startClockSweep(e, duration || 200);
  e.clockSweepDir = Math.random() > 0.5 ? 1 : -1;
  e.clockSweepAngle = Math.random() * Math.PI * 2;
  STATE.flash = 0.2; STATE.flashColor = 0xff3300;
  playEnemyLaser();
  showToast(t('toast.clock_scan', '时钟扫描！'), 1500);
}

// 永恒之钟：12 方向放射状弹幕，多波交替偏移
function startEternalClock(e, waves) {
  e.eternalClockCount = waves || 4;
  e.eternalClockTimer = 20; // 20 帧后开始第一波
  STATE.flash = 0.4; STATE.flashColor = 0xffaa00;
  showToast(t('toast.eternal_clock', '永恒之钟！'), 1500);
}

// 未来视：预演子弹轨迹（幽灵粒子），延迟后真实发射
function startFutureSight(e) {
  e.futureSightTimer = 75; // 75 帧预演期
  e.futureBullets = [];
  // 生成 10 条预演轨迹（部分预判玩家位置）
  const count = 10;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang));
    // 30% 概率朝玩家方向偏移
    if (i % 3 === 0) {
      _v2.copy(player.position).sub(e.mesh.position).normalize();
      _v1.lerp(_v2, 0.4).normalize();
    }
    e.futureBullets.push({
      dir: _v1.clone()
    });
  }
  playSniperShot();
  showToast(t('toast.future_sight', '未来视！预判轨迹出现！'), 75);
}

// 更新时间裂隙：检测玩家是否在裂隙范围内，造成持续伤害
function updateTimeRifts(e) {
  for (const rift of e.timeRifts) {
    const dist = player.position.distanceTo(rift.pos);
    if (dist < rift.radius) {
      damagePlayer(0.35, rift.pos);
    }
  }
}

// 更新时钟扫描：检测玩家是否被光束命中
function updateClockSweepAttack(e) {
  if (!e.clockSweepActive) return;
  // 光束从 Boss 位置沿 clockSweepAngle 方向延伸（XZ 平面）
  _v1.copy(player.position).sub(e.mesh.position);
  _v1.y = 0;
  const playerDist = _v1.length();
  if (playerDist < 45 && playerDist > 3) {
    _v1.normalize();
    // 光束方向（clockSweepAngle 是绕 Z 轴旋转，映射到 XZ 平面）
    const beamAng = e.clockSweepAngle;
    _v2.set(Math.cos(beamAng), 0, Math.sin(beamAng));
    const dot = _v1.dot(_v2);
    if (dot > 0.985) { // 玩家在光束窄角度内
      damagePlayer(0.6, e.mesh.position);
    }
  }
}

// 更新永恒之钟：按波数发射 12 方向弹幕，交替偏移
function updateEternalClock(e) {
  if (e.eternalClockCount <= 0) return;
  e.eternalClockTimer--;
  if (e.eternalClockTimer <= 0) {
    // 发射 12 方向弹幕，奇偶波交替偏移半个间隔
    const offset = (e.eternalClockCount % 2) * (Math.PI / 12);
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + offset;
      _v1.set(Math.cos(ang), 0, Math.sin(ang));
      const b = getEnemyBullet(0xffaa00);
      b.mesh.position.copy(e.mesh.position);
      b.dir.copy(_v1);
      b.speed = 3.5;
      b.life = 220;
      b.mesh.quaternion.setFromUnitVectors(_vForward, _v1);
      enemyBullets.push(b);
    }
    playEnemyLaser();
    e.eternalClockCount--;
    e.eternalClockTimer = 35; // 35 帧间隔
  }
}

// 更新未来视：预演期显示幽灵粒子，到期后真实发射
function updateFutureSight(e) {
  if (e.futureSightTimer <= 0 && e.futureBullets.length === 0) return;
  if (e.futureSightTimer > 0) {
    e.futureSightTimer--;
    // 预演期：沿每条轨迹生成闪烁粒子提示
    if (STATE.time % 5 === 0) {
      for (const fb of e.futureBullets) {
        _v1.copy(e.mesh.position).addScaledVector(fb.dir, 8 + Math.random() * 4);
        explode(_v1.clone(), 0xffaa00, 2, 0.3, false);
      }
    }
    if (e.futureSightTimer <= 0) {
      // 真实发射
      for (const fb of e.futureBullets) {
        const b = getEnemyBullet(0xffaa00);
        b.mesh.position.copy(e.mesh.position);
        b.dir.copy(fb.dir);
        b.speed = 4.2;
        b.life = 220;
        b.mesh.quaternion.setFromUnitVectors(_vForward, fb.dir);
        enemyBullets.push(b);
      }
      playSniperShot();
      e.futureBullets = [];
    }
  }
}

// ============================================================================
// ===== 机械神谕攻击（机械风格：运算、预言、降临、时间操控） =====
function executeMachineOracleAttack(e, phase, attackId) {
  if (phase === 1) {
    if (attackId === 0) {
      // 双核火力：3 发预判直射（替换原追踪弹，打提前量更致命）
      spawnAimedBarrage(e, 3, 3.8, 0xffaa00, 250, 0.12);
      playSniperShot();
      e.stateTimer = 140;
    } else if (attackId === 1) {
      // 神圣光环：20 发环形 + 短暂护盾
      spawnRingBarrage(e.mesh.position, 20, 3.0, 0xffaa00, 250, 0.15);
      e.shieldPhase = 60;
      playShieldOn();
      e.stateTimer = 160;
    } else {
      // 时间减速：展开减速场，玩家移速/射速减半
      startTimeSlow(e, 240, 14);
      // 减速期间配合一轮环形弹幕施加压力
      spawnRingBarrage(e.mesh.position, 16, 2.8, 0x00ddff, 220, 0.12);
      e.stateTimer = 180;
    }
  } else if (phase === 2) {
    if (attackId === 0) {
      // 全弹发射：4 发追踪弹
      spawnHomingBarrage(e.mesh.position, 4, 3.5, 0xffaa00, 70);
      playSniperShot();
      e.stateTimer = 130;
    } else if (attackId === 1) {
      // 预言锁定：标记玩家位置，90 帧后发射激光
      startProphecyLock(e, 90);
      e.stateTimer = 140;
    } else if (attackId === 2) {
      // 时间裂隙：在玩家附近生成多个持续伤害区
      spawnTimeRiftAttack(e);
      e.stateTimer = 160;
    } else if (attackId === 3) {
      // 时钟扫描：秒针拉长为光束扫射战场
      startClockSweepAttack(e, 200);
      e.stateTimer = 220;
    } else {
      // 未来视：预演子弹轨迹，延迟后真实发射
      startFutureSight(e);
      e.stateTimer = 180;
    }
  } else { // phase 3
    if (attackId === 0) {
      // 终极审判：环形 + 追踪 + 激光扫射
      spawnRingBarrage(e.mesh.position, 24, 3.2, 0xffaa00, 280, 0.15);
      spawnHomingBarrage(e.mesh.position, 6, 3.5, 0xffaa00, 60);
      startBossLaserSweep(e, 0xffaa00, 80, 'horizontal');
      STATE.flash = 0.5; STATE.flashColor = 0xffaa00;
      e.stateTimer = 160;
    } else if (attackId === 1) {
      // 机械降临：生成 4 个临时炮塔无人机
      spawnTurretDrones(e, 4);
      e.stateTimer = 200;
    } else if (attackId === 2) {
      // 时间倒流：所有敌方子弹反向飞行
      startTimeReverse(e, 180);
      // 配合新一轮环形弹幕（这些新子弹也会被倒流，形成回旋夹击）
      spawnRingBarrage(e.mesh.position, 18, 3.0, 0x00ddff, 250, 0.13);
      e.stateTimer = 180;
    } else if (attackId === 3) {
      // 永恒之钟：12 方向放射状弹幕，4 波交替偏移
      startEternalClock(e, 4);
      e.stateTimer = 200;
    } else {
      // 时间停止 + 永恒之钟：冻结全场后释放 12 方向弹幕
      startTimeStop(e, 75);
      startEternalClock(e, 5);
      e.stateTimer = 220;
    }
  }
}

function executeMachineOracleCharged(e, attackId) {
  // 机械神谕蓄力攻击：时间停止 + 永恒之钟连发
  // 这是其最致命的大招——冻结时间后倾泻弹幕
  startTimeStop(e, 90);
  startEternalClock(e, 6);
  // 配合预言锁定增加压迫感
  startProphecyLock(e, 100);
  STATE.shake = 12;
  e.stateTimer = 240;
}

// ===== Boss 专属更新（每帧调用，替代原内联逻辑） =====
function updateBoss(e, dist) {
  // 瞬移逻辑（距离过远时瞬移到玩家附近）
  if (e.teleportCooldown > 0) e.teleportCooldown--;
  if (dist > 700 && e.teleportCooldown <= 0 && e.voidStormCount <= 0) {
    explode(e.mesh.position, e.color, 25, 4, false);
    const ang = Math.random() * Math.PI * 2;
    _v1.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(200);
    e.mesh.position.copy(player.position).add(_v1);
    explode(e.mesh.position, e.color, 25, 4, false);
    STATE.flash = 0.3; STATE.flashColor = e.color;
    playDash();
    e.teleportCooldown = 200;
  }

  // 阶段切换检测
  checkBossPhaseTransition(e);

  // 蓄力攻击处理
  if (e.charging) {
    e.chargeTimer--;
    bossChargeTelegraph(e);
    if (e.chargeTimer <= 0) {
      e.charging = false;
      executeBossChargedAttack(e);
    }
  } else if (e.voidStormCount <= 0 && e.crystalBurstCount <= 0 && !e.laserSweep && e.prophecyLockTimer <= 0 && !e.gravityWaveField
             && e.eternalClockCount <= 0 && !e.clockSweepActive && e.futureSightTimer <= 0 && !e.timeStopActive
             && e.crystalResonanceTimer <= 0 && e.prismKaleidoscopeCount <= 0 && e.crystalPrisons.length === 0 && !e.prismRefractionActive) {
    // 普通攻击调度（仅在无特殊状态进行时，含机械神谕时间操控与晶簇巨像晶体状态）
    e.stateTimer--;
    if (e.stateTimer <= 0) {
      executeBossAttack(e);
    }
  }

  // 修复 Boss 转换形态后亮成一团的 bug：
  // bossPhaseTransition 会将 phaseCore 和 innerCore 的 opacity 设为 1.0 作为爆闪，
  // 但除了蓄力结束外，没有任何地方将其重置为 0（深渊吞噬者与机械神谕甚至无蓄力攻击）。
  // 在非蓄力状态下，让闪光逐帧平滑衰减至 0，防止 Bloom 后处理导致永久过曝。
  if (e.phaseCore && !e.charging) {
    if (e.phaseCore.material.opacity > 0) {
      e.phaseCore.material.opacity = Math.max(0, e.phaseCore.material.opacity - 0.03);
      const inner = e.phaseCore.userData.innerCore;
      if (inner && inner.material.opacity > 0) {
        inner.material.opacity = Math.max(0, inner.material.opacity - 0.03);
      }
    }
  }

  // 机械神谕护盾阶段
  if (e.shieldPhase && e.shieldPhase > 0) {
    e.shieldPhase--;
  }

  // 深渊吞噬者原生黑洞吸引（保留原有机制）
  if (e.blackHoleActive && e.blackHoleActive > 0) {
    e.blackHoleActive--;
    _v1.copy(e.mesh.position).sub(player.position).normalize();
    PLAYER.vel.addScaledVector(_v1, 0.15);
  }

  // 各子系统更新
  updateGravityWaveField(e);
  updateBossGravityWells(e);
  updateBossLaserSweep(e);
  updateVoidStorm(e);
  updateCrystalBurst(e);
  updateProphecyLock(e);
  updateTurretDrones(e);

  // ===== 机械神谕时间操控子系统更新 =====
  if (e.bossVariant === 3) {
    // 统一更新时间特效（裂隙/预言标记/扫描光束/时间相位计时），返回当前时间相位
    updateMechanicalOracleEffects(e, 1);
    // 时间裂隙持续伤害检测
    updateTimeRifts(e);
    // 时钟扫描光束命中检测
    updateClockSweepAttack(e);
    // 永恒之钟 12 方向弹幕发射
    updateEternalClock(e);
    // 未来视预演与真实发射
    updateFutureSight(e);
  }

  // ===== 晶簇巨像晶体攻击子系统更新 =====
  if (e.bossVariant === 1) {
    // 统一更新晶体特效（共振场/牢笼标记/棱镜折射计时）
    updateCrystalColossusEffects(e, 1);
    // 晶体共振场减速 + 持续伤害检测
    updateCrystalResonance(e);
    // 晶体牢笼汇聚发射检测
    updateCrystalPrison(e);
    // 棱镜万花筒多波弹幕发射
    updatePrismKaleidoscope(e);
    // 棱镜折射子弹周期性分裂
    updatePrismRefractionBullets();
  }
}

// ===== Boss 清理（Boss 死亡或游戏重置时调用） =====
function cleanupBoss(e) {
  // 清理引力井
  if (e.gravityWells) {
    for (const w of e.gravityWells) {
      scene.remove(w.mesh);
      disposeNode(w.mesh);
    }
    e.gravityWells.length = 0;
  }
  // 清理炮塔无人机
  if (e.turretDrones) {
    for (const d of e.turretDrones) {
      scene.remove(d.mesh);
      disposeNode(d.mesh);
    }
    e.turretDrones.length = 0;
  }
  // 清理预言锁定标记
  if (e.prophecyLockMark) {
    scene.remove(e.prophecyLockMark);
    disposeNode(e.prophecyLockMark);
    e.prophecyLockMark = null;
  }
  // 清理引力波场
  if (e.gravityWaveField) {
    scene.remove(e.gravityWaveField.mesh);
    disposeNode(e.gravityWaveField.mesh);
    e.gravityWaveField = null;
  }
  // 隐藏 Boss 激光 mesh
  if (e.bossLaserMesh) e.bossLaserMesh.visible = false;
  if (e.bossLaserGlow) e.bossLaserGlow.visible = false;
  // 重置特殊状态
  e.voidStormCount = 0;
  e.crystalBurstCount = 0;
  e.laserSweep = null;
  e.prophecyLockTimer = 0;
  e.charging = false;
  resetChargeVisual(e);
  // 清理机械神谕时间操控特效（裂隙/预言标记/减速场/扫描光束）
  clearMechanicalOracleEffects(e);
  // 清理晶簇巨像晶体攻击特效（共振场/牢笼标记）
  clearCrystalColossusEffects(e);
}

function update(){
  if(!STATE.started || STATE.over || STATE.paused || STATE.inReward || STATE.inCutscene) return;
  STATE.time++;

  if (STATE.isTutorial) {
    updateTutorial();
  }

  let rollInput = 0;
  if(KEYS['KeyA']) rollInput += 1;
  if(KEYS['KeyD']) rollInput -= 1;
  PLAYER.roll += rollInput * 0.04;
  PLAYER.roll *= 0.92;
  
  _v1.set(0, 0, 1); // 复用 _v1 作为旋转轴
  _q1.setFromAxisAngle(_v1, PLAYER.roll);
  _q2.copy(PLAYER.quaternion).multiply(_q1);
  
  player.quaternion.slerp(_q2, 0.15);
  player.position.copy(PLAYER.pos);

  const forward = _v1.set(0, 0, -1).applyQuaternion(PLAYER.quaternion);
  const right = _v2.set(1, 0, 0).applyQuaternion(PLAYER.quaternion);

  let fInput = 0, sInput = 0;
  if(KEYS['KeyW']) fInput += 1;
  if(KEYS['KeyS']) fInput -= 0.3; 
  if(KEYS['KeyA']) sInput -= 1;
  if(KEYS['KeyD']) sInput += 1;

  const boost = (KEYS['ShiftLeft']||KEYS['ShiftRight']) && STATE.energy>0 ? 1.7 : 1;
  if(boost>1) {
    STATE.energy = Math.max(0, STATE.energy - 0.6); // 加速时扣除谐振值
  } else {
    STATE.energy = Math.min(STATE.maxEnergy, STATE.energy + STATE.energyRegen); // 不加速时恢复谐振值
  }

  // ===== 机械神谕时间操控：玩家移速受影响 =====
  // timePhase 1=减速(移速×0.5) 3=停止(移速×0, 但可射击/转向)
  const _boss = STATE.currentBoss;
  const _timeSlowMul = (_boss && _boss.timePhase === 1) ? 0.5 : 1;
  const _timeStopMove = (_boss && _boss.timeStopActive) ? true : false;

  if (!_timeStopMove) {
    PLAYER.vel.addScaledVector(forward, fInput * 0.05 * boost * STATE.moveSpeed * _timeSlowMul);
    PLAYER.vel.addScaledVector(right, sInput * 0.04 * boost * STATE.moveSpeed * _timeSlowMul);
  }
  PLAYER.vel.multiplyScalar(0.96);
  
  // 谐振突进逻辑
  if(STATE.isDashing) {
    STATE.dashTimer--;
    if (!_timeStopMove) PLAYER.vel.addScaledVector(forward, 0.8 * _timeSlowMul); // 瞬间加速
  // 突进撞击伤害：对路径上的敌人造成伤害
    if (STATE.dashDamage > 0) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        // Boss 视觉模型远大于 radius，用 bulletHitRadius 才能撞到外壳
        if (player.position.distanceTo(e.mesh.position) < (e.bulletHitRadius || e.radius) + 3.0) {
          e.hp -= STATE.dashDamage;
          explode(e.mesh.position, 0x00ffe5, 8, 0.6, false);
          if (e.hp <= 0) killEnemy(e, j);
        }
      }
    }
    if(STATE.dashTimer <= 0) STATE.isDashing = false;
  }
  
  PLAYER.prevPos.copy(PLAYER.pos);
  if (!_timeStopMove) PLAYER.pos.add(PLAYER.vel);
  if(STATE.invincibleTimer > 0) STATE.invincibleTimer--;
  // === 修改：护盾能量管理 ===
  if(MOUSE.rightDown && STATE.shield > 0 && !STATE.isDashing) {
    if (!STATE.shieldActive) {
      STATE.shieldActive = true;
      playShieldOn(); // 播放开启音效
      // 教程检测：记录玩家使用过护盾
      if(STATE.isTutorial && TUTORIAL.step === 7) TUTORIAL.shieldUsed = true;
      // === 完美格挡：按下右键瞬间开启判定窗口（不在冷却中时）===
      // 仅在 shieldActive false→true 的瞬间触发，防止按住右键期间重复开启窗口
      if(STATE.perfectBlockCooldownTimer <= 0) {
        STATE.perfectBlockTimer = STATE.perfectBlockWindow;
      }
    }
    STATE.shield = Math.max(0, STATE.shield - 0.6); // 消耗蓝色护盾能量
    player.userData.shieldMesh.visible = true;
    // 呼吸闪烁与缓慢自转
    const pulse = 0.15 + Math.sin(STATE.time * 0.1) * 0.05;
    // 更新着色器 uniform
    const shieldMat = player.userData.shieldMesh.material;
    if(shieldMat.uniforms) {
      shieldMat.uniforms.uTime.value = STATE.time * 0.1;
      shieldMat.uniforms.uOpacity.value = pulse;
    }
    if(player.userData.shieldMesh.children[0]) {
      player.userData.shieldMesh.children[0].material.opacity = pulse * 3; // 线框更亮一点
    }
    player.userData.shieldMesh.rotation.y += 0.01;
    player.userData.shieldMesh.rotation.z += 0.005;
    // 完美格挡成功后的护盾高亮特效（覆盖正常呼吸效果）
    if(STATE.perfectBlockFlash > 0) {
      if(shieldMat.uniforms) shieldMat.uniforms.uOpacity.value = 1.0;
      if(player.userData.shieldMesh.children[0]) player.userData.shieldMesh.children[0].material.opacity = 1.0;
    }
  } else {
    // 如果之前是开启状态，现在关闭了，播放关闭音效
    if (STATE.shieldActive) {
      STATE.shieldActive = false;
      playShieldOff();
    }
    player.userData.shieldMesh.visible = false;
    // 修复：只有在未按住右键时才恢复能量，防止按住右键能量耗尽时护盾反复闪烁
    if (!MOUSE.rightDown) {
      STATE.shield = Math.min(STATE.maxShield, STATE.shield + 0.2);
    }
  }

  // === 完美格挡计时器更新（每帧，独立于护盾是否激活）===
  // 说明：玩家可能点一下右键就松开，但判定窗口应继续，窗口内受到攻击仍算完美格挡
  if(STATE.perfectBlockTimer > 0) {
    STATE.perfectBlockTimer--;
    if(STATE.perfectBlockTimer === 0) {
      // 判定窗口结束未触发完美格挡 → 进入失败冷却
      STATE.perfectBlockCooldownTimer = STATE.perfectBlockCooldown;
    }
  }
  if(STATE.perfectBlockCooldownTimer > 0) STATE.perfectBlockCooldownTimer--;
  if(STATE.perfectBlockFlash > 0) STATE.perfectBlockFlash--;




  const ePulse = 0.6 + Math.sin(STATE.time*0.6)*0.2 + (boost-1)*0.4 + fInput*0.5 + (STATE.isDashing?1:0);
  // 引擎核心、光晕、柔光联动闪烁
  player.userData.e1_core.scale.z = 1.6 * ePulse;
  player.userData.e2_core.scale.z = 1.6 * ePulse;
  player.userData.e1_glow.scale.z = 2.2 * ePulse;
  player.userData.e2_glow.scale.z = 2.2 * ePulse;
  player.userData.e1_haze.scale.z = 3.0 * ePulse;
  player.userData.e2_haze.scale.z = 3.0 * ePulse;
  if (player.userData.engineLight) player.userData.engineLight.intensity = 2.5 * ePulse;


  // 机械神谕时间减速：玩家射速减半（冷却递减变慢）
  const _timeSlowFire = (STATE.currentBoss && STATE.currentBoss.timePhase === 1) ? 0.5 : 1;
  PLAYER.fireCooldown -= _timeSlowFire;
  
  if(MOUSE.down) {
    if(STATE.weapon === 0) {
      // 武器1：机关枪
      if(PLAYER.fireCooldown <= 0) fire();
    } else if(STATE.weapon === 1) {
      // 武器2：导弹发射器 (锁定逻辑)
      const cameraDir = _v1.set(0,0,-1).applyQuaternion(player.quaternion); // 复用 _v1
      let bestTarget = null;
      let maxDot = 0.95;
      
      for(const e of enemies) {
        const dir = _v2.copy(e.mesh.position).sub(player.position); // 复用 _v2
        const dist = dir.length();
        if(dist < 500) {
          dir.normalize();
          const dot = dir.dot(cameraDir);
          if(dot > maxDot) { maxDot = dot; bestTarget = e; }
        }
      }       
      STATE.lockTarget = bestTarget;
      
      if(STATE.lockTarget) {
        STATE.lockTimer++;
        // 更新锁定指示器位置和缩放
        lockIndicator.visible = true;
        lockIndicator.position.copy(STATE.lockTarget.mesh.position);
        const scale = Math.max(1, 3 - STATE.lockTimer / 20); // 逐渐缩紧
        lockIndicator.scale.setScalar(scale);
        lockIndicator.material.color.setHex(STATE.lockTimer >= 60 ? 0xff0000 : 0xffff00);
        
        // 锁定 1 秒 (60帧) 且冷却完成，发射导弹
        if(STATE.lockTimer >= 60 && PLAYER.fireCooldown <= 0) {
          PLAYER.fireCooldown = 60; // 导弹发射冷却 1秒
          
          const m = getMissile();
          m.mesh.position.copy(player.position);
          m.dir.copy(cameraDir);
          m.target = STATE.lockTarget;
          m.speed = 8.0; m.life = 600; m.dmg = 5;
          m.mesh.quaternion.setFromUnitVectors(_v3.set(0,0,1), m.dir); // 复用 _v3
          missiles.push(m);
          
          playSniperShot(); // 复用狙击枪音效作为发射音
          
          // 发射后重置锁定，允许立刻锁定下一个
          STATE.lockTimer = 0; 
        }
      } else {
        STATE.lockTimer = 0;
        lockIndicator.visible = false;
      }
    } else if (STATE.weapon === 2) {
      // 武器3：等离子炮（按住蓄能，松开发射）
      const rate = STATE.plasmaChargeRate || 2.5;
      STATE.plasmaCharge = Math.min(100, STATE.plasmaCharge + rate);
      lockIndicator.visible = false;
    } else if (STATE.weapon === 3) {
      // 武器4：散弹枪
      if(PLAYER.fireCooldown <= 0) fire();
      lockIndicator.visible = false;
    } else if (STATE.weapon === 4) {
      // 武器5：电弧发射器
      if(PLAYER.fireCooldown <= 0) fire();
      lockIndicator.visible = false;
    }
  } else {
    // 松开鼠标：等离子炮蓄能发射
    if (STATE.weapon === 2 && STATE.plasmaCharge > 5 && PLAYER.fireCooldown <= 0) {
      fire();
    }
    // 松开鼠标取消锁定
    STATE.lockTimer = 0;
    lockIndicator.visible = false;
  }


    if (!STATE.isTutorial) {
    if(STATE.waveEnemiesLeft > 0){
      STATE.waveInterval--;
      if(STATE.waveInterval <= 0){
        const burst = Math.min(3, STATE.waveEnemiesLeft);
        for(let i=0; i<burst; i++) spawnEnemy(STATE.wave);
        STATE.waveEnemiesLeft -= burst;
        STATE.waveInterval = Math.max(20, 80 - STATE.wave * 4);
      }
    } else if(STATE.waveEnemiesLeft === 0 && enemies.length === 0){
      // 防止在剧情中或 Boss 尚未生成时误触发奖励
      STATE.waveEnemiesLeft = -1;
      // 用帧计时器代替 setTimeout：60帧 = 1秒，与游戏循环同步
      // 实际触发逻辑在主 update() 中递减并校验状态
      STATE.rewardDelayTimer = 60;
    }
  }


       for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.mesh.position.addScaledVector(b.dir, b.speed);
    b.life--;
    if(b.life<=0){ releaseBullet(b); bullets.splice(i,1); continue; }
    
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];
      // 优化：使用平方距离比较，省去昂贵的 Math.sqrt 开方运算，极大提升高射速下的性能
      const dx = b.mesh.position.x - e.mesh.position.x;
      const dy = b.mesh.position.y - e.mesh.position.y;
      const dz = b.mesh.position.z - e.mesh.position.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      
      // Boss 视觉模型远大于 radius(24)，用 bulletHitRadius(40) 才能命中外壳；
      // 其他敌人没有该字段，回退到 radius 即可。
      const hitRadius = (e.bulletHitRadius || e.radius) + 2.0;
      if(distSq < hitRadius * hitRadius){
        // 等离子弹：如果已命中过此敌人，跳过（避免重复伤害）
        if (b.isPlasma && b._hitSet && b._hitSet.has(e)) {
          continue;
        }
        
        let dmg = b.dmg || b.damage || 1;
        
        // 护盾兵正面减伤：如果子弹从正面（z 负方向）击中，伤害降低 80%
        if (e.behavior === 'shielder') {
          const toBullet = _v1.copy(b.mesh.position).sub(e.mesh.position).normalize(); // 复用 _v1
          const forward = _v2.set(0, 0, -1).applyQuaternion(e.mesh.quaternion); // 复用 _v2
          const dot = toBullet.dot(forward);
          if (dot < -0.3) {
            // 正面击中，减伤
            dmg *= 0.2;
            // 护盾格挡特效
            explode(b.mesh.position, 0x66ddff, 6, 0.4, false);
          }
        }
        
        // 暴击判定
        let isCrit = false;
        if (STATE.critChance > 0 && Math.random() < STATE.critChance) {
          dmg *= STATE.critMult;
          isCrit = true;
        }
        
        // 机械神谕护盾阶段：减伤 90%
        if (e.type === 3 && e.shieldPhase && e.shieldPhase > 0) {
          dmg *= 0.1;
        }
        
        e.hp -= dmg;
        
        // 吸血
        if (STATE.lifesteal > 0) {
          const heal = dmg * STATE.lifesteal;
          STATE.hp = Math.min(STATE.maxHp, STATE.hp + heal);
        }
        
        // 命中粒子特效：所有敌人（含 Boss）都生成爆炸，暴击时特效更大
        explode(b.mesh.position, isCrit ? 0xffb547 : 0xffffff, isCrit ? 8 : 4, isCrit ? 0.5 : 0.3, false);

        if(e.type === 3) {
          // Boss 额外处理：播放节流音效，并立刻强制更新血条UI
          playBossHit();
          if(HUD.bossFill) {
            const bossMaxHp = 800 + STATE.wave * 100;
            // 扣血瞬间立刻更新血条，哪怕掉帧也能反映出来
            HUD.bossFill.scale.x = Math.max(0, e.hp / bossMaxHp);
          }
        }
        
        // 等离子弹穿透：记录已命中，不消耗子弹，继续穿透
        if (b.isPlasma) {
          b._hitSet.add(e);
          if(e.hp<=0) killEnemy(e,j);
          // 不 break，不消耗子弹，继续穿透
        } else {
          releaseBullet(b); 
          bullets.splice(i,1);
          if(e.hp<=0) killEnemy(e,j);
          break;
        }
      }
    }
  }

  const upVec = _v3.set(0, 1, 0); // 复用 _v3 做常量上向量
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    const toPlayer = _v1.copy(player.position).sub(e.mesh.position); // 复用 _v1
    const dist = toPlayer.length();
    toPlayer.normalize();
    
    let desiredDir = _v2.set(0,0,0); // 复用 _v2
    let speedFactor = 1.0;
    let canFire = false;

    // ====== 根据行为模式分发 AI ======
    if (e.behavior === 'assaulter') {
      // 突击手：近距离盘旋
      if (dist < 40) {
        desiredDir.copy(toPlayer).negate(); // 太近就拉开
      } else if (dist > 80) {
        desiredDir.copy(toPlayer); // 太远就靠近
      } else {
        // 理想距离内盘旋
        const side = _v5.crossVectors(toPlayer, upVec).normalize().multiplyScalar(e.orbitDir);
        desiredDir.copy(side).addScaledVector(toPlayer, -0.2).normalize();
        desiredDir.y += e.orbitHeight * 0.01;
        desiredDir.normalize();
      }
      canFire = true;
    } 
      else if (e.behavior === 'sniper') {
      canFire = false; // 禁止发射普通子弹
      
      // ===== 激光状态机 =====
      if (e.laserState === 'cooling') {
        e.laserTimer++;
        e.laserMesh.visible = false;
        if(e.laserMesh.userData.glowMesh) e.laserMesh.userData.glowMesh.visible = false;
        
        // 冷却期间保持中远距离，缓慢横移
        if (dist < 250) {
          desiredDir.copy(toPlayer).negate();
          speedFactor = 1.2; 
        } else if (dist > 500) {
          desiredDir.copy(toPlayer);
          speedFactor = 0.5;
        } else {
          const side = _v5.crossVectors(toPlayer, upVec).normalize().multiplyScalar(e.orbitDir);
          desiredDir.copy(side).multiplyScalar(0.5).addScaledVector(toPlayer, -0.05).normalize();
          speedFactor = 0.5;
        }

        // 使用难度设定的冷却时间
        if (e.laserTimer > e.laserCoolingTime) { 
          e.laserState = 'firing';
          e.laserTimer = 0;
        }
      } else if (e.laserState === 'firing') {
        e.laserTimer++;
        e.laserMesh.visible = true;
        if(e.laserMesh.userData.glowMesh) e.laserMesh.userData.glowMesh.visible = true;
        
        // 开火期间停止移动，专心扫射
        speedFactor = 0; 
        desiredDir.set(0, 0, 0);
        
        // 使用难度设定的追踪速度
        e.laserTargetDir.lerp(toPlayer, e.laserTurnSpeed).normalize(); // toPlayer 已经是单位向量，无需 clone
        
        // 计算抵消父级旋转的四元数
        const targetWorldQuat = _q1.setFromUnitVectors(_v1.set(0,1,0), e.laserTargetDir); // 复用 _v1, _q1
        const invParentQuat = _q2.copy(e.mesh.quaternion).invert(); // 复用 _q2
        e.laserMesh.quaternion.copy(invParentQuat).multiply(targetWorldQuat);
        // 同步光晕网格的朝向
        if(e.laserMesh.userData.glowMesh) e.laserMesh.userData.glowMesh.quaternion.copy(e.laserMesh.quaternion);
        
        // ===== 激光伤害判定（连续碰撞检测，防止高速穿透） =====
        // 检查玩家从 prevPos 到 pos 的移动路径是否穿过激光
        const moveVec = _v4.subVectors(PLAYER.pos, PLAYER.prevPos);
        const moveLen = moveVec.length();
        let hitByLaser = false;
        if (moveLen > 0.5) {
          // 高速移动：在路径上采样多个点检测
          const samples = Math.min(Math.ceil(moveLen / 0.4), 6);
          for (let s = 0; s <= samples && !hitByLaser; s++) {
            const t = s / samples;
            const samplePos = _v2.copy(PLAYER.prevPos).addScaledVector(moveVec, t);
            const toSample = _v3.subVectors(samplePos, e.mesh.position);
            const dotS = toSample.dot(e.laserTargetDir);
            if (dotS > 0) {
              const closest = _v4.copy(e.mesh.position).addScaledVector(e.laserTargetDir, dotS);
              if (closest.distanceTo(samplePos) < 1.1) {
                hitByLaser = true;
              }
            }
          }
        } else {
          // 低速移动：单点检测即可
          const toPlayerVec = _v2.subVectors(PLAYER.pos, e.mesh.position);
          const dot = toPlayerVec.dot(e.laserTargetDir);
          if (dot > 0) {
            const closestPoint = _v3.copy(e.mesh.position).addScaledVector(e.laserTargetDir, dot);
            if (closestPoint.distanceTo(PLAYER.pos) < 1.1) {
              hitByLaser = true;
            }
          }
        }
        if (hitByLaser) {
          damagePlayer(e.laserDamage, PLAYER.pos);
        }

        // 新增：激光击毁导弹判定
        for(let j=missiles.length-1; j>=0; j--) {
          const m = missiles[j];
          const toMissileVec = _v2.subVectors(m.mesh.position, e.mesh.position); // 复用 _v2
          const dotM = toMissileVec.dot(e.laserTargetDir);
          if (dotM > 0) {
            const closestPointM = _v3.copy(e.mesh.position).addScaledVector(e.laserTargetDir, dotM); // 复用 _v3
            if (closestPointM.distanceTo(m.mesh.position) < 0.9) {  // 与激光视觉半径(0.6) + 导弹容差(0.3) 一致
              explode(m.mesh.position, 0xff8800, 10, 1.0, true);
              releaseMissile(m);
              missiles.splice(j, 1);
            }
          }
        }

        // 使用难度设定的开火时间
        if (e.laserTimer > e.laserFiringTime) { 
          e.laserState = 'cooling';
          e.laserTimer = 0;
        }
      }
    }



    else if (e.behavior === 'charger') {
      // 冲撞者：极速左右震荡冲向玩家
      desiredDir.copy(toPlayer);
      const side = _v5.crossVectors(toPlayer, upVec).normalize();
      // 修改：使用难度设定的震荡频率 e.swingSpeed
      const swing = Math.sin(STATE.time * e.swingSpeed + e.swingOffset) * 0.9;
      desiredDir.addScaledVector(side, swing).normalize();
      speedFactor = 1.0; 
      
      // 自爆判定
      if(dist < e.radius + 2.0) {
        // 修改：使用难度设定的伤害值 e.crashDamage
        damagePlayer(e.crashDamage, e.mesh.position);
        explode(e.mesh.position, e.color, 25, e.scale * 1.5);
        scene.remove(e.mesh); disposeNode(e.mesh);
        enemies.splice(i,1);
        continue; 
      }
    }

    else if (e.behavior === 'shielder') {
      // 护盾兵：缓慢推进，始终正面对玩家，正面减伤
      desiredDir.copy(toPlayer);
      speedFactor = 0.8;
      canFire = true;
      // 标记正面朝向，用于子弹减伤判定（朝向更新已统一在下方处理）
      e.facingPlayer = true;
    }

    else if (e.behavior === 'splitter') {
      // 分裂者：中距离盘旋，死亡时分裂
      if (dist < 50) {
        desiredDir.copy(toPlayer).negate();
      } else if (dist > 100) {
        desiredDir.copy(toPlayer);
      } else {
        const side = _v5.crossVectors(toPlayer, upVec).normalize().multiplyScalar(e.orbitDir);
        desiredDir.copy(side).addScaledVector(toPlayer, -0.1).normalize();
        desiredDir.y += e.orbitHeight * 0.01;
        desiredDir.normalize();
      }
      canFire = true;
    }

    else if (e.behavior === 'bomber') {
      // 轰炸机：缓慢靠近，中距离投掷范围炸弹
      if (dist > 120) {
        desiredDir.copy(toPlayer);
        speedFactor = 0.7;
      } else if (dist < 80) {
        desiredDir.copy(toPlayer).negate();
        speedFactor = 0.5;
      } else {
        const side = _v5.crossVectors(toPlayer, upVec).normalize().multiplyScalar(e.orbitDir);
        desiredDir.copy(side).multiplyScalar(0.6);
        speedFactor = 0.4;
      }
      canFire = true;
    }

    else if (e.behavior === 'kamikaze') {
      // 自爆机：高速直线冲撞，轻微追踪
      desiredDir.copy(toPlayer);
      // 轻微左右摆动
      const side = _v5.crossVectors(toPlayer, upVec).normalize();
      const swing = Math.sin(STATE.time * 0.08 + e.swingOffset) * 0.3;
      desiredDir.addScaledVector(side, swing).normalize();
      speedFactor = 1.2;
      // 自爆判定（更早爆炸）
      if(dist < e.radius + 3.0) {
        damagePlayer(e.crashDamage, e.mesh.position);
        // 范围爆炸特效
        explode(e.mesh.position, e.color, 35, e.scale * 2.0);
        const _sw = getShockwave(e.color);
        _sw.mesh.position.copy(e.mesh.position);
        shockwaves.push({ mesh: _sw.mesh, radius: 3, speed: 3.0, maxRadius: 40, hit: false, damage: 10, center: e.mesh.position.clone() });
        scene.remove(e.mesh); disposeNode(e.mesh);
        enemies.splice(i,1);
        continue; 
      }
    }

    // Boss 移动逻辑：在速度应用之前设置 desiredDir
    if (e.type === 3) {
      const variant = e.bossVariant || 0;
      if (variant === 0) {
        // 虚空之眼：中距离环绕玩家，缓慢漂浮
        const orbitDist = 160;
        if (dist > orbitDist + 40) {
          desiredDir.copy(toPlayer);
          speedFactor = 0.6;
        } else if (dist < orbitDist - 40) {
          desiredDir.copy(toPlayer).negate();
          speedFactor = 0.5;
        } else {
          const side = _v5.crossVectors(toPlayer, upVec).normalize();
          const orbitDir = e._orbitDir || (e._orbitDir = Math.random() < 0.5 ? 1 : -1);
          desiredDir.copy(side).multiplyScalar(orbitDir).addScaledVector(toPlayer, -0.05).normalize();
          desiredDir.y += Math.sin(STATE.time * 0.01) * 0.15;
          desiredDir.normalize();
          speedFactor = 0.7;
        }
      } else if (variant === 1) {
        // 晶簇巨像：缓慢推进
        if (dist > 120) { desiredDir.copy(toPlayer); speedFactor = 0.45; }
        else { desiredDir.set(0,0,0); speedFactor = 0; }
      } else if (variant === 2) {
        // 深渊吞噬者：远距离游走
        if (dist > 250) { desiredDir.copy(toPlayer); speedFactor = 0.5; }
        else if (dist < 150) { desiredDir.copy(toPlayer).negate(); speedFactor = 0.4; }
        else {
          const side = _v5.crossVectors(toPlayer, upVec).normalize();
          desiredDir.copy(side).multiplyScalar(0.8);
          speedFactor = 0.5;
        }
      } else if (variant === 3) {
        // 机械神谕：中距离八字盘旋
        if (dist > 200) { desiredDir.copy(toPlayer); speedFactor = 0.55; }
        else {
          const side = _v5.crossVectors(toPlayer, upVec).normalize();
          const fig8 = Math.sin(STATE.time * 0.008) * 0.6;
          desiredDir.copy(side).multiplyScalar(fig8).addScaledVector(toPlayer, 0.1).normalize();
          speedFactor = 0.6;
        }
      }
    }

    _v1.copy(desiredDir).multiplyScalar(e.maxSpeed * speedFactor);
    e.vel.lerp(_v1, e.behavior === 'charger' ? 0.15 : 0.04);
    // 机械神谕时间停止：非 Boss 敌人冻结（Boss 是施术者，不受影响）
    const _timeStopEnemy = (STATE.currentBoss && STATE.currentBoss.timeStopActive && e.type !== 3);
    if (!_timeStopEnemy) {
      e.mesh.position.add(e.vel);
    }

    // ====== 统一朝向更新 ======
    if (e.type === 3) {
      // Boss 始终面向玩家，确保虚空之眼等正面特征紧盯玩家
      e.mesh.lookAt(player.position);
    } else if (e.behavior === 'shielder') {
      // 护盾兵：始终正面对玩家，确保护盾朝前减伤
      e.mesh.lookAt(player.position);
    } else if (e.vel.lengthSq() > 0.0001) {
      _v1.copy(e.mesh.position).add(e.vel);
      e.mesh.lookAt(_v1);
      if(e.behavior !== 'charger') {
        _q1.copy(e.mesh.quaternion).invert();
        _v2.copy(desiredDir).applyQuaternion(_q1);
        const bankAngle = Math.atan2(_v2.x, -_v2.z) * 0.6;
        e.mesh.rotateZ(bankAngle);
      }
    }
      // ====== Boss 专属攻击逻辑（多阶段系统，委托给 updateBoss） ======
      if (e.type === 3) {
        updateBoss(e, dist);
      }


    // ====== 普通敌人开火逻辑 ======
    else if (canFire) {
      e.fireTimer--;
      if(e.fireTimer <= 0){
        e.fireTimer = e.maxFireTimer;
        
        if (e.behavior === 'sniper') {
          // 狙击手：大体积、极快、无预判的直射子弹（逼迫玩家主动走位）
          const eb = getEnemyBullet(e.color);
          eb.mesh.scale.set(2.5, 2.5, 2.5); // 体积巨大
          eb.mesh.position.copy(e.mesh.position).add(_vFire.copy(toPlayer).multiplyScalar(3));
          eb.dir.copy(toPlayer);
          eb.speed = 10.0; 
          eb.life = 300; 
          eb.isHoming = true; 
          eb.homingTime = 60; // 狙击弹只追踪 1 秒，之后靠惯性直线飞行
          eb.mesh.quaternion.setFromUnitVectors(_vForward, eb.dir);
          enemyBullets.push(eb);
          playSniperShot(); 
        } else if (e.behavior === 'shielder') {
          // 护盾兵：3 发扇形子弹
          for (let k = -1; k <= 1; k++) {
            const ang = k * 0.18;
            _qFire.setFromAxisAngle(_vUp, ang);
            const dir = toPlayer.clone().applyQuaternion(_qFire);
            const eb = getEnemyBullet(e.color);
            eb.mesh.position.copy(e.mesh.position).add(dir.clone().multiplyScalar(2));
            eb.dir.copy(dir);
            eb.speed = e.bulletSpeed;
            eb.life = 400;
            eb.mesh.quaternion.setFromUnitVectors(_vForward, eb.dir);
            enemyBullets.push(eb);
          }
          playEnemyLaser();
        } else if (e.behavior === 'splitter') {
          // 分裂者：双发连射
          for (let k = 0; k < 2; k++) {
            const eb = getEnemyBullet(e.color);
            const jitter = (Math.random() - 0.5) * 0.2;
            _qFire.setFromAxisAngle(_vUp, jitter);
            const dir = toPlayer.clone().applyQuaternion(_qFire);
            eb.mesh.position.copy(e.mesh.position).add(dir.clone().multiplyScalar(2));
            eb.dir.copy(dir);
            eb.speed = e.bulletSpeed;
            eb.life = 500;
            eb.mesh.quaternion.setFromUnitVectors(_vForward, eb.dir);
            enemyBullets.push(eb);
          }
          playEnemyLaser();
        } else if (e.behavior === 'bomber') {
          // 轰炸机：投掷范围炸弹（慢速大球，命中或到时爆炸成冲击波）
          const eb = getEnemyBullet(e.color);
          eb.mesh.scale.set(3.0, 3.0, 3.0);
          eb.mesh.position.copy(e.mesh.position).add(_vFire.copy(toPlayer).multiplyScalar(3));
          eb.dir.copy(toPlayer);
          eb.speed = e.bulletSpeed;
          eb.life = 300;
          eb.isBomb = true; // 标记为范围炸弹
          eb.mesh.quaternion.setFromUnitVectors(_vForward, eb.dir);
          enemyBullets.push(eb);
          playEnemyLaser();
        } else {
          // 突击手：预判射击
          const Vp = _v1.copy(PLAYER.vel); // 复用 _v1
          const D = _v2.subVectors(e.mesh.position, player.position); // 复用 _v2
          const Sb = e.bulletSpeed;
          
          let t = 0;
          const a = Vp.dot(Vp) - Sb * Sb;
          const b = -2 * Vp.dot(D);
          const c = D.dot(D);
          if (Math.abs(a) < 1e-6) {
            if (Math.abs(b) > 1e-6) t = -c / b;
          } else {
            const delta = b * b - 4 * a * c;
            if (delta >= 0) {
              const sqrtDelta = Math.sqrt(delta);
              const t1 = (-b + sqrtDelta) / (2 * a);
              const t2 = (-b - sqrtDelta) / (2 * a);
              if (t1 > 0 && t2 > 0) t = Math.min(t1, t2);
              else if (t1 > 0) t = t1;
              else if (t2 > 0) t = t2;
            }
          }
          const aimPoint = _v3.copy(player.position); // 复用 _v3
          if (t > 0) aimPoint.addScaledVector(Vp, t);
          
          const fireDir = _v4.subVectors(aimPoint, e.mesh.position).normalize(); // 复用 _v4
          const eb = getEnemyBullet(e.color);
          eb.mesh.position.copy(e.mesh.position).addScaledVector(fireDir, 2);
          eb.dir.copy(fireDir);
          eb.speed = Sb;
          eb.life = 300; // 突击手子弹寿命，与其他敌人(300-500)一致，原值 1000 导致子弹滞留屏幕过久
          eb.mesh.quaternion.setFromUnitVectors(_v5.set(0,0,1), eb.dir); // 复用 _v5
          enemyBullets.push(eb);
          playEnemyLaser();
        }
      }
    }

    // ====== 敌机碰撞伤害判定 (冲撞者已在上方处理) ======
    if(e.behavior !== 'charger' && dist < e.radius + 1.5){
      damagePlayer(e.type===2?20:(e.type===1?12:8), e.mesh.position);
      if(e.type !== 3) {
        explode(e.mesh.position, e.color, 12, e.scale*0.8, false);
        scene.remove(e.mesh); 
        disposeNode(e.mesh); 
        enemies.splice(i,1);
      } else {
        e.vel.add(_vFire.copy(toPlayer).negate().multiplyScalar(2));
      }
    }
  } // 敌机循环结束

    // ====== 导弹更新逻辑 ======
  for(let i=missiles.length-1; i>=0; i--) {
    const m = missiles[i];
    
    // 如果目标死亡，寻找新目标或直线飞行
    if(m.target && (m.target.hp <= 0 || !m.target.mesh.parent)) {
      m.target = null;
    }
    
    if(m.target) {
      const toTarget = _v1.subVectors(m.target.mesh.position, m.mesh.position); // 复用 _v1
      const dist = toTarget.length();
      const desiredDir = toTarget.normalize();
      
      // 获取当前飞行方向
      const currentDir = _v2.copy(m.dir).normalize(); // 复用 _v2
      
      // 计算当前方向与目标方向的夹角
      let dot = THREE.MathUtils.clamp(currentDir.dot(desiredDir), -1, 1);
      let angle = Math.acos(dot);
      
      // 设定最大转向角速度 (约 0.15 弧度/帧，非常灵活)
      const maxTurn = 0.15; 
      
      if (angle < maxTurn) {
        // 夹角很小，直接对准目标
        m.dir.copy(desiredDir);
      } else {
        // 夹角较大，限制每帧只能转 maxTurn 弧度，避免震荡
        const t = maxTurn / angle;
        m.dir.lerpVectors(currentDir, desiredDir, t).normalize();
      }
      
      // 更新导弹朝向
      m.mesh.quaternion.setFromUnitVectors(_v3.set(0,0,1), m.dir); // 复用 _v3
      
      // 关键：距离目标很近时强制减速，防止速度过快导致飞过头绕圈
      if (dist < 15) {
        m.speed = Math.min(m.speed, 2.5);
      }
    }
    
    // 导弹减速效果 (由快到慢，最低降到 4.0)
    m.speed = Math.max(m.speed - 0.03, 4.0);
    m.mesh.position.addScaledVector(m.dir, m.speed);
    m.life--;
    
    // 碰撞判定
    let hit = false;
    for(let j=enemies.length-1; j>=0; j--) {
      const e = enemies[j];
      if(m.mesh.position.distanceTo(e.mesh.position) < (e.bulletHitRadius || e.radius) + 1.0) {
        let dmg = m.dmg;
        // 暴击
        let isCrit = false;
        if (STATE.critChance > 0 && Math.random() < STATE.critChance) {
          dmg *= STATE.critMult;
          isCrit = true;
        }
        e.hp -= dmg;
        // 吸血
        if (STATE.lifesteal > 0) {
          STATE.hp = Math.min(STATE.maxHp, STATE.hp + dmg * STATE.lifesteal);
        }
        explode(m.mesh.position, isCrit ? 0xffb547 : 0xff8800, isCrit ? 20 : 15, 1.5, true);
        if(e.hp <= 0) killEnemy(e, j);
        hit = true;
        break;
      }
    }
    
    if(hit || m.life <= 0) {
      releaseMissile(m);
      missiles.splice(i, 1);
    }
  }


  // ====== 敌方子弹移动与碰撞判定 ======
  // 机械神谕时间操控：timePhase 2=倒流(子弹反向移动) 3=停止(子弹冻结)
  const _bossForBullets = STATE.currentBoss;
  const _timeReverse = (_bossForBullets && _bossForBullets.timePhase === 2);
  const _timeStopBullets = (_bossForBullets && _bossForBullets.timeStopActive);
  for(let i=enemyBullets.length-1;i>=0;i--){
    const b=enemyBullets[i];
    
    // 追踪逻辑：加入距离判定和燃料限制（时间停止/倒流时禁用追踪）
    if(b.isHoming && b.homingTime > 0 && !_timeStopBullets && !_timeReverse) {
      const dist = b.mesh.position.distanceTo(player.position);
      const targetDir = _v1.subVectors(player.position, b.mesh.position).normalize(); // 复用 _v1
      // 距离越近转向越快，避免在近处绕圈打不到人
      const turnSpeed = dist < 40 ? 0.3 : 0.1; 
      b.dir.lerp(targetDir, turnSpeed).normalize();
      b.mesh.quaternion.setFromUnitVectors(_v2.set(0,0,1), b.dir); // 复用 _v2
      b.homingTime--; // 消耗追踪燃料
    }
    
    if (!_timeStopBullets) {
      // 时间倒流：子弹反向移动（远离玩家）
      if (_timeReverse) b.mesh.position.addScaledVector(b.dir, -b.speed);
      else b.mesh.position.addScaledVector(b.dir, b.speed);
      b.life--;
    }
    // ... 后面的代码保持不变
    if(b.life<=0){
      // 范围炸弹过期时爆炸成冲击波
      if (b.isBomb) {
        const _sw = getShockwave(b.mesh.material.color.getHex());
        _sw.mesh.position.copy(b.mesh.position);
        shockwaves.push({ mesh: _sw.mesh, radius: 3, speed: 2.5, maxRadius: 35, hit: false, damage: 18, center: b.mesh.position.clone() });
        explode(b.mesh.position, 0xff8800, 15, 1.5);
      }
      // 分裂子弹：过期时分裂为环形弹幕（虚空之球、分裂晶体等）
      if (b.splitPattern) {
        const sp = b.splitPattern;
        for (let j = 0; j < sp.count; j++) {
          const sang = (j / sp.count) * Math.PI * 2;
          _v3.set(Math.cos(sang), 0, Math.sin(sang));
          const seb = getEnemyBullet(sp.color);
          seb.mesh.position.copy(b.mesh.position);
          seb.dir.copy(_v3);
          seb.speed = sp.speed;
          seb.life = 150;
          seb.mesh.quaternion.setFromUnitVectors(_vForward, _v3);
          enemyBullets.push(seb);
        }
        explode(b.mesh.position, sp.color, 12, 2, false);
      }
      b.splitPattern = null; b.mesh.scale.set(1,1,1);
      releaseEnemyBullet(b); enemyBullets.splice(i,1); continue;
    }

    const hitRadius = 1.5 * (b.mesh.scale.x || 1);
    if(b.mesh.position.distanceTo(player.position) < hitRadius){
      // 范围炸弹命中时也产生冲击波
      if (b.isBomb) {
        const _sw2 = getShockwave(b.mesh.material.color.getHex());
        _sw2.mesh.position.copy(b.mesh.position);
        shockwaves.push({ mesh: _sw2.mesh, radius: 3, speed: 2.5, maxRadius: 35, hit: false, damage: 18, center: b.mesh.position.clone() });
        explode(b.mesh.position, 0xff8800, 15, 1.5);
      } else {
        damagePlayer(10, b.mesh.position);
      }
      // 分裂子弹：命中玩家时也分裂为环形弹幕
      if (b.splitPattern) {
        const sp = b.splitPattern;
        for (let j = 0; j < sp.count; j++) {
          const sang = (j / sp.count) * Math.PI * 2;
          _v3.set(Math.cos(sang), 0, Math.sin(sang));
          const seb = getEnemyBullet(sp.color);
          seb.mesh.position.copy(b.mesh.position);
          seb.dir.copy(_v3);
          seb.speed = sp.speed;
          seb.life = 150;
          seb.mesh.quaternion.setFromUnitVectors(_vForward, _v3);
          enemyBullets.push(seb);
        }
        explode(b.mesh.position, sp.color, 12, 2, false);
      }
      b.splitPattern = null;
      releaseEnemyBullet(b); 
      b.mesh.scale.set(1, 1, 1); 
      enemyBullets.splice(i,1);
      continue; // 新增：击中玩家后直接检查下一发子弹
    }

    // 新增：检测是否击中了我方导弹
    for(let j=missiles.length-1; j>=0; j--) {
      const m = missiles[j];
      if(b.mesh.position.distanceTo(m.mesh.position) < 1.5) {
        explode(m.mesh.position, 0xff8800, 10, 1.0, true); // 导弹被引爆
        releaseMissile(m);
        missiles.splice(j, 1);
        b.splitPattern = null;
        releaseEnemyBullet(b);
        b.mesh.scale.set(1, 1, 1);
        enemyBullets.splice(i, 1);
        break; // 子弹已销毁，跳出导弹循环
      }
    }
  }

    // ====== 球面波扩张与碰撞判定 ======
  for(let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += sw.speed; // 半径不断增大
    sw.mesh.scale.setScalar(sw.radius); // 按比例放大网格
    sw.mesh.material.opacity = 0.4 * (1 - sw.radius / sw.maxRadius); // 随着扩散逐渐透明
    
    // 检测玩家是否被波纹边缘击中（只击中一次）—— 引力波不造成伤害
    if(!sw.hit && !sw.isPull && sw.damage > 0) {
      const dist = player.position.distanceTo(sw.center);
      // 当玩家正好处于球面壳厚度范围内时，判定击中
      if(Math.abs(dist - sw.radius) < 3.5) {
        damagePlayer(sw.damage, sw.center);
        sw.hit = true;
      }
    }

    // 引力波：波纹扫过玩家时将其拉向中心（深渊吞噬者 phase 1）
    if(sw.isPull && !sw.pullApplied) {
      const distP = player.position.distanceTo(sw.center);
      if(Math.abs(distP - sw.radius) < 18) {
        _v1.copy(sw.center).sub(player.position).normalize();
        PLAYER.vel.addScaledVector(_v1, 2.2);
        sw.pullApplied = true;
        STATE.shake = Math.max(STATE.shake, 6);
      }
    }

    // 新增：球面波击毁导弹判定
    for(let j=missiles.length-1; j>=0; j--) {
      const m = missiles[j];
      const distM = m.mesh.position.distanceTo(sw.center);
      if(Math.abs(distM - sw.radius) < 4.0) { 
        explode(m.mesh.position, 0xff8800, 10, 1.0, true);
        releaseMissile(m);
        missiles.splice(j, 1);
      }
    }
    // 超过最大半径后回收
    if(sw.radius >= sw.maxRadius) {
      releaseShockwave(sw);
      shockwaves.splice(i, 1);
    }
  }


  updateParticles();
  if(STATE.comboTimer>0){ STATE.comboTimer--; if(STATE.comboTimer<=0) STATE.combo=0; }

  camera.quaternion.slerp(PLAYER.quaternion, 0.15);
  _v1.set(0, 1.5, 7).applyQuaternion(camera.quaternion); // camOffset
  _v2.copy(player.position).add(_v1); // targetCamPos
  if(STATE.shake>0){
    _v2.x += (Math.random()-0.5)*STATE.shake;
    _v2.y += (Math.random()-0.5)*STATE.shake;
    STATE.shake *= 0.86;
  }
  camera.position.lerp(_v2, 0.15);

  starsFar.rotation.y += 0.00005;
  starsNear.rotation.y += 0.0001;
  // 远方星球自转
  for(let i=0; i<distantPlanets.length; i++){
    distantPlanets[i].mesh.rotation.y += distantPlanets[i].speed;
  }
  // 电弧闪电生命周期更新（对象池）
  updateArcLightnings();
  // 奖励延迟计时器（用帧数而非 setTimeout，避免与游戏循环脱节）
  if (STATE.rewardDelayTimer > 0) {
    STATE.rewardDelayTimer--;
    if (STATE.rewardDelayTimer === 0 &&
        STATE.started && !STATE.over && !STATE.isTutorial && !STATE.inCutscene) {
      triggerReward();
    }
  }
  updateHUD();
}

// === 帧率独立处理：固定逻辑更新频率为 60Hz ===
const FIXED_FPS = 60;
const FIXED_TIME_STEP = 1000 / FIXED_FPS;
let lastFrameTime = performance.now();
let accumulator = 0;

function animate() {
  requestAnimationFrame(animate);
  
  const now = performance.now();
  let delta = now - lastFrameTime;
  lastFrameTime = now;
  
  // 防止页面切走后回来导致 delta 过大造成的死循环
  if (delta > 250) delta = 250; 
  accumulator += delta;
  
  // 按固定的 60Hz 频率更新游戏逻辑
  let steps = 0;
  while (accumulator >= FIXED_TIME_STEP && steps < 5) {
    update(); // 游戏逻辑更新
    accumulator -= FIXED_TIME_STEP;
    steps++;
  }
  
  // 每帧渲染画面 (使用后处理管线，包含 Bloom 辉光效果)
  // 先更新 Boss 装饰动画：从各 mesh 的 onBeforeRender 剥离合并到 enemyData.updateBossAnimations，
  // 每帧调用一次 (而非每个 mesh 各自的渲染回调)，减少频繁进出回调的 CPU 开销。
  // 放在 update() 的固定步长循环之外、render 之前，保证每渲染帧恰好推进一次，
  // 与原 onBeforeRender 行为一致 (暂停时画面仍渲染，装饰动画继续，零损失)。
  for (let i = 0; i < enemies.length; i++) {
    const animFn = enemies[i].updateBossAnimations;
    if (animFn) animFn();
  }
  composer.render();
  
  frames++;
  const nowFps = performance.now();
  if(nowFps - lastFpsTime > 500){
    fpsCorner.textContent = Math.round(frames * 1000 / (nowFps - lastFpsTime)) + ' FPS';
    frames=0; lastFpsTime=nowFps;
  }
}
animate();

// 初始化登录与数据同步系统（必须在 AUTH 定义之后调用）
initAuthSystem();

// 应用初始国际化（刷新静态 HTML 文本与难度按钮显示名）
try {
  applyI18n();
  refreshDifficultyUI();
  syncLangGrid();
  if (typeof refreshAuthLang === 'function') refreshAuthLang();
} catch (e) { /* i18n 函数在 state.js 中定义，加载顺序保证其已就绪 */ }

/* ============== UI 事件 ============== */
function enterGame() {
  // 修复：云端数据同步未完成时阻止进入游戏，避免用旧 META 初始化本局属性
  if (STATE.cloudSyncPending) {
    if (typeof showToast === 'function') showToast(t('toast.cloud_sync', '云端数据同步中，请稍候…'), 1500);
    else alert(t('toast.cloud_sync', '云端数据同步中，请稍候…'));
    return;
  }
  initAudio();
  initAudioContext(); // 初始化 Web Audio 上下文（需在用户交互后调用）
  overlay.style.display='none';
  endScreen.style.display='none';
  resetGame();
  STATE.started = true;
  document.body.classList.add('in-game');

  startDialogue('intro', () => {
    startWave();
    document.body.requestPointerLock();
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
}

document.getElementById('btn-start').addEventListener('click', enterGame);
document.getElementById('btn-restart').addEventListener('click', enterGame);

/* ============== 武器图鉴系统 ============== */
const CODEX_DATA = [
  {
    name: '机关枪', nameEn: 'Machine Gun',
    type: 'bullet',
    stats: [
      { label: '武器类型', labelEn: 'Type', val: '连发型动能武器', valEn: 'Rapid kinetic weapon' },
      { label: '基础伤害', labelEn: 'Base Damage', val: '1 / 发', valEn: '1 / shot' },
      { label: '射击频率', labelEn: 'Fire Rate', val: '极快 (可强化)', valEn: 'Very fast (upgradeable)' },
      { label: '弹道特性', labelEn: 'Projectile', val: '直线飞行，可扩散', valEn: 'Straight line, can spread' },
      { label: '战术说明', labelEn: 'Tactics', val: '依靠高频打击压制敌人。升级后可形成多重弹道火力网。没有追踪能力，需要玩家自行瞄准预判。', valEn: 'Suppress enemies with high fire rate. Upgrades add multi-projectile spread. No homing — aim and lead manually.' }
    ]
  },
  {
    name: '追踪导弹', nameEn: 'Missile Launcher',
    type: 'missile',
    stats: [
      { label: '武器类型', labelEn: 'Type', val: '锁定型爆炸武器', valEn: 'Lock-on explosive weapon' },
      { label: '基础伤害', labelEn: 'Base Damage', val: '5 / 发', valEn: '5 / shot' },
      { label: '射击频率', labelEn: 'Fire Rate', val: '锁定1秒，单发发射', valEn: '1s lock, single fire' },
      { label: '弹道特性', labelEn: 'Projectile', val: '智能强追踪，咬住不放', valEn: 'Strong homing, stays on target' },
      { label: '战术说明', labelEn: 'Tactics', val: '自动追踪锁定的敌人，非常适合打击高移速目标。缺点是飞行途中会被敌方的子弹、激光和Boss球面波拦截引爆。', valEn: 'Auto-tracks locked targets — great vs fast movers. Can be intercepted mid-flight by bullets, lasers and boss shockwaves.' }
    ]
  },
  {
    name: '等离子炮', nameEn: 'Plasma Cannon',
    type: 'plasma',
    stats: [
      { label: '武器类型', labelEn: 'Type', val: '蓄能型能量武器', valEn: 'Charge-type energy weapon' },
      { label: '基础伤害', labelEn: 'Base Damage', val: '3~10 / 发 (随蓄能)', valEn: '3~10 / shot (by charge)' },
      { label: '射击频率', labelEn: 'Fire Rate', val: '按住蓄能，松开发射', valEn: 'Hold to charge, release to fire' },
      { label: '弹道特性', labelEn: 'Projectile', val: '穿透敌机，不消耗', valEn: 'Pierces enemies, no ammo cost' },
      { label: '战术说明', labelEn: 'Tactics', val: '按住鼠标蓄能，蓄满后松开发射高伤害等离子弹。子弹可穿透多个敌人，是清理密集敌群的利器。蓄能时无法移动射击。', valEn: 'Hold mouse to charge; release at full to fire a high-damage plasma bolt that pierces multiple enemies. Cannot move while charging.' }
    ]
  },
  {
    name: '散弹枪', nameEn: 'Shotgun',
    type: 'pellet',
    stats: [
      { label: '武器类型', labelEn: 'Type', val: '近距扇形武器', valEn: 'Close-range spread weapon' },
      { label: '基础伤害', labelEn: 'Base Damage', val: '0.6 / 颗 (5+颗)', valEn: '0.6 / pellet (5+ pellets)' },
      { label: '射击频率', labelEn: 'Fire Rate', val: '中速', valEn: 'Medium' },
      { label: '弹道特性', labelEn: 'Projectile', val: '扇形扩散，近距离爆发', valEn: 'Fan spread, close-range burst' },
      { label: '战术说明', labelEn: 'Tactics', val: '发射多颗弹丸形成扇形火力网，近距离伤害极高。升级后弹丸数量增加。适合对付冲撞者和自爆机等近战敌人。', valEn: 'Fires multiple pellets in a fan — extreme close-range damage. Upgrades add more pellets. Great vs chargers and kamikazes.' }
    ]
  },
  {
    name: '电弧发射器', nameEn: 'Arc Emitter',
    type: 'arc',
    stats: [
      { label: '武器类型', labelEn: 'Type', val: '链式闪电武器', valEn: 'Chain lightning weapon' },
      { label: '基础伤害', labelEn: 'Base Damage', val: '2.5 / 跳', valEn: '2.5 / jump' },
      { label: '射击频率', labelEn: 'Fire Rate', val: '中速，自动锁定', valEn: 'Medium, auto-targets' },
      { label: '弹道特性', labelEn: 'Projectile', val: '链式跳跃，最多3+目标', valEn: 'Chains, up to 3+ targets' },
      { label: '战术说明', labelEn: 'Tactics', val: '自动锁定前方扇形区域内的敌人，发射链式闪电在多个敌人间跳跃。无需精确瞄准，适合对付分散的敌群。升级后可跳跃更多目标。', valEn: 'Auto-targets enemies in a frontal cone and chains lightning between them. No precise aim needed — great vs scattered groups. Upgrades add more chain targets.' }
    ]
  }
];

let codexScene, codexCamera, codexRenderer, codexMesh;
let codexActive = false;
let codexIndex = 0;

function initCodex() {
  if(codexRenderer) return; // 防止重复初始化
  
  codexScene = new THREE.Scene();
  codexCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  codexCamera.position.set(0, 0, 6); // 拉远相机距离
  
  codexRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('codex-canvas'), antialias: true, alpha: true });
  codexRenderer.outputColorSpace = THREE.SRGBColorSpace;
  codexRenderer.setPixelRatio(window.devicePixelRatio);
  
  codexScene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.0));
  const light = new THREE.DirectionalLight(0x00ffe5, 1.5);
  light.position.set(2, 2, 2);
  codexScene.add(light);
  
  updateCodexModel();
}

function updateCodexModel() {
  if(codexMesh) {
    codexScene.remove(codexMesh);
    disposeNode(codexMesh);
  }
  
  const data = CODEX_DATA[codexIndex];
  if(data.type === 'bullet') {
    const geo = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
    geo.rotateX(Math.PI / 2);
    codexMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:0x00ffe5 }));
  } else if(data.type === 'plasma') {
    // 等离子弹：发光球体 + 外层光晕
    codexMesh = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), new THREE.MeshBasicMaterial({ color:0x00ddff }));
    codexMesh.add(core);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshBasicMaterial({ color:0x00ddff, transparent:true, opacity:0.3, blending:THREE.AdditiveBlending }));
    codexMesh.add(glow);
  } else if(data.type === 'pellet') {
    // 散弹：多个小弹丸
    codexMesh = new THREE.Group();
    for(let i=0; i<5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color:0xffaa00 }));
      p.position.set((i-2)*0.3, 0, 0);
      codexMesh.add(p);
    }
  } else if(data.type === 'arc') {
    // 电弧：闪电折线
    const points = [];
    for(let i=0; i<8; i++) {
      points.push(new THREE.Vector3((Math.random()-0.5)*1.5, (i-4)*0.3, (Math.random()-0.5)*0.5));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    codexMesh = new THREE.Line(geo, new THREE.LineBasicMaterial({ color:0x88ffff, linewidth:2 }));
  } else {
    const geo = new THREE.SphereGeometry(0.5, 16, 16);
    codexMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:0xffb547 }));
  }
  codexScene.add(codexMesh);

  // 更新右侧UI文本
  document.getElementById('codex-name').textContent = trName(data);
  const statsDiv = document.getElementById('codex-stats');
  const en = STATE.lang === 'en';
  statsDiv.innerHTML = data.stats.map(s => `
    <div class="codex-stat-item">
      <div class="label">${en ? (s.labelEn || s.label) : s.label}</div>
      <div class="val">${en ? (s.valEn || s.val) : s.val}</div>
      ${s.desc ? `<div class="desc">${s.desc}</div>` : ''}
    </div>
  `).join('');
}

function animateCodex() {
  if(!codexActive) return;
  requestAnimationFrame(animateCodex);
  if(codexMesh) {
    codexMesh.rotation.y += 0.01;
    codexMesh.position.y = Math.sin(performance.now() * 0.001) * 0.2;
  }
  codexRenderer.render(codexScene, codexCamera);
}

function resizeCodex() {
  if(!codexRenderer) return;
  const box = document.querySelector('.codex-canvas-box');
  const w = box.clientWidth, h = box.clientHeight;
  codexRenderer.setSize(w, h, false);
  codexCamera.aspect = w / h;
  codexCamera.updateProjectionMatrix();
}

document.getElementById('btn-codex').addEventListener('click', () => {
  document.getElementById('codex-overlay').classList.add('show');
  initCodex();
  resizeCodex();
  codexActive = true;
  animateCodex();
});

document.getElementById('btn-codex-close').addEventListener('click', () => {
  document.getElementById('codex-overlay').classList.remove('show');
  codexActive = false;
});

/* ============== 星晶强化中心 UI ============== */
function renderMetaShop() {
  const grid = document.getElementById('meta-grid');
  const crystalEl = document.getElementById('meta-crystal-count');
  crystalEl.textContent = META.crystals;
  grid.innerHTML = '';
  for (const def of META_UPGRADES) {
    const lv = getMetaLevel(def.id);
    const isMax = lv >= def.max;
    const cost = isMax ? 0 : def.cost(lv);
    const canAfford = META.crystals >= cost;
    
    const card = document.createElement('div');
    card.className = 'meta-card';
    
    // 等级点
    let dots = '';
    for (let i = 0; i < def.max; i++) {
      dots += `<span class="mc-dot${i < lv ? ' on' : ''}"></span>`;
    }
    
    let btnClass = 'mc-buy';
    let btnText = '';
    let btnDisabled = '';
    if (isMax) { btnClass += ' maxed'; btnText = t('meta.maxed', '已满级'); btnDisabled = 'disabled'; }
    else if (canAfford) { btnText = `💎 ${cost}  ` + t('meta.upgrade', '升级'); }
    else { btnClass += ' cant'; btnText = `💎 ${cost}  ` + t('meta.insufficient', '星晶不足'); btnDisabled = 'disabled'; }

    card.innerHTML = `
      <div class="mc-icon">${def.icon}</div>
      <div class="mc-name">${trName(def)}</div>
      <div class="mc-desc">${trDesc(def)}</div>
      <div class="mc-level">${dots}</div>
      <div style="font-size:11px;color:var(--muted);">${t('meta.level', '等级')} ${lv} / ${def.max}</div>
      <button class="${btnClass}" data-id="${def.id}" ${btnDisabled}>${btnText}</button>
    `;
    grid.appendChild(card);
  }
  // 绑定购买按钮
  grid.querySelectorAll('.mc-buy:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (buyMetaUpgrade(id)) {
        renderMetaShop();
      }
    });
  });
}

document.getElementById('btn-meta').addEventListener('click', () => {
  document.getElementById('meta-overlay').classList.add('show');
  renderMetaShop();
});

document.getElementById('btn-meta-close').addEventListener('click', () => {
  document.getElementById('meta-overlay').classList.remove('show');
});

document.getElementById('codex-prev').addEventListener('click', () => {
  codexIndex = (codexIndex - 1 + CODEX_DATA.length) % CODEX_DATA.length;
  updateCodexModel();
});

document.getElementById('codex-next').addEventListener('click', () => {
  codexIndex = (codexIndex + 1) % CODEX_DATA.length;
  updateCodexModel();
});


window.addEventListener('resize', ()=>{
  const w=window.innerWidth, h=window.innerHeight;
  renderer.setSize(w,h);
  camera.aspect=w/h; camera.updateProjectionMatrix();
  // 同步后处理管线尺寸
  composer.setSize(w, h);
  bloomPass.setSize(w, h);
  if(HUD.app){
    HUD.app.renderer.resize(w,h);
    HUD.W=w; HUD.H=h;
    // 递归销毁旧的 HUD 子元素，避免显存泄漏（removeChildren 不会释放 GPU 纹理）
    for (let i = HUD.stage.children.length - 1; i >= 0; i--) {
      const child = HUD.stage.children[i];
      HUD.stage.removeChild(child);
      child.destroy({ children: true, texture: true, baseTexture: true });
    }
    buildHUD(HUD.app);
    lastHpRatio=-1; lastEnRatio=-1; lastScore=-1; lastWave=-1; lastLevel=-1;
  }
  // 新增：图鉴画布自适应
  if(codexActive) resizeCodex();
});
