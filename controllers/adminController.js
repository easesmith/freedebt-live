const catchAsync = require("../util/catchAsync");
const AppError = require("../util/appError");
const bcrypt = require("bcryptjs");
const utilsFuns = require("../util/utilFuns");

const Category = require("../models/categoryModel");
const Service = require("../models/serviceModel");
const ServiceReq = require("../models/serviceReqModel");
const ServiceClientLink = require("../models/serviceClientLinkModel");
const Client = require("../models/clientModel");
const Partner = require("../models/partnerModel");
const Chats = require("../models/chatModel");
const ServiceUpdate = require("../models/serviceUpdateModel");
const Admin = require("../models/adminModel");
const Documents = require("../models/documentModel");
const {
  sendNotification,
  findObjectsWithSameFields,
} = require("../util/notificationUtils");
const Notification = require("../models/notificationModel");
const { uploadFile, generatePreSignedUrl } = require("../middleware/docUpload");
const { uploadImgToS3 } = require("../middleware/imgUpload");
const Folder = require("../models/folderModel");
const SubFolder = require("../models/subFolderModel");
const { sendSMSAfterAdminSendMsg } = require("../util/sendSMS");

exports.testDev = catchAsync(async (req, res, next) => {
  const admins = await Admin.find();

  for (const admin of admins) {
    const not = new Notification({ type: "admin" });

    await not.save();

    admin.notificationId = not._id;

    await admin.save();
  }

  res.status(201).json({
    success: true,
    message: "",
  });
});

exports.addCategory = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;

  if (!req.file) {
    return next(new AppError("Icon is required", 400));
  }

  const path = Date.now() + "-" + req.file.originalname;

  uploadImgToS3(req.file.buffer, path);

  const newCategory = new Category({
    name,
    icon: path,
    description,
  });

  await newCategory.save();

  res.status(201).json({
    success: true,
    message: "Category Added successfully!",
  });
});

exports.editCategory = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { name, description } = req.body;
  
  const category = await Category.findById(id);

  let path = category.icon;

  if(req.file){
     path = Date.now() + "-" + req.file.originalname;
    uploadImgToS3(req.file.buffer, path);
  }

  const updatedCategory = await Category.findByIdAndUpdate(id,{name,description,icon:path});

  if(!updatedCategory){
    return next(new AppError("No category exists with this id",404));
  }

  res.status(200).json({
    success: true,
    message: "Category Updated successfully!",
  });
});

exports.addService = catchAsync(async (req, res, next) => {
  const { name, description, categoryId } = req.body;

  if (!req.file) {
    return next(new AppError("Icon is required", 400));
  }

  const path = Date.now() + "-" + req.file.originalname;

  uploadImgToS3(req.file.buffer, path);

  const category = await Category.findById(categoryId);

  if (!category) {
    return next(new AppError("No category exists with this id", 404));
  }

  const newService = new Service({
    name,
    icon: path,
    categoryId,
    description,
  });

  await newService.save();

  res.status(201).json({
    success: true,
    message: "Service Added successfully!",
  });
});

exports.updateService = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const { name, description,categoryId } = req.body;
  
  const service = await Service.findById(id);

  let path = service.icon;

  if(req.file){
     path = Date.now() + "-" + req.file.originalname;
    uploadImgToS3(req.file.buffer, path);
  }

  const updatedService = await Service.findByIdAndUpdate(id,{name,description,icon:path,categoryId});

  if(!updatedService){
    return next(new AppError("No service exists with this id",404));
  }

  res.status(200).json({
    success: true,
    message: "Service Updated successfully!",
  });
});

exports.getServices = catchAsync(async (req, res, next) => {
  const { categoryId } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const flag = req.query.flag;
  let services;
  let totalServices;
  services = await Service.find()
    .populate({
      path: "categoryId",
      model: "Category",
    })
    .skip((page - 1) * limit)
    .limit(limit);
  totalServices = await Service.countDocuments();
  if (categoryId) {
    if (flag === "no-paginate") {
      services = await Service.find({ categoryId });
    } else {
      services = await Service.find({ categoryId })
        .populate({ path: "categoryId", model: "Category" })
        .skip((page - 1) * limit)
        .limit(limit);
      totalServices = await Service.countDocuments({ categoryId });
    }
  }
  res.status(200).json({
    success: true,
    services,
    count: totalServices,
    message: "Services sent!",
  });
});

