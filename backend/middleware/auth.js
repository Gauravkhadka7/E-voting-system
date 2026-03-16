const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'blockvote_secret_2024';

exports.protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token. Please log in.' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

exports.adminOnly = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token.' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'admin')
      return res.status(403).json({ message: 'Admin access only.' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
};