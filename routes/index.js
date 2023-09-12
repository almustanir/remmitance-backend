const express = require("express");
const router = express.Router();
const UserRoutes = require("./usersRoute");
const TransactionRoutes = require("./transactionModel");
const requestsRoutes = require("./requestsRoute");

router.use("/api/users", UserRoutes);
router.use("/api/transactions", TransactionRoutes);
router.use("/api/requests", requestsRoutes);
router.use("/api/get-all-users", UserRoutes);
router.use("/api/update-user-verified-status", UserRoutes);

module.exports = router;
