const catchAsync = require("../util/catchAsync");
const axios = require("axios");
const crypto = require("crypto");

const AppError = require("../util/appError");
const bcrypt = require("bcryptjs");
const Service = require("../models/serviceModel");
const ServiceReq = require("../models/serviceReqModel");
const Client = require("../models/clientModel");
const Document = require("../models/documentModel");
const Partner = require("../models/partnerModel");
const Chats = require("../models/chatModel");
const ServiceClientLink = require("../models/serviceClientLinkModel");
const ServiceUpdate = require("../models/serviceUpdateModel");
const {
  calculateNoOfUnreadMessages,
  markAllMessagesAsRead,
} = require("../util/utilFuns");
const Notification = require("../models/notificationModel");
const {
  sendNotification,
  findObjectsWithSameFields,
} = require("../util/notificationUtils");
const { uploadFile, generatePreSignedUrl } = require("../middleware/docUpload");
const Category = require("../models/categoryModel");
const Folder = require("../models/folderModel");
const SubFolder = require("../models/subFolderModel");
const { sendOtpSms, verifyOtpSms } = require("../util/sendSMS");
const path = require("path");

exports.testDev = catchAsync(async (req, res, next) => {
  const clients = await Client.find();
  const partners = await Partner.find();

  for (const client of clients) {
    client.status = true;
    await client.save();
  }

  for (const partner of partners) {
    partner.status = true;
    await partner.save();
  }

  res.status(201).json({
    success: true,
    message: "",
  });
});

exports.getClientProfile = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const client = await Client.findById(clientId);
  res.status(201).json({
    success: true,
    client: client,
  });
});

exports.updateClientProfile = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  const {
    firstName,
    lastName,
    phone,
    email,
    state,
    city,
    pinCode,
    addressLine,
  } = req.body;
  const client = await Client.findById(clientId);
  client.name = { first: firstName, last: lastName };
  client.phone = phone;
  client.email = email;
  client.address = { state, city, pinCode, addressLine };
  await client.save();
  res.status(201).json({
    success: true,
    client: client,
    message: "Profile updated successfully"
  });
});

exports.requestService = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const { serviceId, requirement } = req.body;
  // const adminId = "65c72027f14765977d83bd74";

  const service = await Service.findById(serviceId);

  if (!service) {
    return next(new AppError("No Service exists with this id", 404));
  }

  const client = await Client.findById(clientId);

  const request = new ServiceReq({
    clientId,
    serviceId,
    type: client.type,
    status: "pending",
    requirement,
  });

  await request.save();

  const chatsArr = [
    {
      pin: true,
      msg: `Requirements: ${requirement}`,
      from: "client",
      readAdmin: false,
    },
  ];

  const newChatDoc = new Chats({
    clientId,
    unreadAdmin: 1,
    status: "open",
    chats: chatsArr,
    serviceId: serviceId,
    requestId: request._id,
  });

  await newChatDoc.save();
  const info = { navigate: `/admin/chats`, serviceId, clientId };
  await sendNotification("admin", null, "message", info);

  res.status(201).json({
    success: true,
    message: "Service request sent successfully!",
  });
});

exports.uploadDocument = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const { name, serviceClientLinkId } = req.body;

  if (!req.file) {
    return next(new AppError("Document is required", 400));
  }

  const path = Date.now() + "-" + req.file.originalname;

  uploadFile(req.file.buffer, path);

  const serviceClientLink = await ServiceClientLink.findById(
    serviceClientLinkId
  );

  if (!serviceClientLink) {
    return next(new AppError("No purchased service found with this id", 404));
  }

  const doc = new Document({
    clientId,
    serviceClientLinkId,
    name,
    path,
  });

  await doc.save();

  res.status(201).json({
    success: true,
    message: "Document uploaded successfully!",
  });
});