exports.getCategories = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const flag = req.query.flag;
  if (flag === "no-paginate") {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      categories,
      message: "Categories sent!",
    });
  } else {
    const categories = await Category.find()
      .skip((page - 1) * limit)
      .limit(limit);
    const count = await Category.countDocuments();
    res.status(200).json({
      success: true,
      categories,
      count,
      message: "Categories sent!",
    });
  }
});

exports.getAllRequests = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;

  const reqs = await ServiceReq.find()
    .skip((page - 1) * limit)
    .limit(limit);
  const count = await ServiceReq.countDocuments();

  res.status(200).json({
    success: true,
    requests: reqs,
    count,
    message: "Requests sent!",
  });
});

exports.getRequestsByStatus = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const status = req.query.status || "all";
  const type = req.query.type || "self";

  let filter = {};
  if (status !== "all") {
    filter.status = status;
  }
  filter.type = type;

  const requests = await ServiceReq.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('clientId')
    .populate('serviceId');
  const count = await ServiceReq.countDocuments(filter);

  res.status(200).json({
    success: true,
    requests,
    count,
    message: "Requests sent!",
  });
});

exports.getRecentRequests = catchAsync(async (req, res, next) => {
  const requests = await ServiceReq.find()
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate('clientId')
    .populate('serviceId')
    .exec();

  res.status(201).json({
    success: true,
    requests,
    message: "Recent requests retrieved successfully!",
  });
});

exports.getServiceDetails = catchAsync(async (req, res, next) => {
  const serviceId = req.params.serviceId;
  const service = await Service.findById(serviceId).populate({
    path: "categoryId",
    model: "Category",
  });

  if (!service) {
    return next(new AppError("No service exists with this id", 404));
  }

  res.status(200).json({
    success: true,
    service,
    message: "Service retrieved successfully!",
  });
});
exports.getRequestDetails = catchAsync(async (req, res, next) => {
  const reqId = req.params.reqId;
  const request = await ServiceReq.findById(reqId).populate([
    {
      path: "serviceId",
      model: "Services",
    },
    {
      path: "clientId",
      model: "Client",
    },
  ]);

  if (!request) {
    return next(new AppError("No request exists with this id", 404));
  }

  res.status(200).json({
    success: true,
    request,
    message: "Service retrieved successfully!",
  });
});
exports.getClientReqByStatus = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;
  const status = req.query.status;

  let filter = {
    clientId,
  };

  if (status) {
    filter.status = status;
  }

  const requests = await ServiceReq.find(filter).populate({
    path: "serviceId",
    model: "Services",
  });

  res.status(200).json({
    success: true,
    requests,
    message: "Requests sent successfully!",
  });
});

exports.getClientsServices = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;

  const services = await ServiceClientLink.find({ clientId }).populate({
    path: "serviceId",
    model: "Services",
  });

  res.status(200).json({
    success: true,
    services,
    message: "Requests sent successfully!",
  });
});

exports.getClients = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const flag = req.query.flag;
  const type = req.query.type;
  const searchQuery = req.query.searchQuery;

  if (flag === "no-paginate") {
    const clientsTemp = await Client.find().lean();

    const clients = clientsTemp.map((client) => {
      const fullName = `${client.name.first} ${client.name.last}`;

      return { ...client, fullName };
    });

    res.status(200).json({
      success: true,
      clients,
      message: "All clients sent!",
    });
  } else {
    let filter = {};
    if (type) {
      filter.type = type;
    }

    if (searchQuery) {
      filter = {
        ...filter,
        $or: [
          { "name.first": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for first name
          { "name.last": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for last name
          { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for email
          { phone: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for phone
        ],
      };
    }
    const clients = await Client.find(filter)
      .skip((page - 1) * limit)
      .limit(limit);
    const count = await Client.countDocuments(filter);

    res.status(200).json({
      success: true,
      clients,
      count,
      message: "All clients sent!",
    });
  }
});

exports.searchClients = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  const clients = await Client.find({
    $or: [
      { "name.first": { $regex: query, $options: "i" } }, // Case-insensitive search for first name
      { "name.last": { $regex: query, $options: "i" } }, // Case-insensitive search for last name
      { email: { $regex: query, $options: "i" } }, // Case-insensitive search for email
      { phone: { $regex: query, $options: "i" } }, // Case-insensitive search for phone
    ],
  });

  res.status(200).json({
    success: true,
    clients,
    message: "clients sent!",
  });
});

// exports.searchPartners = catchAsync(async (req, res, next) => {
//   const { query } = req.query;

