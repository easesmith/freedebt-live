const multer = require("multer");
const AWS = require("aws-sdk");

exports.upload = multer();

const credentials = {
  accessKey:process.env.ACCESS_KEY_AWS ,
  secret: process.env.SECRET_KEY_AWS,
  bucketName: "corporete-client-documents",
  region: "ap-south-1",
};

AWS.config.update({
  accessKeyId: credentials.accessKey,
  secretAccessKey: credentials.secret,
  region: credentials.region,
});

const s3 = new AWS.S3();

exports.uploadFile = (fileContent, fileName) => {
  // const fileContent = fileContent;
  // const fileName = Date.now() + "-" + req.file.originalname;

  const params = {
    Bucket: credentials.bucketName,
    Key: fileName,
    Body: fileContent,
  };

  s3.upload(params, function (err, data) {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  });
};

exports.generatePreSignedUrl = (key) => {
  const params = {
    Bucket: credentials.bucketName,
    Key: key,
    Expires: 600,
  };

  const preSignedUrl = s3.getSignedUrl("getObject", params);

  console.log("preSignedUrl", preSignedUrl);

  return preSignedUrl;
};
