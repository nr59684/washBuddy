
import express from 'express';
import webpush from 'web-push';
import bodyParser from 'body-parser';
import http from 'http';

const app = express();
const port = 4000;

// VAPID keys should be generated only once.
const vapidKeys = {
    publicKey: process.env.VITE_VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VITE_VAPID_PRIVATE_KEY || '',
};

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

app.use(bodyParser.json());

let subscriptions: webpush.PushSubscription[] = [];

app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({ message: 'Subscription added successfully.' });
});

app.post('/send-notification', (req, res) => {
    const notificationPayload = {
        notification: {
            title: 'New Notification',
            body: 'This is a test notification.',
            icon: 'icons/icon-192.png',
        },
    };

    const promises = subscriptions.map(sub => webpush.sendNotification(sub, JSON.stringify(notificationPayload)));
    Promise.all(promises)
        .then(() => res.status(200).json({ message: 'Notifications sent successfully.' }))
        .catch(err => {
            console.error('Error sending notification, error: ', err);
            res.sendStatus(500);
        });
});

const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
