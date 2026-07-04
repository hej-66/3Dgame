// meta.js — 局外成长（星晶与永久升级）、最佳记录
// 内存缓存
const inMemoryBest = {};

function getBestRecord(diff) {
  if (inMemoryBest[diff]) return inMemoryBest[diff];
  
  let data = null;
  // 1. 尝试 localStorage
  try { data = localStorage.getItem('sr_best_' + diff); } catch(e) {}
  
  // 2. 尝试 Cookie
  if (!data) {
    try {
      const cookieName = 'sr_best_' + diff + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      for(let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(cookieName) === 0) {
          data = c.substring(cookieName.length, c.length);
          break;
        }
      }
    } catch(e) {}
  }
  
  if (data) {
    try {
      const parsed = JSON.parse(data);
      inMemoryBest[diff] = parsed;
      return parsed;
    } catch(e) {}
  }
  
  const defaultRecord = { score: 0, wave: 0, maxCombo: 0 };
  inMemoryBest[diff] = defaultRecord;
  return defaultRecord;
}

function saveBestRecord(diff, record) {
  const old = getBestRecord(diff);
  if (record.score > old.score) {
    inMemoryBest[diff] = record;
    const dataStr = JSON.stringify(record);
    
    // 1. 写入 localStorage
    try { localStorage.setItem('sr_best_' + diff, dataStr); } catch(e) {}
    
    // 2. 写入 Cookie (持久化后备方案，有效期 1 年)
    try {
      const d = new Date();
      d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
      const expires = "expires=" + d.toUTCString();
      document.cookie = 'sr_best_' + diff + '=' + encodeURIComponent(dataStr) + ';' + expires + ';path=/;SameSite=Lax';
    } catch(e) {}
    
    // 3. 同步到云端（如果已登录）
    if (typeof AUTH !== 'undefined' && AUTH.token) {
      saveCloudData();
    }
    
    return true;
  }
  return false;
}

function loadMeta() {
  let data = null;
  try { data = localStorage.getItem(META_KEY); } catch(e) {}
  if (!data) {
    try {
      const cn = META_KEY + '=';
      const dc = decodeURIComponent(document.cookie);
      const ca = dc.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(cn) === 0) { data = c.substring(cn.length); break; }
      }
    } catch(e) {}
  }
  if (data) {
    try {
      const parsed = JSON.parse(data);
      META = Object.assign({ crystals: 0, upgrades: {}, unlocked: false }, parsed);
    } catch(e) {}
  }
}

function saveMeta() {
  const s = JSON.stringify(META);
  try { localStorage.setItem(META_KEY, s); } catch(e) {}
  try {
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    document.cookie = META_KEY + '=' + encodeURIComponent(s) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  } catch(e) {}
  // 同步到云端（如果已登录）
  if (typeof AUTH !== 'undefined' && AUTH.token) {
    saveCloudData();
  }
}

function getMetaLevel(id) { return META.upgrades[id] || 0; }

function getMetaBonus(id) {
  const lv = getMetaLevel(id);
  switch(id) {
    case 'm_hp':       return lv * 15;
    case 'm_energy':   return lv * 20;
    case 'm_dmg':      return lv * 0.10;
    case 'm_speed':    return lv * 0.05;
    case 'm_regen':    return lv * 0.15;
    case 'm_crit':     return lv * 0.05;
    case 'm_lifesteal':return lv * 0.03;
    case 'm_shield':   return lv * 25;
    case 'm_crystal':  return lv * 0.15;
    case 'm_revive':   return lv;
    default: return 0;
  }
}

function buyMetaUpgrade(id) {
  const def = META_UPGRADES.find(u => u.id === id);
  if (!def) return false;
  const lv = getMetaLevel(id);
  if (lv >= def.max) return false;
  const cost = def.cost(lv);
  if (META.crystals < cost) return false;
  META.crystals -= cost;
  META.upgrades[id] = lv + 1;
  saveMeta();
  return true;
}

// 在游戏开始时根据永久升级初始化 STATE
function applyMetaToState() {
  STATE.maxHp += getMetaBonus('m_hp');
  STATE.hp = STATE.maxHp;
  STATE.maxEnergy += getMetaBonus('m_energy');
  STATE.energy = STATE.maxEnergy;
  STATE.maxShield += getMetaBonus('m_shield');
  STATE.shield = STATE.maxShield;
  STATE.moveSpeed *= (1 + getMetaBonus('m_speed'));
  STATE.energyRegen *= (1 + getMetaBonus('m_regen'));
  STATE.critChance += getMetaBonus('m_crit');
  STATE.lifesteal += getMetaBonus('m_lifesteal');
  STATE.bulletDmgBonus += getMetaBonus('m_dmg');
  STATE.reviveLeft = getMetaBonus('m_revive');
}

// 新增：刷新菜单上的历史最佳分数显示
function refreshDifficultyUI() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    const diff = btn.dataset.diff;
    const def = DIFFICULTIES[diff];
    // 难度名跟随当前语言刷新（修复语言切换后 .d-name 仍为加载时语言的 bug）
    const nameEl = btn.querySelector('.d-name');
    if (nameEl && def) nameEl.textContent = trName(def);
    const best = getBestRecord(diff);
    const bestEl = btn.querySelector('.d-best');
    if(bestEl) bestEl.textContent = `BEST: ${best.score}`;
  });
}

// 刷新难度最佳记录显示（供登录系统调用）
function refreshDiffBest() { refreshDifficultyUI(); }
