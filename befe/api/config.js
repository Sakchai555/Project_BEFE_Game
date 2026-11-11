module.exports = async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const apiBase = String(process.env.RENDER_API_URL || '').replace(/\/$/, '');
  if (!apiBase) return res.status(503).json({ error: 'Render API is not configured' });
  try {
    const response = await fetch(`${apiBase}/api/config`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return res.status(503).json({ error: 'Render API is unavailable' });
    const config = await response.json();
    return res.status(200).json({ ...config, apiBase });
  } catch {
    return res.status(503).json({ error: 'Render API is unavailable' });
  }
};
