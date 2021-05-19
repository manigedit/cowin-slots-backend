const moment = require("moment");
const axios = require("axios");
const db = require("./db/index");
const UserAccount = require("./db/models/userAccount");
const redis = require("redis");
const redisClient = redis.createClient();
const logger = require("./loggingutils");
const notifierUtil = require("./notifyutils");

const districts = [
  { district_id: 74, district_name: "Araria" },
  { district_id: 78, district_name: "Arwal" },
  { district_id: 77, district_name: "Aurangabad" },
  { district_id: 83, district_name: "Banka" },
  { district_id: 98, district_name: "Begusarai" },
  { district_id: 82, district_name: "Bhagalpur" },
  { district_id: 99, district_name: "Bhojpur" },
  { district_id: 100, district_name: "Buxar" },
  { district_id: 94, district_name: "Darbhanga" },
  { district_id: 105, district_name: "East Champaran" },
  { district_id: 79, district_name: "Gaya" },
  { district_id: 104, district_name: "Gopalganj" },
  { district_id: 107, district_name: "Jamui" },
  { district_id: 91, district_name: "Jehanabad" },
  { district_id: 80, district_name: "Kaimur" },
  { district_id: 75, district_name: "Katihar" },
  { district_id: 101, district_name: "Khagaria" },
  { district_id: 76, district_name: "Kishanganj" },
  { district_id: 84, district_name: "Lakhisarai" },
  { district_id: 70, district_name: "Madhepura" },
  { district_id: 95, district_name: "Madhubani" },
  { district_id: 85, district_name: "Munger" },
  { district_id: 86, district_name: "Muzaffarpur" },
  { district_id: 90, district_name: "Nalanda" },
  { district_id: 92, district_name: "Nawada" },
  { district_id: 97, district_name: "Patna" },
  { district_id: 73, district_name: "Purnia" },
  { district_id: 81, district_name: "Rohtas" },
  { district_id: 71, district_name: "Saharsa" },
  { district_id: 96, district_name: "Samastipur" },
  { district_id: 102, district_name: "Saran" },
  { district_id: 93, district_name: "Sheikhpura" },
  { district_id: 87, district_name: "Sheohar" },
  { district_id: 88, district_name: "Sitamarhi" },
  { district_id: 103, district_name: "Siwan" },
  { district_id: 72, district_name: "Supaul" },
  { district_id: 89, district_name: "Vaishali" },
  { district_id: 106, district_name: "West Champaran" },
];
const usersByPincode = {};

async function chaljaBhai() {
  logger.log.info("MAIN: Ran the checker");
  const UserAccountModel = db.getModel("users", UserAccount);
  let usersArray = await UserAccountModel.find({}).lean();
  //usersArray = [ {'_id': 'something' ,'phone': '9939639598', 'pincode': '110001', 'age': '54'} ]
  usersArray.map((user) => {
    if (usersByPincode[user.pincode]) {
      if (usersByPincode[user.pincode].indexOf(user.pincode) == -1) {
        usersByPincode[user.pincode].push(user);
      }
    } else {
      usersByPincode[user.pincode] = [user];
    }
  });

  districts.reverse();

  if (Object.keys(usersByPincode).length < 30) {
    Object.keys(usersByPincode).forEach(async (pincode) => {
      let datesArray = await fetchNextDays(3);
      datesArray.forEach((date) => {
        getSlotsbyPincode(pincode, date);
      });
    });
  } else {
    districts.forEach(async (district) => {
      logger.log.info(
        `DISTRICT: District search started for ${district.district_name}`
      );

      let datesArray = await fetchNextDays(3);
      datesArray.forEach((date) => {
        getSlotsForDate(district.district_id, date, district.district_name);
      });
    });
  }
}

