// state.js — 全局状态与配置
/* THREE 已通过 three-bundle.js 加载到全局 window.THREE，可直接使用 */

/* =========================================================
   星界回响 — Stellar Resonance
   ========================================================= */
const STATE = {
  started:false, over:false, paused:false, inReward:false,
  score:0, wave:0, combo:0, maxCombo:0, comboTimer:0,
  hp:100, maxHp:100, energy:100, maxEnergy:100, energyRegen:0.2,
  // 新增：护盾专属能量（蓝色），与谐振值（黄色）独立
  shield: 100, maxShield: 100, 
  shake:0, flash:0, flashColor:0x00ffe5,
  waveEnemiesLeft:0, waveInterval:0, time:0,
  difficulty:'standard',
  bulletLevel:1, fireRate:5, bulletSpeed:3.5, moveSpeed:1.0,
  isDashing:false, dashTimer:0, invincibleTimer:0,
  isTutorial:false,
  // 武器系统：0机关枪 1导弹 2等离子炮 3散弹枪 4电弧
  weapon: 0,
  weapons: ['机关枪', '导弹发射器', '等离子炮', '散弹枪', '电弧发射器'],
  weaponsEn: ['Machine Gun', 'Missile Launcher', 'Plasma Cannon', 'Shotgun', 'Arc Emitter'],
  lockTarget: null,
  lockTimer: 0,
  shieldActive: false,
  // ===== 完美格挡（Perfect Block）=====
  // 机制：按下右键瞬间开启判定窗口，窗口内受到攻击 = 完美格挡成功
  // 成功：不耗能量 + 蓝色能量波清除周围弹幕 + 不进冷却（奖励精准时机）
  // 失败（窗口结束未触发）：进入冷却，冷却期间按下右键不开启判定窗口（仍可开普通护盾）
  // 冷却必须 > 判定窗口，防止连续快速点按滥用
  perfectBlockWindow: 12,        // 判定窗口（帧），约 200ms，需精准时机
  perfectBlockTimer: 0,          // 当前窗口剩余帧（>0 表示在判定窗口内）
  perfectBlockCooldown: 60,      // 失败冷却（帧），1 秒，> perfectBlockWindow
  perfectBlockCooldownTimer: 0,  // 当前冷却剩余帧（>0 表示在冷却中，不能开启新判定窗口）
  perfectBlockRadius: 28,        // 能量波清除弹幕半径
  perfectBlockFlash: 0,          // 成功后护盾高亮特效计时器（帧）
  // ===== 新增：成长与战斗属性 =====
  critChance: 0,        // 暴击率 0~1
  critMult: 2.0,        // 暴击倍率
  lifesteal: 0,         // 吸血 0~1（按造成伤害比例回血）
  dashDamage: 0,        // 突进撞击伤害
  bulletDmgBonus: 0,    // 子弹额外伤害
  plasmaCharge: 0,      // 等离子炮蓄能进度 0~100
  // ===== 剧情系统 =====
  inCutscene: false,        // 是否在剧情中
  currentDialogue: null,    // 当前对话
  dialogueIndex: 0,         // 当前对话索引
  previousPaused: false,    // 剧情前的暂停状态
  dialogueOnComplete: null, // 剧情完成回调
  currentStoryId: null,     // 当前剧情 ID
  typewriterActive: false,  // 打字机是否进行中
  typewriterTimer: null,    // 打字机定时器
  typewriterFull: '',       // 当前行的完整文本
  typewriterShown: 0,       // 已显示字符数
  // ===== 新增：Boss 轮换 =====
  bossIndex: 0,             // 当前 Boss 序号
  bossActive: false,        // 是否有 Boss 活跃
  currentBoss: null,        // 当前 Boss 引用
  victory: false,           // 胜利标记
  // ===== 新增：局外成长（星晶）=====
  crystals: 0,           // 本局获得的星晶
  totalCrystals: 0,      // 累计星晶（含历史）
  // ===== 修复：游戏循环内的延迟计时器（用帧数代替 setTimeout，避免与游戏循环脱节）=====
  rewardDelayTimer: 0,   // 奖励触发延迟（帧数）
  // ===== 修复：云端数据同步状态（防止 enterGame 与 loadCloudData 竞争）=====
  cloudSyncPending: false, // 云端数据同步中（true 时禁止进入游戏）
  // ===== 修复：剧情加载进度条定时器 ID（防止剧情中切出时定时器残留触发回调）=====
  loadingInterval: null,   // runLoadingBar 的 setInterval ID
  loadingTimeout: null,    // runLoadingBar 完成后的 setTimeout ID
  // ===== 渲染画质等级（0=无 1=低 2=中 3=极致）=====
  // 版本化迁移：用 sr_gfx_version 标记画质体系版本，跨版本时映射旧索引
  // 旧 v1 体系（5档）：0无 1低 2中 3高 4极致
  // 新 v2 体系（4档）：0无 1低 2中 3极致（删除「高」，极致光强对齐中画质）
  // 旧 3(高) → 新 2(中)；旧 4(极致) → 新 3(极致)
  graphicsQuality: (() => {
    const GFX_VERSION = 2;
    const savedVer = parseInt(localStorage.getItem('sr_gfx_version')) || 1;
    let q = parseInt(localStorage.getItem('sr_graphicsQuality'));
    if (isNaN(q)) q = 2;
    if (savedVer < GFX_VERSION) {
      const legacyMap = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3 }; // 旧3(高)→2(中)；旧4(极致)→3(极致)
      q = (q in legacyMap) ? legacyMap[q] : 2;
      localStorage.setItem('sr_graphicsQuality', String(q));
      localStorage.setItem('sr_gfx_version', String(GFX_VERSION));
    }
    if (q < 0 || q > 3) q = 2;
    return q;
  })(),
  // ===== 语言设置（'zh' 中文 | 'en' 英文），保存到 localStorage =====
  lang: localStorage.getItem('sr_lang') || 'zh'
};

