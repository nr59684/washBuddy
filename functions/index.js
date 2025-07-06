const functions = require("firebase-functions");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();

// Initialize web-push with VAPID details once.
// It's crucial to set these in your Firebase Functions config.
// See README.md for instructions.
const vapidConfig = functions.config().webpush;
if (vapidConfig && vapidConfig.private_key && vapidConfig.mail_to && process.env.VITE_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    vapidConfig.mail_to,
    process.env.VITE_VAPID_PUBLIC_KEY,
    vapidConfig.private_key,
  );
} else {
  console.warn("VAPID details not fully configured. Push notifications will not work.");
}


// A helper function to send notifications and handle cleanup of stale subscriptions.
const sendNotifications = async (subscriptions, payload) => {
  const deliveryPromises = [];
  const staleSubscriptions = [];

  Object.entries(subscriptions).forEach(([endpoint, sub]) => {
    deliveryPromises.push(
      webpush.sendNotification(sub, payload)
        .catch((err) => {
          // A 410 'Gone' status code indicates the subscription is no longer valid.
          if (err.statusCode === 410) {
            console.log(`Subscription for ${endpoint} is stale, marking for removal.`);
            staleSubscriptions.push(endpoint);
          } else {
            console.error(`Failed to send notification to ${endpoint}:`, err);
          }
        }),
    );
  });

  await Promise.all(deliveryPromises);
  return staleSubscriptions;
};


exports.handleMachineUpdates = functions.region("us-central1").database.ref("/rooms/{roomId}")
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists() ? change.before.val() : null;
    const afterData = change.after.exists() ? change.after.val() : null;

    if (!afterData) {
      console.log(`Room ${context.params.roomId} deleted, no action.`);
      return null;
    }

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
    const { machines: beforeMachines } = beforeData;
    
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
        const member = members?.[username];
        if (member?.pushSubscriptions) {
          const payload = JSON.stringify({
            title: `✅ ${afterMachine.name} Finished!`,
            body: "Your laundry is ready for pickup.",
            icon: "https://i.imgur.com/O9N4p5p.png",
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

      const wasBusy = beforeFiltered.every((m) => m.status === "In Use" || m.status === "OutOfService");
      const isAvailable = afterFiltered.some((m) => m.status === "Available");

      if (wasBusy && isAvailable) {
         const payload = JSON.stringify({
            title: `🔔 ${type.charAt(0).toUpperCase() + type.slice(1)} Available!`,
            body: `A ${type} is now free in your laundry room.`,
            icon: "https://i.imgur.com/O9N4p5p.png",
          });

        for (const [username, memberData] of Object.entries(members || {})) {
          if (memberData?.subscriptions?.[type] && memberData.pushSubscriptions) {
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
            const path = `/rooms/${roomId}/members/${username}/pushSubscriptions/${endpoint.substring(0, 100).replace(/[.$#\[\]\/]/g, '_')}`; // Sanitize and use part of the endpoint as key
            updates[path] = null;
        });
        await admin.database().ref().update(updates);
        console.log(`Cleaned up ${staleSubscriptions.length} stale subscription(s).`);
    }

    return null;
  });