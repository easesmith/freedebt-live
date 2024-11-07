const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  console.log(err)
  process.exit(1)

})

dotenv.config({ path: './config.env' });

const app = require('./app')

const mongoose_url = process.env.TEST_MONGO_CONNECTION;

mongoose
  .connect(mongoose_url)
  .then((result) => {
    console.log("DB connection successful!");
  })
  .catch((err) => {
    console.log("DB Connection Error", err);
  });


const port = process.env.PORT || 5000;

const server = app.listen(port, function () {
  console.log(`App is running on port http://localhost:${port}`);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log('ERROR',err)
  // console.log(err.name, err.message);
  server.close(() => {
    process.exit(1)
  })
})