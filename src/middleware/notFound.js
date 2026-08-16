// Runs when no route matched, so unknown paths return JSON instead of Express' HTML page.
module.exports = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};
