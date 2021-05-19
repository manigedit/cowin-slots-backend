const mongoose = require("mongoose");
let connection = null;

const DB_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

function getDbConn() {
  return new Promise(async (resolve, reject) => {
    if (connection === null) {
      connection = await mongoose.connect(DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
    resolve(connection);
  });
}

const getModel = (name, schema) => {
  return connection.model(name, schema);
};

mongoose.connection
  .once("open", function () {
    console.log("DB Connection has been made");
  })
  .on("error", async function (error) {
    console.log("Connect error", error);
    mongoose.connection.close();
    await getDbConn();
  })
  .on("disconnected", async function () {
    console.log("Connection disconnected");
    await getDbConn();
  });

module.exports = {
  getDbConn,
  getModel,
};
