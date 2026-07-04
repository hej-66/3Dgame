// weapons.js — 武器开火、电弧对象池、玩家受伤
function fire(){
  if(PLAYER.fireCooldown>0) return;
  const aim = _v1.set(0, 0, -1).applyQuaternion(player.quaternion); // 复用 _v1
  const dmgBonus = 1 + STATE.bulletDmgBonus;
  
  // ===== 武器 0：机关枪 =====
  if (STATE.weapon === 0) {    
    PLAYER.fireCooldown = STATE.fireRate; 
    const count = STATE.bulletLevel;
    let offsets = [];
    if(count === 1) offsets = [0];
    else if(count === 2) offsets = [-0.6, 0.6];
    else {
      const spread = 0.5;
      const start = -spread * (count - 1) / 2;
      for(let i=0; i<count; i++) offsets.push(start + i * spread);
    }
    for(const ox of offsets){
      // 使用 _v2 计算偏移
      _v2.set(ox, -0.05, -1.5).applyQuaternion(player.quaternion);
      const start = player.position.clone().add(_v2); // start 需要存入子弹，用 clone
      const b = getBullet();
      b.mesh.position.copy(start);
      b.mesh.quaternion.setFromUnitVectors(_vForward, aim);
      b.dir.copy(aim); b.speed=STATE.bulletSpeed; b.life=200; b.dmg=1 * dmgBonus;
      bullets.push(b);
    }
    playLaser();
  }
  // ===== 武器 1：导弹发射器 =====
  else if (STATE.weapon === 1) {
    PLAYER.fireCooldown = STATE.fireRate * 3; 
    const count = Math.min(STATE.bulletLevel, 4);
    for(let i=0; i<count; i++){
      const m = getMissile();
      _v2.set((i - (count-1)/2) * 0.8, -0.1, -1.5).applyQuaternion(player.quaternion); // 复用 _v2
      const start = player.position.clone().add(_v2);
      m.mesh.position.copy(start);
      m.mesh.quaternion.copy(player.quaternion);
      m.dir.copy(aim); m.speed = 1.5; m.life = 300; m.dmg = 4 * dmgBonus;
      m.target = STATE.lockTarget;
      missiles.push(m);
    }
    playSniperShot(); // 复用狙击枪音效作为导弹发射音
  }
  // ===== 武器 2：等离子炮（蓄能型，高伤害单发）=====
  else if (STATE.weapon === 2) {
    PLAYER.fireCooldown = STATE.fireRate * 2.5;
    // 蓄能等级影响伤害和体积
    const charge = Math.min(STATE.plasmaCharge / 100, 1);
    const baseDmg = (3 + charge * 7) * dmgBonus;
    const b = getBullet();
    b.mesh.position.copy(player.position).addScaledVector(aim, -1.5);
    b.mesh.quaternion.setFromUnitVectors(_vForward, aim);
    b.mesh.scale.setScalar(1.5 + charge * 2.5);
    b.dir.copy(aim); b.speed = STATE.bulletSpeed * 0.8; b.life = 200; b.dmg = baseDmg;
    b.isPlasma = true;
    b._hitSet = new Set();
    bullets.push(b);
    // 蓄能消耗
    STATE.plasmaCharge = 0;
    playLaser();
    // 发射特效
    explode(b.mesh.position, 0x00ddff, 8, 0.6, false);
  }
  // ===== 武器 3：散弹枪（近距离扇形多发）=====
  else if (STATE.weapon === 3) {
    PLAYER.fireCooldown = STATE.fireRate * 1.8;
    const pelletCount = 5 + STATE.bulletLevel;
    const spreadAngle = 0.5;
    for(let i=0; i<pelletCount; i++){
      const t = pelletCount === 1 ? 0.5 : i / (pelletCount - 1);
      const angle = (t - 0.5) * spreadAngle;
      _q1.setFromAxisAngle(_v2.set(0,1,0), angle); // 复用 _v2 做轴，_q1 做四元数
      const dir = _v3.copy(aim).applyQuaternion(_q1); // 复用 _v3 做方向 (dir 会被存入子弹，需确保不覆盖)
      _v2.set(0, -0.05, -1.5).applyQuaternion(player.quaternion);
      const start = player.position.clone().add(_v2);
      const b = getBullet();
      b.mesh.position.copy(start);
      b.mesh.quaternion.setFromUnitVectors(_vForward, dir);
      b.dir.copy(dir); b.speed = STATE.bulletSpeed * 1.1; b.life = 80; b.dmg = 0.6 * dmgBonus;
      b.isPellet = true;
      bullets.push(b);
    }
    playLaser();
  }
  // ===== 武器 4：电弧发射器（链式闪电，自动锁定最近敌人）=====
  else if (STATE.weapon === 4) {
    PLAYER.fireCooldown = STATE.fireRate * 1.5;
    // 找到前方扇形范围内的敌人
    const arcRange = 80;
    const arcCone = 0.7; // 锥角余弦
    // 性能优化：复用预分配的候选数组与对象池，避免每次开火分配 { e, dist, dot } 对象
    _arcCandidates.length = 0;
    _arcCandIdx = 0;
    // 使用 PLAYER.pos（逻辑位置）而非 player.position（渲染位置），因为在 update() 中
    // PLAYER.pos 在 fire() 调用前已更新，但 player.position 仍为上一帧位置
    const playerLogicalPos = PLAYER.pos.clone();
    for (const e of enemies) {
      const toE = e.mesh.position.clone().sub(playerLogicalPos);
      const dist = toE.length();
      if (dist < arcRange) {
        toE.normalize();
        const dot = toE.dot(aim);
        if (dot > arcCone) {
          // 从对象池取一个槽位，避免 push 字面量对象
          let c = _arcCandPool[_arcCandIdx];
          if (!c) { c = { e: null, dist: 0, dot: 0 }; _arcCandPool[_arcCandIdx] = c; }
          _arcCandIdx++;
          c.e = e; c.dist = dist; c.dot = dot;
          _arcCandidates.push(c);
        }
      }
    }
    _arcCandidates.sort((a, b) => b.dot - a.dot);
    // 链式打击最多 4 个敌人
    const chainCount = Math.min(_arcCandidates.length, 3 + Math.floor(STATE.bulletLevel / 2) + (STATE.arcChainBonus || 0));
    // 使用逻辑位置作为电弧起点，避免高速移动时电弧落后于飞船
    let lastPos = playerLogicalPos.clone().add(aim.clone().multiplyScalar(-1.5));
    for (let i = 0; i < chainCount; i++) {
      const target = _arcCandidates[i].e;
      // 绘制闪电特效（线段）
      drawArcLightning(lastPos, target.mesh.position.clone());
      // 造成伤害
      let dmg = 2.5 * dmgBonus;
      // 暴击
      if (STATE.critChance > 0 && Math.random() < STATE.critChance) dmg *= STATE.critMult;
      target.hp -= dmg;
      // 吸血
      if (STATE.lifesteal > 0) STATE.hp = Math.min(STATE.maxHp, STATE.hp + dmg * STATE.lifesteal);
      explode(target.mesh.position.clone(), 0x88ffff, 6, 0.4, false);
      lastPos = target.mesh.position.clone();
      // 检查是否击杀
      const idx = enemies.indexOf(target);
      if (target.hp <= 0 && idx >= 0) killEnemy(target, idx);
    }
    if (chainCount > 0) playLaser();
    else {
      // 没有目标时发射一道空电弧
      const endPos = playerLogicalPos.clone().add(aim.clone().multiplyScalar(-60));
      drawArcLightning(playerLogicalPos.clone().add(aim.clone().multiplyScalar(-1.5)), endPos);
      playLaser();
    }
  }
}

