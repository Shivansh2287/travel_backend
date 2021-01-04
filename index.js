const express = require("express");
const passport = require("passport");
const keys = require("./config/keys");
const cookieSession = require("cookie-session");

//ROUTES
const authRoute = require("./routes/auth");
const postRoute = require("./routes/post");
const viewprofileRoute = require("./routes/viewprofile");
const admin = require("./middleware/admin");

//CHORE
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");

//EXPERIMENTAL: REMOVE IF UNWANTED
const bodyParser = require("body-parser");

//mongo connect
mongoose.connect(
  "mongodb+srv://Shivansh:dojo@cluster0.n0cr0.mongodb.net/Clusters?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true },

  () => {
    console.log("connected to db");
  }
);
mongoose.set("useCreateIndex", true);

//
const { verifyAccessToken } = require("./webTokens/jwt");
//needs to be require after schema
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey],
  })
);
app.use(passport.initialize());
app.use(passport.session());
require("./services/passport");
require("./routes/authRoute")(app);

////////
dotenv.config();
app.use(express.json());

//just a demo how to access private routes
app.get("/", [verifyAccessToken, admin], async (req, res, next) => {
  res.send("accessing private route");
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

//Route Middleware For Login And Signup routes
app.use("/api/user", authRoute);

app.use("/api/post", postRoute);
app.use("/api/viewprofile", viewprofileRoute);
require("./middleware/prod");
app.listen(5000, () => console.log("server up and running"));