//   const partners = await Partner.find({
//     $or: [
//       { "name.first": { $regex: query, $options: "i" } }, // Case-insensitive search for first name
//       { "name.last": { $regex: query, $options: "i" } }, // Case-insensitive search for last name
//       { email: { $regex: query, $options: "i" } }, // Case-insensitive search for email
//       { phone: { $regex: query, $options: "i" } }, // Case-insensitive search for phone
//     ],
//   });

//   res.status(200).json({
//     success: true,
//     partners,
//     message: "partners sent!",
//   });
// });

// exports.getClientsByType = catchAsync(async (req, res, next) => {
//   const type = req.query.type;

//   const clients = await Client.find({ type });

//   res.status(200).json({
//     success: true,
//     clients,
//     message: "clients sent!",
//   });
// });

exports.getPartners = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const searchQuery = req.query.searchQuery;

  let filter = {};

  if (searchQuery) {
    filter = {
      ...filter,
      $or: [
        { "name.first": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for first name
        { "name.last": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for last name
        { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for email
        { phone: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search for phone
      ],
    };
  }

  const partners = await Partner.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const count = await Partner.countDocuments(filter);

  res.status(200).json({
    success: true,
    partners,
    count,
    message: "Requests sent!",
  });
});

exports.getPartnerInfo = catchAsync(async (req, res, next) => {
  const partnerId = req.params.partnerId;

  const basicDetails = await Partner.findById(partnerId);

  const clients = await Client.find({ partnerId });
  // Extract clientIds from clients array
  const clientIds = clients.map((client) => client._id);

  // Find requests whose clientId is present in the clientIds array
  const requests = await ServiceReq.find({
    clientId: { $in: clientIds },
  }).populate({ path: "clientId", model: "Client" });

  res.status(200).json({
    success: true,
    partner: { basicDetails, clients, requests },
    message: "Requests sent!",
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

  const reqCount = await ServiceReq.countDocuments({ clientId });

  const requests = await ServiceReq.find({ clientId })
    .populate({
      path: "serviceId",
      model: "Services",
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  const clientServices = await ServiceClientLink.find({ clientId })
    .populate({
      path: "serviceId",
      model: "Services",
      populate: { path: "categoryId", model: "Category" },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .exec();

  res.status(200).json({
    success: true,
    clientInfo: { basicDetails, requests, reqCount, clientServices },
    message: "Requests sent!",
  });
});

exports.addPartner = catchAsync(async (req, res, next) => {
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

  const not = new Notification({ partnerId: newPartner._id, type: "partner" });

  await not.save();

  newPartner.notificationId = not._id;

  await newPartner.save();

  res.status(201).json({
    success: true,
    message: "Partner successfully Created!",
  });
});
exports.deletePartner = catchAsync(async (req, res, next) => {
  const partnerId = req.params.partnerId;
  const option = req.query.option || "block";

  const partner = await Partner.findById(partnerId);

  if (option === "block") {
    partner.status = false;
    await partner.save();
  } else {
    await Partner.findByIdAndDelete(partnerId);
  }

  res.status(200).json({
    success: true,
    message: "Partner successfully Updated!",
  });
});

exports.addClient = catchAsync(async (req, res, next) => {
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
    type: "admin",
  });

  const not = new Notification({ clientId: newClient._id, type: "client" });

  await not.save();

  newClient.notificationId = not._id;

  await newClient.save();

  res.status(201).json({
    success: true,
    message: "Client successfully Created!",
  });
});

exports.deleteClient = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;
  const option = req.query.option || "block";

  const client = await Client.findById(clientId);

  if (option === "block") {
    client.status = false;
    await client.save();
  } else {
    await Client.findByIdAndDelete(clientId);
  }

  res.status(200).json({
    success: true,
    message: "Client successfully Updated!",
  });
});

exports.purchaseServiceForClient = catchAsync(async (req, res, next) => {
  const { clientId, serviceId, cost, note, requirement, paymentStatus } =
    req.body;

  const service = await Service.findById(serviceId);

  if (!service) {
    return next(new AppError("No Service exists with this id", 404));
  }

  const client = await Client.findById(clientId);

  const newClientServiceLink = new ServiceClientLink({
    clientId,
    serviceId: serviceId,
    cost: cost,
    note: note,
    requirement: requirement,
    paymentStatus: paymentStatus,
    status: "pending",
    type: client.type,
    partnerId: client.type === "partner" ? client.partnerId : null,
  });

  await newClientServiceLink.save();

  res.status(201).json({
    success: true,
    message: "Service added successfully!",
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

exports.getPurchasedServicesDocs = catchAsync(async (req, res, next) => {
  const purchasedServices = await ServiceClientLink.find()
    .sort({ createdAt: -1 }) // Sort by latest createdAt
    .populate([
      { path: "clientId", model: "Client" },
      {
        path: "serviceId",
        model: "Services",
        populate: { path: "categoryId", model: "Category" },
      },
      { path: "partnerId", model: "Partner" }
    ]);

  res.status(200).json({
    success: true,
    services: purchasedServices,
    message: "Services sent!",
  });
});


exports.filterPurchasedServicesDocs = catchAsync(async (req, res, next) => {
  const { assignmentStatus } = req.query;
  if(!assignmentStatus){
    return next(new AppError('please provide status',400))
  }
  // Build the filter based on assignmentStatus
  const filter = {};
  if (assignmentStatus) {
    filter.serviceStatus = assignmentStatus; // Filters by "assigned", "unassigned", or "completed"
  }

  const purchasedServices = await ServiceClientLink.find(filter).populate([
    { path: "clientId", model: "Client" },
    {
      path: "serviceId",
      model: "Services",
      populate: { path: "categoryId", model: "Category" },
    },
    { path: "partnerId", model: "Partner" },
  ]);

  res.status(200).json({
    success: true,
    services: purchasedServices,
    message: "Services sent!",
  });
});

// Get Partner
exports.getPartnerList=catchAsync(async(req,res,next)=>{
  
   const foundPartnersList= await Partner.find();
   if(!foundPartnersList){
    return next(new AppError('no partner found',200))
   }
   return res.status(200).json({
    status:true,
    message:'list found',
    foundPartnersList
   })

})

// service updates

exports.addUpdateService = catchAsync(async (req, res, next) => {
  const { serviceClientLinkId, description, folderType, fId } = req.body;

  // fId = folderId or sub-folder Id
  // folderType = sub-folder or folder

  if (!req.file) {
    return next(new AppError("Document is required", 400));
  }

  const path = Date.now() + "-" + req.file.originalname;

  uploadFile(req.file.buffer, path);

  const serviceClientLinkDoc = await ServiceClientLink.findById(
    serviceClientLinkId
  );

  if (!serviceClientLinkDoc) {
    return next(new AppError("The client have not purchased the service!"));
  }

  let update = {
    clientId: serviceClientLinkDoc.clientId,
    serviceClientLinkId: serviceClientLinkDoc._id,
    description,
    doc: path,
  };

  if (folderType === "folder") {
    const folder = await Folder.findById(fId);
    if (!folder) {
      return next(new AppError("No folder exists with this id", 400));
    }
    update.folderId = fId;
  }
  if (folderType === "sub-folder") {
    const subFolder = await SubFolder.findById(fId);
    if (!subFolder) {
      return next(new AppError("No sub folder exists with this id", 400));
    }

    update.subFolderId = fId;
  }

  const newUpdate = new ServiceUpdate(update);

  await newUpdate.save();

  const info = { navigate: `/client/my-services/${serviceClientLinkDoc._id}` };
  await sendNotification(
    "client",
    serviceClientLinkDoc.clientId,
    "update",
    info
  );

  const info2 = {
    navigate: `/partner/clients/${serviceClientLinkDoc.clientId}/service/${serviceClientLinkDoc._id}`,
  };
  await sendNotification(
    "partner",
    serviceClientLinkDoc.clientId,
    "update",
    info2
  );

  res.status(201).json({
    success: true,
    message: "Update successfully Created!",
  });
});

exports.updateServiceAsCompleted = catchAsync(async (req, res, next) => {
  const { clientId, serviceId } = req.body;

  const serviceClientLinkDoc = await ServiceClientLink.findOne({
    clientId,
    serviceId,
  });

  if (!serviceClientLinkDoc) {
    return next(new AppError("The client have not purchased the service!"));
  }
  serviceClientLinkDoc.status = "completed";
  await serviceClientLinkDoc.save();

  res.status(201).json({
    success: true,
    message: "Status successfully Updated!",
  });
});

exports.updateServiceUpdate = catchAsync(async (req, res, next) => {
  const { clientId, serviceClientLinkId, description, serviceUpdateDocId } =
    req.body;

  let path = null;

  if (req.file) {
    path = Date.now() + "-" + req.file.originalname;

    uploadFile(req.file.buffer, path);
  }

  const serviceClientLinkDoc = await ServiceClientLink.findById(
    serviceClientLinkId
  );

  if (!serviceClientLinkDoc) {
    return next(new AppError("The client have not purchased the service!"));
  }

  const updates = { clientId, serviceClientLinkId, description };
  if (path) {
    updates.doc = path;
  }

  const updatedDocument = await ServiceUpdate.findByIdAndUpdate(
    serviceUpdateDocId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedDocument) {
    return next(new AppError("Document not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Updated successfully!",
  });
});

exports.deleteServiceUpdate = catchAsync(async (req, res, next) => {
  const serviceUpdateDocId = req.params.serviceUpdateDocId;

  const deletedDocument = await ServiceUpdate.findByIdAndDelete(
    serviceUpdateDocId
  );

  if (!deletedDocument) {
    return next(new AppError("Document not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Deleted successfully!",
  });
});

exports.getAllServiceUpdates = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;

  const updates = await ServiceUpdate.find()
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate([
      {
        path: "clientId",
        model: "Client",
      },
      {
        path: "serviceClientLinkId",
        model: "ServiceClientLink",
        populate: { path: "serviceId", model: "Services" },
      },
    ]);

  const modifiedUpdates = updates.map((update) => ({
    _id: update._id,
    client: { name: update.clientId.name, _id: update.clientId._id },
    service: {
      name: update.serviceClientLinkId.serviceId.name,
      serviceId: update.serviceClientLinkId.serviceId._id,
      serviceClientLinkId: update.serviceClientLinkId._id,
    },
    status: update.status,
    description: update.description,
    doc: update.doc,
    createdAt: update.createdAt,
  }));

  res.status(201).json({
    success: true,
    updates: modifiedUpdates,
    message: "Updates successfully Sent!",
  });
});
exports.getServiceUpdatesByClientId = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;

  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;

  const updates = await ServiceUpdate.find({ clientId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: "clientId",
      model: "Client",
    });

  res.status(201).json({
    success: true,
    updates,
    message: "Updates successfully Sent!",
  });
});

exports.getClientServiceDetails = catchAsync(async (req, res, next) => {
  const serviceClientLinkId = req.params.serviceClientLinkId;

  const clientService = await ServiceClientLink.findById(serviceClientLinkId);

  if (!clientService) {
    return next(new AppError("No Client Service Exists with this id"));
  }

  const clientInfo = await Client.findById(clientService.clientId);
  const serviceInfo = await Service.findById(clientService.serviceId).populate({
    path: "categoryId",
    model: "Category",
  });

  const updates = await ServiceUpdate.find({
    serviceClientLinkId: serviceClientLinkId,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate([
      {
        path: "clientId",
        model: "Client",
      },
      {
        path: "serviceClientLinkId",
        model: "ServiceClientLink",
        populate: { path: "serviceId", model: "Services" },
      },
    ]);
  const modifiedUpdates = updates.map((update) => ({
    _id: update._id,
    client: { name: update.clientId.name, _id: update.clientId._id },
    service: {
      name: update.serviceClientLinkId.serviceId.name,
      _id: update.serviceClientLinkId.serviceId._id,
    },
    status: update.status,
    description: update.description,
    doc: update.doc,
    createdAt: update.createdAt,
  }));

  const documents = await Documents.find({
    clientId: clientService.clientId,
    serviceClientLinkId,
  });
  res.status(200).json({
    success: true,
    info: {
      clientService,
      clientInfo,
      serviceInfo,
      updates: modifiedUpdates,
      documents,
    },
    message: "Updates successfully Sent!",
  });
});

exports.getClosedChats = catchAsync(async (req, res, next) => {
  const clientId = req.query.clientId;
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

exports.payLater = catchAsync(async (req, res, next) => {
  const requestId = req.body.requestId;

  const request = await ServiceReq.findById(requestId);

  const client = await Client.findById(request.clientId);

  request.status = "accepted";
  await request.save();

  const chatsDoc = await Chats.findOne({
    clientId: request.clientId,
    serviceId: request.serviceId,
    status: "open",
  });

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
    paymentStatus: "due",
    status:'pending',
    type: client.type,
    partnerId: client.type === "partner" ? client.partnerId : null,
  });

  await newClientServiceLink.save();

  res.status(200).json({
    success: true,
    message: "Updated successfully!",
  });
});

// chats
exports.getOpenChats = catchAsync(async (req, res, next) => {
  const chatsDocs = await Chats.find({ status: "open" }).populate({
    path: "clientId",
    model: "Client",
  });

  const dataSource = chatsDocs.map((doc) => {
    // client
    const clientName = `${doc.clientId.name.first} ${doc.clientId.name.last}`;

    const unread = doc.unreadAdmin;
    const type = doc.type;

    if (doc.chats.length > 0) {
      // latest msgObj from chats array
      const latestMsgObj = doc.chats[doc.chats.length - 1];
      return {
        avatar: "https://avatars.githubusercontent.com/u/80540635?v=4",
        alt: doc.clientId.name.first,
        title: clientName,
        type,
        clientId: doc.clientId._id,
        subtitle: latestMsgObj.msg,
        date: latestMsgObj.date,
        serviceId: doc.serviceId ? doc.serviceId : null,
        unread,
      };
    }
  });

  res.status(200).json({
    success: true,
    dataSource,
    message: "Chat list  sent!",
  });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { msg, clientId, serviceId, type } = req.body;

  let chatDoc;
  if (type === "internal") {
    chatDoc = await Chats.findOne({
      clientId,
      type: "internal",
      status: "open",
    });
  } else {
    chatDoc = await Chats.findOne({
      clientId,
      type: "non-internal",
      serviceId,
      status: "open",
    });
  }

  const chatObj = { msg, from: "admin", readClient: false };
  chatDoc.chats.push(chatObj);
  await chatDoc.save();
  await utilsFuns.calculateNoOfUnreadMessages(chatDoc._id, "client");

  const info = {
    navigate: `/client/chats`,
    serviceId: type === "internal" ? null : serviceId,
    type,
  };
  await sendNotification("client", clientId, "message", info);

  await sendSMSAfterAdminSendMsg(clientId)

  res.status(200).json({
    success: true,
    message: "message sent successfully!",
  });
});

exports.getChatsByClientId = catchAsync(async (req, res, next) => {
  const clientId = req.params.id;
  const serviceId = req.query.serviceId;
  const type = req.query.type; // internal or non-internal;

  let dataSource;

  let chatsDoc;
  if (type === "internal") {
    chatsDoc = await Chats.findOne({
      clientId,
      type: "internal",
      status: "open",
    });
  } else {
    chatsDoc = await Chats.findOne({
      clientId,
      type: "non-internal",
      serviceId,
      status: "open",
    });
  }

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
      position: chat.from === "admin" ? "right" : "left",
      buttonFlag: chat.buttonFlag ? chat.buttonFlag : null,
      pin: chat.pin ? chat.pin : null,
    }));
  }

  await utilsFuns.markAllMessagesAsRead(chatsDoc._id, "admin");

  let service = null;

  if (type === "non-internal") {
    const serviceDoc = await Service.findById(chatsDoc.serviceId.toString());
    service = { _id: serviceDoc._id, name: serviceDoc.name };
  }

  res.status(200).json({
    success: true,
    dataSource,
    service: service,
    message: "Chats sent!",
  });
});

exports.quotePrice = catchAsync(async (req, res, next) => {
  const { price, note, clientId, serviceId, type } = req.body;
  // const adminId = req.admin._id;

  if (type === "partner" || type === "admin") {
    const request = await ServiceReq.findOne({
      clientId,
      serviceId,
      status: "pending",
    });

    request.cost = price * 1;
    request.note = note;
    request.status = "quotation-sent";

    await request.save();
  } else {
    const chatDoc = await Chats.findOne({
      clientId,
      serviceId,
      status: "open",
    });
    if (!chatDoc) {
      return next(new AppError("No chat exists with this id", 404));
    }

    const request = await ServiceReq.findById(chatDoc.requestId.toString());

    if (!request) {
      return next(new AppError("No request exists with this id", 404));
    }

    request.cost = price * 1;
    request.note = note;
    request.status = "quotation-sent";

    await request.save();

    const chatObj = {
      msg: `Please pay ₹${price*1} to start service`,
      buttonFlag: "accept-btn",
      from: "admin",
      readClient: false,
    };
    chatDoc.chats.push(chatObj);
    await chatDoc.save();
    await utilsFuns.calculateNoOfUnreadMessages(chatDoc._id, "client");
  }

  const info = { navigate: `/client/chats`, serviceId };
  await sendNotification("client", clientId, "message-quotation", info);


  await sendSMSAfterAdminSendMsg(clientId)

  res.status(200).json({
    success: true,
    message: "message sent successfully!",
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

// sub-admins routes
exports.addSubAdmin = catchAsync(async (req, res, next) => {
  const { name, phone, email, password, permissions } = req.body;

  const passwordHash = await bcrypt.hash(password, 12);

  const newAdmin = new Admin({
    name,
    phone,
    email,
    password: passwordHash,
    permissions,
  });

  await newAdmin.save();

  res.status(201).json({
    success: true,
    message: "Admin successfully Created! Kindly Login...",
  });
});

exports.getAllSubAdmins = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;

  const admins = await Admin.find()
    .sort({ createdAt: -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalDocs = await Admin.countDocuments();

  res.status(200).json({
    success: true,
    admins,
    totalDocs,
    message: "All Admins",
  });
});

exports.updateSubAdmin = catchAsync(async (req, res, next) => {
  const { name, phone, email, permissions, adminId } = req.body;

  const subAdmin = await Admin.findById(adminId);
  subAdmin.name = name;
  subAdmin.phone = phone;
  subAdmin.email = email;
  subAdmin.permissions = permissions;

  await subAdmin.save();

  res.status(200).json({
    success: true,
    message: "Admin Updated successfully",
  });
});

exports.deleteSubAdmin = catchAsync(async (req, res, next) => {
  const adminId = req.params.adminId;

  await Admin.findByIdAndDelete(adminId);

  res.status(200).json({
    success: true,
    message: "Deleted successfully",
  });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({ type: "admin" }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    notification: notification,
    message: "notification sent!",
  });
});
exports.markReadNotification = catchAsync(async (req, res, next) => {
  const index = req.body.index;
  const notificationDoc = await Notification.findOne({ type: "admin" });

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

exports.startInternalConversation = catchAsync(async (req, res, next) => {
  const { message, clientIds } = req.body;

  for (const clientId of clientIds) {
    const existingChatsDoc = await Chats.findOne({
      clientId,
      type: "internal",
    });

    if (!existingChatsDoc) {
      const chats = [{ msg: message, readClient: false, from: "admin" }];
      const chatsDoc = new Chats({
        clientId,
        type: "internal",
        unreadClient: 1,
        chats,
      });

      await chatsDoc.save();
    } else {
      const newMessage = { msg: message, readClient: false, from: "admin" };

      existingChatsDoc.chats.push(newMessage);
      await existingChatsDoc.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "messages sent!",
  });
});

exports.sendBulkSmsToClients = catchAsync(async (req, res, next) => {
  const { message, clientIds } = req.body;

  res.status(200).json({
    success: true,
    message: "messages sent!",
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

exports.addFolder = catchAsync(async (req, res, next) => {
  const { name, clientId } = req.body;

  const newFolder = await Folder.create({
    name,
    clientId,
  });

  if (!newFolder) {
    return next(new AppError("Error Creating folder", 400));
  }

  res.status(200).json({
    success: true,
    newFolder,
  });
});

exports.addSubfolder = catchAsync(async (req, res, next) => {
  const { name, fId, type } = req.body;
  // type = folder or sub-folder
  // fId = subFolderId or folderId

  let folder;
  let newSubF = { name };

  if (type === "folder") {
    folder = await Folder.findById(fId);
    newSubF.folderId = fId;
  }
  if (type === "sub-folder") {
    folder = await SubFolder.findById(fId);
    newSubF.subFolderId = fId;
  }

  if (!folder) {
    return next(new AppError("No folder exists with this id", 400));
  }
  newSubF.clientId = folder.clientId;

  const newSubFolder = await SubFolder.create(newSubF);

  if (!newSubFolder) {
    return next(new AppError("Error creating sub folder", 400));
  }

  res.status(200).json({
    success: true,
    newSubFolder,
  });
});

exports.getFoldersByServiceClientLinkId = catchAsync(async (req, res, next) => {
  const clientId = req.params.clientId;

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

exports.getClientData = catchAsync(async (req, res, next) => {
  const { paymentStatus } = req.query; // paymentStatus = due or paid
  const { serviceStatus } = req.query; // serviceStatus = pending or completed
  const { serviceId } = req.query;
  let startDate = req?.query?.startDate || null;
  let endDate = req?.query?.endDate || null;
  let servicePurchaseStartDate = req?.query?.serviceStartDate || null;
  let servicePurchaseEndDate = req?.query?.serviceEndDate || null;
  let filter = {};
  let clientIds = [];
  if (paymentStatus) {
    const serviceClientLinkDocs = await ServiceClientLink.find({
      paymentStatus,
    });
    clientIds = serviceClientLinkDocs.map((doc) => doc.clientId.toString());
  }
  console.log("clientIds after paymentStatus", clientIds);
  if (startDate && endDate) {
    console.log("startdate", startDate);
    console.log("endDate", endDate);
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }
  if (servicePurchaseStartDate && servicePurchaseEndDate) {
    servicePurchaseStartDate = new Date(servicePurchaseStartDate);
    servicePurchaseEndDate = new Date(servicePurchaseEndDate);
    const serviceClientLinkDocs = await ServiceClientLink.find({
      createdAt: {
        $gte: servicePurchaseStartDate,
        $lt: servicePurchaseEndDate,
      },
    });
    const newClientIds = serviceClientLinkDocs.map((doc) =>
      doc.clientId.toString()
    );
    if (clientIds.length > 0) {
      clientIds = clientIds.filter((element) => newClientIds.includes(element));
    } else {
      clientIds = newClientIds;
    }
  }
  if (serviceStatus) {
    const serviceClientLinkDocs = await ServiceClientLink.find({
      status: serviceStatus,
    });
    const newClientIds = serviceClientLinkDocs.map((doc) =>
      doc.clientId.toString()
    );
    if (clientIds.length > 0) {
      clientIds = clientIds.filter((element) => newClientIds.includes(element));
    } else {
      clientIds = newClientIds;
    }
  }
  if (serviceId) {
    const serviceClientLinkDocs = await ServiceClientLink.find({ serviceId });
    const newClientIds = serviceClientLinkDocs.map((doc) =>
      doc.clientId.toString()
    );
    console.log("newClientIds", newClientIds);
    if (clientIds.length > 0) {
      clientIds = clientIds.filter((element) => newClientIds.includes(element));
    } else {
      clientIds = newClientIds;
    }
  }
  console.log("clientIds after serviceId", clientIds);
  if (clientIds.length > 0) {
    filter = { ...filter, _id: { $in: clientIds } };
  }
  console.log("filter", filter);
  const clients = await Client.find(filter);
  res.status(200).json({
    success: true,
    clients,
  });
});

exports.getPartnersData = catchAsync(async (req, res, next) => {
  let startDate = req?.query?.startDate || null;
  let endDate = req?.query?.endDate || null;

  let filter = {};

  if (startDate && endDate) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    console.log(startDate, endDate);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }
  const partners = await Partner.find(filter);

  res.status(200).json({
    success: true,
    partners,
  });
});

exports.getServiceClientLinkData = catchAsync(async (req, res, next) => {
  let startDate = req?.query?.startDate || null;
  let endDate = req?.query?.endDate || null;

  const { paymentStatus } = req.query; // paymentStatus = due or paid
  const { serviceStatus } = req.query; // serviceStatus = pending or completed
  const { serviceId } = req.query;

  let filter = {};

  if (startDate && endDate) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    filter.createdAt = { $gte: startDate, $lt: endDate };
  }

  if (serviceId) {
    filter.serviceId = serviceId;
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }

  if (serviceStatus) {
    filter.status = serviceStatus;
  }

  const serviceClientLinkDocs = await ServiceClientLink.find(filter).populate([
    { path: "clientId", model: "Client" },
    { path: "serviceId", model: "Services" },
  ]);

  res.status(200).json({
    success: true,
    serviceClientLinkDocs,
  });
});

exports.assignServicesToPartner = catchAsync(async (req, res, next) => {
  const { partnerId, serviceClientLinkId } = req.body;

  // Find and update the document by serviceClientLinkId
  const assignedPartner = await ServiceClientLink.findByIdAndUpdate(
    serviceClientLinkId,
    { 
      partnerId,
      serviceStatus: "assigned"
    },
    { new: true }
  );

  // Check if the document was found and updated
  if (!assignedPartner) {
    return next(new AppError('No service-client link found with this ID', 404));
  }

  // Return a detailed response including the updated document
  res.status(200).json({
    status: true,
    message: "Partner assigned successfully",
    data: assignedPartner
  });
});

exports.getServiceReqByPartner=catchAsync(async(req,res,next)=>{
  const {partnerId}=req.query

  if(!partnerId){
    return next(new AppError('no partner found',400))
  }
  const foundServices=await ServiceReq.find(partnerId)
  if(!foundServices){
    return next(new AppError("no services found",400))
  }
  return res.status(200).json({
    status:true,
    message:"found services",
    foundServices
  })
})
// exports.getUpdateDocsByfId = catchAsync(async (req, res, next) => {
//   const subFolderId = req.params.subFId;

//   const updateDocs = await ServiceUpdate.find({subFolderId})

//   res.status(200).json({
//     success: true,
//     updateDocs,
//   });
// });
