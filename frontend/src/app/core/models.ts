export type Gender = 'Male' | 'Female';
export type PhotoVisibility = 'Everyone' | 'Protected';

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  role: 'User' | 'Admin';
  profileComplete: boolean;
}

export interface ProfileCard {
  userId: number;
  fullName: string;
  age: number;
  gender: Gender;
  heightCm?: number;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  education?: string;
  occupation?: string;
  city?: string;
  state?: string;
  maritalStatus: string;
  photoUrl?: string | null;
  /** True when the member has photos the viewer isn't allowed to see yet. */
  photoLocked: boolean;
  isVerified: boolean;
  /** Mutual partner-preference match, 0–100. */
  matchScore?: number | null;
  /** Has an active Gold or Platinum plan */
  isPremium: boolean;
}

export interface Photo {
  id: number;
  url: string;
  isPrimary: boolean;
}

export interface Koota {
  name: string;
  meaning: string;
  points: number;
  max: number;
}

export interface HoroscopeMatch {
  score: number;
  max: number;
  verdict: string;
  kootas: Koota[];
  manglikNote?: string | null;
}

export interface Completeness {
  percent: number;
  missing: string[];
}

export interface ProfileDetail {
  userId: number;
  fullName: string;
  age: number;
  gender: Gender;
  dateOfBirth: string;
  heightCm?: number;
  maritalStatus: string;
  motherTongue?: string;
  religion?: string;
  caste?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string;
  city?: string;
  state?: string;
  country?: string;
  residencyStatus?: string;
  createdBy?: string;
  familyType?: string;
  familyValues?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  brothers?: number | null;
  sisters?: number | null;
  diet?: string;
  smoking?: string;
  drinking?: string;
  rasi?: string;
  nakshatra?: string;
  manglik?: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  about?: string;
  photoUrl?: string | null;
  photos: Photo[];
  photoLocked: boolean;
  photoVisibility: PhotoVisibility;
  photoRequestStatus?: 'Pending' | 'Approved' | 'Declined' | null;
  prefAgeMin?: number;
  prefAgeMax?: number;
  prefHeightMin?: number;
  prefReligion?: string;
  prefMotherTongue?: string;
  prefMaritalStatus?: string;
  isVerified: boolean;
  isHidden: boolean;
  interestStatus?: 'Pending' | 'Accepted' | 'Declined' | null;
  interestSentByMe: boolean;
  isShortlisted: boolean;
  canMessage: boolean;
  blockedByMe: boolean;
  matchScore?: number | null;
  horoscopeMatch?: HoroscopeMatch | null;
  email?: string | null;
  phone?: string | null;
  completeness?: Completeness | null;
  isPremium: boolean;
  /** The viewer unlocked these contact details with a plan credit */
  contactUnlocked: boolean;
}

export interface ProfileUpdate {
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus: string;
  heightCm?: number | null;
  motherTongue?: string | null;
  religion?: string | null;
  caste?: string | null;
  education?: string | null;
  occupation?: string | null;
  annualIncome?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  residencyStatus?: string | null;
  createdBy?: string | null;
  familyType?: string | null;
  familyValues?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  brothers?: number | null;
  sisters?: number | null;
  diet?: string | null;
  smoking?: string | null;
  drinking?: string | null;
  rasi?: string | null;
  nakshatra?: string | null;
  manglik?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  about?: string | null;
  prefAgeMin?: number | null;
  prefAgeMax?: number | null;
  prefHeightMin?: number | null;
  prefReligion?: string | null;
  prefMotherTongue?: string | null;
  prefMaritalStatus?: string | null;
}

