const express = require("express");
const authController = require("../controllers/authController");
const partnerController = require("../controllers/partnerController");
const validate = require("../middleware/validate");
const {upload} = require("../middleware/docUpload")

const router = express.Router();

router.post("/signup",validate.validateFields ,authController.partnerSignup);
router.post("/login",validate.validateFields, authController.partnerLogin);
router.get("/logout", partnerController.logout);

// *
router.get("/get-otp",partnerController.getOTP);
router.post("/reset-password",partnerController.resetPassword);
router.get('/status/:txnId',partnerController.checkStatus);


//test
router.post("/abc", partnerController.testDev);

// autheniation 
router.use(authController.authenicatePartner);

router.post("/add-client", validate.validateFields, partnerController.addClient);

router.post("/request-service", validate.validateFields, partnerController.requestService);
router.get("/get-client-unpucharesed-services",partnerController.getClientUnPucharsedServices)

// new routes - 21-02-24
router.get("/get-clients", partnerController.getClients);
router.get("/get-client-details/:clientId", partnerController.getClientInfo);

  router.get("/get-client-requests-by-status/:clientId", partnerController.getRequestsByStatusClient);
  router.get("/get-all-requests", partnerController.getAllRequests);

  router.get("/get-request-details/:reqId", partnerController.getReqDetails);

  router.post(
    "/upload-document",
    upload.single('document'),
    partnerController.uploadDocument
  );


  router.get("/purchased-service-details/:serviceClientLinkId", partnerController.getServiceUpdates);

  // router.post("/accept-quotation", partnerController.acceptQuotation);

  
// notifications routes
router.get("/get-notifications",partnerController.getNotifications)
router.post("/mark-as-read-notification",partnerController.markReadNotification)

router.get("/get-doc",partnerController.getDoc)

// *
router.get('/get-folders/:clientId',partnerController.getFoldersByServiceClientLinkId);
router.get('/get-subfolders-and-docs/:fId',partnerController.getSubFoldersByFolderId);


router.post('/accept-payment',partnerController.newPayment);



module.exports = router;
