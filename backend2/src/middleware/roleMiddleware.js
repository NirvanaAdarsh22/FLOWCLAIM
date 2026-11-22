
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission."
      });
    }

    next();
  };
};

export default roleMiddleware;