exports.getAllServices = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const categoryId = req.query.categoryId || null;
  const searchQuery = req.query.search || null;

  const requests = await ServiceReq.find({ clientId }).lean();

  let filter = {};
  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (searchQuery) {
    filter.name = { $regex: searchQuery, $options: "i" };
  }

  const services = await Service.find(filter)
    .populate({
      path: "categoryId",
      model: "Category",
    })
    .lean();

  const modifiedServices = services.map((service) => {
    let status = "available";
    const req = requests?.find(
      (reqt) => reqt.serviceId.toString() === service._id.toString()
    );

    if (req && req?.status === "pending") {
      status = "pending";
    }
    if (req && req?.status === "quotation-sent") {
      status = "quotation-sent";
    }
    if (req && req?.status === "accepted") {
      status = "accepted";
    }

    return { ...service, status: status };
  });

  res.status(200).json({
    success: true,
    services: modifiedServices,
    message: "Services sent!",
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.cookie("user", "", { expires: new Date(0) });

  res.status(200).json({
    success: true,
    message: "Logout successfully!",
  });
});

exports.getMyRequests = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const searchQuery = req.query.search || "";

  const clientId = req.client._id;

  const reqs = await ServiceReq.find({ clientId }).populate({
    path: "serviceId",
    model: "Services",
  });

  const totalReqs = await ServiceReq.find({ clientId }).countDocuments();

  res.status(200).json({
    success: true,
    requests: reqs,
    count: totalReqs,
    message: "Requests sent!",
  });
});

exports.getRequestDetails = catchAsync(async (req, res, next) => {
  const reqId = req.params.reqId;

  const request = await ServiceReq.findById(reqId).populate({
    path: "serviceId",
    model: "Services",
  });

  res.status(200).json({
    success: true,
    request: request,
    message: "Request sent!",
  });
});

exports.getAllDocuments = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const searchQuery = req.query.search;

  const pipeline = [
    { $match: { clientId } },
    { $group: { _id: "$serviceClientLinkId", documents: { $push: "$$ROOT" } } },
    {
      $lookup: {
        from: "ServiceClientLink", // Name of the referenced collection
        localField: "serviceClientLinkId", // Field in the current collection
        foreignField: "_id", // Field in the referenced collection
        as: "serviceClientLink", // Name for the joined field
      },
    },
    {
      $addFields: {
        serviceClientLink: { $arrayElemAt: ["$serviceClientLink", 0] }, // Extract the first element from the joined array
      },
    },
  ];

  if (searchQuery) {
    pipeline.unshift({
      $match: { name: { $regex: searchQuery, $options: "i" } },
    });
  }

  const groupedDocuments = await Document.aggregate(pipeline);

  const docs = await Promise.all(
    groupedDocuments.map(async (doc) => {
      const serviceClientLink = await ServiceClientLink.findById(
        doc._id
      ).populate({ path: "serviceId", model: "Services" });
      return { ...doc, serviceClientLink };
    })
  );

  res.status(200).json({
    success: true,
    documents: docs,
    message: "Total docs sent!",
  });
});

exports.getUpdateDocuments = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const serviceUpdateDocs = await ServiceUpdate.find({ clientId }).populate({
    path: "serviceClientLinkId",
    model: "ServiceClientLink",
    populate: { path: "serviceId", model: "Services" },
  });

  const documentsByServiceId = serviceUpdateDocs.reduce((acc, doc) => {
    const serviceId = doc.serviceClientLinkId.serviceId._id.toString();
    const serviceClientLinkId = doc.serviceClientLinkId._id;
    const serviceName = doc.serviceClientLinkId.serviceId.name;

    if (!acc[serviceClientLinkId]) {
      acc[serviceClientLinkId] = {
        serviceId,
        serviceClientLinkId,
        serviceName,
        docs: [],
      };
    }

    acc[serviceClientLinkId].docs.push({
      _id: doc._id,
      doc: { status: doc.status, description: doc.description, file: doc.doc },
    });

    return acc;
  }, {});

  const arrangedDocuments = Object.values(documentsByServiceId);

  res.status(200).json({
    success: true,
    documents: arrangedDocuments,
    message: "Total docs sent!",
  });
});
exports.getSignupOtp = catchAsync(async (req, res, next) => {
  const { phone } = req.query;

  await sendOtpSms(phone, clientUser._id);

  res.status(200).json({
    success: true,
    message: "Otp sent successfully",
  });
});
exports.getOTP = catchAsync(async (req, res, next) => {
  const { phone, flag } = req.query;

  if (!phone) {
    return next(new AppError("Phone is required", 400));
  }

  // flag = 'new-user' / 'reset'
  if (flag === "reset") {
    const clientUser = await Client.findOne({ phone });
    if (!clientUser) {
      return next(new AppError("No User found", 404));
    }
  }

  await sendOtpSms(phone);

  res.status(200).json({
    success: true,
    message: "Otp sent successfullys",
  });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { phone, newPassword, confirmPassword, enteredOTP } = req.body;

  await verifyOtpSms(phone, enteredOTP, res);

  if (newPassword !== confirmPassword) {
    return next(new AppError("Password and Confirm Password does not match!"));
  }

  const clientUser = await Client.findOne({ phone });

  if (!clientUser) {
    return next(new AppError("No User found", 404));
  }

  const hashedPwd = await bcrypt.hash(newPassword, 12);

  clientUser.password = hashedPwd;

  await clientUser.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully.Kindly Login...",
  });
});

