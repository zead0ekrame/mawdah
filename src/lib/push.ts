import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@mawaddah.app";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

/**
 * إرسال Web Push Notification لمستخدم واحد
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-72.png",
    data: { url: payload.url || "/chat" },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      )
    )
  );

  // حذف الاشتراكات المنتهية أو المرفوضة
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { endpoint: subscriptions[i].endpoint },
        }).catch(() => {});
      }
    }
  }
}

/**
 * إرسال Web Push Notification لجميع المستخدمين النشطين
 */
export async function broadcastPush(payload: PushPayload): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user: { status: { in: ["ACTIVE", "PAUSED", "UNDER_FOLLOWUP"] } },
    },
  });

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-72.png",
    data: { url: payload.url || "/chat" },
  });

  let sentCount = 0;
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      )
    )
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled") {
      sentCount++;
    } else {
      const err = (results[i] as PromiseRejectedResult).reason as any;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { endpoint: subscriptions[i].endpoint },
        }).catch(() => {});
      }
    }
  }

  return sentCount;
}
