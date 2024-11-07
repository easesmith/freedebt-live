const bcrypt = require("bcryptjs");
const axios = require('axios');
const crypto = require('crypto');
const catchAsync = require("./../util/catchAsync");
const AppError = require("./../util/appError");
const Client = require("../models/clientModel");
const Service = require("../models/serviceModel");
const Document = require("../models/documentModel");
const ServiceReq = require("../models/serviceReqModel");
const utilsFuns = require("../util/utilFuns");
const ServiceClientLink = require("../models/serviceClientLinkModel");
const Partner = require("../models/partnerModel");
const ServiceUpdate = require("../models/serviceUpdateModel");
const { sendNotification, findObjectsWithSameFields } = require("../util/notificationUtils");
const Notification = require("../models/notificationModel");
const Chats = require("../models/chatModel");
const { uploadFile, generatePreSignedUrl } = require("../middleware/docUpload");
const Folder = require("../models/folderModel");
const SubFolder = require("../models/subFolderModel");
const { sendOtpSms, verifyOtpSms } = require("../util/sendSMS");

exports.testDev = catchAsync(async (req, res, next) => {

  const partners = await Partner.find();

  for (const partner of partners) {
    const not = new Notification({ partnerId: partner._id, type: 'partner' })

    await not.save()

    partner.notificationId = not._id;

    await partner.save()
  }


  res.status(201).json({
    success: true,
    message: "",
  });
});


exports.addClient = catchAsync(async (req, res, next) => {
  const partnerId = req.partner._id;
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

  const password = utilsFuns.generatePassword(email, phone);
  const passwordHash = await bcrypt.hash(password, 12);

  const newClient = new Client({
    name: { first: firstName, last: lastName },
    phone,
    email,
    password: passwordHash,
    address: { state, city, pinCode, addressLine },
    type: "partner",
    partnerId,
  });

  const not = new Notification({ clientId: newClient._id, type: 'client' })

  await not.save()

  newClient.notificationId = not._id;

  await newClient.save()

  const info = { navigate: `/admin/clients/${newClient._id}` };
  await sendNotification("admin", null, "new-client", info);

  res.status(201).json({
    success: true,
    message: "Client successfully Created!",
  });
});

exports.requestService = catchAsync(async (req, res, next) => {
  const { clientId, serviceId, requirement } = req.body;

  const service = await Service.findById(serviceId);

  if (!service) {
    return next(new AppError("No Service exists with this id", 404));
  }

  const client = await Client.findById(clientId);

  if (!client) {
    return next(new AppError("No Client exists with this id", 404));
  }

  const request = new ServiceReq({
    clientId,
    serviceId,
    type: client.type,
    status: "pending",
    requirement,
  });

  await request.save();

  res.status(201).json({
    success: true,
    message: "Service request sent successfully!",
  });
});

exports.getClientUnPucharsedServices = catchAsync(async (req, res, next) => {
  const clientId = req.query.clientId;

  const requests = await ServiceReq.find({ clientId }).lean();


  const services = await Service.find()
    .populate({
      path: "categoryId",
      model: "Category",
    })
    .lean();

  const purchasedServices = await ServiceClientLink.find({ clientId });


  const modifiedServices = services.filter((service) => {
    const req = requests.find(
      (reqt) => reqt.serviceId.toString() === service._id.toString()
    );

    // const isServicePurchased = purchasedServices.find(
    //   (ser) => ser.serviceId.toString() === service._id.toString()
    // );

    // return !req && !isServicePurchased;
    return req?.status === "accepted" || !req;
  });

  res.status(200).json({
    success: true,
    services: modifiedServices,
    message: "Services sent!",
  });
});

exports.getClients = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const partnerId = req.partner._id;
  const searchQuery = req.query.searchQuery

  let filter = { partnerId: partnerId }

  if (searchQuery) {
    filter = {
      ...filter,
      $or: [
        { "name.first": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for first name
        { "name.last": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for last name
        { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for email
        { phone: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for phone
      ],
    }

  }

  const clients = await Client.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const count = await Client.countDocuments(filter);

  res.status(200).json({
    success: true,
    count,
    clients,
    message: "All clients sent!",
  });
});


exports.getClientInfo = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;

  const basicDetails = await Client.findById(clientId).populate({
    path: "partnerId",
    model: "Partner",
  });

  const reqCount = await ServiceReq.countDocuments({ clientId })

  const requests = await ServiceReq.find({ clientId })
    .populate({
      path: "serviceId",
      model: "Services",

    })

    .sort({ updatedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    .exec();

  const clientServices = await ServiceClientLink.find({ clientId })
    .populate({ path: "serviceId", model: "Services", populate: { path: "categoryId", model: "Category" } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .exec();


  res.status(200).json({
    success: true,
    clientInfo: { basicDetails, requests, reqCount, clientServices },
    message: "Requests sent!",
  });
});


exports.getRequestsByStatusClient = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const status = req.query.status;
  const clientId = req.params.clientId;

  if (!status) {
    return next(new AppError("status is required", 400));
  }

  const requests = await ServiceReq.find({ clientId, status })
    .skip((page - 1) * limit)
    .limit(limit);
  const count = await ServiceReq.countDocuments({ clientId, status });

  res.status(201).json({
    success: true,
    requests,
    count,
    message: "Requests sent!",
  });
});

exports.getAllRequests = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const partnerId = req.partner._id;
  const status = req.query.status;

  const clients = await Client.find({ partnerId });

  const clientIds = clients.map((client) => client._id);

  let filter = { clientId: { $in: clientIds } };

  if (status) {
    filter.status = status
  }

  const requests = await ServiceReq.find(filter)
    .skip((page - 1) * limit).limit(limit)
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate([
      { path: "clientId", model: "Client" },
      { path: "serviceId", model: "Services" },
    ])
    .exec();


  const count = await ServiceReq.countDocuments(filter);

  res.status(200).json({
    success: true,
    count,
    requests: requests,
    message: "Requests sent!",
  });
});