// service updates
exports.getAllServicesUpdates = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;

  const updates = await ServiceUpdate.find({ clientId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    updates: updates,
    message: "Updates sent!",
  });
});

exports.getServiceUpdatesByServiceClientLinkId = catchAsync(
  async (req, res, next) => {
    const clientId = req.client._id;

    //myServices Id
    const serviceClientLinkId = req.params.serviceClientLinkId;

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10;

    const updates = await ServiceUpdate.find({ clientId, serviceClientLinkId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      updates: updates,
      message: "Updates sent!",
    });
  }
);

// chat
exports.sendMessage = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const { msg, serviceId, type } = req.body;
  let filter = { clientId, type };

  if (type === "non-internal") {
    filter.serviceId = serviceId;
  }

  const chatDoc = await Chats.findOne(filter);

  if (chatDoc) {
    const chatObj = { msg, from: "client", readAdmin: false };
    chatDoc.chats.push(chatObj);

    await chatDoc.save();

    await calculateNoOfUnreadMessages(chatDoc._id, "admin");

    const info = {
      navigate: `/admin/chats`,
      serviceId: serviceId ? serviceId : null,
      clientId,
      type,
    };
    await sendNotification("admin", null, "message", info);
  }

  res.status(200).json({
    success: true,
    message: "message sent successfully!",
  });
});

exports.getMyChats = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const type = req.query.type;
  const serviceId = req.query.serviceId;

  let dataSource;
  let filter = { clientId, type, status: "open" };

  if (type === "non-internal") {
    filter.serviceId = serviceId;
  }

  const chatsDoc = await Chats.findOne(filter);
  if (!chatsDoc) {
    return next(new AppError("No chat found exists with this id", 404));
  }

  const client = await Client.findById(clientId);

  if (chatsDoc.chats.length === 0) {
    dataSource = [];
  } else {
    const dbChats = chatsDoc.chats;
    //sort
    dbChats.sort((a, b) => {
      return a.date - b.date;
    });

    dataSource = dbChats.map((chat) => ({
      type: "text",
      title:
        chat.from === "client"
          ? `${client.name.first} ${client.name.last}`
          : "Admin",
      text: chat.msg,
      position: chat.from === "client" ? "right" : "left",
      buttonFlag: chat.buttonFlag ? chat.buttonFlag : null,
      pin: chat.pin ? chat.pin : null,
    }));
  }

  await markAllMessagesAsRead(chatsDoc._id, "client");
  let serviceDoc = null;
  if (type === "non-internal") {
    serviceDoc = await Service.findById(serviceId);
  }

  res.status(200).json({
    success: true,
    dataSource,
    service: serviceDoc ? { _id: serviceDoc._id, name: serviceDoc.name } : null,
    message: "Chats sent!",
  });
});

exports.getClosedChats = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const requestId = req.query.requestId;
  let dataSource;
  let filter = { clientId, requestId };

  const chatsDoc = await Chats.findOne(filter);
  if (!chatsDoc) {
    return next(new AppError("No chat found exists with this id", 404));
  }

  const client = await Client.findById(clientId);

  if (chatsDoc.chats.length === 0) {
    dataSource = [];
  } else {
    const dbChats = chatsDoc.chats;
    //sort
    dbChats.sort((a, b) => {
      return a.date - b.date;
    });

    dataSource = dbChats.map((chat) => ({
      type: "text",
      title:
        chat.from === "client"
          ? `${client.name.first} ${client.name.last}`
          : "Admin",
      text: chat.msg,
      position: chat.from === "client" ? "right" : "left",
      buttonFlag: chat.buttonFlag ? chat.buttonFlag : null,
      pin: chat.pin ? chat.pin : null,
    }));
  }

  res.status(200).json({
    success: true,
    dataSource,
    message: "Chats sent!",
  });
});