// ===== 画质预设配置（4 档：0 无 / 1 低 / 2 中 / 3 极致）=====
// 设计原则：极致画质的光强与中画质一致（lightMul/emissiveMul 均与中画质相同），
// 避免过亮破坏画面（旧版极致 emissiveMul 1.5 + lightMul 1.0 导致激光兵/晶簇巨像过曝）。
// 极致仅靠 Physical 材质(transmission/clearcoat/sheen/iridescence) + 全量粒子体现高端差异。
// 旧版 5 档中的「高(HIGH)」已删除（与中画质光强差异太小，无存在意义）。
// material: 'basic'(无光照) | 'phong' | 'standard' | 'physical'(含transmission/clearcoat)
// lightMul: 点光源(PointLight)强度倍率，0=关闭
// directLightMul: 平行光/环境光/半球光强度倍率，0=关闭（Phong/Standard 材质需要至少一个主光源）
const GRAPHICS_PRESETS = [
  { // 0: 无 — 最低画质，关闭所有特效
    name: '无', nameEn: 'None', label: 'OFF',
    fog: false, fogDensity: 0,
    particleMul: 0.0, lightMul: 0.0, directLightMul: 0.0, emissiveMul: 0.0,
    material: 'basic', bloom: false
  },
  { // 1: 低 — 基础画质，保留雾效和简单光照（Phong 需要 DirectionalLight）
    name: '低', nameEn: 'Low', label: 'LOW',
    fog: true, fogDensity: 0.0008,
    particleMul: 0.3, lightMul: 0.0, directLightMul: 0.7, emissiveMul: 0.6,
    material: 'phong', bloom: false
  },
  { // 2: 中 — 默认画质，标准 PBR（推荐）
    name: '中', nameEn: 'Mid', label: 'MID',
    fog: true, fogDensity: 0.0012,
    particleMul: 0.6, lightMul: 0.5, directLightMul: 1.0, emissiveMul: 1.0,
    material: 'standard', bloom: false
  },
  { // 3: 极致 — Physical 材质 + 全量粒子；光强与中画质一致，避免过亮
    name: '极致', nameEn: 'Ultra', label: 'ULTRA',
    fog: true, fogDensity: 0.0012,
    particleMul: 1.0, lightMul: 0.5, directLightMul: 1.0, emissiveMul: 1.0,
    material: 'physical', bloom: false
  }
];

// 获取当前画质预设
function getGraphics() {
  return GRAPHICS_PRESETS[STATE.graphicsQuality] || GRAPHICS_PRESETS[2];
}

/* =========================================================
   画质自适应材质工厂
   根据当前画质等级返回不同类型的材质：
   - basic:    MeshBasicMaterial（无光照，纯色+emissive模拟）
   - phong:    MeshPhongMaterial（简单光照）
   - standard: MeshStandardMaterial（PBR，默认）
   - physical: MeshPhysicalMaterial（含 transmission/clearcoat，仅极致画质）
   ========================================================= */

