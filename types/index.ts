export type UserRole = "PROFESSIONAL" | "FIRM" | "VIEWER" | "INSTITUTION_ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface Professional {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  location: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  isVerified: boolean;
  availability: "available" | "busy" | "not_available";
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string;
  location: string;
  type: "full_time" | "part_time" | "contract" | "gig";
  status: "active" | "closed" | "draft";
  postedAt: string;
  salary?: string;
  description?: string;
  requirements?: string[];
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  category: string;
  publishedAt: string;
  readTimeMinutes: number;
  author: {
    name: string;
    avatarUrl?: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatarUrl?: string;
    title?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