function getSlotsbyPincode(pincode, date) {
  logger.info(
    `PINCODE_SEARCH: statred pincode search for ${pincode} on ${date}`
  );
  let config = {
    method: "get",
    url: `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=${pincode}&date=${date}`,
    headers: {
      accept: "application/json",
      "Accept-Language": "hi_IN",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    },
  };

  axios(config)
    .then(function (slots) {
      console.log("slots", slots.status, pincode, date);

      try {
        if (slots.status == 200) {
          processPincodeResponse(slots.data, pincode);
        } else {
          console.log(
            "Blocked API call for pincode ",
            pincode,
            " at ",
            new Date()
          );
        }
      } catch (e) {
        console.log(e);
      }
    })
    .catch(function (error) {
      console.log(error);
    });
}

function processPincodeResponse(data, pincode) {
  const usersOfthatPincode = usersByPincode[pincode];

  console.log("Processing pincode ", pincode);
  if (usersOfthatPincode) {
    usersOfthatPincode.map((user) => {
      for (let i = 0; i < data.centers.length; i++) {
        let notifiableSlots = data.centers[i].sessions.filter(
          (slot) =>
            slot.min_age_limit <= user.age && slot.available_capacity > 0
        );

        if (notifiableSlots && notifiableSlots.length) {
          notifyUserviaWhatsapp(user, data.centers[i], notifiableSlots);
        }
      }
    });
  }
}

function getSlotsForDate(district_id, date, districtName) {
  logger.log.info(
    `DISTRICT_SEARCH: started district search for ${districtName} on ${date}`
  );
  let config = {
    method: "get",
    url: `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${district_id}&date=${date}`,
    headers: {
      accept: "application/json",
      "Accept-Language": "hi_IN",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    },
  };

  axios(config)
    .then(function (slots) {
      if (slots.status == 200) {
        processDistrictsResponse(slots.data);
      }
      logger.log.info(
        `DISTRICT_SEARCH_BLOCKED: API blocked at For ${districtName} `
      );
    })
    .catch(function (error) {
      logger.log.info(
        `DISTRICT_SEARCH_ERROR: API blocked at For ${districtName} `
      );
    });
}

function processDistrictsResponse(district) {
  district.centers.map((center) => {
    let validSlots = center.sessions.filter(
      (slot) => slot.available_capacity > 0
    );
    if (validSlots.length > 2) {
      tryToNotify(center.pincode, center, validSlots);
    }
  });
}

function tryToNotify(pincode, center, slots) {
  const usersOfthatPincode = usersByPincode[pincode];
  if (usersOfthatPincode) {
    usersOfthatPincode.map((user) => {
      let notifableSlots = slots.filter(
        (slot) => slot.min_age_limit <= user.age
      );
      if (notifableSlots.length) {
        notifyUserviaWhatsapp(user, center, notifableSlots);
      }
    });
  }
}

function notifyUserviaWhatsapp(user, center, slots) {
  logger.log.info(
    `NOTIFY_SLOT: notified ${user.phone} for ${center} with ${slots.length} slots`
  );
  notifierUtil.sendMessage(user.phone, center, slots, user._id);
}

async function fetchNextDays(n) {
  let dates = [];
  let today = moment();
  for (let i = 0; i < n; i++) {
    let dateString = today.format("DD-MM-YYYY");
    dates.push(dateString);
    today.add(1, "day");
  }
  return dates;
}

async function welcomeNewUsers() {
  const UserAccountModel = db.getModel("users", UserAccount);
  let usersArray = await UserAccountModel.find({}).lean();
  //usersArray = [ {'_id': 'test', 'phone': '9939639598', 'pincode': '110001', 'age': '54'} ]
  for (let i = 0; i < usersArray.length; i++) {
    redisClient.get(`${usersArray[i].phone}-welcomed`, (err, data) => {
      if (data != null) {
      } else {
        redisClient.set(
          `${usersArray[i].phone}-welcomed`,
          new Date(),
          (err, data) => {
            logger.log.info(
              `NEW_USER: sent welcome message to ${usersArray[i].phone}`
            );
            notifierUtil.sendWelcomeMessage(usersArray[i].phone);
          }
        );
      }
    });
  }
}

db.getDbConn().then(() => {
  setInterval(chaljaBhai, 300000);
  setInterval(welcomeNewUsers, 180000);
});