// 通用材质工厂：opts 包含 color/emissive/emissiveIntensity/metalness/roughness 等基础属性
// physicalOpts（可选）包含 transmission/thickness/ior/clearcoat 等物理属性，仅极致画质使用
function makeQualityMaterial(opts, physicalOpts) {
  const g = getGraphics();
  const eMul = g.emissiveMul;

  if (g.material === 'basic') {
    // 无光照：用 color + emissive 模拟外观
    return new THREE.MeshBasicMaterial({
      color: opts.color || 0x444444,
      transparent: opts.transparent || false,
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
      flatShading: opts.flatShading || false,
      blending: opts.blending || THREE.NormalBlending,
      map: opts.map || null,
      fog: opts.fog !== undefined ? opts.fog : true
    });
  }

  if (g.material === 'phong') {
    return new THREE.MeshPhongMaterial({
      color: opts.color || 0x444444,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: (opts.emissiveIntensity || 1.0) * eMul,
      shininess: opts.shininess || 80,
      specular: opts.specular || 0x222222,
      transparent: opts.transparent || false,
      opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
      flatShading: opts.flatShading || false,
      blending: opts.blending || THREE.NormalBlending,
      map: opts.map || null,
      emissiveMap: opts.emissiveMap || null,
      fog: opts.fog !== undefined ? opts.fog : true
    });
  }

  if (g.material === 'physical' && physicalOpts) {
    // 极致画质：使用 PhysicalMaterial，展开式合并 opts + physicalOpts
    // 修复：旧版白名单只拷贝 transmission/thickness/ior/clearcoat/clearcoatRoughness，
    // 丢失 sheen/sheenColor/iridescence/iridescenceIOR/attenuationColor 等高级属性。
    // 现改为展开式，physicalOpts 中的同名字段会覆盖 opts（如 emissiveIntensity 由 eMul 重算后覆盖）。
    return new THREE.MeshPhysicalMaterial({
      ...opts,
      ...physicalOpts,
      emissiveIntensity: (opts.emissiveIntensity || 1.0) * eMul
    });
  }

  // 默认: standard
  return new THREE.MeshStandardMaterial({
    color: opts.color || 0x444444,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: (opts.emissiveIntensity || 1.0) * eMul,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.5,
    roughness: opts.roughness !== undefined ? opts.roughness : 0.5,
    transparent: opts.transparent || false,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
    flatShading: opts.flatShading || false,
    blending: opts.blending || THREE.NormalBlending,
    map: opts.map || null,
    emissiveMap: opts.emissiveMap || null,
    fog: opts.fog !== undefined ? opts.fog : true
  });
}

// 画质自适应点光源工厂：画质 0/1（无/低）返回 null（跳过点光源），中/极致画质按 lightMul 缩放强度
function makeQualityLight(color, intensity, distance) {
  const g = getGraphics();
  if (g.lightMul <= 0) return null; // 画质 0/1：无点光源
  return new THREE.PointLight(color, intensity * g.lightMul, distance);
}

// 画质自适应平行光工厂：画质 0(无) 返回 null，其他画质按 directLightMul 缩放
function makeQualityDirLight(color, intensity) {
  const g = getGraphics();
  if (g.directLightMul <= 0) return null;
  return new THREE.DirectionalLight(color, intensity * g.directLightMul);
}

// 画质自适应环境光工厂：画质 0(无) 返回 null
function makeQualityAmbientLight(color, intensity) {
  const g = getGraphics();
  if (g.directLightMul <= 0) return null;
  return new THREE.AmbientLight(color, intensity * g.directLightMul);
}

// 画质自适应半球光工厂：画质 0(无) 返回 null
function makeQualityHemiLight(skyColor, groundColor, intensity) {
  const g = getGraphics();
  if (g.directLightMul <= 0) return null;
  return new THREE.HemisphereLight(skyColor, groundColor, intensity * g.directLightMul);
}

const KEYS = {};
const MOUSE = { down:false };

// ===== 新增：全局复用变量，防止高频 GC 卡顿 =====
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(); // 新增
const _v5 = new THREE.Vector3(); // 敌人AI侧向量复用
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _color = new THREE.Color(); // explode() 颜色复用
const _vForward = new THREE.Vector3(0, 0, 1); // 子弹朝向常量（只读）
const _vUp = new THREE.Vector3(0, 1, 0); // Y轴常量（只读）

const threeCanvas = document.getElementById('three-canvas');
const pixiCanvas  = document.getElementById('pixi-canvas');
const overlay     = document.getElementById('overlay');
const endScreen   = document.getElementById('end');
const toast       = document.getElementById('toast');
const fpsCorner   = document.getElementById('fps-corner');
const pauseOverlay= document.getElementById('pause-overlay');
const rewardOverlay= document.getElementById('reward-overlay');
const rewardCardsContainer = document.getElementById('reward-cards');

/* ============== 全局工具：GPU资源销毁 ============== */
function disposeNode(node) {
  if (!node) return;
  node.traverse((child) => {
    if (child.isMesh || child.isPoints || child.isLine) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    }
  });
}

