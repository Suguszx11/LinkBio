const API = String(process.env.LINKBIO_API_URL || '').replace(/\/$/, '');

exports.handler = async (event) => {
  if (!API) return json(500, { success: false, message: 'ยังไม่ได้ตั้งค่า LINKBIO_API_URL' });
  const path = event.path.replace(/^\/.netlify\/functions\/api/, '') || '/';
  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const headers = { ...event.headers };
  delete headers.host;
  delete headers['content-length'];
  const init = { method: event.httpMethod, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(event.httpMethod)) {
    init.body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : (event.body || '');
  }
  try {
    const upstream = await fetch(`${API}${path}${query}`, init);
    const body = Buffer.from(await upstream.arrayBuffer()).toString('base64');
    const out = {};
    upstream.headers.forEach((v, k) => { if (k.toLowerCase() !== 'set-cookie') out[k] = v; });
    const cookies = upstream.headers.getSetCookie?.() || [];
    return { statusCode: upstream.status, headers: out, multiValueHeaders: cookies.length ? { 'set-cookie': cookies } : undefined, body, isBase64Encoded: true };
  } catch (e) {
    return json(502, { success: false, message: 'เชื่อมต่อ Backend ไม่สำเร็จ' });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}
