const axios = require("axios");
const router = require("express").Router();
const Request = require("../models/requestModel");
const authMiddlewares = require("../middlewares/authMiddlewares");
const User = require("../models/usersModel");
const Transaction = require("../models/transactionModel");

const countryToCurrencyMapping = require("../data/currencies.json");
const TRANSACTION_FEE = 0.35;

// get all requests for a user

router.post("/get-all-requests-by-user", authMiddlewares, async (req, res) => {
  try {
    const requests = await Request.find({
      $or: [{ sender: req.body.userId }, { receiver: req.body.userId }],
    })
      .populate("sender")
      .populate("receiver")
      .sort({ createdAt: -1 });


    for (let request of requests) {
      const senderCurrency = countryToCurrencyMapping[request.sender.country];
      const receiverCurrency = countryToCurrencyMapping[request.receiver.country];

      // Fetch exchange rate using the API
      const { data: exchangeData } = await axios.get(
        `https://v6.exchangerate-api.com/v6/${process.env.exchange_rate_key}/pair/${senderCurrency}/${receiverCurrency}`
      );
      console.log(exchangeData);
      const exchangeRate = exchangeData.conversion_rate;
      const convertedAmount = parseFloat((request.amount * exchangeRate).toFixed(2));
      request.convertedAmount = convertedAmount;
      request.currency = exchangeData.target_code;

    }


    res.send({
      data: requests,
      message: "Requests fetched successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// send a request to another user

router.post("/send-request", authMiddlewares, async (req, res) => {
  try {
    const { receiver, amount, description } = req.body;

    const request = new Request({
      sender: req.body.userId,
      receiver,
      amount,
      description,
    });

    await request.save();

    res.send({
      data: request,
      message: "Request sent successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// update a request status

router.post("/update-request-status", authMiddlewares, async (req, res) => {
  try {
    if (req.body.status === "accepted") {
      const { sender, receiver, amount } = req.body;

      const senderUser = await User.findById(sender._id);
      const receiverUser = await User.findById(receiver._id);

      const senderCurrency = countryToCurrencyMapping[senderUser.country];
      const receiverCurrency = countryToCurrencyMapping[receiverUser.country];

      if (senderCurrency === null) {
        return res.send({
          status: 500,
          message: "Currency not supported",
          success: false,
        });
      }

      if (receiverCurrency === null) {
        return res.send({
          status: 500,
          message: "Currency not supported",
          success: false,
        });
      }

      // Fetch exchange rate using the API
      const { data: exchangeData } = await axios.get(
        `https://v6.exchangerate-api.com/v6/${process.env.exchange_rate_key}/pair/${senderCurrency}/${receiverCurrency}`
      );

      let exchangeRate;
      if (exchangeData.success !== "success") {
        exchangeRate = exchangeData.conversion_rate;
      } else {
        return res.send({
          status: 500,
          message: "Exchange rate not available at the moment",
          success: false,
        });
      }

      // Convert amount from sender's currency to receiver's currency
      const convertedAmount = parseFloat((amount * exchangeRate).toFixed(2));

      // Create and save the transaction
      const newTransaction = new Transaction({
        sender: sender._id,
        receiver: receiver._id,
        amount: convertedAmount,
        type: "request",
        reference: req.body.description,
        status: "success",
        exchangeRate,
        senderCurrency,
        receiverCurrency,
      });

      await newTransaction.save();

      // Deduct the amount from the sender
      await User.findByIdAndUpdate(sender._id, {
        $inc: { balance: amount },
      });

      // Add the amount to the receiver
      await User.findByIdAndUpdate(receiver._id, {
        $inc: { balance: -convertedAmount - TRANSACTION_FEE },
      });
    }

    await Request.findByIdAndUpdate(req.body._id, {
      status: req.body.status,
    });

    res.send({
      data: null,
      message: "Request status updated successfully",
      success: true,
    });
  } catch (error) {
    res.send({
      data: error,
      message: error.message,
      success: false,
    });
  }
});

module.exports = router;