/* ============== 难度与缓存 ============== */
const DIFFICULTIES = {
  casual:    { name:'休闲', nameEn:'Casual',    hp:150, eHpMul:0.7, eRateMul:1.5, eSpdMul:0.7, eBSpdMul:0.7 },
  easy:      { name:'简单', nameEn:'Easy',      hp:120, eHpMul:0.85,eRateMul:1.2, eSpdMul:0.85,eBSpdMul:0.85 },
  standard:  { name:'标准', nameEn:'Standard',  hp:100, eHpMul:1.0, eRateMul:1.0, eSpdMul:1.0, eBSpdMul:1.0 },
  hard:      { name:'困难', nameEn:'Hard',      hp:80,  eHpMul:1.3, eRateMul:0.8, eSpdMul:1.2, eBSpdMul:1.2 },
  hell:      { name:'地狱', nameEn:'Hell',      hp:50,  eHpMul:1.8, eRateMul:0.6, eSpdMul:1.5, eBSpdMul:1.5 }
};

/* ============== 局外成长系统（Meta Progression）============== */
// 永久升级树：使用星晶（Stellar Crystal）解锁，跨局保留
const META_UPGRADES = [
  { id:'m_hp',      name:'装甲强化',   nameEn:'Armor Reinforcement', desc:'初始最大生命值 +15',           descEn:'Initial max HP +15',            max:8,  cost:(lv)=>20+lv*15, icon:'🛡️' },
  { id:'m_energy',  name:'谐振扩容',   nameEn:'Resonance Expansion',  desc:'初始谐振值上限 +20',           descEn:'Initial resonance cap +20',     max:6,  cost:(lv)=>25+lv*20, icon:'🔋' },
  { id:'m_dmg',     name:'弹药强化',   nameEn:'Ammo Enhancement',     desc:'所有武器伤害 +10%',            descEn:'All weapon damage +10%',        max:8,  cost:(lv)=>30+lv*25, icon:'⚔️' },
  { id:'m_speed',   name:'引擎调校',   nameEn:'Engine Tuning',        desc:'移动速度 +5%',                 descEn:'Movement speed +5%',            max:6,  cost:(lv)=>20+lv*15, icon:'🚀' },
  { id:'m_regen',   name:'能量回收',   nameEn:'Energy Recovery',      desc:'谐振值恢复速度 +15%',          descEn:'Resonance regen +15%',          max:5,  cost:(lv)=>25+lv*20, icon:'♻️' },
  { id:'m_crit',    name:'瞄准系统',   nameEn:'Targeting System',     desc:'暴击率 +5%（基础暴击倍率2.0）',descEn:'Crit chance +5% (base crit mult 2.0)', max:6, cost:(lv)=>40+lv*30, icon:'🎯' },
  { id:'m_lifesteal',name:'纳米修复',  nameEn:'Nano Repair',          desc:'吸血 +3%（按伤害回血）',       descEn:'Lifesteal +3% (heal by damage)',max:5,  cost:(lv)=>50+lv*35, icon:'❤️' },
  { id:'m_shield',  name:'护盾矩阵',   nameEn:'Shield Matrix',        desc:'初始护盾值 +25',               descEn:'Initial shield +25',            max:6,  cost:(lv)=>30+lv*25, icon:'🔵' },
  { id:'m_crystal', name:'星晶萃取',   nameEn:'Crystal Extraction',   desc:'每局获得的星晶 +15%',          descEn:'Crystals earned per run +15%',  max:6,  cost:(lv)=>35+lv*25, icon:'💎' },
  { id:'m_revive',  name:'应急重生',   nameEn:'Emergency Revival',    desc:'每局可复活 1 次（半血）',      descEn:'Revive once per run (half HP)', max:1,  cost:(lv)=>200,      icon:'✨' }
];

/* ============== 局外成长：星晶与永久升级 ============== */
const META_KEY = 'sr_meta_v1';
let META = { crystals: 0, upgrades: {}, unlocked: false };

/* ============== Pixi HUD ============== */
const HUD = {};

