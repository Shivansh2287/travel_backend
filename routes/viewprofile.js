const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { verifyAccessToken } = require("../webTokens/jwt");
const Post = mongoose.model("Post");
const User = mongoose.model("User");

router.get("/:id", verifyAccessToken, (req, res) => {
  User.findOne({ _id: req.params._id })
    .select("-password")
    .then((user) => {
      Post.find({ postedBy: req.params.id })
        .populate("postedBy", "_id name")
        .exec((err, posts) => {
          if (err) {
            return res.status(422).json({ error: err });
          }
          res.json({ user, posts });
        });
    })
    .catch((err) => {
      return res.status(404).json({ error: "User not found" });
    });
});

module.exports = router;
