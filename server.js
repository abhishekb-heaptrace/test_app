const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

// Load data or initialize
let data = { logs: [], remainingTime: 8*60*60, clockInTimestamp: null };
if (fs.existsSync(DATA_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) {
        console.error('Error reading data.json, starting fresh.');
    }
}

// Save data
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Clock In
app.post('/clockin', (req, res) => {
    const now = Date.now();
    if (!data.clockInTimestamp) {
        data.logs.push({ clockIn: new Date(now).toISOString(), clockOut: null });
        data.clockInTimestamp = now;
        saveData();
    }
    res.redirect('/');
});

// Clock Out
app.post('/clockout', (req, res) => {
    if (data.clockInTimestamp) {
        const now = Date.now();
        const currentLog = data.logs[data.logs.length - 1];
        currentLog.clockOut = new Date(now).toISOString();

        const spentSeconds = Math.floor((now - data.clockInTimestamp)/1000);
        data.remainingTime -= spentSeconds;
        if (data.remainingTime < 0) data.remainingTime = 0;

        data.clockInTimestamp = null;
        saveData();
    }
    res.redirect('/');
});

// Reset
app.post('/reset', (req, res) => {
    data.remainingTime = 8*60*60;
    data.logs = [];
    data.clockInTimestamp = null;
    saveData();
    res.redirect('/');
});

// Get logs & remaining time
app.get('/logs', (req, res) => {
    let timeLeft = data.remainingTime;
    if (data.clockInTimestamp) {
        const spent = Math.floor((Date.now() - data.clockInTimestamp)/1000);
        timeLeft = data.remainingTime - spent;
        if (timeLeft < 0) timeLeft = 0;
    }
    res.json({ logs: data.logs, remainingTime: timeLeft });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
