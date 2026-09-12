import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { notificationsService, type NotificationDto } from "@/services/notifications";

export const useNotifications = () => {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const hasToastedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsService.getMy();
      const list = data.data;
      setItems(list.items);
      setUnreadCount(list.unreadCount);

      // Toast anything never shown before, then mark it delivered so it
      // won't toast again on the next fetch/login — it stays in this list,
      // unread, until the student actually opens it.
      const undelivered = list.items.filter((n) => !n.isDelivered);
      if (undelivered.length > 0 && !hasToastedRef.current) {
        hasToastedRef.current = true;
        undelivered.forEach((n) => toast(n.title));
        notificationsService.markDelivered(undelivered.map((n) => n.id)).catch(() => undefined);
      }
    } catch {
      // Non-critical — leave whatever was already loaded in place.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationsService.markRead(id);
    } catch {
      // Best-effort — a stale unread flag self-corrects on the next fetch.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsService.markAllRead();
    } catch {
      // Best-effort — see markRead.
    }
  }, []);

  return { items, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
};
