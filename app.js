const express = require("express");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require('path')
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const AppError = require("./util/appError");
const globalErrorHandler = require("./controllers/errorController");
const adminRouter = require("./routes/adminRoutes");
const clientRouter = require("./routes/clientRoutes");
const partnerRouter = require("./routes/partnerRoutes");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again later.",
});

const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "build")));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: process.env.FRONT_END_URL, // Specify the allowed origin
    credentials: true, // Allow including credentials in cross-origin requests
  })
);


app.use('/documents', express.static(path.join(__dirname, 'documents')))
app.use("/images", express.static(path.join(__dirname, "images")));

// Test middleware
app.use((req, res, next) => {
  // console.log('test middleware');
  req.requestTime = new Date().toISOString();
  next();
});

// Apply the rate limiter to all requests
// app.use(limiter);





app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/client", clientRouter);
app.use("/api/v1/partner", partnerRouter);


app.get("*", (req, res) => {
  return res.sendFile(path.resolve(__dirname, "build", "index.html"));
});

// app.all("*", (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

app.use(globalErrorHandler);

module.exports = app;

// const firebaseConfig = {
//   apiKey: "AIzaSyC94tebEbFu14QOUXbVMdaZjXWwbxCV7hg",
//   authDomain: "corporate-rasta.firebaseapp.com",
//   projectId: "corporate-rasta",
//   storageBucket: "corporate-rasta.appspot.com",
//   messagingSenderId: "92247147190",
//   appId: "1:92247147190:web:3887cf0a60e067efbd9c17"
// };