const REWARDS = [
  { id:'bullet_up', name:'武器强化', nameEn:'Weapon Boost', desc:'增加一道弹道，火力全开！', descEn:'Add one more projectile — firepower unleashed!', icon:'⚡' },
  { id:'fire_rate', name:'冷却优化', nameEn:'Cooldown Opt.', desc:'射击间隔缩短20%，射速大幅提升。', descEn:'Fire interval -20%, rate of fire greatly increased.', icon:'🔥' },
  { id:'heal', name:'结构修复', nameEn:'Structure Repair', desc:'立即恢复40点生命值。', descEn:'Restore 40 HP immediately.', icon:'❤️' },
  { id:'max_hp', name:'装甲扩展', nameEn:'Armor Expansion', desc:'最大生命值提升20点，并恢复20点血量。', descEn:'Max HP +20, and restore 20 HP.', icon:'🛡️' },
  { id:'bullet_speed', name:'弹道加速', nameEn:'Projectile Accel.', desc:'子弹飞行速度提升25%。', descEn:'Projectile speed +25%.', icon:'💨' },
  { id:'move_speed', name:'引擎过载', nameEn:'Engine Overload', desc:'战机移动速度提升15%。', descEn:'Fighter movement speed +15%.', icon:'🚀' },
  { id:'max_energy', name:'谐振扩容', nameEn:'Resonance Expansion', desc:'谐振值上限提升40点，并恢复满谐振值。', descEn:'Resonance cap +40, and refill resonance.', icon:'🔋' },
  { id:'energy_regen', name:'能量回收', nameEn:'Energy Recovery', desc:'谐振值恢复速度提升50%。', descEn:'Resonance regen +50%.', icon:'♻️' },
  // ===== 新增奖励 =====
  { id:'crit_up', name:'精准瞄准', nameEn:'Precision Aim', desc:'暴击率 +12%（暴击造成2倍伤害）。', descEn:'Crit chance +12% (crit deals 2x damage).', icon:'🎯' },
  { id:'crit_mult', name:'致命一击', nameEn:'Deadly Strike', desc:'暴击倍率 +0.5x。', descEn:'Crit multiplier +0.5x.', icon:'💥' },
  { id:'lifesteal', name:'纳米修复', nameEn:'Nano Repair', desc:'吸血 +5%（按造成伤害比例回血）。', descEn:'Lifesteal +5% (heal by damage dealt).', icon:'🩸' },
  { id:'dash_dmg', name:'突进利刃', nameEn:'Dash Blade', desc:'突进时撞击伤害 +30，可击杀敌机。', descEn:'Dash collision damage +30, can kill enemies.', icon:'🗡️' },
  { id:'shield_up', name:'护盾强化', nameEn:'Shield Reinforce', desc:'最大护盾值 +30 并恢复满护盾。', descEn:'Max shield +30 and refill shield.', icon:'🔵' },
  { id:'dmg_up', name:'弹药强化', nameEn:'Ammo Enhancement', desc:'所有武器伤害 +15%。', descEn:'All weapon damage +15%.', icon:'⚔️' },
  { id:'plasma_boost', name:'等离子增幅', nameEn:'Plasma Boost', desc:'等离子炮蓄能速度 +50%。', descEn:'Plasma charge speed +50%.', icon:'🔮' },
  { id:'arc_chain', name:'电弧延伸', nameEn:'Arc Extension', desc:'电弧发射器链式打击 +2 个目标。', descEn:'Arc emitter chains +2 targets.', icon:'⚡' },
  { id:'full_heal', name:'紧急修复', nameEn:'Emergency Repair', desc:'立即恢复全部生命值与护盾。', descEn:'Fully restore HP and shield.', icon:'✨' },
  { id:'energy_burst', name:'能量爆发', nameEn:'Energy Burst', desc:'谐振值瞬间回满，并提升恢复速度30%。', descEn:'Instantly refill resonance, regen +30%.', icon:'🌟' }
];

/* ============== 登录与数据同步系统 ============== */
const AUTH = {
  token: null,
  username: null,
  userId: null,
  isGuest: false,
  isLocal: false, // 本地模式（服务器不可用时的降级，区别于用户主动选择游客）
  apiBase: '', // 同源部署时为空，部署后自动同源
  serverAvailable: null // null=未检测, true=可用, false=不可用
};

const TUTORIAL = {
  active: false,
  step: 0,
  targets: [],
  mouseMoveTracker: 0
};

/* =========================================================
   国际化系统（i18n）—— 中文/英文双语支持
   - STATE.lang: 'zh' | 'en'（从 localStorage 'sr_lang' 读取，默认 'zh'）
   - 数据结构（DIFFICULTIES / META_UPGRADES / REWARDS / GRAPHICS_PRESETS / CODEX_DATA / TUT_DATA）
     采用内联 *En 字段（nameEn/descEn），通过 trName()/trDesc() 取本地化值。
   - 其余扁平字符串（静态 HTML、Toast、Boss 名/阶段、说话者、杂项）使用 I18N.en 表 + t()/tf()。
   - 静态 HTML 元素加 data-i18n / data-i18n-html / data-i18n-placeholder 属性，
     applyI18n() 在启动与语言切换时批量刷新；中文为原始内容兜底，英文缺失时回退中文。
   ========================================================= */

