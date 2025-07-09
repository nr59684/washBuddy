/* eslint-disable max-len */
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

// Initialize web-push with VAPID details once.
// It's crucial to set these in your Firebase Functions config.
// See README.md for instructions.
// In some older versions or contexts, functions.config() might not be available during analysis.
// Access environment variables directly from process.env as a troubleshooting step.

webpush.setVapidDetails(
  'mailto:rijhwaninilesh@gmail.com', // Default or env var
  "BAWfcaGBdI67mL1vObCUQZi_5LOBNloy0Vm7zmVvU7Txpwyu0lTI-6XD8NWpOo6hULnlzeFfobc6FJ35YlV7iX8",
  "h84-IdV9-eQkphOUU9t8m0fdev6F0-kgmjvt_F-fIMY",
);

const vapidConfig = {
  public_key: process.env.WEBPUSH_PUBLIC_KEY,
  private_key: process.env.WEBPUSH_PRIVATE_KEY,
};

if (!vapidConfig.public_key || !vapidConfig.private_key) {
  console.warn("VAPID details not fully configured. Push notifications will not work.");
}


// A helper function to send notifications and handle cleanup of stale subscriptions.
const sendNotifications = async (subscriptions, payload) => {
  const deliveryPromises = [];
  const staleSubscriptions = [];

  Object.entries(subscriptions).forEach(([endpoint, sub]) => {
    deliveryPromises.push(
      webpush.sendNotification(sub, payload)
        .catch(err => {
          // A 410 'Gone' status code indicates the subscription is no longer valid.
          if (err.statusCode === 410) {
            console.log(`Subscription for ${endpoint} is stale, marking for removal.`);
            staleSubscriptions.push(endpoint);
          } else {
            // Log other errors for debugging

            console.error(`Failed to send notification to ${endpoint}:`, err);
          }
        }),
    );
  });

  await Promise.all(deliveryPromises);
  return staleSubscriptions;
};

// HTTP function to receive push subscriptions from your client
exports.addSubscription = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  // Note: For web push subscriptions initiated directly via Fetch API, context.auth might be null.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  // Data should contain roomId, username, and the PushSubscription object
  const { roomId, username, subscription } = data;

  // Basic validation of the subscription object
  if (!roomId || !username || !subscription || !subscription.endpoint) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters: roomId, username, or subscription.",
    );
  }

  // --- Database Storage Logic ---
  // Store the subscription object under the user's pushSubscriptions node in the database.
  // Sanitize the endpoint to use as a key (Realtime Database keys cannot contain ., #, $, [, ], or /)
  const sanitizedEndpoint = subscription.endpoint.replace(/[.$#\[\]/]/g, '_');
  // Use a portion of the endpoint as the key to avoid excessively long keys
  const subscriptionKey = sanitizedEndpoint.substring(0, 100);

  const dbPath = `/rooms/${roomId}/members/${username}/pushSubscriptions/${subscriptionKey}`;

  // Use admin.database().ref(path).set(value) to save the subscription.
  // Using .set() will overwrite if a subscription with the same key exists (which is fine).
  try {
    await admin.database().ref(dbPath).set(subscription);
    console.log(`Subscription added for user ${username} in room ${roomId}`);
    return { success: true, message: 'Subscription added successfully.' };
  } catch (error) {
    console.error('Error adding subscription:', error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to add subscription.",
      error,
    );
  }
});


exports.handleMachineUpdates = functions.region("us-central1").database.ref("/rooms/{roomId}")
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists() ? change.before.val() : null;
    const afterData = change.after.exists() ? change.after.val() : null;

    if (!afterData) {
      console.log(`Room ${context.params.roomId} deleted, no action.`);
      return null;
    }
    // Check if vapidConfig is fully initialized before proceeding with notifications
    if (!beforeData || !beforeData.machines || !beforeData.members) {
      console.log("Room created or incomplete, skipping notification logic.");
      return null;
    }
    if (!vapidConfig) {
      console.error("Web Push is not configured. Skipping notifications.");
      return null;
    }

    const { roomId } = context.params;
    const { members, machines: afterMachines } = afterData;
    const { machines: beforeMachines } = beforeData; // Destructure beforeMachines here
    
    let staleSubscriptions = [];

    // 1. Check for machines that finished
    for (const afterMachine of afterMachines) {
      const beforeMachine = beforeMachines.find((m) => m.id === afterMachine.id);
      if (!beforeMachine) continue;

      if (
        beforeMachine.status === "In Use" &&
        afterMachine.status === "Finished"

      ) {
        const username = afterMachine.lastUsedBy;
        // Check if member and their pushSubscriptions exist without optional chaining
        const member = members && members[username];
        // Check if pushSubscriptions exist


        if (member && member.pushSubscriptions) {
          const payload = JSON.stringify({
            title: `✅ ${afterMachine.name} Finished!`,
            body: "Your laundry is ready for pickup.",
            icon: "/icons/icon-192.png", // Use relative path
          });
          const stale = await sendNotifications(member.pushSubscriptions, payload);


          staleSubscriptions.push(...stale.map(s => ({username, endpoint: s})));

        }
      }
    }

    // 2. Check for newly available machines for subscribers
    const checkAvailability = async (type) => {
      const beforeFiltered = beforeMachines.filter((m) => m.type === type);
      const afterFiltered = afterMachines.filter((m) => m.type === type);

      if (beforeFiltered.length === 0 || afterFiltered.length === 0) return;

      const wasBusy = beforeFiltered.every(m =>
        m.status === "In Use" || m.status === "OutOfService",
      );
      const isAvailable = afterFiltered.some(m => m.status === "Available");

      if (wasBusy && isAvailable) {
        const payload = JSON.stringify({
            title: `🔔 ${type.charAt(0).toUpperCase() + type.slice(1)} Available!`,
            body: `A ${type} is now free in your laundry room.`,
            icon: "/icons/icon-192.png", // Use relative path
          });




        for (const [username, memberData] of Object.entries(members || {})) {
          // Check if memberData, subscriptions, and the specific subscription type exist
          const hasSubscriptionType = memberData && memberData.subscriptions && memberData.subscriptions[type];
          // Check if memberData and their pushSubscriptions exist
          const hasPushSubscriptions = memberData && memberData.pushSubscriptions;
          if (hasSubscriptionType && hasPushSubscriptions) {

              const stale = await sendNotifications(memberData.pushSubscriptions, payload);
              staleSubscriptions.push(...stale.map(s => ({username, endpoint: s})));


              // Unsubscribe user after notification
              await admin.database().ref(`/rooms/${roomId}/members/${username}/subscriptions/${type}`).set(false);
          }
        }
      }
    };
    
    await checkAvailability("washer");
    await checkAvailability("dryer");
    
    // 3. Clean up any stale subscriptions
    if (staleSubscriptions.length > 0) {
        const updates = {};

        staleSubscriptions.forEach(({username, endpoint}) => {
          // Sanitize and use part of the endpoint as key

            const sanitizedEndpoint = endpoint.substring(0, 100).replace(/[.$#\[\]/]/g, '_');
            const path = `/rooms/${roomId}/members/${username}/pushSubscriptions/${sanitizedEndpoint}`;
            updates[path] = null;
        });
        await admin.database().ref().update(updates);
        console.log(`Cleaned up ${staleSubscriptions.length} stale subscription(s).`);
    }

    return null;
  }); 