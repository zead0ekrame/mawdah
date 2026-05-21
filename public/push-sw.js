// Service Worker for Web Push Notifications — نصيب
// يستقبل الإشعارات من الخادم ويعرضها للمستخدم حتى لو التطبيق مغلق

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "نصيب 💚", body: event.data.text(), data: { url: "/chat" } };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-72.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    data: data.data || { url: "/chat" },
    actions: [
      { action: "open", title: "فتح التطبيق" },
      { action: "close", title: "تجاهل" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "نصيب 💚", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const url = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