// 说话者稳定 ID（解耦显示名与音色配置，供 story.js / audio.js 共用）
const SPEAKER_SID = {
  'LUNA-7': 'luna7',
  '战术官': 'tactician',
  '虚空之眼': 'voideye',
  '晶簇巨像': 'crystal',
  '深渊吞噬者': 'abyss',
  '机械神谕': 'oracle',
  '系统': 'system'
};
// sid → 中文显示名兜底表（trSpeaker 在中文模式下使用，避免回退成 sid）
const SPEAKER_ZH = {};
(function () { for (const zh in SPEAKER_SID) { SPEAKER_ZH[SPEAKER_SID[zh]] = zh; } })();

// 英文翻译表（扁平 dot key）。中文为各处的原始兜底值，故此处只存 en。
const I18N = {
  en: {
    // ===== 静态 HTML（data-i18n / data-i18n-html / data-i18n-placeholder）=====
    'pause.text': 'PAUSED',
    'pause.sub': 'Click screen to resume',
    'btn.settings': 'Settings',
    'btn.menu': 'Return to Menu',
    'settings.title': 'GRAPHICS',
    'settings.sub': 'Changing graphics requires restarting the current game',
    'settings.close': 'Confirm',
    'reward.title': 'Resonance Enhancement — Choose a Buff',
    'tut.exit': 'Exit Tutorial',
    'auth.sub': 'STELLAR RESONANCE · Data Sync',
    'tab.login': 'Login',
    'tab.register': 'Register',
    'auth.username': 'Username',
    'auth.username.ph': '2-20 characters',
    'auth.password': 'Password',
    'auth.password.ph': 'At least 6 characters',
    'auth.divider': 'or',
    'auth.guest': 'Guest Mode (data not saved to cloud)',
    'auth.offline': '⚠ No cloud server detected, currently in local mode<br>Deploy to Cloudflare to enable account sync',
    'main.sub': 'Stellar Resonance · True 3D Deep Space Combat Sim',
    'main.desc': 'Pilot your resonance fighter to break through waves of void constructs. Once in-game the mouse will be locked — turn indefinitely and roll freely in 360°. Press ESC to release the mouse and pause. Clear each wave to earn a 3-pick-1 enhancement reward.',
    'user.cloud': '· Cloud sync enabled',
    'btn.logout': 'Log Out',
    'key.mouse': 'Turn / Shoot',
    'key.move': 'Move / Roll',
    'key.dash': 'Resonance Dash (Invincible)',
    'btn.start': 'Launch Resonance ▸',
    'btn.tutorial': 'Tutorial',
    'btn.codex': 'Weapon Codex',
    'btn.meta': 'Stellar Upgrades',
    'codex.close': 'Return to Menu',
    'meta.title': 'Stellar Crystal Enhancement',
    'meta.crystals': '💎 Crystals: ',
    'meta.close': 'Back',
    'meta.desc': 'Use Stellar Crystals earned in battle to permanently enhance your fighter. Upgrades apply to all difficulties and persist across runs.',
    'end.title': 'Resonance Severed',
    'end.score': 'Final Score',
    'end.wave': 'Wave Reached',
    'end.combo': 'Max Combo',
    'btn.restart': 'Restart ▸',
    'btn.end.meta': 'Stellar Upgrades',
    'btn.end.menu': 'Return to Menu',
    'lang.label': 'LANGUAGE',

    // ===== 说话者显示名（按 sid）=====
    'speaker.luna7': 'LUNA-7',
    'speaker.tactician': 'Tactician',
    'speaker.voideye': 'Void Eye',
    'speaker.crystal': 'Crystal Colossus',
    'speaker.abyss': 'Abyss Devourer',
    'speaker.oracle': 'Mechanical Oracle',
    'speaker.system': 'System',

    // ===== Boss 名称（按 variant 索引）=====
    'boss.0': 'Void Eye',
    'boss.1': 'Crystal Colossus',
    'boss.2': 'Abyss Devourer',
    'boss.3': 'Mechanical Oracle',

    // ===== Boss 阶段名（variant.phase）=====
    'bossphase.0.1': 'Gaze Phase',     'bossphase.0.2': 'Frenzy Phase',   'bossphase.0.3': 'Abyss Phase',
    'bossphase.1.1': 'Crystallization','bossphase.1.2': 'Refraction Phase','bossphase.1.3': 'Shatter Phase',
    'bossphase.2.1': 'Accretion Phase','bossphase.2.2': 'Event Horizon',  'bossphase.2.3': 'Singularity Phase',
    'bossphase.3.1': 'Computation',    'bossphase.3.2': 'Prophecy Phase', 'bossphase.3.3': 'Descent Phase',

    // ===== Toast 提示 =====
    'toast.gfx_changed_restart': 'Graphics changed. Restart to take effect.',
    'toast.gfx_changed': 'Graphics changed.',
    'toast.test_backdoor': '🚀 Test backdoor: force spawn BOSS ',
    'toast.revive': 'Emergency Revive',
    'toast.gravity_wave': '⚠ Gravity Wave ⚠',
    'toast.laser_sweep': '⚠ Laser Sweep ⚠',
    'toast.void_storm': '⚠ Void Storm ⚠',
    'toast.crystal_burst': '⚠ Crystal Burst ⚠',
    'toast.prophecy_lock': '⚠ Prophecy Lock ⚠',
    'toast.mech_descent': '⚠ Mechanical Descent ⚠',
    'toast.void_tear_charge': '⚠ Void Tear Charging ⚠',
    'toast.pupil_focus': '⚠ Pupil Focus ⚠',
    'toast.dual_pupil_focus': '⚠ Dual Pupil Focus ⚠',
    'toast.crystal_spike': 'Crystal Spike!',
    'toast.prism_refract': 'Prism Refraction!',
    'toast.cluster_resonate': 'Cluster Resonance!',
    'toast.crystal_cage': 'Crystal Cage!',
    'toast.prism_kaleido': 'Prism Kaleidoscope!',
    'toast.cluster_shield': 'Cluster Shield Activated',
    'toast.time_slow': 'Time Slowed!',
    'toast.time_reverse': 'Time Reversed! Bullets Reflected!',
    'toast.time_stop': 'Time Stopped!',
    'toast.time_rift': 'Time Rift!',
    'toast.clock_scan': 'Clock Scan!',
    'toast.eternal_clock': 'Eternal Clock!',
    'toast.future_sight': 'Future Sight! Predictive trajectories appear!',
    'toast.cloud_sync': 'Cloud data syncing, please wait…',
    'toast.boss_approach': '⚠ BOSS APPROACHING ⚠',
    'toast.boss_appear': '⚠ BOSS: ',

    // ===== WebGL 上下文丢失 =====
    'webgl.lost.title': 'Render Engine Interrupted / WEBGL LOST',
    'webgl.lost.sub': 'Please refresh the page to recover',

    // ===== 阶段默认前缀 =====
    'phase.default': 'Phase ',

    // ===== 星晶强化商店 =====
    'meta.maxed': 'MAXED',
    'meta.upgrade': 'Upgrade',
    'meta.insufficient': 'Not enough crystals',
    'meta.level': 'Level',

    // ===== 结算界面（带占位符）=====
    'end.best_record': '{diff} best: {score} pts (Wave {wave}) ',
    'end.new_record': '[ NEW RECORD! ]',
    'end.crystals': '💎 Earned <b style="color:#7ee8fa">+{n}</b> crystals (total {total})',

    // ===== HUD =====
    'hud.lock_done': 'Lock complete [Fire]',
    'hud.locking': 'Locking... {pct}%',
    'hud.crit': 'Crit {n}%  ×{m}',
    'hud.lifesteal': 'Lifesteal {n}%  Damage +{d}%',
    'hud.dash_shield': 'Dash Dmg {n}  Shield {s}',
    'hud.weapon.0': '①MG', 'hud.weapon.1': '②Missile', 'hud.weapon.2': '③Plasma',
    'hud.weapon.3': '④Shotgun', 'hud.weapon.4': '⑤Arc',

    // ===== 难度后缀（结算用）=====
    'diff.suffix': ' difficulty',

    // ===== 登录系统 =====
    'auth.title.login': 'Commander Login',
    'auth.title.register': 'Register New Account',
    'auth.submit.login': 'Login ▸',
    'auth.submit.register': 'Register ▸',
    'auth.error.empty': 'Please enter username and password',
    'auth.processing': 'Processing...',
    'auth.success': 'Success!',
    'auth.network_error': 'Network error: ',
    'auth.login_fail': 'Login failed',
    'auth.register_fail': 'Registration failed',
    'user.guest': 'Guest',
    'user.local': 'Local Player',

    // ===== 教程 =====
    'tut.next': 'Start Practice ▸',
    'tut.finish': 'Return to Menu',
    'tut.step': 'STEP {n} / {total}',
    'toast.tut_shield_fail': 'Killed! Restart shield practice',
    'toast.tut_dodge_fail': 'Killed! Restart dodge',
    'toast.tut_parblock_fail': 'Killed! Restart perfect block practice',

    // ===== 主菜单设置按钮 =====
    'btn.menu_settings': 'Settings'
  }
};

