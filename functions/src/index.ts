/* eslint-disable max-len */
import {onValueUpdated} from "firebase-functions/v2/database";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as webpush from "web-push";

// Initialize the Firebase Admin SDK.
admin.initializeApp();

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
};

webpush.setVapidDetails(
    "mailto:your-email@example.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export const saveSubscription = onRequest({region: "europe-west1"}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const {subscription, userId, roomId} = req.body;
    if (!subscription || !userId || !roomId) {
        res.status(400).send("Missing required fields: subscription, userId, roomId");
        return;
    }

    try {
        const memberRef = admin.database().ref(`/rooms/${roomId}/members/${userId}`);
        await memberRef.update({pushSubscription: subscription});
        logger.log("Successfully saved subscription for user", userId);
        res.status(201).json({message: "Subscription saved successfully."});
    } catch (error) {
        logger.error("Error saving subscription:", error);
        res.status(500).send("Internal Server Error");
    }
});

export const sendmachinefinishednotification = onValueUpdated(
    {
        region: "europe-west1",
        instance: "washbuddy-7f682-default-rtdb",
        ref: "/rooms/{roomId}/machines/{machineId}",
    },
    async (event) => {
        const beforeData = event.data.before.val();
        const afterData = event.data.after.val();

        if (beforeData.status !== "Finished" && afterData.status === "Finished") {
            const {machineName, lastUsedBy} = afterData;

            if (!lastUsedBy) {
                logger.log(
                    `Machine '${machineName}' finished, but no user was assigned.`
                );
                return;
            }

            const {roomId} = event.params;

            const memberRef = admin
                .database()
                .ref(`/rooms/${roomId}/members/${lastUsedBy}`);
            const memberSnapshot = await memberRef.once("value");
            const memberData = memberSnapshot.val();

            if (!memberData || !memberData.pushSubscription) {
                logger.warn(
                    `User '${lastUsedBy}' has no push subscription. Cannot send notification.`
                );
                return;
            }

            const pushSubscription = memberData.pushSubscription;

            const payload = JSON.stringify({
                title: "Laundry's Done! 🫧",
                body: `Your cycle on machine '${machineName}' is finished.`,
                data: {
                    url: `/laundry-room/${roomId}`,
                },
            });

            try {
                await webpush.sendNotification(pushSubscription, payload);
                logger.log(
                    "Successfully sent 'finished' notification to",
                    lastUsedBy
                );
            } catch (error) {
                logger.error("Error sending message:", error);
            }
        }
    }
);
