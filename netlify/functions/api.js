const API = String(process.env.LINKBIO_API_URL || 'https://linkbio-backend-egwq.onrender.com').replace(/\/$/, '');

exports.handler = async (event) => {
  const suffix = event.path.replace(/^\/.netlify\/functions\/api/, '') || '/';
  const path = suffix === '/' ? '/api' : `/api${suffix}`;
  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const headers = { ...event.headers };
  delete headers.host;
  delete headers['content-length'];
  try {
    const init = { method: event.httpMethod, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(event.httpMethod)) {
      init.body = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64')
        : (event.body || '');
    }
    const upstream = await fetch(`${API}${path}${query}`, init);
    const body = Buffer.from(await upstream.arrayBuffer()).toString('base64');
    const out = {};
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'set-cookie') out[k] = v;
    });
    const cookies = upstream.headers.getSetCookie?.() || [];
    return {
      statusCode: upstream.status,
      headers: out,
      ...(cookies.length ? { multiValueHeaders: { 'set-cookie': cookies } } : {}),
      body,
      isBase64Encoded: true
    };
  } catch (e) {
    console.error('LinkBio API proxy:', e?.message || e);
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ success: false, message: 'à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ Backend à¸‚à¸­à¸‡ LinkBio à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ' })
    };
  }
};
