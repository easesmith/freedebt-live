const express = require("express");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const validate = require("../middleware/validate");
// const imgUpload = require("../middleware/imgUpload");
const {upload} = require("../middleware/docUpload");
const {uploadImg} = require("../middleware/imgUpload");

const router = express.Router();

router.post("/login", validate.validateFields, authController.adminLogin);

//test
router.post("/abc", adminController.testDev);
router.get("/logout", adminController.logout);


// autheniation
router.use(authController.authenicateAdmin);

// sub-admin routes
router.post(
  "/add-subadmin",
  authController.authorize("subAdmins", "write"),
  adminController.addSubAdmin
);

router.patch(
  "/update-subadmin",
  authController.authorize("subAdmins", "write"),
  adminController.updateSubAdmin
);

router.delete(
  "/delete-subadmin/:adminId",
  authController.authorize("subAdmins", "write"),
  adminController.deleteSubAdmin
);

router.get(
  "/all-subadmins",
  authController.authorize("subAdmins", "read"),
  adminController.getAllSubAdmins
);

// category routes
router.post(
  "/add-category",
  validate.validateFields,
  authController.authorize("categories", "write"),
  uploadImg.single("icon"),
  adminController.addCategory
);

router.patch(
  "/edit-category/:id",
  validate.validateFields,
  authController.authorize("categories", "write"),
  uploadImg.single("icon"),
  adminController.editCategory
);

router.get(
  "/get-categories",
  authController.authorize("categories", "read"),
  adminController.getCategories
);

// service routes
router.post(
  "/add-service",
  validate.validateFields,
  authController.authorize("categories", "write"),
  uploadImg.single("icon"),
  adminController.addService
);

router.post(
  "/update-service/:id",
  validate.validateFields,
  authController.authorize("categories", "write"),
  uploadImg.single("icon"),
  adminController.updateService
);

router.get(
  "/get-services",
  authController.authorize("categories", "read"),
  adminController.getServices
);

router.get("/get-clients", adminController.getClients);
router.get(
  "/get-partners",
  authController.authorize("partners", "read"),
  adminController.getPartners
);
router.post(
  "/add-partner",
  authController.authorize("partners", "write"),
  adminController.addPartner
);

router.delete(
  "/partner/:partnerId",
  authController.authorize("partners", "write"),
  adminController.deletePartner
);

router.post(
  "/add-client",
  // authController.authorize("c", "write"),
  adminController.addClient
);


router.delete(
  "/client/:clientId",
  authController.authorize("clients", "write"),
  adminController.deleteClient
);

router.post("/purchase-service-for-client",adminController.purchaseServiceForClient);
router.get("/get-client-unpucharesed-services",adminController.getClientUnPucharsedServices);


router.get("/get-purchased-services-docs",adminController.getPurchasedServicesDocs);

router.get("/get-partner-details/:partnerId", adminController.getPartnerInfo);
router.get("/get-client-details/:clientId", adminController.getClientInfo);


router.get(
  "/get-all-requests",
  authController.authorize("serviceRequests", "read"),
  adminController.getAllRequests
);
router.get(
  "/get-requests",
  authController.authorize("serviceRequests", "read"),
  adminController.getRequestsByStatus
);
router.get(
  "/get-recent-requests",
  authController.authorize("dashboard", "read"),
  adminController.getRecentRequests
);

router.get(
  "/get-service-details/:serviceId",
  adminController.getServiceDetails
);


// routes - 24-02
router.get("/get-request-details/:reqId", adminController.getRequestDetails);
router.get(
  "/get-client-req-by-status/:clientId",
  adminController.getClientReqByStatus
);

router.get(
  "/get-client-services/:clientId",
  adminController.getClientsServices
);

//service update routes

// *
router.post(
  "/add-update-to-service",
  authController.authorize("serviceUpdates", "write"),
  upload.single('document'),
  adminController.addUpdateService
);


router.post("/update-service-as-completed",authController.authorize("serviceUpdates","write"),adminController.updateServiceAsCompleted)

router.patch(
  "/update-service-update",
  authController.authorize("serviceUpdates", "write"),
  upload.single('document'),
  adminController.updateServiceUpdate
);

router.delete(
  "/delete-service-update/:serviceUpdateDocId",
  authController.authorize("serviceUpdates", "write"),
  adminController.deleteServiceUpdate
);

// folder and sub-folder routes
// *
router.post("/add-folder",adminController.addFolder)
router.post("/add-subfolder",adminController.addSubfolder);

router.get('/get-folders/:clientId',adminController.getFoldersByServiceClientLinkId);
router.get('/get-subfolders-and-docs/:fId',adminController.getSubFoldersByFolderId);
// router.get('/get-update-docs/:subFId',adminController.getUpdateDocsByfId);


router.get(
  "/get-all-service-updates",
  authController.authorize("serviceUpdates", "read"),
  adminController.getAllServiceUpdates
);
router.get(
  "/get-client-service-updates/:clientId",
  adminController.getServiceUpdatesByClientId
);

// 26-02
router.get(
  "/get-client-service-update-details/:serviceClientLinkId",
  adminController.getClientServiceDetails
);

router.post('/pay-later',adminController.payLater)

router.get("/get-closed-chats",adminController.getClosedChats)

// chats
router.get(
  "/get-open-chats",
  authController.authorize("chats", "read"),
  adminController.getOpenChats
);
router.post(
  "/send-message",
  authController.authorize("chats", "write"),
  validate.validateFields,
  adminController.sendMessage
);
router.get(
  "/get-chats/:id",
  authController.authorize("chats", "read"),
  adminController.getChatsByClientId
); // passing clientId

router.post(
  "/quote-price-message",
  validate.validateFields,
  authController.authorize("chats", "write"),
  adminController.quotePrice
);

// bulk operations
router.post(
  "/start-internal-conversation",
  authController.authorize("clients", "write"),
  adminController.startInternalConversation
);

router.post(
  "/send-bulk-sms",
  authController.authorize("clients", "write"),
  adminController.sendBulkSmsToClients
);



// notifications routes
router.get("/get-notifications",adminController.getNotifications)
router.post("/mark-as-read-notification",adminController.markReadNotification)

router.get("/get-doc",adminController.getDoc)

// *
router.get('/get-clients-data',adminController.getClientData)
router.get('/get-partners-data',adminController.getPartnersData)
router.get('/get-service-client-link-data',adminController.getServiceClientLinkData)

module.exports = router;