export interface SearchQuery {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMin?: number | null;
  religion?: string;
  caste?: string;
  motherTongue?: string;
  maritalStatus?: string;
  city?: string;
  education?: string;
  diet?: string;
  keyword?: string;
  photoOnly?: boolean;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Interest {
  id: number;
  profile: ProfileCard;
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: string;
  sentByMe: boolean;
}

export interface PhotoRequest {
  id: number;
  profile: ProfileCard;
  status: 'Pending' | 'Approved' | 'Declined';
  createdAt: string;
}

export interface BlockedUser {
  userId: number;
  fullName: string;
  blockedAt: string;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface Conversation {
  with: ProfileCard;
  lastMessage?: string;
  lastAt?: string;
  unread: number;
}

export interface Dashboard {
  interestsReceived: number;
  pendingInterests: number;
  accepted: number;
  shortlisted: number;
  profileViews: number;
  unreadMessages: number;
  pendingPhotoRequests: number;
  completeness: Completeness;
  isHidden: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  male: number;
  female: number;
  verifiedProfiles: number;
  interests: number;
  acceptedInterests: number;
  messages: number;
  openReports: number;
  pendingVerifications: number;
  pendingStories: number;
  revenue: Revenue;
}

export type NotificationType =
  | 'InterestReceived' | 'InterestAccepted' | 'PhotoRequested' | 'PhotoRequestApproved'
  | 'VerificationApproved' | 'VerificationRejected' | 'Shortlisted'
  | 'PlanActivated' | 'PlanExpiring' | 'PlanExpired' | 'StoryApproved';

export interface AppNotification {
  id: number;
  type: NotificationType;
  text: string;
  link?: string | null;
  actorId?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface Badges {
  notifications: number;
  messages: number;
}

export interface SavedSearch {
  id: number;
  name: string;
  query: SearchQuery;
  createdAt: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  status?: 'Pending' | 'Approved' | 'Declined' | null;
  documentType?: string | null;
  adminNote?: string | null;
  submittedAt?: string | null;
}

export interface AdminVerification {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  documentType: string;
  contentType: string;
  status: 'Pending' | 'Approved' | 'Declined';
  adminNote?: string;
  createdAt: string;
  dateOfBirth: string;
}

export interface AdminReport {
  id: number;
  reporterId: number;
  reporterName: string;
  reportedId: number;
  reportedName: string;
  reportedIsActive: boolean;
  reason: string;
  details?: string;
  status: 'Open' | 'Dismissed' | 'ActionTaken';
  adminNote?: string;
  createdAt: string;
  reportsAgainstUser: number;
}

// ---------- Phase 3: plans, payments, account, stories ----------
export interface Plan {
  code: string;
  name: string;
  priceInr: number;
  months: number;
  interestsPerDay?: number | null;
  contactViews: number;
  seeVisitors: boolean;
  boost: boolean;
  badge: boolean;
  highlights: string[];
}

export interface PlansResponse {
  /** "Razorpay", "Demo" (local testing, no money moves) or "None" (payments not set up) */
  paymentMode: 'Razorpay' | 'Demo' | 'None';
  plans: Plan[];
}

export interface MyPlan {
  plan: Plan;
  isPaid: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  contactViewsLeft: number;
  contactViewsTotal: number;
  interestsToday: number;
  interestsPerDay?: number | null;
}

export interface Checkout {
  orderId: number;
  provider: 'Razorpay' | 'Demo';
  amount: number;
  currency: string;
  planName: string;
  providerOrderId?: string | null;
  keyId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
}

export interface Order {
  id: number;
  planCode: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface Invoice {
  order: Order;
  billedTo: string;
  email: string;
  phone?: string | null;
  planStarts?: string | null;
  planEnds?: string | null;
  sellerName: string;
  sellerAddress: string;
}

export interface AdminOrder {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  planCode: string;
  amount: number;
  status: string;
  provider: string;
  invoiceNumber?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface Revenue {
  paidOrders: number;
  totalPaise: number;
  activeGold: number;
  activePlatinum: number;
}

export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  contactViewsLeft: number;
}

export interface Visitors {
  locked: boolean;
  count: number;
  items: ProfileCard[];
}

export interface Account {
  email: string;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified: boolean;
}

export interface Story {
  id: number;
  coupleNames: string;
  title: string;
  story: string;
  weddingDate?: string | null;
  city?: string | null;
  status: 'Pending' | 'Approved' | 'Declined';
  createdAt: string;
}

export interface OutboxMessage {
  id: number;
  channel: 'Email' | 'SMS';
  to: string;
  subject: string;
  body: string;
  createdAt: string;
}
