export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  user: ChatUser;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
  reactions: MessageReaction[];
  isPinned: boolean;
}

export interface MessageReader {
  user: ChatUser;
  lastReadAt: string | null;
}

export interface MessagePage {
  data: ChatMessage[];
  readers: MessageReader[];
  total: number;
  page: number;
  limit: number;
}
