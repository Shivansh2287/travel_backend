const router = require("express").Router();
const User = require("../model/User");
const createError = require("http-errors");
const twilio = require("twilio");
const crypto = require("crypto");
const passport = require("passport");
const Joi = require("@hapi/joi");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const mongoose = require("mongoose");
const Users = mongoose.model("User");
const {
  signAccessToken,

  signRefreshToken,
  verifyRefreshToken,
} = require("../webTokens/jwt");

//MAIL

//TWILIO SERViCE CONFIG
const serviceID = "VA21a2f45955181c2fd60f00e94ddc29e6";
const accountSID = "AC48ae75b176deb06a18ea521bd1002067";
const authToken = "bd073c3816ddb96f3bec384143bc2445";
//SETUP CLIENT
const client = require("twilio")(accountSID, authToken);

//phone number registration for otp
//ENDPOINT TO LOGIN, USES SMS CHANNEL AS STATIC, SENDS OTP to NUMBER
//EXAMPLE: /generate?phonenumber=918707463246
router.get("/generate", (req, res) => {
  client.verify
    .services(serviceID)
    .verifications.create({
      to: `+${req.query.phonenumber}`,
      channel: "sms",
    })
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

//verify
//ENDPOINT TO  VERIFY OTP
//EXAMPLE: /verify?phonenumber=8707463246&code=09201
router.get("/verify", (req, res) => {
  client.verify
    .services(serviceID)
    .verificationChecks.create({
      to: `+${req.query.phonenumber}`,
      code: req.query.code,
    })
    .then((data) => {
      res.status(200).send(data);
    })
    .catch((err) => {
      res.status(400).send("WRONG CODE", err);
    });
});

//password reset
router.put("/phone/:id", function (req, res) {
  console.log("updated phone");
  Users.findByIdAndUpdate(
    req.prams.id,
    {
      $set: { phone: req.body.phone },
    },
    { new: true },
    function (err, updatedPhone) {
      if (err) {
        res.send("Error");
      } else {
        res.json(updatedPhone);
      }
    }
  );
});

// registration validation

const authschema = Joi.object({
  name: Joi.string().min(5).max(50),
  email: Joi.string().min(5).max(255).email(),
  password: Joi.string().min(5).max(255),
});

//registration using user schema
router.post("/register", async (req, res, next) => {
  try {
    console.log("PASSING");
    console.log(req.body);
    const result = await authschema.validateAsync(req.body);
    console.log("PASSED!");
    const doesExist = await User.findOne({ email: result.email });
    if (doesExist)
      throw createError.Conflict(`${result.email} is already been registered`);

    const user = new User(result);
    const savedUser = await user.save();
    const accessToken = await signAccessToken(savedUser.id);
    const refreshToken = await signRefreshToken(savedUser.id);
    res.send({ accessToken, refreshToken });
  } catch (error) {
    if (error.isJoi === true) error.status = 422;
    next(error);
  }
});

//login validation
const loginschema = Joi.object({
  email: Joi.string().min(5).max(255).required().email(),
  password: Joi.string().min(5).max(255).required(),
});

//login
router.post("/login", async (req, res, next) => {
  try {
    const result = await loginschema.validateAsync(req.body);
    const user = await User.findOne({ email: result.email });
    if (!user) throw createError.NotFound("User not registered");

    const isMatch = await user.isValidPassword(result.password);
    if (!isMatch) throw createError.Unauthorized("Username/password not valid");

    const accessToken = await signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id);

    res.send({ accessToken, refreshToken });
  } catch (error) {
    if (error.isJoi === true)
      return next(createError.BadRequest("Invalid Username/Password"));
    next(error);
  }
});

//jwt refresh if expires
//there is one error in this piece of code
router.post("/refresh-token", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);

    const accessToken = await signAccessToken(userId);
    const refToken = await signRefreshToken(userId);
    res.send({ accessToken: accessToken, refreshToken: refToken });
  } catch (error) {
    next(error);
  }
});

//delete route

router.delete("/logout", async (req, res, next) => {
  console.log("logout");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw createError.BadRequest();
    const userId = await verifyRefreshToken(refreshToken);
    client.DEL(userId, (err, val) => {
      if (err) {
        console.log(err.message);
        throw createError.InternalServerError();
      }
      console.log(val);
      res.sendStatus(204);
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
