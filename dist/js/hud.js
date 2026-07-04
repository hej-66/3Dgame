// hud.js — Pixi HUD、伤害飘字、HUD 更新、Toast、武器切换提示
const pixiApp = new PIXI.Application();
(async () => {
  try {
    await pixiApp.init({
      canvas: pixiCanvas, width: window.innerWidth, height: window.innerHeight,
      backgroundAlpha: 0, antialias: false, resolution: 1, autoDensity: true
    });
    HUD.app = pixiApp;
    buildHUD(pixiApp);
  } catch (err) { console.error('Pixi init failed:', err); }
})();

function buildHUD(app){
  const stage = app.stage;
  const W = app.screen.width, H = app.screen.height;

  // 1. 血条改为红色
  const hpBox = new PIXI.Container(); hpBox.position.set(28,28); stage.addChild(hpBox);
  hpBox.addChild(new PIXI.Text({ text:'INTEGRITY', style:{fontSize:11, fill:0x7e8aa3, letterSpacing:3} }));
  const hpBg = new PIXI.Graphics();
  hpBg.roundRect(0,22,280,14,3).fill({color:0xff3355, alpha:0.06}).stroke({color:0xff3355, alpha:0.4, width:1});
  hpBox.addChild(hpBg);
  const hpFill = new PIXI.Graphics(); hpFill.rect(0,0,278,12).fill({color:0xff3355}); hpFill.position.set(1,23); hpBox.addChild(hpFill);
  const hpText = new PIXI.Text({ text:'100', style:{fontSize:14, fill:0xffffff} }); hpText.position.set(286,20); hpBox.addChild(hpText);
  HUD.hpFill = hpFill; HUD.hpText = hpText;

  // 2. 谐振值条改为黄色
  const enBox = new PIXI.Container(); enBox.position.set(28,70); stage.addChild(enBox);
  enBox.addChild(new PIXI.Text({ text:'RESONANCE (SPACE DASH)', style:{fontSize:11, fill:0x7e8aa3, letterSpacing:3} }));
  const enBg = new PIXI.Graphics();
  enBg.roundRect(0,22,280,8,3).fill({color:0xffb547, alpha:0.06}).stroke({color:0xffb547, alpha:0.4, width:1}); 
  enBox.addChild(enBg);
  const enFill = new PIXI.Graphics(); enFill.rect(0,0,278,6).fill({color:0xffb547}); enFill.position.set(1,23); enBox.addChild(enFill);
  HUD.enFill = enFill;

  // 3. 新增：蓝色能量护盾条
  const en2Box = new PIXI.Container(); en2Box.position.set(28,100); stage.addChild(en2Box);
  en2Box.addChild(new PIXI.Text({ text:'SHIELD ENERGY (RIGHT MOUSE)', style:{fontSize:11, fill:0x7e8aa3, letterSpacing:3} }));
  const en2Bg = new PIXI.Graphics(); 
  en2Bg.roundRect(0,22,280,8,3).fill({color:0x00aaff, alpha:0.06}).stroke({color:0x00aaff, alpha:0.4, width:1}); 
  en2Box.addChild(en2Bg);
  const en2Fill = new PIXI.Graphics(); en2Fill.rect(0,0,278,6).fill({color:0x00aaff}); en2Fill.position.set(1,23); en2Box.addChild(en2Fill);
  HUD.en2Fill = en2Fill;

  const scoreBox = new PIXI.Container(); scoreBox.position.set(W-28,28); stage.addChild(scoreBox);
  const scoreLabel = new PIXI.Text({ text:'SCORE', style:{fontSize:11, fill:0x7e8aa3, letterSpacing:3} }); scoreLabel.anchor.set(1,0); scoreBox.addChild(scoreLabel);
  const scoreText = new PIXI.Text({ text:'0', style:{fontSize:38, fontWeight:'700', fill:0xffffff} }); scoreText.anchor.set(1,0); scoreText.y=14; scoreBox.addChild(scoreText);
  HUD.scoreText = scoreText;
  const waveText = new PIXI.Text({ text:'WAVE 01', style:{fontSize:13, fill:0x00ffe5, letterSpacing:3} }); waveText.anchor.set(1,0); waveText.y=64; scoreBox.addChild(waveText);
  HUD.waveText = waveText;

  const comboText = new PIXI.Text({ text:'', style:{fontSize:42, fontWeight:'900', fill:0xffb547} }); comboText.anchor.set(1,0); comboText.position.set(W-28, H-90); stage.addChild(comboText);
  HUD.comboText = comboText;
  const comboLabel = new PIXI.Text({ text:'', style:{fontSize:11, fill:0x7e8aa3, letterSpacing:3} }); comboLabel.anchor.set(1,0); comboLabel.position.set(W-28, H-40); stage.addChild(comboLabel);
  HUD.comboLabel = comboLabel;

  HUD.damageMarkers = []; HUD.stage = stage; HUD.W = W; HUD.H = H; HUD.floaters = [];
  HUD.flashG = new PIXI.Graphics(); stage.addChild(HUD.flashG);
  HUD.dashG = new PIXI.Graphics(); stage.addChild(HUD.dashG);
  // Boss 血条
  const bossBox = new PIXI.Container(); bossBox.position.set(W/2, 60); bossBox.pivot.set(0.5, 0); bossBox.visible = false; stage.addChild(bossBox);
  const bossBg = new PIXI.Graphics();
  bossBg.roundRect(-200, 0, 400, 16, 4).fill({color:0xff0055, alpha:0.08}).stroke({color:0xff0055, alpha:0.6, width:1});
  bossBox.addChild(bossBg);
  const bossFill = new PIXI.Graphics(); bossFill.rect(0,0,396,12).fill({color:0xff0055}); bossFill.position.set(-198, 2); bossBox.addChild(bossFill);
  const bossName = new PIXI.Text({ text:'VOID OVERLORD', style:{fontSize:14, fill:0xff5577, fontWeight:'700', letterSpacing:4} }); bossName.anchor.set(0.5, 1); bossName.y = -4; bossBox.addChild(bossName);
  HUD.bossBox = bossBox; HUD.bossFill = bossFill; HUD.bossName = bossName;
  // 武器切换大字提示
  const weaponText = new PIXI.Text({ text:'', style:{fontSize:48, fontWeight:'900', fill:0x00ffe5, align:'center'} });
  weaponText.anchor.set(0.5); weaponText.position.set(W/2, H/2 - 100); weaponText.alpha = 0;
  stage.addChild(weaponText);
  HUD.weaponText = weaponText;
  
  // 锁定状态提示
  const lockText = new PIXI.Text({ text:'', style:{fontSize:16, fontWeight:'700', fill:0xffb547, letterSpacing:2} });
  lockText.anchor.set(0.5); lockText.position.set(W/2, H/2 + 40);
  stage.addChild(lockText);
  HUD.lockText = lockText;
  
  // ===== 新增：左下角属性面板 =====
  const statBox = new PIXI.Container(); statBox.position.set(28, H - 130); stage.addChild(statBox);
  const statText = new PIXI.Text({ text:'', style:{fontSize:12, fill:0x7e8aa3, letterSpacing:1, lineHeight:16} });
  statBox.addChild(statText);
  HUD.statText = statText;
  
  // ===== 新增：底部中央武器栏 =====
  const weaponBox = new PIXI.Container(); weaponBox.position.set(W/2, H - 50); stage.addChild(weaponBox);
  const weaponBar = new PIXI.Text({ text:'', style:{fontSize:14, fill:0x00ffe5, letterSpacing:2, align:'center'} });
  weaponBar.anchor.set(0.5); weaponBox.addChild(weaponBar);
  HUD.weaponBar = weaponBar;
  
  // ===== 新增：等离子蓄能条 =====
  const plasmaBox = new PIXI.Container(); plasmaBox.position.set(W/2 - 100, H - 80); plasmaBox.visible = false; stage.addChild(plasmaBox);
  plasmaBox.addChild(new PIXI.Text({ text:'PLASMA CHARGE', style:{fontSize:10, fill:0x00ddff, letterSpacing:2} }));
  const plasmaBg = new PIXI.Graphics();
  plasmaBg.roundRect(0, 16, 200, 8, 3).fill({color:0x00ddff, alpha:0.1}).stroke({color:0x00ddff, alpha:0.4, width:1});
  plasmaBox.addChild(plasmaBg);
  const plasmaFill = new PIXI.Graphics(); plasmaFill.rect(0, 0, 198, 6).fill({color:0x00ddff}); plasmaFill.position.set(1, 17); plasmaBox.addChild(plasmaFill);
  HUD.plasmaBox = plasmaBox; HUD.plasmaFill = plasmaFill;
  
  buildDialogueUI(app);
}

