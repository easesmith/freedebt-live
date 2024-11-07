const Chats = require("../models/chatModel");

exports.generatePassword = function (email, phone) {
  const atIndex = email.indexOf("@");
  // console.log('phone Number',phoneNumber)
  const digitsOnly = phone.replace(/\D/g, "");
  let password = "";

  if (atIndex !== -1) {
    // return email.substring(0,atIndex)
    password += email.substring(0, atIndex);
    password += digitsOnly.substring(digitsOnly.length - 5);

    return password;
  } else {
    return null;
  }
};

exports.calculateNoOfUnreadMessages = async function (chatsDocId, userType) {
  // client  admin
  const chatsDoc = await Chats.findById(chatsDocId);
  let noOfUnreadMessages =
    userType === "client" ? chatsDoc.unreadClient : chatsDoc.unreadAdmin;

  const chats = chatsDoc.chats;

  if (userType === "client") {
    if (chats.length > 0) {
      noOfUnreadMessages = chats.filter((msgObj) => msgObj.readClient === false);
    }

    chatsDoc.unreadClient = noOfUnreadMessages.length;
  }else{
    if (chats.length > 0) {
      noOfUnreadMessages = chats.filter((msgObj) => msgObj.readAdmin === false);
    }

    chatsDoc.unreadAdmin = noOfUnreadMessages.length;
  }

  await chatsDoc.save();
};

exports.markAllMessagesAsRead = async function (chatsDocId,userType) {

  // if 'admin' unreadAdmin = 0
  // else unreadClient = 0
  const chatsDoc = await Chats.findById(chatsDocId);
  const newUnread = 0;

  if(userType==='admin'){

    chatsDoc.unreadAdmin = newUnread;

    chatsDoc.chats.forEach((msgObj) => {
      if (!msgObj.readAdmin) {
        msgObj.readAdmin = true;
      }
    });
  }else{

    chatsDoc.unreadClient = newUnread;

    chatsDoc.chats.forEach((msgObj) => {
      if (!msgObj.readClient) {
        msgObj.readClient = true;
      }
    });
  }



  await chatsDoc.save();
};