// 绘制电弧闪电特效（折线）
// 电弧闪电对象池 — 预分配固定数量的 Line 对象，避免高频创建/销毁导致 GC 卡顿
const ARC_POOL_SIZE = 14;
const ARC_SEGMENTS = 6;
const ARC_POINTS = ARC_SEGMENTS + 1; // 起止 + 6段
const arcPool = [];
let arcPoolInited = false;
// 电弧武器目标搜索的候选数组与对象池 — 避免每次开火分配字面量对象 { e, dist, dot }
const _arcCandidates = [];       // 复用数组（持有对 _arcCandPool 中对象的引用）
const _arcCandPool = [];         // 预分配对象池
let _arcCandIdx = 0;
function initArcPool() {
  if (arcPoolInited) return;
  arcPoolInited = true;
  for (let i = 0; i < ARC_POOL_SIZE; i++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(ARC_POINTS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x88ffff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    // 修复：关闭视锥剔除。预分配缓冲区复用时 boundingSphere 不会随顶点更新自动重算，
    // 若仍开启 frustumCulled，旧 boundingSphere 在视锥外会导致电弧被错误剔除（"有时不可见"）
    line.frustumCulled = false;
    scene.add(line);
    arcPool.push({ line, geo, pos, mat, active: false, ttl: 0 });
  }
}
function drawArcLightning(from, to) {
  if (!arcPoolInited) initArcPool();
  // 找空闲槽，全占用则抢占最老的（轮转）
  let arc = null;
  for (let i = 0; i < ARC_POOL_SIZE; i++) {
    const candidate = arcPool[i];
    if (!candidate.active) { arc = candidate; break; }
  }
  if (!arc) {
    // 全占用：找 ttl 最小的抢占
    arc = arcPool[0];
    for (let i = 1; i < ARC_POOL_SIZE; i++) {
      if (arcPool[i].ttl < arc.ttl) arc = arcPool[i];
    }
  }

  // 写入顶点数据（避免 Vector3 分配，直接计算）
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
  const nx = dx / len, ny = dy / len, nz = dz / len;
  // 起点
  arc.pos[0] = from.x; arc.pos[1] = from.y; arc.pos[2] = from.z;
  // 中间抖动点
  for (let i = 1; i < ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const base = len * t;
    arc.pos[i*3]   = from.x + nx * base + (Math.random() - 0.5) * 3;
    arc.pos[i*3+1] = from.y + ny * base + (Math.random() - 0.5) * 3;
    arc.pos[i*3+2] = from.z + nz * base + (Math.random() - 0.5) * 3;
  }
  // 终点
  arc.pos[ARC_SEGMENTS*3]   = to.x;
  arc.pos[ARC_SEGMENTS*3+1] = to.y;
  arc.pos[ARC_SEGMENTS*3+2] = to.z;

  arc.geo.attributes.position.needsUpdate = true;
  arc.geo.setDrawRange(0, ARC_POINTS);
  arc.mat.opacity = 0.9;
  arc.line.visible = true;
  arc.active = true;
  arc.ttl = 9; // 9帧 ≈ 150ms @ 60fps
}
// 每帧更新电弧生命周期与淡出（由主更新循环调用）
function updateArcLightnings() {
  if (!arcPoolInited) return;
  for (let i = 0; i < ARC_POOL_SIZE; i++) {
    const arc = arcPool[i];
    if (!arc.active) continue;
    arc.ttl--;
    if (arc.ttl <= 0) {
      arc.line.visible = false;
      arc.active = false;
    } else {
      arc.mat.opacity = 0.9 * (arc.ttl / 9); // 淡出
    }
  }
}

function damagePlayer(amount, fromPos){
  if(STATE.invincibleTimer > 0) return;

  // === 完美格挡：判定窗口内受到攻击 = 完美格挡成功 ===
  // 成功：不消耗能量 + 触发蓝色能量波清除周围弹幕 + 不进冷却（奖励精准时机）
  // 必须在护盾判定之前，确保窗口内即使能量不足也能触发
  if(STATE.perfectBlockTimer > 0) {
    STATE.perfectBlockTimer = 0;        // 消耗判定窗口
    STATE.perfectBlockFlash = 30;       // 护盾高亮特效 30 帧
    STATE.flash = 0.5; STATE.flashColor = 0x00ffff;  // 青色强闪
    STATE.shake = Math.min(STATE.shake + 4, 10);
    triggerPerfectBlockWave();          // 清除周围弹幕 + 能量波视觉
    playPerfectBlock();                 // 特殊音效
    // 教程检测：step 8 = 完美格挡教学
    if(STATE.isTutorial && TUTORIAL.step === 8) TUTORIAL.perfectBlockDone = true;
    return;                             // 不扣血、不消耗能量
  }

    // === 修改：量子护盾消耗专属能量免疫伤害 ===
  const energyCost = amount * 2;
  if(STATE.shieldActive && STATE.shield >= energyCost) {
    STATE.shield -= energyCost;
    STATE.flash = 0.3; STATE.flashColor = 0x00aaff;
    STATE.shake = Math.min(STATE.shake + 2, 8);
    // 护盾受击高亮效果
    const hitMat = player.userData.shieldMesh.material;
    if(hitMat.uniforms) {
      hitMat.uniforms.uOpacity.value = 0.9;
    }
    if(player.userData.shieldMesh.children[0]) {
      player.userData.shieldMesh.children[0].material.opacity = 1.0;
    }
    playShieldHit(); // <--- 新增：播放护盾受击音效
    return; 
  }

  // 以下为原有的掉血逻辑
  STATE.hp -= amount; STATE.flash=1; STATE.flashColor=0xff3355;
  STATE.shake = Math.min(STATE.shake+6, 14); STATE.combo=0; STATE.comboTimer=0;
  if(fromPos){
    const dx=fromPos.x-player.position.x, dz=fromPos.z-player.position.z;
    spawnDamageMarker(Math.atan2(dz,-dx)+Math.PI);
  }
  playHit();
  if(STATE.hp<=0){ STATE.hp=0; gameOver(); }
}
