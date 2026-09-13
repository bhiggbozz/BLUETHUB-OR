import type { NotificationDto } from "@/services/notifications";

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

interface NotificationProps {
  items: NotificationDto[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const Notification = ({ items, onMarkRead, onMarkAllRead }: NotificationProps) => {
  return (
    <div className="overflow-hidden rounded-md border border-white/75 bg-white/82 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-poppins text-sm font-semibold text-slate-900 capitalize">
            Notification
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Updates from your teachers and courses.</p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#e5e7eb]"
        >
          Mark all read
        </button>
      </div>
      <section className="px-4 py-3">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">You're all caught up.</p>
          )}
          {items.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => !notification.isRead && onMarkRead(notification.id)}
              className="flex w-full items-center gap-2 justify-between rounded-[16px] border border-slate-100 bg-slate-50/85 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-2.5 capitalize">
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-300" : "bg-red-500"}`}
                ></div>
                <div className="space-y-0.5">
                  <h3 className="font-poppins text-xs font-semibold text-slate-800">
                    {notification.title}
                  </h3>
                  <p className="font-poppins text-[10px] font-medium text-slate-500 normal-case">
                    {notification.body}
                  </p>
                  <p className="font-poppins text-[10px] font-medium text-slate-400">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Notification;
