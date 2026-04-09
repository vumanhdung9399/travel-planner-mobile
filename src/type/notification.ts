export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  password?: string;
  name: string;
  phone: string;
  avatar: string | null;
}

export interface Group {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
}

export interface Notification {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  content: string;
  link: string | null;
  user: User;
  createdBy: {
    id: string;
  };
  group: Group;
  groupKey: string;
  type: string;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  metadata: any;
  scheduledAt: string | null;
}