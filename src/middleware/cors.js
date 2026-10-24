/** CORS allowlist; Vite development uses its proxy, so CORS is only needed for separate deployments. */
export const cors = (origins) => {
  const allowedOrigins = new Set(origins.split(',').map((origin) => origin.trim()).filter(Boolean));

  return (req, res, next) => {
    const requestOrigin = req.get('Origin');
    if (!requestOrigin || (!allowedOrigins.has('*') && !allowedOrigins.has(requestOrigin))) return next();

    res.set('Access-Control-Allow-Origin', allowedOrigins.has('*') ? '*' : requestOrigin);
    res.vary('Origin');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return req.method === 'OPTIONS' ? res.sendStatus(204) : next();
  };
};
