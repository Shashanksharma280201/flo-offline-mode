import admin from "firebase-admin";
import dotenv from "dotenv";
import { Message } from "firebase-admin/lib/messaging/messaging-api";

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID
  })
});

type NotificationData = {
  [key: string]: string;
};

export const sendPushNotificationToOperator = async ({
  title,
  body,
  robotId,
  type,
  data
}: {
  title?: string;
  body: string;
  robotId: string;
  type: "issue" | "maintenance" | "shift-end" | "checkout-reminder" | "auto-checkout";
  data?: NotificationData;
}) => {
  const notification: Message = {
    notification: {
      title,
      body
    },
    data: { type, robotId, ...data },
    // No special characters
    topic: robotId.replace(/[^a-zA-Z0-9._-]/g, "")
  };
  await admin.messaging().send(notification);
};
