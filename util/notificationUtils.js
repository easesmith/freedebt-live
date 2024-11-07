const Admin = require("../models/adminModel");
const Client = require("../models/clientModel");
const Notification = require("../models/notificationModel");
const Partner = require("../models/partnerModel");
const _ = require("lodash");

exports.sendNotification = async function (userType, userId, msgType, info) {
  let user = {};
  if (userType === "client") {
    user = await Client.findById(userId);
  }

  // if(userType==='admin'){
  //     user = await Admin.findOne({role:'super-admin'})
  // }

  if (userType === "partner") {
    const client = await Client.findById(userId);

    if (client.partnerId) {
      user = await Partner.findById(client.partnerId);
    } else {
      return;
    }
  }

  let notificationDoc;
  if (userType === "admin") {
    notificationDoc = await Notification.findOne({type:'admin'});
  } else {
    notificationDoc = await Notification.findById(user.notificationId);
  }

  let message = "";

  if (msgType === "message") {
    message = "A new message";
  }
  if (msgType === "message-quotation") {
    message = "Accept Quotation";
  }
  if (msgType === "update") {
    message = "A new update";
  }
  if (msgType === "new-client") {
    message = "A new client joined";
  }

  const newNot = {
    message,
    read: false,
    date: new Date(),
    type: msgType,
    info,
  };

  notificationDoc.notifications.push(newNot);
  notificationDoc.unread++;
  await notificationDoc.save();
};

exports.findObjectsWithSameFields = function (arr1, index) {
  const arr = arr1.map((obj) => ({
    info: obj.info,
    message: obj.message,
    read: obj.read,
    type: obj.type,
  }));

  const matchingIndices = [];
  const objToMatch = arr[index];

  for (let i = 0; i < arr.length; i++) {
    if (i !== index) {
      // Skip comparing with itself
      const obj = arr[i];

      // Check if the properties of obj match the properties of objToMatch
      if (_.isEqual(obj, objToMatch)) {
        matchingIndices.push(i);
      }
    }
  }

  return matchingIndices;
};
