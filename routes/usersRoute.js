const router = require("express").Router();
const User = require("../models/usersModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddlewares = require("../middlewares/authMiddlewares");

const COUNTRIES = require("../data/countries.json");

//register user account

router.post("/register", async (req, res) => {
  try {
    //check if user already exists
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.send({
        success: false,
        message: "User already exists",
      });
    }

    //harsh password
    const salt = await bcrypt.genSalt(10);
    const harshedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = harshedPassword;
    const newUser = new User(req.body);
    await newUser.save();
    res.send({
      message: "User created successfully",
      data: newUser,
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

//login user account
router.post("/login", async (req, res) => {
  console.log(req.body);
  try {
    //check if user exists
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.send({
        success: false,
        message: "user does not exist",
      });
    }

    //check if password is correct
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.send({
        success: false,
        message: "password is incorrect",
      });
    }

    if (!user.isVerified) {
      return res.send({
        success: false,
        message: "user not verified",
      });
    }

    //generate token
    const token = jwt.sign({ userid: user._id }, process.env.jwt_secret, {
      expiresIn: "1d",
    });
    res.send({
      message: "user logged in successfully",
      data: token,
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

//Get User Information
router.post("/get-user-info", authMiddlewares, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    // user.password = "";
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      identificationType: user.identificationType,
      identificationNumber: user.identificationNumber,
      address: user.address,
      balance: user.balance,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      country: user.country,
    };
    res.send({
      message: "User info fetched successfully",
      data: userData,
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

// update user verified status

router.post(
  "/update-user-verified-status",
  authMiddlewares,
  async (req, res) => {
    try {
      const user = await User.findById(req.body.selectedUser);

      console.log(user);

      await User.findOneAndUpdate(
        { _id: req.body.selectedUser },
        {
          isVerified: req.body.isVerified,
        }
      );

      res.send({
        data: null,
        message: "User verified status updated successfully",
        success: true,
      });
    } catch (error) {
      res.send({
        data: error,
        message: error.message,
        success: false,
      });
    }
  }
);

//Get All Users
router.get("/get-all-users", authMiddlewares, async (req, res) => {
  try {
    const users = await User.find();
    res.send({
      message: "User info fetched successfully",
      data: users,
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

router.post("/update-user-country", async (req, res) => {
  //validate country
  if (!COUNTRIES.find((c) => c.countryCode === req.body.country)) {
    res.send({
      message: "not found",
    });
  }

  try {
    await User.updateOne({ _id: req.body.id }, { country: req.body.country });

    const updatedUser = await User.findById(req.body.id);

    res.send({
      message: "User updated successfully",
      data: updatedUser,
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});
module.exports = router;
