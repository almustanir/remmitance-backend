const axios = require("axios");
const router = require("express").Router();
const Transaction = require("../models/transactionModel");
const authMiddlewares = require("../middlewares/authMiddlewares");
const User = require("../models/usersModel");

const stripe = require("stripe")(process.env.stripe_key);
const { v4 } = require("uuid");
const Mail = require("../services/email");
const MailTemplate = require("../services/emailTemplate");


const countryToCurrencyMapping = require("../data/currencies.json");

// transer money from one account to another

const MINIMUM_AMOUNT = 3; // $5 regardless of currency
const TRANSACTION_FEE = 0.35;

router.post("/transfer-funds", authMiddlewares, async (req, res) => {
  try {
    const { amount, sender, receiver } = req.body;

    const senderUser = await User.findById(req.body.userId);
    const receiverUser = await User.findById(receiver);

    const senderCurrency = countryToCurrencyMapping[senderUser.country];
    const receiverCurrency = countryToCurrencyMapping[receiverUser.country];

    // Fetch exchange rate using the API
    const { data: exchangeData } = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.exchange_rate_key}/pair/${senderCurrency}/${receiverCurrency}`
    );
    const exchangeRate = exchangeData.conversion_rate;

    // Convert amount from sender's currency to receiver's currency
    const convertedAmount = parseFloat((amount * exchangeRate).toFixed(2));

    if (convertedAmount < MINIMUM_AMOUNT * exchangeRate) {
      return res.send({
        message: "Transaction failed, amount after fee is below minimum",
        success: false,
      });
    }

    // Save the transaction
    const newTransaction = new Transaction({
      sender,
      receiver,
      amount: convertedAmount,
      type: "transfer",
      reference: "convert & send",
      status: "success",
      exchangeRate,
      senderCurrency,
      receiverCurrency,
    });

    await newTransaction.save();

    // Decrease the sender's balance
    await User.findByIdAndUpdate(sender, {
      $inc: { balance: -amount },
    });

    // Increase the receiver's balance
    await User.findByIdAndUpdate(receiver, {
      $inc: { balance: convertedAmount - TRANSACTION_FEE },
    });

    const receiverTemplate = MailTemplate.receiverMailTemplate(senderUser.email, receiverUser.email, amount)
    const senderTemplate = MailTemplate.receiverMailTemplate(senderUser.email, receiverUser.email, amount)

    Mail("Transaction", receiverTemplate, receiverUser.email)
    Mail("Transaction", senderTemplate, senderUser.email)

    return res.send({
      message: "Transaction successful",
      data: newTransaction,
      success: true,
    });
  } catch (error) {
    return res.send({
      message: "Transaction failed",
      data: error.message,
      success: false,
    });
  }
});

// verify receiver's account number

router.post("/verify-account", authMiddlewares, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.receiver });
    if (user) {
      return res.send({
        message: "Account verified",
        data: user,
        success: true,
      });
    } else {
      return res.send({
        message: "Account not found",
        data: null,
        success: false,
      });
    }
  } catch (error) {
    return res.send({
      message: "Account not found",
      data: error.message,
      success: false,
    });
  }
});

// get all transactions for a user

router.post(
  "/get-all-transactions-by-user",
  authMiddlewares,
  async (req, res) => {
    try {
      const transactions = await Transaction.find({
        $or: [{ sender: req.body.userId }, { receiver: req.body.userId }],
      })
        .sort({ createdAt: -1 })
        .populate("sender")
        .populate("receiver");
      return res.send({
        message: "Transactions fetched",
        data: transactions,
        success: true,
      });
    } catch (error) {
      res.send({
        message: "Transactions not fetched",
        data: error.message,
        success: false,
      });
    }
  }
);

// deposit funds using stripe

router.post("/deposit-funds", authMiddlewares, async (req, res) => {
  try {
    const { token, amount } = req.body;
    // create a customer
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    // create a charge
    const charge = await stripe.charges.create(
      {
        amount: amount,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: `Deposited to Mubswallet`,
      },
      {
        idempotencyKey: v4(),
      }
    );
      console.log("charge",charge)
    // save the transaction
    if (charge.status === "succeeded") {
      const newTransaction = new Transaction({
        sender: req.body.userId,
        receiver: req.body.userId,
        amount: amount,
        type: "deposit",
        reference: "stripe deposit",
        status: "success",
      });
      await newTransaction.save();

      // increase the user's balance
      await User.findByIdAndUpdate(req.body.userId, {
        $inc: { balance: amount },
      });
      return res.send({
        message: "Transaction successful",
        data: newTransaction,
        success: true,
      });
    } else {
      return res.send({
        message: "Transaction failed ,not Success",
        data: charge,
        success: false,
      });
    }
  } catch (error) {
    console.log("Transaction failed", error);
    return res.send({
      message: "Transaction failed",
      data: error.message,
      success: false,
    });
  }
});

module.exports = router;
