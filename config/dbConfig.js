const mongoose = require("mongoose");

mongoose.connect(process.env.mongo_uri);

const connectionResult = mongoose.connection;

connectionResult.on("error", () => {
  console.log("Error connecting to the database");
});

connectionResult.on("connected", () => {
  console.log("Connected to the database");
});