exports.getReqDetails = catchAsync(async (req, res, next) => {
  const reqId = req.params.reqId

  const request = await ServiceReq.findById(reqId).populate([
    { path: 'clientId', model: 'Client' },
    { path: 'serviceId', model: 'Services' }
  ])


  res.status(200).json({
    success: true,
    request: request,
    message: "Request sent!",
  });
});
exports.getOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.query;

  const partnerUser = await Partner.findOne({ phone });
  if (!partnerUser) {
    return next(new AppError("No User found", 404));
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
    return next(new AppError('Password and Confirm Password does not match!'))
  }

  const partnerUser = await Partner.findOne({ phone })

  if (!partnerUser) {
    return next(new AppError('No User found', 404))
  }

  const hashedPwd = await bcrypt.hash(newPassword, 12);

  partnerUser.password = hashedPwd;

  await partnerUser.save()

  res.status(200).json({
    success: true,
    message: "Password changed successfully.Kindly Login...",
  });
});



exports.uploadDocument = catchAsync(async (req, res, next) => {
  const { name, serviceClientLinkId, clientId } = req.body;

  if (!req.file) {
    return next(new AppError("Document is required", 400));
  }

  const path = Date.now() + "-" + req.file.originalname;

  uploadFile(req.file.buffer, path)

  const serviceClientLink = await ServiceClientLink.findById(serviceClientLinkId);

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


exports.getServiceUpdates = catchAsync(async (req, res, next) => {
  const serviceClientLinkId = req.params.serviceClientLinkId;

  const clientService = await ServiceClientLink.findById(serviceClientLinkId)

  if (!clientService) {
    return next(new AppError("No Client Service Exists with this id"));
  }

  const clientInfo = await Client.findById(clientService.clientId)
  const serviceInfo = await Service.findById(clientService.serviceId).populate({ path: "categoryId", model: "Category" })


  const updates = await ServiceUpdate.find({
    serviceClientLinkId: serviceClientLinkId,
  })
    .populate({ path: "clientId", model: "Client" })
    .sort({ updatedAt: -1, createdAt: -1 });

  const documents = await Document.find({ clientId: clientService.clientId, serviceClientLinkId: serviceClientLinkId })
  res.status(200).json({
    success: true,
    info: { clientInfo, serviceInfo, updates, documents },
    message: "Updates successfully Sent!",
  });
});
// exports.acceptQuotation = catchAsync(async (req, res, next) => {
//   const requestId = req.body.requestId;

//   const request = await ServiceReq.findById(requestId);

//   const client = await Client.findById(request.clientId)
//   request.status = "accepted";
//   await request.save();

//   const chatsDoc = await Chats.findOne({ clientId:request.clientId, serviceId:request.serviceId, status: "open" });

//   if(chatsDoc){
//     chatsDoc.status = "closed";
//     await chatsDoc.save();
//   }

//   const newClientServiceLink = new ServiceClientLink({
//     clientId:request.clientId,
//     serviceId: request.serviceId,
//     cost: request.cost,
//     note: request.note,
//     requirement: request.requirement,
//     status:'pending',
//     paymentStatus: "paid",
//     type: client.type,
//     partnerId:client.type==='partner'?client.partnerId:null
//   });

//   await newClientServiceLink.save();


//   res.status(200).json({
//     success: true,
//     message: "accepted successfully!",
//   });
// });

exports.getNotifications = catchAsync(async (req, res, next) => {
  const partnerId = req.partner._id;
  const notification = await Notification.findOne({ partnerId })

  res.status(200).json({
    success: true,
    notification: notification,
    message: "notification sent!",
  });
});
exports.markReadNotification = catchAsync(async (req, res, next) => {
  const index = req.body.index;
  const partnerId = req.partner._id;

  const notificationDoc = await Notification.findOne({ partnerId })

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


exports.logout = catchAsync(async (req, res, next) => {
  res.cookie("token", "", { expires: new Date(0) });
  res.cookie("user", "", { expires: new Date(0) });

  res.status(200).json({
    success: true,
    message: "Logout successfully!",
  });
});

exports.getDoc = catchAsync(async (req, res, next) => {
  const url = req.query.url
  const preSignedUrl = generatePreSignedUrl(url);

  if (!preSignedUrl) {
    return next(new AppError('Error Viewing the document', 400))
  }

  res.status(200).json({
    success: true,
    preSignedUrl,
  });
});

exports.getFoldersByServiceClientLinkId = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;

  const folders = await Folder.find({ clientId })

  res.status(200).json({
    success: true,
    folders,
  });
});

exports.getSubFoldersByFolderId = catchAsync(async (req, res, next) => {
  const fId = req.params.fId;
  const flag = req.query.flag // folder or sub-folder

  let subfolders;
  let updateDocs
  if (flag === 'sub-folder') {
    subfolders = await SubFolder.find({ subFolderId: fId });
    updateDocs = await ServiceUpdate.find({ subFolderId: fId })
  }
  if (flag === 'folder') {
    subfolders = await SubFolder.find({ folderId: fId });
    updateDocs = await ServiceUpdate.find({ folderId: fId })
  }

  res.status(200).json({
    success: true,
    subfolders,
    updateDocs
  });
});


exports.newPayment = catchAsync(async (req, res, next) => {
  const { transactionId, MUID, name, number, requestId } = req.body;

  const serviceClientLinkId = req.body?.serviceClientLinkId || null
  // serviceId / serviceClientLinkId = send any one.
  const request = await ServiceReq.findById(requestId);
  let amount;

  if (serviceClientLinkId) {
    const serviceClientDoc = await ServiceClientLink.findById(serviceClientLinkId);
    amount = serviceClientDoc.cost;
  }


  amount = request.cost;


  const data = {
    merchantId: process.env.MERCHANT_ID,
    merchantTransactionId: transactionId,
    merchantUserId: MUID,
    // name:name,
    amount: amount * 100,
    redirectUrl: `${process.env.REDIRECT_URL}/api/v1/partner/status/${transactionId}?requestId=${requestId}&serviceClientLinkId=${serviceClientLinkId}`,
    redirectMode: 'REDIRECT',
    mobileNumber: number,
    paymentInstrument: {
      type: 'PAY_PAGE'
    }

  }

  const payload = JSON.stringify(data);
  const payloadMain = Buffer.from(payload).toString('base64');
  const keyIndex = 1;

  const string = payloadMain + '/pg/v1/pay' + process.env.SALT_KEY;

  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const checksum = sha256 + '###' + keyIndex;

  const prod_URL = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';

  const options = {
    method: 'POST',
    url: prod_URL,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'X-VERIFY': checksum
    },
    data: {
      request: payloadMain
    }
  }

  axios.request(options).then(function (response) {
    console.log(response.data);
    return res.status(200).json({ redirectUrl: response.data.data.instrumentResponse.redirectInfo.url });
    // return res.redirect(response.data.data.instrumentResponse.redirectInfo.url)
  }).catch(function (err) {
    console.error(err)
  })

});


const acceptQuotationUtil = async (requestId, next) => {
  try {
    const request = await ServiceReq.findById(requestId);

    const client = await Client.findById(request.clientId)
    request.status = "accepted";
    await request.save();

    const chatsDoc = await Chats.findOne({ clientId: request.clientId, serviceId: request.serviceId, status: "open" });

    if (chatsDoc) {
      chatsDoc.status = "closed";
      await chatsDoc.save();
    }

    const newClientServiceLink = new ServiceClientLink({
      clientId: request.clientId,
      serviceId: request.serviceId,
      cost: request.cost,
      note: request.note,
      requirement: request.requirement,
      status: 'pending',
      paymentStatus: "paid",
      type: client.type,
      partnerId: client.type === 'partner' ? client.partnerId : null
    });

    await newClientServiceLink.save();
  } catch (err) {
    return next(new AppError('Internal Server Error', 500))
  }
};


const acceptQuotationUtil2 = async (serviceClientLinkId, next) => {
  try {
    const serviceClientLinkDoc = await ServiceClientLink.findById(serviceClientLinkId);

    if (!serviceClientLinkDoc) {
      return next(new AppError('No service purchased with this id', 404))
    };

    serviceClientLinkDoc.paymentStatus = 'paid';
    await serviceClientLinkDoc.save();

  } catch (err) {
    return next(new AppError('Internal Server Error', 500))
  }

};


exports.checkStatus = catchAsync(async (req, res, next) => {

  const merchantTransactionId = req.params.txnId;
  const merchantId = process.env.MERCHANT_ID;
  const { requestId } = req.query;

  let serviceClientLinkId = req.query?.serviceClientLinkId || null;

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
      if (serviceClientLinkId) {
        await acceptQuotationUtil2(serviceClientLinkId, next)
      } else {
        await acceptQuotationUtil(requestId, next);
      }

      const url = `${process.env.REDIRECT_URL}/partner/success`;
      return res.redirect(url);
    } else {
      const url = `${process.env.REDIRECT_URL}/partner/failure`;
      return res.redirect(url);
    }
  })


});