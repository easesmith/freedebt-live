const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Admin = require("../models/admin");
const jwtkey = require("../util/jwtkey");

exports.userAuth = async (req, res, next) => {
  try {
    const token = req.cookies["token"];
    //token is missing
    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
        success: false,
      });
    }
    try {
      const validatedToken = await jwt.verify(token, process.env.JWT_SECRET);
      console.log(validatedToken);
      const userId = validatedToken.id;
      const user = await User.findById(userId);
      req.user = user;
    } catch (err) {
      return res.status(400).json({
        message: "Invalid Token",
        success: false,
      });
    }
    //if token is valid move on to next middleware
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.userAuthForCart = async (req, res, next) => {
  try {
    const token = req.cookies["token"];
    // console.log('token inside', req.cookies)
    // const token = req.header('Authorization')
    //token is missing

    try {
      if (token) {
        const validatedToken = await jwt.verify(token, process.env.JWT_SECRET);
        const userId = validatedToken.id;
        const user = await User.findById(userId);
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (err) {
      if ((err.name = "TokenExpiredError")) {
        res.clearCookie("token");
        return res.status(400).json({
          message: "Token expired",
          tokenExpired: true,
        });
      }
      return res.status(400).json({
        message: "Invalid Token",
        success: false,
      });
    }
    //if token is valid move on to next middleware
    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.isAdminAuth = async (req, res, next) => {
  try {
    // console.log('token inside', req.header('Authorization'))
    const token = req.cookies["admtoken"];

    jwt.verify(token, jwtkey.secretJwtKey, function (err, authData) {
      if (err) {
        if (err.name = "TokenExpiredError") {
          res.clearCookie("admtoken");
          return res.status(400).json({
            message: "Token expired",
            tokenExpired: true,
          });
        }
        return res.status(401).json({
          message: "Token authentication failed",
          error: err,
          success: false,
        });
      } else {
        console.log('authData',authData)
        req.perm = authData.permissions;
        req.adminId = authData.adminId; 
        next();
      }
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
