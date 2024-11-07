const express = require("express");
const authController = require("../controllers/authController");
const clientController = require("../controllers/clientController");
const validate = require("../middleware/validate");
const { upload } = require("../middleware/docUpload");

const router = express.Router();

router.post("/signup", validate.validateFields, authController.clientSignup);
router.post("/login", validate.validateFields, authController.clientLogin);

router.get("/logout", clientController.logout);

// *
router.get("/get-otp",clientController.getOTP);
router.post("/reset-password",clientController.resetPassword);
router.post('/status/:txnId',clientController.checkStatus);
// router.post('/payment-callback/:txnId',clientController.checkStatus);


//test
router.post("/abc", clientController.testDev);

// autheniation
router.use(authController.authenicateClient);

router.get("/get-profile", clientController.getClientProfile);

router.post(
  "/upate-profile",
  validate.validateFields,
  clientController.updateClientProfile
);

router.post(
  "/request-service",
  validate.validateFields,
  clientController.requestService
);

router.post(
  "/upload-document",
  validate.validateFields,
  upload.single("document"),
  clientController.uploadDocument
);

router.get("/get-categories", clientController.getCategories);

router.get("/all-services", clientController.getAllServices);

router.get("/get-my-requests", clientController.getMyRequests);

router.get("/get-request-details/:reqId", clientController.getRequestDetails);

router.get("/get-my-documents", clientController.getAllDocuments);

router.get("/get-update-documents", clientController.getUpdateDocuments);

router.get("/get-my-services", clientController.getMyServices);

router.get(
  "/get-my-services-details/:serviceClientLinkId",
  clientController.getMyServicesDetails
);

router.get("/get-closed-chats", clientController.getClosedChats);

// service update route
router.get("/get-all-service-updates", clientController.getAllServicesUpdates);
router.get(
  "/get-service-updates/:serviceClientLinkId",
  clientController.getServiceUpdatesByServiceClientLinkId
);

// chat routes

router.post(
  "/send-message",
  // validate.validateFields,
  clientController.sendMessage
);

// chatlist or service list
router.get("/get-chats-list", clientController.getChatsList);

router.get("/get-my-chats", clientController.getMyChats);

// router.post("/accept-quotation", clientController.acceptQuotation);

// notifications routes
router.get("/get-notifications", clientController.getNotifications);
router.post(
  "/mark-as-read-notification",
  clientController.markReadNotification
);

router.get("/get-doc", clientController.getDoc);

router.get("/get-folders", clientController.getFoldersByServiceClientLinkId);
router.get(
  "/get-subfolders-and-docs/:fId",
  clientController.getSubFoldersByFolderId
);

router.post("/accept-payment", clientController.newPayment);

module.exports = router;
