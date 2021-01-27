require("dotenv").config();
const puppeteer = require("puppeteer");
const TeleBot = require("telebot");
const JSONFileStorage = require("node-json-file-storage");
const { save } = require("node-json-file-storage/JSONFileManager");

const file_uri = __dirname + "/jobs.json";
const storage = new JSONFileStorage(file_uri);

//instantiate Telebot with our token got in the BtFather
const bot = new TeleBot({
  token: process.env.ACCESS_TOKEN,
});

//our command
bot.on(["/watch"], (msg) => {
  // start the polling on the /watch
  poll(msg);
});

const scrapSteam = async () => {
  const url =
    "https://www.tesla.com/de_DE/careers/search#/?region=3&country=3&city=7";
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  let jobs = await page.evaluate(() => {
    let results = [];
    let tRows = document.querySelectorAll("tr");
    let items = [].slice.call(tRows, 1);
    items.forEach((item) => {
      results.push({
        title: item
          .querySelector("a")
          .getAttribute("title")
          .replace("View details on", ""),
        text: item.querySelector(".listing-department").innerText,
      });
    });
    return results;
  });
  let saveObj = {
    id: 1,
    jobs: jobs,
  };
  storage.put(saveObj);
  let deals = "deals";
  browser.close();
  return deals;
};

async function poll(msg) {
  console.log("refresh");
  await scrapSteam();
  //     bot.sendMessage(msg.from.id, `Hello ${msg.chat.username}`);
  setTimeout(poll.bind(null, msg), 10000);
}

//start polling
bot.start();
