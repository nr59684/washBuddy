const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.handleMachineUpdates = functions.region('us-central1').database.ref("/rooms/{roomId}")
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

    const {roomId} = context.params;
    const {members, machines: afterMachines} = afterData;
    const {machines: beforeMachines} = beforeData;
    const notifications = [];

    // 1. Check for machines that finished
    afterMachines.forEach((afterMachine) => {
      const beforeMachine = beforeMachines.find((m) => m.id === afterMachine.id);
      if (!beforeMachine) return; 

      if (
        beforeMachine.status === "In Use" &&
        afterMachine.status === "Finished"
      ) {
        const user = afterMachine.lastUsedBy;
        if (user && members && members[user] && members[user].tokens) {
          notifications.push({
            user,
            title: `✅ ${afterMachine.name} Finished!`,
            body: "Your laundry is ready for pickup.",
            tokens: Object.keys(members[user].tokens),
          });
        }
      }
    });

    // 2. Check for newly available machines for subscribers
    const checkAvailability = (type) => {
      const beforeFiltered = beforeMachines.filter((m) => m.type === type);
      const afterFiltered = afterMachines.filter((m) => m.type === type);

      if (beforeFiltered.length === 0 || afterFiltered.length === 0) return;

      const wasBusy = beforeFiltered.every((m) => m.status === "In Use" || m.status === "OutOfService");
      const isAvailable = afterFiltered.some((m) => m.status === "Available");

      if (wasBusy && isAvailable) {
        Object.entries(members || {}).forEach(([username, memberData]) => {
          if (memberData?.subscriptions?.[type] && memberData.tokens) {
            notifications.push({
              user: username,
              title: `🔔 ${type.charAt(0).toUpperCase() + type.slice(1)} Available!`,
              body: `A ${type} is now free in your laundry room.`,
              tokens: Object.keys(memberData.tokens),
              unsubscribe: { type }, 
            });
          }
        });
      }
    };

    checkAvailability("washer");
    checkAvailability("dryer");

    if (notifications.length === 0) {
      return null;
    }
    
    const tokenToPayloadMap = new Map();
    notifications.forEach(notif => {
      notif.tokens.forEach(token => {
        tokenToPayloadMap.set(token, {
          notification: {
            title: notif.title,
            body: notif.body,
            icon: "https://i.imgur.com/O9N4p5p.png",
          },
        });
      });
    });

    const messages = Array.from(tokenToPayloadMap.entries()).map(([token, payload]) => ({
        token: token,
        ...payload,
    }));

    if (messages.length > 0) {
      const response = await admin.messaging().sendEach(messages);
      console.log(`${response.successCount} messages were sent successfully for room ${roomId}`);
    }
    
    // Unsubscribe users who received an availability notification
    const dbUpdates = {};
    notifications.forEach(notif => {
        if (notif.unsubscribe) {
            const path = `/rooms/${roomId}/members/${notif.user}/subscriptions/${notif.unsubscribe.type}`;
            dbUpdates[path] = false;
        }
    });

    if (Object.keys(dbUpdates).length > 0) {
        await admin.database().ref().update(dbUpdates);
    }

    return null;
  });
