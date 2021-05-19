const express = require("express");
const bodyParser = require("body-parser");

const db = require("./db/index");
const UserAccount = require("./db/models/userAccount");

const port = process.env.PORT || 4200;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.get("/ping", async (req, res) => {
  res.json({ ok: "pong" });
});

app.get("/", (req, res) => {
  res.send(`<h2> Covid Vaccine Notifier </h2>`);
});

app.post("/user", async (req, res) => {
  const { phone, pincode, age } = req.body;
  await db.getDbConn();
  const UserAccountModel = db.getModel("users", UserAccount);
  const user = new UserAccountModel({
    phone,
    pincode,
    age,
  });
  let savedUser;

  try {
    savedUser = await user.save();
  } catch (err) {
    return res.json({
      status: "error",
      message: err.message || "Something went wrong",
    });
  }
  res.json({ status: "success", data: savedUser });
});

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
