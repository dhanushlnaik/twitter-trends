const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config()
const username = process.env.UNAME;
const pwd = process.env.PWD;
const mongouri = process.env.MONGO_URI;


const sleep = ms => new Promise(res => setTimeout(res, ms));

async function scrapeTwitter() {
    // MongoDB setup
    const client = new MongoClient(mongouri);
    await client.connect();
    const db = client.db('twitter_trends');
    const collection = db.collection('trends');

    // Puppeteer setup
    const browser = await puppeteer.launch({ 
        headless: true, 
        executablePath : 
            process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(),
        args : [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
        ],
     });
    const page = await browser.newPage();
    page.on('console', consoleObj => console.log(consoleObj.text()));
    // await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor : 1});

    await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });

    console.log('Current URL:', page.url());
    try {
 
        const usernameinput = await page.waitForSelector(`::-p-xpath(//input[@name="text"])`)
        console.log(usernameinput);
        await usernameinput.focus();
        await page.keyboard.type(username);
        console.log("Added")
        const nextBut = await page.waitForSelector(`::-p-xpath(//button[@role='button']//span[text()='Next'])`);
        console.log(nextBut)
        await nextBut.click();  

        const passwordinput = await page.waitForSelector(`::-p-xpath(//input[@name="password"])`)
        await passwordinput.focus();
        await page.keyboard.type(pwd);

        const loginBut = await page.waitForSelector(`::-p-xpath(//button[@role='button']//span[text()='Log in'])`);
        console.log(loginBut)
        await loginBut.click(); 
        console.log('Current URL after login:', page.url());
        await sleep(10000);
        console.log('Current URL after login:', page.url());
        await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle2' });
        await page.waitForSelector('section[aria-labelledby="accessible-list-0"]');

        let trends = await page.evaluate(() => {
            let trendElements = document.querySelectorAll('div.css-146c3p1.r-bcqeeo.r-1ttztb7.r-qvutc0.r-37j5jr.r-a023e6.r-rjixqe.r-b88u0q.r-1bymd8e span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3');
            const trends1 = Array.from(trendElements).map(el => el.innerText);
            
            trendElements = document.querySelectorAll('span.r-18u37iz');
            const trends2 = Array.from(trendElements).map(el => el.innerText);
            
            return trends1.concat(trends2);
        });

    
        const response = await axios.get('http://ifconfig.me');
        const ip_address = response.data;

        // Generate unique ID and end time
        const unique_id = uuidv4();
        const end_time = new Date().toISOString();

        // Store in MongoDB
        const data = {
            unique_id,
            trends,
            end_time,
            ip_address
        };

        await collection.insertOne(data);

        console.log(data)

        await browser.close();
        await client.close();

        return data;

    } catch (error) {
        console.error('Error during scraping:', error);
        await browser.close();
        await client.close();
        throw error;
    }
}

module.exports = scrapeTwitter;