// exports.acceptQuotation = catchAsync(async (req, res, next) => {
//   const clientId = req.client._id;
//   const serviceId = req.body.serviceId;

//   const chatsDoc = await Chats.findOne({ clientId, serviceId, status: "open" });
//   if (!chatsDoc) {
//     return next(new AppError("No chat found exists with this id", 404));
//   }

//   chatsDoc.status = "closed";
//   await chatsDoc.save();

//   const client = await Client.findById(clientId);

//   const request = await ServiceReq.findById(chatsDoc.requestId.toString());
//   console.log("request", request);
//   request.status = "accepted";
//   await request.save();

//   const newClientServiceLink = new ServiceClientLink({
//     clientId,
//     serviceId: chatsDoc.serviceId.toString(),
//     cost: request.cost,
//     note: request.note,
//     requirement: request.requirement,
//     paymentStatus: "paid",
//     status: "pending",
//     type: client.type,
//     partnerId: client.type === "partner" ? client.partnerId : null,
//   });

//   await newClientServiceLink.save();

//   res.status(200).json({
//     success: true,
//     message: "accepted successfully!",
//   });
// });

exports.getChatsList = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  const chatsDocs = await Chats.find({ clientId, status: "open" }).populate({
    path: "serviceId",
    model: "Services",
  });

  let transformedChats = [];

  if (chatsDocs.length > 0) {
    transformedChats = chatsDocs.map((chat) => ({
      _id: chat._id,
      type: chat.type,
      unread: chat.unreadClient,
      clientId: chat.clientId,
      subtitle: chat.chats[chat.chats.length - 1].msg,
      date: chat.chats[chat.chats.length - 1].date,
      service: chat.serviceId
        ? { name: chat.serviceId.name, _id: chat.serviceId._id }
        : null,
      status: chat.status,
    }));
  }

  res.status(200).json({
    success: true,
    chats: transformedChats,
    message: "Chats sent!",
  });
});

exports.getMyServices = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  const services = await ServiceClientLink.find({ clientId }).populate({
    path: "serviceId",
    model: "Services",
  });

  res.status(200).json({
    success: true,
    services: services,
    message: "Chats sent!",
  });
});

exports.getMyServicesDetails = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const serviceClientLinkId = req.params.serviceClientLinkId;

  const myService = await ServiceClientLink.findById(
    serviceClientLinkId
  ).populate({ path: "clientId", model: "Client" });
  const docs = await Document.find({ clientId, serviceClientLinkId }).sort({
    updatedAt: -1,
    createdAt: -1,
  });
  const updates = await ServiceUpdate.find({
    clientId,
    serviceClientLinkId,
  }).sort({ updatedAt: -1, createdAt: -1 });
  const serviceInfo = await Service.findById(myService.serviceId);

  res.status(200).json({
    success: true,
    myservice: { serviceClientLinkDoc: myService, serviceInfo, updates, docs },
    message: "Details sent!",
  });
});

exports.getIsAnyActiveChat = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  let result = false;

  const chats = await Chats.find({ clientId, status: "open" }).lean();

  if (chats.length > 0) {
    result = true;
  }

  res.status(200).json({
    success: true,
    flag: result,
    message: "flag sent!",
  });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;
  const notification = await Notification.findOne({ clientId });

  res.status(200).json({
    success: true,
    notification: notification,
    message: "notification sent!",
  });
});
exports.markReadNotification = catchAsync(async (req, res, next) => {
  const index = req.body.index;
  const clientId = req.client._id;
  const notificationDoc = await Notification.findOne({ clientId });

  const result = findObjectsWithSameFields(
    notificationDoc.notifications,
    index
  );
  result.push(index);

  let newNotificationsArr = notificationDoc.notifications;

  newNotificationsArr = newNotificationsArr.filter(
    (_, index) => !result.includes(index)
  );
  notificationDoc.unread = notificationDoc.unread - result.length;

  notificationDoc.notifications = newNotificationsArr;

  await notificationDoc.save();

  res.status(200).json({
    success: true,
    message: "notification read!",
  });
});

