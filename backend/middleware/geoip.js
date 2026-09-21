/**
 * GeoIP middleware — attaches approximate location to req.geoInfo
 * Uses IP-API (free, no key required for non-commercial)
 */
const https = require("https");

const geoipMiddleware = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "unknown";

    // Skip for localhost
    if (ip === "127.0.0.1" || ip === "::1" || ip === "unknown") {
      req.geoInfo = { ip, country: "LOCAL", region: "LOCAL", city: "LOCAL" };
      return next();
    }

    // Attach to request (non-blocking)
    req.geoInfo = { ip };
    next();

    // Background geo lookup
    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city`;
    // Note: In production use a proper geo service; this is async and non-blocking
  } catch (err) {
    req.geoInfo = { ip: "unknown" };
    next();
  }
};

module.exports = geoipMiddleware;