// 取本地化扁平字符串。fb 为中文兜底；en 缺失时回退 fb。
function t(key, fb) {
  if (STATE.lang === 'en' && I18N.en && I18N.en[key] != null) return I18N.en[key];
  return fb != null ? fb : key;
}

// 带占位符的本地化字符串。vars 为 {占位符:值} 映射；fb 为中文模板兜底。
function tf(key, vars, fb) {
  let s = t(key, fb);
  if (vars) { for (const k in vars) { s = s.split('{' + k + '}').join(vars[k]); } }
  return s;
}

// 数据结构本地化访问器（用于含 name/nameEn、desc/descEn 的对象）
function trName(obj) { return (STATE.lang === 'en' && obj && obj.nameEn) ? obj.nameEn : obj.name; }
function trDesc(obj) { return (STATE.lang === 'en' && obj && obj.descEn) ? obj.descEn : obj.desc; }
// 用于含 title/titleEn 的对象（教程步骤等）
function trTitle(obj) { return (STATE.lang === 'en' && obj && obj.titleEn) ? obj.titleEn : obj.title; }
// 武器名（STATE.weapons / STATE.weaponsEn）
function trWeapon(i) {
  if (STATE.lang === 'en' && STATE.weaponsEn && STATE.weaponsEn[i] != null) return STATE.weaponsEn[i];
  return STATE.weapons[i];
}
// 画质预设名
function trGfxName(preset) {
  return (STATE.lang === 'en' && preset && preset.nameEn) ? preset.nameEn : (preset.name || '中');
}
// Boss 名（按 variant）
function trBoss(v) { return t('boss.' + v, ['虚空之眼', '晶簇巨像', '深渊吞噬者', '机械神谕'][v] || 'BOSS'); }
// Boss 阶段名
function trBossPhase(v, p) { return t('bossphase.' + v + '.' + p, (BOSS_PHASE_NAMES_LOCAL_ZH[v] && BOSS_PHASE_NAMES_LOCAL_ZH[v][p - 1]) || ('阶段 ' + p)); }
// 说话者显示名（接受 sid 或中文原名）
function trSpeaker(sidOrName) {
  const sid = SPEAKER_SID[sidOrName] || sidOrName;
  // 中文兜底必须是中文名（按 sid 反查），否则会回退成 sid 英文标识
  const fb = SPEAKER_ZH[sid] || sidOrName;
  return t('speaker.' + sid, fb);
}

