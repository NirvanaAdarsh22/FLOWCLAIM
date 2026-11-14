
const roleMiddleware = (...allowedRoles) => {

    return (req, res, next) => {

        // Check whether user has an allowed role
        if (!allowedRoles.includes(req.user.role)) {

            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission."
            });
        }

        // User is authorized
        next();
    };
};

module.exports = roleMiddleware;
