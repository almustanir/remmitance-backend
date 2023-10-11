const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();
const helmet = require("helmet");
require("dotenv").config();

const dbConfig = require("./config/dbConfig");
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(cors());
app.use(express.json({ limit: 10000 }));
app.use('/assets', express.static(path.join(__dirname, '..', 'frontend', 'src', 'assets')));
app.use("/", require("./routes"));
const PORT = process.env.PORT || 4000;

try {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
} catch (error) {
  console.error("Error starting the server:", error);
}
