// functions/api/data.js — 云端存档读写
//   GET  → 返回 { success, bestRecords, metaData }
//   POST → 接收 { bestRecords, metaData }，保存后返回 { success }
// 鉴权：Authorization: Bearer <token>，token 映射存于 KV `token:<token>`

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

// 校验 token，返回用户信息或 null
async function validateToken(env, authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const raw = await env.STELLAR_KV.get(`token:${token}`, 'text');
  if (!raw) return null;
  const info = JSON.parse(raw);
  // 过期检查
  if (info.expires && info.expires < Date.now()) {
    await env.STELLAR_KV.delete(`token:${token}`); // 清理过期 token
    return null;
  }
  return info; // { username, userId }
}

// 读取存档（不存在则返回默认空存档）
async function readData(env, userId) {
  const raw = await env.STELLAR_KV.get(`data:${userId}`, 'text');
  if (raw) return JSON.parse(raw);
  return { bestRecords: {}, metaData: { crystals: 0, upgrades: {}, unlocked: false } };
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.STELLAR_KV) {
    return new Response(JSON.stringify({ success: false, error: '服务未配置存储' }), { status: 503, headers: JSON_HEADERS });
  }

  const session = await validateToken(env, request.headers.get('Authorization'));
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: '未登录或登录已过期' }), { status: 401, headers: JSON_HEADERS });
  }

  const data = await readData(env, session.userId);
  return new Response(JSON.stringify({
    success: true,
    bestRecords: data.bestRecords,
    metaData: data.metaData
  }), { status: 200, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STELLAR_KV) {
    return new Response(JSON.stringify({ success: false, error: '服务未配置存储' }), { status: 503, headers: JSON_HEADERS });
  }

  const session = await validateToken(env, request.headers.get('Authorization'));
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: '未登录或登录已过期' }), { status: 401, headers: JSON_HEADERS });
  }

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ success: false, error: '请求格式错误' }), { status: 400, headers: JSON_HEADERS }); }

  // 合并已有存档（防止客户端漏字段覆盖）
  const existing = await readData(env, session.userId);
  const bestRecords = (body.bestRecords && typeof body.bestRecords === 'object') ? body.bestRecords : existing.bestRecords;
  const metaData = (body.metaData && typeof body.metaData === 'object') ? body.metaData : existing.metaData;

  // 限制存档大小（防止滥用，KV 单值上限 25MB，这里保守限制）
  const payload = JSON.stringify({ bestRecords, metaData });
  if (payload.length > 256 * 1024) {
    return new Response(JSON.stringify({ success: false, error: '存档数据过大' }), { status: 413, headers: JSON_HEADERS });
  }

  await env.STELLAR_KV.put(`data:${session.userId}`, payload);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: JSON_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