exports.getDoc = catchAsync(async (req, res, next) => {
  const url = req.query.url;
  const preSignedUrl = generatePreSignedUrl(url);

  if (!preSignedUrl) {
    return next(new AppError("Error Viewing the document", 400));
  }

  res.status(200).json({
    success: true,
    preSignedUrl,
  });
});

exports.getCategories = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const search = req.query.search || null;

  let filter = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const categories = await Category.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const count = await Category.countDocuments(filter);

  res.status(200).json({
    success: true,
    categories,
    count,
    message: "Categories sent!",
  });
});

exports.getFoldersByServiceClientLinkId = catchAsync(async (req, res, next) => {
  const clientId = req.client._id;

  const folders = await Folder.find({ clientId });

  res.status(200).json({
    success: true,
    folders,
  });
});

exports.getSubFoldersByFolderId = catchAsync(async (req, res, next) => {
  const fId = req.params.fId;
  const flag = req.query.flag; // folder or sub-folder

  let subfolders;
  let updateDocs;
  if (flag === "sub-folder") {
    subfolders = await SubFolder.find({ subFolderId: fId });
    updateDocs = await ServiceUpdate.find({ subFolderId: fId });
  }
  if (flag === "folder") {
    subfolders = await SubFolder.find({ folderId: fId });
    updateDocs = await ServiceUpdate.find({ folderId: fId });
  }

  res.status(200).json({
    success: true,
    subfolders,
    updateDocs,
  });
});

exports.getUpdateDocsByfId = catchAsync(async (req, res, next) => {
  const subFolderId = req.params.subFId;

  const updateDocs = await ServiceUpdate.find({ subFolderId });

  res.status(200).json({
    success: true,
    updateDocs,
  });
});

exports.newPayment = catchAsync(async (req, res, next) => {
  const { transactionId, MUID, name, number, serviceId } = req.body;

  const serviceClientLinkId = req.body?.serviceClientLinkId;

  // serviceId / serviceClientLinkId = send any one.

  const clientId = req.client._id;
  const request = await ServiceReq.findOne({
    clientId,
    serviceId,
    status: "quotation-sent",
  });
  let amount;

  if (serviceClientLinkId) {
    const serviceClientDoc = await ServiceClientLink.findById(
      serviceClientLinkId
    );
    amount = serviceClientDoc.cost;
  } else {
    amount = request.cost;
  }

  // console.log("transactionId from new payment fn",transactionId);
  // console.log("clientId from new payment fn",clientId);
  // console.log("serviceId from new payment fn",serviceId);
  // console.log("serviceClientLinkId from new payment fn",serviceClientLinkId);

  const data = {
    merchantId: process.env.MERCHANT_ID,
    merchantTransactionId: transactionId,
    merchantUserId: MUID,
    // name: name,
    amount: amount * 100,
    redirectUrl: `${process.env.REDIRECT_URL}/api/v1/client/status/${transactionId}?clientId=${clientId}&serviceId=${serviceId}&serviceClientLinkId=${serviceClientLinkId || null}`,
    // callbackUrl: `${process.env.REDIRECT_URL}/api/v1/client/status/${transactionId}?clientId=${clientId}&serviceId=${serviceId}&serviceClientLinkId=${serviceClientLinkId || null}`,
    // redirectMode: "REDIRECT",
    redirectMode: "POST",
    mobileNumber: number,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  // console.log('data', data);


  const payload = JSON.stringify(data);
  const payloadMain = Buffer.from(payload).toString("base64");
  console.log('payloadMain', payloadMain)
  const keyIndex = 1;

  const string = payloadMain + "/pg/v1/pay" + process.env.SALT_KEY;

  const sha256 = crypto.createHash("sha256").update(string).digest("hex");
  const checksum = sha256 + "###" + keyIndex;

  const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

  const options = {
    method: "POST",
    url: prod_URL,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    },
    data: {
      request: payloadMain,
    },
  };

  axios
    .request(options)
    .then(function (response) {
      console.log(response.data.data.instrumentResponse);
      return res.status(200).json({ redirectUrl: response.data.data.instrumentResponse.redirectInfo.url });
      // return res.redirect(
      //   response.data.data.instrumentResponse.redirectInfo.url
      // );
    })
    .catch(function (err) {
      console.error(err);
    });
});

