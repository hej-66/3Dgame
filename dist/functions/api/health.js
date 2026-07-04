// functions/api/health.js — 服务健康检查
// 前端 checkServerAvailable() 通过此端点判断后端是否可用（利用边缘缓存减少冷启动）
export async function onRequestGet(context) {
  return new Response(JSON.stringify({ status: 'ok', time: Date.now() }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=30'
    }
  });
}

// 预检请求
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
