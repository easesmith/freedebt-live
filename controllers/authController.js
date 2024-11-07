const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");

const catchAsync = require('./../util/catchAsync');
const AppError = require('./../util/appError');
const Client = require('../models/clientModel');
const Partner = require('../models/partnerModel');
const Admin = require('../models/adminModel');
const Notification = require('../models/notificationModel');
const { sendNotification } = require('../util/notificationUtils');
const { verifyOtpSms } = require('../util/sendSMS');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};
const createSendToken = (user, statusCode, res, type) => {
  let modifiedUser = { ...user.toObject() };
  modifiedUser.abc = type;
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  //   if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  console.log("user", modifiedUser);
  res.cookie('token', token, cookieOptions);
  res.cookie('user', JSON.stringify(modifiedUser), {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: false
  })

  // Remove password from output
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    user
  });
};

//client routes
exports.clientSignup = catchAsync(async (req, res, next) => {
  // const { enteredOtp, firstName, lastName, phone, email, password, state, city, pinCode, addressLine, type } = req.body;
  const { enteredOtp, firstName, lastName, phone, password, type } = req.body;

  await verifyOtpSms(phone, enteredOtp, res)
  const passwordHash = await bcrypt.hash(password, 12);

  const newClient = new Client({
    name: { first: firstName, last: lastName },
    phone,
    // email,
    password: passwordHash,
    // address: { state, city, pinCode, addressLine },
    type: type,
  });


  const not = new Notification({ clientId: newClient._id, type: 'client' })

  await not.save()

  newClient.notificationId = not._id;

  await newClient.save();


  const info = { navigate: `/admin/clients/${newClient._id}` };
  await sendNotification("admin", null, "new-client", info);

  res.status(201).json({
    success: true,
    message: "Client successfully Created! Kindly Login..."
  })
});

exports.clientLogin = catchAsync(async (req, res, next) => {
  const { phone, password } = req.body;
  const client = await Client.findOne({ phone }).select("+password");
  console.log("client", client);
  if (!client || !(await client.correctPassword(password, client.password))) {
    return next(new AppError("Incorrect phone or password", 401));
  }
  if (!client.status) {
    return next(new AppError("Account Blocked", 401));
  }
  createSendToken(client, 200, res, 'client');
});


//partner routes
exports.partnerSignup = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    password,
    state,
    city,
    pinCode,
    addressLine,

  } = req.body;

  const passwordHash = await bcrypt.hash(req.body.password, 12);

  const newPartner = new Partner({
    name: { first: firstName, last: lastName },
    phone,
    email,
    password: passwordHash,
    address: { state, city, pinCode, addressLine },
  });


  const not = new Notification({ partnerId: newPartner._id, type: 'partner' })

  await not.save()

  newPartner.notificationId = not._id;

  await newPartner.save()

  res.status(201).json({
    success: true,
    message: "Partner successfully Created! Kindly Login...",
  });
});

exports.partnerLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const partner = await Partner.findOne({ email }).select("+password");

  if (
    !partner ||
    !(await partner.correctPassword(password, partner.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!partner.status) {
    return next(new AppError("Account Blocked", 401));
  }

  createSendToken(partner, 200, res, 'partner');
});



//admin routes


exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select("+password");

  if (
    !admin ||
    !(await admin.correctPassword(password, admin.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(admin, 200, res, 'admin');
});


exports.authenicateClient = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  const token = req.cookies["token"];

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user still exists
  const currentUser = await Client.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The client belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.client = currentUser;
  next();
});
exports.authenicatePartner = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  const token = req.cookies["token"];

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user still exists
  const currentUser = await Partner.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The partner belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.partner = currentUser;
  next();
});
exports.authenicateAdmin = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  const token = req.cookies["token"];

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // 3) Check if user still exists
  const currentUser = await Admin.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The admin belonging to this token does no longer exist.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.admin = currentUser;
  next();
});


exports.authorize = (section, accessType) => {
  return (req, res, next) => {
    const perms = req.admin.permissions || {};
    if ((accessType === 'read' || accessType === 'write') && (perms[section] === accessType || perms[section] === 'write')) {
      next();
      return

    } else {
      return next(
        new AppError('Forbidden- Insufficient Permissions', 403)
      );
    }

  };
};