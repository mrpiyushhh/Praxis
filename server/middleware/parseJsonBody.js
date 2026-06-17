function readStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function tryParseJson(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  return JSON.parse(trimmed);
}

async function parseJsonBody(req, res, next) {
  if (['GET', 'HEAD', 'DELETE'].includes(req.method)) {
    req.body = req.body || {};
    return next();
  }

  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
    return next();
  }

  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = tryParseJson(req.body) || {};
      return next();
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }
  }

  try {
    const raw = await readStream(req);
    if (!raw) {
      req.body = {};
      return next();
    }

    try {
      req.body = tryParseJson(raw) || {};
    } catch {
      return res.status(400).json({ message: 'Invalid JSON body' });
    }

    next();
  } catch {
    res.status(400).json({ message: 'Could not read request body' });
  }
}

module.exports = parseJsonBody;