// functions/api/login.js — 用户登录
// 密码校验：用存储的 salt 重新计算 PBKDF2 哈希，与记录比对

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

// 使用 Web Crypto 的恒定时间比较，避免时序攻击
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  const ok = await crypto.subtle.timingSafeEqual(bufA, bufB);
  return ok;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STELLAR_KV) {
    return new Response(JSON.stringify({ success: false, error: '服务未配置存储（STELLAR_KV 绑定缺失）' }), { status: 503, headers: JSON_HEADERS });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ success: false, error: '请求格式错误' }), { status: 400, headers: JSON_HEADERS }); }

  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) {
    return new Response(JSON.stringify({ success: false, error: '用户名或密码不能为空' }), { status: 400, headers: JSON_HEADERS });
  }

  // 查找用户
  const raw = await env.STELLAR_KV.get(`user:${username.toLowerCase()}`, 'text');
  if (!raw) {
    return new Response(JSON.stringify({ success: false, error: '用户名或密码错误' }), { status: 401, headers: JSON_HEADERS });
  }
  const user = JSON.parse(raw);

  // 校验密码
  const hash = await hashPassword(password, user.salt);
  const valid = await safeEqual(hash, user.hash);
  if (!valid) {
    return new Response(JSON.stringify({ success: false, error: '用户名或密码错误' }), { status: 401, headers: JSON_HEADERS });
  }

  // 签发 token（有效期 30 天）
  const token = randomHex(24);
  await env.STELLAR_KV.put(`token:${token}`, JSON.stringify({
    username: user.username, userId: user.userId, expires: Date.now() + 30 * 24 * 3600 * 1000
  }));

  return new Response(JSON.stringify({
    success: true, token, username: user.username, userId: user.userId
  }), { status: 200, headers: JSON_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
