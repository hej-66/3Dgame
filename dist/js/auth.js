// auth.js — 登录与数据同步系统
// 检测服务器是否可用

// 模块级：当前是否为注册模式（供 refreshAuthLang 在语言切换时刷新标题/按钮）
let _authRegisterMode = false;
async function checkServerAvailable() {
  if (AUTH.serverAvailable !== null) return AUTH.serverAvailable;
  // file:// 协议直接判定为不可用
  if (location.protocol === 'file:') {
    AUTH.serverAvailable = false;
    return false;
  }
  try {
    // 使用轻量级 health 端点检测，利用边缘缓存减少冷启动
    const resp = await fetch(AUTH.apiBase + '/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    AUTH.serverAvailable = resp.ok;
    return AUTH.serverAvailable;
  } catch(e) {
    AUTH.serverAvailable = false;
    return false;
  }
}

// 从 localStorage 恢复登录状态
function restoreAuth() {
  try {
    const saved = localStorage.getItem('sr_auth');
    if (saved) {
      const data = JSON.parse(saved);
      AUTH.token = data.token;
      AUTH.username = data.username;
      AUTH.userId = data.userId;
      AUTH.isGuest = data.isGuest || false;
      AUTH.isLocal = data.isLocal || false;
    }
  } catch(e) {}
}

// 保存登录状态到 localStorage
function saveAuth() {
  try {
    localStorage.setItem('sr_auth', JSON.stringify({
      token: AUTH.token,
      username: AUTH.username,
      userId: AUTH.userId,
      isGuest: AUTH.isGuest,
      isLocal: AUTH.isLocal
    }));
  } catch(e) {}
}

// 清除登录状态
function clearAuth() {
  AUTH.token = null;
  AUTH.username = null;
  AUTH.userId = null;
  AUTH.isGuest = false;
  AUTH.isLocal = false;
  try { localStorage.removeItem('sr_auth'); } catch(e) {}
}

// 显示登录界面
function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('show');
}

// 隐藏登录界面
function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('show');
}

// 更新主菜单用户信息显示
function updateUserInfoBar() {
  const bar = document.getElementById('user-info-bar');
  const nameEl = document.getElementById('user-display-name');
  if (AUTH.username && !AUTH.isGuest) {
    bar.style.display = 'flex';
    nameEl.textContent = AUTH.username;
  } else {
    // 游客/本地模式：不显示用户信息条（保持原行为）
    bar.style.display = 'none';
  }
}

// 取得当前语言的游客/本地显示名（供内部显示与保存）
function guestDisplayName() {
  return AUTH.isLocal ? t('user.local', '本地玩家') : t('user.guest', '游客');
}

// 语言切换时刷新 auth 相关动态文本（标题/按钮/游客名）
function refreshAuthLang() {
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  if (authTitle && typeof _authRegisterMode !== 'undefined') {
    authTitle.textContent = _authRegisterMode ? t('auth.title.register', '注册新账号') : t('auth.title.login', '指挥官登录');
  }
  if (authSubmit && typeof _authRegisterMode !== 'undefined') {
    authSubmit.textContent = _authRegisterMode ? t('auth.submit.register', '注册 ▸') : t('auth.submit.login', '登录 ▸');
  }
  // 游客/本地用户名跟随语言
  if (AUTH.isGuest) {
    AUTH.username = guestDisplayName();
    saveAuth();
  }
  updateUserInfoBar();
}

// API 请求封装
async function apiRequest(endpoint, options = {}) {
  const url = AUTH.apiBase + endpoint;
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH.token) {
    headers['Authorization'] = 'Bearer ' + AUTH.token;
  }
  try {
    const resp = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    return await resp.json();
  } catch(err) {
    return { error: t('auth.network_error', '网络错误：') + err.message };
  }
}

// 登录
async function doLogin(username, password) {
  const result = await apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (result.success) {
    AUTH.token = result.token;
    AUTH.username = result.username;
    AUTH.userId = result.userId;
    AUTH.isGuest = false;
    AUTH.isLocal = false;
    saveAuth();
    return true;
  }
  return result.error || t('auth.login_fail', '登录失败');
}

// 注册
async function doRegister(username, password) {
  const result = await apiRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (result.success) {
    AUTH.token = result.token;
    AUTH.username = result.username;
    AUTH.userId = result.userId;
    AUTH.isGuest = false;
    AUTH.isLocal = false;
    saveAuth();
    return true;
  }
  return result.error || t('auth.register_fail', '注册失败');
}

// 从云端加载数据
async function loadCloudData() {
  if (!AUTH.token) return null;
  const result = await apiRequest('/api/data', { method: 'GET' });
  if (result.success) {
    return {
      bestRecords: result.bestRecords,
      metaData: result.metaData
    };
  }
  return null;
}

// 保存数据到云端
async function saveCloudData() {
  if (!AUTH.token) return;
  if (AUTH.serverAvailable === false) return; // 服务器不可用时跳过
  // 收集所有难度的最佳记录
  const bestRecords = {};
  const diffs = ['casual', 'easy', 'standard', 'hard', 'hell'];
  for (const diff of diffs) {
    const record = getBestRecord(diff);
    if (record.score > 0) {
      bestRecords[diff] = record;
    }
  }
  await apiRequest('/api/data', {
    method: 'POST',
    body: JSON.stringify({
      bestRecords,
      metaData: META
    })
  });
}