function spawnFloater(text, x, y, color=0x00ffe5, big=false){
  if(!HUD.stage) return;
  const t = new PIXI.Text({ text, style:{ fontSize:big?28:18, fontWeight:'700', fill:color } });
  t.anchor.set(0.5); t.position.set(x,y); HUD.stage.addChild(t);
  HUD.floaters.push({ text:t, vy:-1.2, life:50, maxLife:50, baseScale:big?1.3:1 });
}
function spawnDamageMarker(angle){
  if(!HUD.stage) return;
  const cx=HUD.W/2, cy=HUD.H/2, r=140;
  const g = new PIXI.Graphics(); g.moveTo(0,0).lineTo(-30,-12).lineTo(-22,0).lineTo(-30,12).closePath().fill({color:0xff3355, alpha:0.9});
  g.position.set(cx+Math.cos(angle)*r, cy+Math.sin(angle)*r); g.rotation=angle; HUD.stage.addChild(g);
  HUD.damageMarkers.push({ g, life:30, maxLife:30 });
}

let lastHpRatio = -1, lastEnRatio = -1, lastScore = -1, lastWave = -1, lastLevel = -1;
let lastStatText = '';
let lastWeaponText = '';
let lastBossHpRatio = -1;
// HUD 颜色/形状缓存：避免每帧触发 Pixi TextStyle dirty 或 Graphics 顶点重上传
let lastComboOver10 = null;   // combo>10 状态翻转才赋 fill
let lastLockDone = null;      // lockTimer>=60 状态翻转才赋 fill
let lastPlasmaPct = -1;       // 蓄能比例变化才重绘 Graphics
let lastPlasmaColor = -1;     // 蓄能颜色档位（满/未满）变化才重绘
function updateHUD(){
  if(!HUD.hpFill) return;
  const hpRatio = Math.max(0, STATE.hp/STATE.maxHp);
  if(hpRatio !== lastHpRatio){
    HUD.hpFill.clear();
    const hpColor = hpRatio>0.25 ? 0xff3355 : 0x880000; // 满血亮红，残血暗红
    HUD.hpFill.rect(0,0,278,12).fill({color:hpColor}); HUD.hpFill.scale.x = hpRatio; lastHpRatio = hpRatio;
  }
  HUD.hpText.text = Math.ceil(STATE.hp);
  
    const enRatio = Math.max(0, STATE.energy/STATE.maxEnergy);
  if(enRatio !== lastEnRatio){ HUD.enFill.scale.x = enRatio; lastEnRatio = enRatio; }
  
  // 修改：蓝色能量条绑定护盾变量
  const shieldRatio = Math.max(0, STATE.shield/STATE.maxShield);
  if(HUD.en2Fill) HUD.en2Fill.scale.x = shieldRatio;
  
  if(STATE.score !== lastScore){ HUD.scoreText.text = STATE.score.toLocaleString(); lastScore = STATE.score; }
  if(STATE.wave !== lastWave){ HUD.waveText.text = 'WAVE ' + String(STATE.wave).padStart(2,'0'); lastWave = STATE.wave; }

  if(STATE.combo > 1){
    HUD.comboText.text = '×' + STATE.combo;
    const _comboOver10 = STATE.combo > 10;
    if (_comboOver10 !== lastComboOver10) {
      HUD.comboText.style.fill = _comboOver10 ? 0xff2d95 : 0xffb547;
      lastComboOver10 = _comboOver10;
    }
    const alpha = Math.min(1, STATE.comboTimer/120);
    HUD.comboText.alpha = alpha; HUD.comboLabel.alpha = alpha; HUD.comboLabel.text = 'COMBO';
  } else { HUD.comboText.text=''; HUD.comboLabel.text=''; }

  for(let i=HUD.floaters.length-1;i>=0;i--){
    const f=HUD.floaters[i]; f.text.y += f.vy; f.vy *= 0.96; f.life--;
    f.text.alpha = f.life/f.maxLife; f.text.scale.set((f.life>f.maxLife-8 ? 1+(f.maxLife-f.life)/8*0.4 : 1)*f.baseScale);
    if(f.life<=0){ HUD.stage.removeChild(f.text); f.text.destroy(); HUD.floaters.splice(i,1); }
  }
  for(let i=HUD.damageMarkers.length-1;i>=0;i--){
    const m=HUD.damageMarkers[i]; m.life--; m.g.alpha = m.life/m.maxLife;
    if(m.life<=0){ HUD.stage.removeChild(m.g); m.g.destroy(); HUD.damageMarkers.splice(i,1); }
  }
  
  if(STATE.invincibleTimer > 0){
    HUD.dashG.clear(); HUD.dashG.rect(0,0,HUD.W,HUD.H).stroke({width: 6, color: 0x00ffe5, alpha: Math.min(1, STATE.invincibleTimer/15)*0.8});
  } else { HUD.dashG.clear(); }
  
  // ===== 优化：统一处理 Boss 血条 =====
  // 直接使用 STATE.currentBoss 现成引用，避免每帧 enemies.find() 遍历
  const boss = STATE.currentBoss;
  if(boss && boss.mesh && boss.mesh.parent) {
    if(!HUD.bossBox.visible) HUD.bossBox.visible = true;
    // 更新 Boss 名称
    const displayName = trBoss(boss.bossVariant);
    if (HUD.bossName && HUD.bossName.text !== displayName) {
      HUD.bossName.text = displayName;
    }
    // 使用 Boss 实例自身的 maxHp，避免与 createEnemyShip 中的值不一致
    const bossMaxHp = boss.maxHp || (600 + STATE.wave * 50);
    const targetRatio = Math.max(0, boss.hp / bossMaxHp);
    // 只有血条比例变化时才更新，减少 PixiJS 内部计算
    if(targetRatio !== lastBossHpRatio) {
      if(!isNaN(targetRatio) && isFinite(targetRatio)) {
        HUD.bossFill.scale.x = targetRatio;
      } else {
        HUD.bossFill.scale.x = 1;
      }
      lastBossHpRatio = targetRatio;
    }
  } else {
    if(HUD.bossBox.visible) HUD.bossBox.visible = false;
    lastBossHpRatio = -1; // 重置以便下次出现 Boss 时立刻更新
  }

  // ===== 优化：屏幕闪光 =====
  if(STATE.flash>0){
    HUD.flashG.clear(); HUD.flashG.rect(0,0,HUD.W,HUD.H).fill({color:STATE.flashColor, alpha:STATE.flash*0.3});
    STATE.flash *= 0.85; if(STATE.flash<0.02) STATE.flash=0;
  } else if(HUD.flashG.geometry) {
    HUD.flashG.clear(); // 仅清理一次
  }

  // ===== 武器切换大字淡出 =====
  if(HUD.weaponText && HUD.weaponText.alpha > 0) {
    HUD.weaponText.alpha -= 0.02;
    HUD.weaponText.scale.x += 0.01; HUD.weaponText.scale.y += 0.01;
  }
  
  // ===== 导弹锁定状态文字 =====
  if(STATE.weapon === 1 && STATE.lockTarget) {
    HUD.lockText.text = STATE.lockTimer >= 60 ? t('hud.lock_done', '锁定完成 [发射]') : tf('hud.locking', { pct: Math.floor(STATE.lockTimer/60*100) }, '锁定中... {pct}%');
    const _lockDone = STATE.lockTimer >= 60;
    if (_lockDone !== lastLockDone) {
      HUD.lockText.style.fill = _lockDone ? 0xff3355 : 0xffb547;
      lastLockDone = _lockDone;
    }
  } else {
    HUD.lockText.text = '';
  }
  
  // ===== 优化：左下角属性面板 =====
  if (HUD.statText) {
    const critPct = Math.round(STATE.critChance * 100);
    const lsPct = Math.round(STATE.lifesteal * 100);
    const dmgPct = Math.round(STATE.bulletDmgBonus * 100);
    const newText =
      tf('hud.crit', { n: critPct, m: STATE.critMult.toFixed(1) }, '暴击率 {n}%  ×{m}') + '\n' +
      tf('hud.lifesteal', { n: lsPct, d: dmgPct }, '吸血 {n}%  伤害 +{d}%') + '\n' +
      tf('hud.dash_shield', { n: STATE.dashDamage, s: Math.ceil(STATE.shield) }, '突进伤害 {n}  护盾 {s}');
    if (newText !== lastStatText) { // 只有文本变化时才赋值
      HUD.statText.text = newText;
      lastStatText = newText;
    }
  }
  
  // ===== 优化：底部武器栏 =====
  if (HUD.weaponBar) {
    const en = STATE.lang === 'en';
    const weaponIcons = en
      ? [t('hud.weapon.0','①MG'), t('hud.weapon.1','②Missile'), t('hud.weapon.2','③Plasma'), t('hud.weapon.3','④Shotgun'), t('hud.weapon.4','⑤Arc')]
      : ['①机关枪', '②导弹', '③等离子炮', '④散弹枪', '⑤电弧'];
    let bar = '';
    for (let i = 0; i < 5; i++) {
      if (i === STATE.weapon) bar += `[${weaponIcons[i]}]`;
      else bar += ` ${weaponIcons[i]} `;
    }
    if (bar !== lastWeaponText) { // 只有文本变化时才赋值
      HUD.weaponBar.text = bar;
      lastWeaponText = bar;
    }
  }
  
  // ===== 新增：等离子蓄能条 =====
  if (HUD.plasmaBox) {
    if (STATE.weapon === 2) {
      HUD.plasmaBox.visible = true;
      const pct = Math.min(1, STATE.plasmaCharge / 100);
      const _plasmaColor = pct >= 1 ? 0xffb547 : 0x00ddff;
      // 仅在 pct 或颜色档位变化时才 clear+重绘 Graphics，避免每帧顶点缓冲重上传
      if (pct !== lastPlasmaPct || _plasmaColor !== lastPlasmaColor) {
        HUD.plasmaFill.clear();
        HUD.plasmaFill.rect(0, 0, 198 * pct, 6).fill({ color: _plasmaColor });
        lastPlasmaPct = pct;
        lastPlasmaColor = _plasmaColor;
      }
    } else {
      HUD.plasmaBox.visible = false;
      // 切出等离子炮时重置缓存，确保下次切回时强制重绘
      lastPlasmaPct = -1;
      lastPlasmaColor = -1;
    }
  }
}

function showToast(text, duration=1400){
  // 下限保护：CSS 淡入过渡需 400ms，duration 过短会导致 toast 还没淡入完就淡出（只闪一瞬间）
  if(duration < 500) duration = 1400;
  toast.textContent=text; toast.classList.add('show'); toast.classList.remove('out');
  clearTimeout(showToast._t); showToast._t=setTimeout(()=>{ toast.classList.add('out'); setTimeout(()=>toast.classList.remove('show','out'),600); }, duration);
}

function showWeaponSwitchUI() {
  if(!HUD.weaponText) return;
  HUD.weaponText.text = trWeapon(STATE.weapon);
  HUD.weaponText.alpha = 1;
  HUD.weaponText.scale.set(1.2);
  // 淡出动画会在 updateHUD 中处理
}