const acceptQuotationUtil = async (clientId, serviceId, next) => {
  try {
    const chatsDoc = await Chats.findOne({
      clientId,
      serviceId,
      status: "open",
    });

    // console.log("chatsDoc from acceptQuotationUtil fn", chatsDoc)
    if (!chatsDoc) {
      // console.log("app error from acceptQuotationUtil fn", chatsDoc)
      return next(new AppError("No chat found exists with this id", 404));
    }

    chatsDoc.status = "closed";
    await chatsDoc.save();

    const client = await Client.findById(clientId);

    const request = await ServiceReq.findById(chatsDoc.requestId.toString());
    console.log("request", request);
    request.status = "accepted";
    await request.save();

    const newClientServiceLink = new ServiceClientLink({
      clientId,
      serviceId: chatsDoc.serviceId.toString(),
      cost: request.cost,
      note: request.note,
      requirement: request.requirement,
      paymentStatus: "paid",
      status: "pending",
      type: client.type,
      partnerId: client.type === "partner" ? client.partnerId : null,
    });

    // console.log("passed from acceptQuotationUtil fn")

    await newClientServiceLink.save();
  } catch (err) {
    // console.log("fn error from acceptQuotationUtil fn", err)
    return next(new AppError("Internal Server Error", 500));
  }
};

const acceptQuotationUtil2 = async (serviceClientLinkId, next) => {
  try {

    console.log("serviceClientLinkId from acceptQuotationUtil2 fn", serviceClientLinkId)
    const serviceClientLinkDoc = await ServiceClientLink.findById(
      serviceClientLinkId
    );

    // console.log("serviceClientLinkDoc from acceptQuotationUtil2 fn", serviceClientLinkDoc)

    if (!serviceClientLinkDoc) {
      // console.log("app error from acceptQuotationUtil2 fn", serviceClientLinkDoc)
      return next(new AppError("No service purchased with this id", 404));
    }

    serviceClientLinkDoc.paymentStatus = "paid";
    // console.log("passed from acceptQuotationUtil2 fn")

    await serviceClientLinkDoc.save();
  } catch (err) {
    // console.log("fn error from acceptQuotationUtil2 fn", err)
    return next(new AppError("Internal Server Error", 500));
  }
};

exports.checkStatus = catchAsync(async (req, res, next) => {
  // console.log("inside check status");
  const merchantTransactionId = req.params.txnId;
  const merchantId = process.env.MERCHANT_ID;
  const { clientId, serviceId } = req.query;
  let serviceClientLinkId = req.query?.serviceClientLinkId || null;

  console.log("serviceClientLinkId from check staus fn",serviceClientLinkId)

  if (serviceClientLinkId === "null") {
    serviceClientLinkId = null;
  }
  const keyIndex = 1;
  const string =
    `/pg/v1/status/${merchantId}/${merchantTransactionId}` +
    process.env.SALT_KEY;
  const sha256 = crypto.createHash("sha256").update(string).digest("hex");
  const checksum = sha256 + "###" + keyIndex;
  const options = {
    method: "GET",
    url: `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
      "X-MERCHANT-ID": `${merchantId}`,
    },
  };
  axios.request(options).then(async (resp) => {
    if (resp.data.success === true) {
      console.log("check 1")
      // console.log("serviceClientLinkId from check staus fn axios req",serviceClientLinkId)
      // console.log("serviceClientLinkId type from check staus fn axios req",typeof serviceClientLinkId)
      // console.log("serviceClientLinkId is === null from check staus fn axios req",serviceClientLinkId === null)


      if (serviceClientLinkId) {
        // console.log("check 2")

        await acceptQuotationUtil2(serviceClientLinkId, next);
      } else {
        // console.log("check 3")

        await acceptQuotationUtil(clientId, serviceId, next);
      }
      // console.log("check 4")
      
      const url = `${process.env.REDIRECT_URL}/client/success`;
      return res.redirect(url);
    } else {
      // console.log("check 5")

      const url = `${process.env.REDIRECT_URL}/client/failure`;
      return res.redirect(url);
    }
  });

});


exports.paymentCallback = catchAsync(async (req, res, next) => {

  console.log('From Payment Callback body', req.body)
  console.log('inside check status function...')

  res.status(200).json({
    success: true,
    message: 'ok'
  })
});