// 合并云端数据到本地
function mergeCloudData(cloudData) {
  if (!cloudData) return;
  
  // 合并最佳记录（取较高值）
  if (cloudData.bestRecords) {
    for (const diff in cloudData.bestRecords) {
      const cloudRec = cloudData.bestRecords[diff];
      const localRec = getBestRecord(diff);
      if (cloudRec.score > localRec.score) {
        inMemoryBest[diff] = cloudRec;
        try { localStorage.setItem('sr_best_' + diff, JSON.stringify(cloudRec)); } catch(e) {}
      }
    }
  }
  
  // 合并 Meta 数据（取星晶较多者）
  if (cloudData.metaData) {
    const cloudMeta = cloudData.metaData;
    if (cloudMeta.crystals > META.crystals) {
      META = cloudMeta;
      saveMeta();
    } else if (cloudMeta.crystals < META.crystals) {
      // 本地数据较新，上传到云端
      saveCloudData();
    }
  }
}

// 初始化登录系统
function initAuthSystem() {
  restoreAuth();
  
  const authOverlay = document.getElementById('auth-overlay');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');
  const authUsername = document.getElementById('auth-username');
  const authPassword = document.getElementById('auth-password');
  const authGuest = document.getElementById('auth-guest');
  
  let isRegisterMode = false;
  // 暴露给 refreshAuthLang() 使用，以便语言切换时刷新标题/按钮
  _authRegisterMode = false;
  
  // 切换登录/注册标签
  tabLogin.addEventListener('click', () => {
    isRegisterMode = false;
    _authRegisterMode = false;
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    authTitle.textContent = t('auth.title.login', '指挥官登录');
    authSubmit.textContent = t('auth.submit.login', '登录 ▸');
    authError.textContent = '';
  });

  tabRegister.addEventListener('click', () => {
    isRegisterMode = true;
    _authRegisterMode = true;
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    authTitle.textContent = t('auth.title.register', '注册新账号');
    authSubmit.textContent = t('auth.submit.register', '注册 ▸');
    authError.textContent = '';
  });

  // 提交登录/注册
  authSubmit.addEventListener('click', async () => {
    const username = authUsername.value.trim();
    const password = authPassword.value;

    if (!username || !password) {
      authError.textContent = t('auth.error.empty', '请填写用户名和密码');
      return;
    }

    authSubmit.disabled = true;
    authSubmit.textContent = t('auth.processing', '处理中...');
    authError.textContent = '';

    const result = isRegisterMode
      ? await doRegister(username, password)
      : await doLogin(username, password);

    if (result === true) {
      authSubmit.textContent = t('auth.success', '成功！');
      // 加载云端数据
      STATE.cloudSyncPending = true; // 标记同步中，阻止在此期间进入游戏
      const cloudData = await loadCloudData();
      mergeCloudData(cloudData);
      STATE.cloudSyncPending = false; // 同步完成
      hideAuthOverlay();
      updateUserInfoBar();
      // 刷新难度选择显示
      if (typeof refreshDiffBest === 'function') refreshDiffBest();
    } else {
      authError.textContent = result;
      authSubmit.disabled = false;
      authSubmit.textContent = isRegisterMode ? t('auth.submit.register', '注册 ▸') : t('auth.submit.login', '登录 ▸');
    }
  });
  
  // 回车提交
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authSubmit.click();
  });
  authUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authPassword.focus();
  });
  
  // 游客模式
  authGuest.addEventListener('click', () => {
    AUTH.isGuest = true;
    AUTH.isLocal = false;
    AUTH.username = guestDisplayName();
    saveAuth();
    hideAuthOverlay();
    updateUserInfoBar();
  });
  
  // 退出登录
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearAuth();
    showAuthOverlay();
    updateUserInfoBar();
  });
  
  // 启动时检查登录状态
  if (AUTH.token) {
    // 已登录，验证令牌并加载数据
    STATE.cloudSyncPending = true; // 标记同步中，阻止用户在数据未到达时进入游戏
    loadCloudData().then(cloudData => {
      if (cloudData) {
        mergeCloudData(cloudData);
        updateUserInfoBar();
      } else {
        // 令牌失效
        clearAuth();
        // 服务器不可用，自动降级为本地模式
        AUTH.isGuest = true;
        AUTH.isLocal = true;
        AUTH.username = guestDisplayName();
        saveAuth();
        updateUserInfoBar();
      }
      STATE.cloudSyncPending = false; // 同步完成（含失败降级）
    }).catch(() => { STATE.cloudSyncPending = false; });
  } else if (AUTH.isGuest) {
    updateUserInfoBar();
  } else {
    // 检测服务器是否可用
    checkServerAvailable().then(available => {
      if (available) {
        showAuthOverlay();
      } else {
        // 服务器不可用，显示离线提示并自动进入本地模式
        document.getElementById('auth-offline-hint').style.display = 'block';
        AUTH.isGuest = true;
        AUTH.isLocal = true;
        AUTH.username = guestDisplayName();
        saveAuth();
        updateUserInfoBar();
      }
    });
  }
}
