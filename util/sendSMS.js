const axios = require("axios");
const Client = require("../models/clientModel");
const ClientOtpLink = require("../models/clientOtpLinkModel");

exports.sendSMSAfterAdminSendMsg = async (clientId) => {
  try {
    const clientDoc = await Client.findById(clientId);
    await axios.get(
      `https://manage.txly.in/vb/apikey.php?apikey=rqn4QrMoja5bae29&senderid=corprc&templateid=1707171317194013273&number=${
        clientDoc.phone * 1
      }&message= Hi, just wanted to let you know that we have an update on the service you inquired about. Please check on https://clients.corporateraastaconsulting.com . Thanks! Corporate raasta consulting LLP`
    );
  } catch (err) {
    console.log(err);
  }
};

exports.sendOtpSms = async (phone) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    await axios.get(
      `https://manage.txly.in/vb/apikey.php?apikey=rqn4QrMoja5bae29&senderid=corprc&templateid=1707171264587322686&number=${phone}&message= ${otp} is your OTP For Login in Corporate Raasta Consulting, OTP is only valid for 10 mins do not share it with anyone.`
    );

    const expirationTimeframe = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = new Date(); // Current time
    const otpExpiresAt = new Date(currentTime.getTime() + expirationTimeframe);
    const existingOtpDoc = await ClientOtpLink.findOne({
      phone,
    });

    if (existingOtpDoc) {
      existingOtpDoc.otp = otp;
      existingOtpDoc.otpExpiresAt = otpExpiresAt;

      await existingOtpDoc.save();
    } else {
      await ClientOtpLink.findOneAndDelete({ phone });
      const otpDoc = new ClientOtpLink({
        phone,
        otp: otp,
        otpExpiresAt: otpExpiresAt,
      });

      await otpDoc.save();
    }
  } catch (err) {
    console.log(err);
  }
};

exports.verifyOtpSms = async (phone, enteredOTP,res) => {
  const otpDoc = await ClientOtpLink.findOne({ phone }).lean();

  if (enteredOTP * 1 !== otpDoc.otp) {
    return res
      .status(400)
      .json({ success: false, message: "OTP does not match" });
  }

  const currentTime = new Date().getTime(); // Current time
  if (currentTime > otpDoc.otpExpiresAt.getTime()) {
    return res
      .status(400)
      .json({ success: false, message: "OTP has expired!" });
  }
  otpDoc.otp = null;
};