// Boss 阶段中文名兜底表（定义在 main.js 的 BOSS_PHASE_NAMES 之前可能未就绪，故单独存放兜底）
const BOSS_PHASE_NAMES_LOCAL_ZH = [
  ['凝视阶段', '狂乱阶段', '深渊阶段'],
  ['结晶阶段', '折射阶段', '碎裂阶段'],
  ['吸积阶段', '视界阶段', '奇点阶段'],
  ['运算阶段', '预言阶段', '降临阶段']
];

// 将 data-i18n / data-i18n-html / data-i18n-placeholder 元素的文本刷新为当前语言。
// 首次调用时缓存元素的中文原始内容（data-i18n-orig），切回中文时恢复。
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.dataset.i18nOrig === undefined) el.dataset.i18nOrig = el.textContent;
    el.textContent = (STATE.lang === 'en' && I18N.en[key]) ? I18N.en[key] : el.dataset.i18nOrig;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (el.dataset.i18nOrig === undefined) el.dataset.i18nOrig = el.innerHTML;
    el.innerHTML = (STATE.lang === 'en' && I18N.en[key]) ? I18N.en[key] : el.dataset.i18nOrig;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (el.dataset.i18nPhOrig === undefined) el.dataset.i18nPhOrig = el.placeholder;
    el.placeholder = (STATE.lang === 'en' && I18N.en[key]) ? I18N.en[key] : el.dataset.i18nPhOrig;
  });
}

// 切换语言：保存到 localStorage，刷新静态文本与动态面板。
function setLang(lang) {
  STATE.lang = (lang === 'en') ? 'en' : 'zh';
  try { localStorage.setItem('sr_lang', STATE.lang); } catch (e) {}
  applyI18n();
  // 刷新可能正在显示的动态面板（存在性检查，避免加载顺序问题）
  try {
    if (typeof renderQualityGrid === 'function') renderQualityGrid();
    if (typeof refreshDifficultyUI === 'function') refreshDifficultyUI();
    if (document.getElementById('meta-overlay') && document.getElementById('meta-overlay').classList.contains('show') && typeof renderMetaShop === 'function') renderMetaShop();
    if (document.getElementById('codex-overlay') && document.getElementById('codex-overlay').classList.contains('show') && typeof updateCodexModel === 'function') updateCodexModel();
    if (document.getElementById('tutorial-overlay') && document.getElementById('tutorial-overlay').classList.contains('show') && typeof showTutorialStep === 'function') showTutorialStep();
    if (typeof refreshAuthLang === 'function') refreshAuthLang();
    if (typeof updateUserInfoBar === 'function') updateUserInfoBar();
  } catch (e) { /* 忽略刷新失败，不影响主流程 */ }
}
