import { API, type TResponse } from ".";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  isDelivered: boolean;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  unreadCount: number;
}

export const notificationsService = {
  getMy: (page = 1, pageSize = 20) =>
    API.get<TResponse<NotificationListDto>>("api/Notification/my", {
      params: { page, pageSize },
    }),

  markDelivered: (ids: string[]) =>
    API.post<TResponse<null>>("api/Notification/mark-delivered", ids),

  markRead: (id: string) =>
    API.post<TResponse<null>>(`api/Notification/${id}/read`),

  markAllRead: () => API.post<TResponse<null>>("api/Notification/read-all"),
};
