const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const token = req.headers.authorization; // Changed 'Authorization' to lowercase 'authorization'
    const decoded = jwt.verify(token, process.env.jwt_secret);
    req.body.userId = decoded.userid;
    next();
  } catch (error) {
    res.status(401).send({
      message: error.message,
      success: false,
    });
  }
};
