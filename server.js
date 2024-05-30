const express = require('express');
const { MongoClient } = require('mongodb');
const scrapeTwitter = require('./scrapeTwitter');
const path = require('path');
const app = express();
const PORT = 3000;
require('dotenv').config()
const mongouri = process.env.MONGO_URI;

// MongoDB setup
const client = new MongoClient(mongouri);
const dbName = 'twitter_trends';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/fetch-trends', async (req, res) => {
    try {
        const data = await scrapeTwitter();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching trends');
    }
});

app.get('/trends', async (req, res) => {-
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('trends');
    console.log(collection)
    const trends = await collection.find({}).sort({ _id: -1 }).limit(1).toArray();
    res.json(trends[0]);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
