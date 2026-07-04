// functions/api/register.js — 用户注册
// 数据模型（KV 命名空间 STELLAR_KV）：
//   user:<username>  → { username, salt, hash, userId, createdAt }
//   token:<token>    → { username, userId, expires }
//   data:<userId>    → { bestRecords, metaData }
// 密码使用 PBKDF2-SHA256（10万次迭代）加盐哈希，Workers 运行时原生支持 Web Crypto

// 生成随机十六进制字符串（用于 salt / token / userId）
function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// PBKDF2 派生 256 位密钥，返回 base64
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

export async function onRequestPost(context) {
  const { request, env } = context;

  // KV 未绑定（本地开发未配置）时返回明确错误
  if (!env.STELLAR_KV) {
    return new Response(JSON.stringify({ success: false, error: '服务未配置存储（STELLAR_KV 绑定缺失）' }), { status: 503, headers: JSON_HEADERS });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ success: false, error: '请求格式错误' }), { status: 400, headers: JSON_HEADERS }); }

  const username = (body.username || '').trim();
  const password = body.password || '';

  // 输入校验
  if (!username || username.length < 2 || username.length > 20) {
    return new Response(JSON.stringify({ success: false, error: '用户名需为 2-20 个字符' }), { status: 400, headers: JSON_HEADERS });
  }
  if (!/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/.test(username)) {
    return new Response(JSON.stringify({ success: false, error: '用户名仅允许中英文、数字、下划线、连字符' }), { status: 400, headers: JSON_HEADERS });
  }
  if (password.length < 6 || password.length > 64) {
    return new Response(JSON.stringify({ success: false, error: '密码长度需为 6-64 位' }), { status: 400, headers: JSON_HEADERS });
  }

  // 检查用户是否已存在（用户名不区分大小写存储键，但保留原大小写）
  const existKey = `user:${username.toLowerCase()}`;
  if (await env.STELLAR_KV.get(existKey, 'text')) {
    return new Response(JSON.stringify({ success: false, error: '用户名已被占用' }), { status: 409, headers: JSON_HEADERS });
  }

  // 生成 salt、userId、token
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const userId = randomHex(12);
  const token = randomHex(24);

  // 写入用户记录
  await env.STELLAR_KV.put(existKey, JSON.stringify({
    username, salt, hash, userId, createdAt: Date.now()
  }));

  // 写入 token 映射（有效期 30 天）
  await env.STELLAR_KV.put(`token:${token}`, JSON.stringify({
    username, userId, expires: Date.now() + 30 * 24 * 3600 * 1000
  }));

  return new Response(JSON.stringify({
    success: true, token, username, userId
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
