require("dotenv").config();
const puppeteer = require("puppeteer");
const TeleBot = require("telebot");
const JSONFileStorage = require("node-json-file-storage");

const file_uri = __dirname + "/jobs.json";
const storage = new JSONFileStorage(file_uri);

const user_uri = __dirname + "/chats.json";
const user = new JSONFileStorage(user_uri);

const bot = new TeleBot({
  token: process.env.ACCESS_TOKEN,
});

//our command
bot.on(["/watch"], (msg) => init(msg));

const init = (msg) => {
  let id = msg.from.id;
  bot.sendMessage(id, "Your Chat ID has been added to the notifier list");
  addToUserQueue(id);
};

const sendMessage = (job) => {
  let message = job.title + "\n" + job.date + "\n" + job.link;
  let users = user.get("1");
  if (users) {
    users.users.forEach((user) => {
      bot.sendMessage(user, message);
    });
  }
};

const addToUserQueue = (id) => {
  let users = user.get("1");
  updatedUsers = [];
  if (users) {
    if (!users.users.includes(id)) {
      updatedUsers = users.users;
      updatedUsers.push(id);
    } else {
      updatedUsers = users.users;
    }
  } else {
    updatedUsers = [];
  }
  console.log(updatedUsers);
  let userObj = {
    id: 1,
    users: updatedUsers,
  };
  user.put(userObj);
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

const scrapSteam = async () => {
  const url =
    "https://www.tesla.com/de_DE/careers/search/?country=DE&location=Gr%C3%BCnheide%20(Gigafactory%20Berlin)&region=3";
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  let localJobs = storage.get("1");
  if (localJobs) {
    localJobs = localJobs.jobs;
  } else {
    localJobs = [];
  }
  await autoScroll(page);
  let jobs = await page.evaluate((localJobs) => {
    var promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        let results = [];
        let newJob = [];
        let tRows = document.querySelectorAll("tr");
        let items = [].slice.call(tRows, 1);
        var today = new Date();

        items.forEach(
          (item) => {
            console.log(item);
            let title = item
              .querySelector("a")
              .innerText.replace("View details on ", "")
              .replace(" (m/w/d) - Gigafactory Berlin", "")
              .replace("Brandenburg", "");
            let date = item.querySelector("td:last-of-type").innerText;
            if (date.includes("2021")) {
              results.push(title);
            }
            if (!localJobs.includes(title) && date.includes("2021")) {
              newJob.push({
                title: title,
                // category: item.querySelector(".listing-department").innerText,
                // place: item.querySelector(".listing-location").innerText,
                // date: item.querySelector(".listing-dateposted").innerText,
                link: item.querySelector("a").href,
                date: date,
              });
            }
            resolve({ results: results, newJob: newJob });
          },
          [localJobs]
        );
      }, 2000);
    });
    return promise.then((data) => {
      return { results: data.results, newJob: data.newJob };
    });
  }, localJobs);
  let saveObj = {
    id: 1,
    jobs: jobs.results,
  };
  storage.put(saveObj);
  browser.close();
  return jobs.newJob;
};

async function poll() {
  console.log("refresh");
  let newJob = await scrapSteam();
  if (newJob) {
    newJob.forEach((job) => {
      sendMessage(job);
    });
  }
  setTimeout(poll.bind(null), 500000);
}

//start polling
poll();
bot.start();
