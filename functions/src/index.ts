/* eslint-disable max-len */
import {onValueUpdated} from "firebase-functions/v2/database";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize the Firebase Admin SDK.
admin.initializeApp();

/**
 * This Cloud Function triggers when a machine's data is updated.
 * It's configured to run in the 'europe-west1' region to match the database.
 */
export const sendmachinefinishednotification = onValueUpdated(
  {
    // ✨ FIX: Specify the region to match your database location.
    region: "europe-west1",
    // ✨ FIX: Specify the database instance URL.
    instance: "washbuddy-7f682-default-rtdb",
    // The path within the database to listen for changes.
    ref: "/rooms/{roomId}/machines/{machineId}",
  },
  async (event) => {
    const beforeData = event.data.before.val();
    const afterData = event.data.after.val();

    // Proceed only if the status changed to "Finished".
    if (beforeData.status !== "Finished" && afterData.status === "Finished") {
      const {machineName, lastUsedBy} = afterData;

      if (!lastUsedBy) {
        logger.log(
          `Machine '${machineName}' finished, but no user was assigned.`
        );
        return;
      }

      const {roomId} = event.params;

      // Find the user's FCM token in the 'members' list.
      const memberRef = admin
        .database()
        .ref(`/rooms/${roomId}/members/${lastUsedBy}`);
      const memberSnapshot = await memberRef.once("value");
      const memberData = memberSnapshot.val();

      if (!memberData || !memberData.fcmToken) {
        logger.warn(
          `User '${lastUsedBy}' has no FCM token. Cannot send notification.`
        );
        return;
      }

      const fcmToken = memberData.fcmToken;

      // Construct the notification payload.
      const payload = {
        notification: {
          title: "Laundry's Done! 🫧",
          body: `Your cycle on machine '${machineName}' is finished.`,
          icon: "/icons/icon-192.png",
        },
        token: fcmToken,
      };

      // Send the message via FCM.
      try {
        await admin.messaging().send(payload);
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
