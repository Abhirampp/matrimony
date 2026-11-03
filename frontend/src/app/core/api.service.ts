import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  AdminReport, AdminStats, AdminUser, AdminVerification, AppNotification, Badges, BlockedUser, Conversation, Dashboard,
  Interest, Message, Paged, Photo, PhotoRequest, PhotoVisibility, ProfileCard, ProfileDetail, ProfileUpdate, SavedSearch,
  SearchQuery, VerificationStatus, Visitors, ContactInfo, PlansResponse, MyPlan, Checkout, Order, Invoice, Account, Story,
  AdminOrder, OutboxMessage,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api`;

  /** Turns a stored photo path into a full URL (photos are served by the API). */
  photo(url?: string | null): string | null {
    if (!url) return null;
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  // Profiles
  myProfile() { return this.http.get<ProfileDetail>(`${this.api}/profiles/me`); }
  updateMyProfile(p: ProfileUpdate) { return this.http.put<void>(`${this.api}/profiles/me`, p); }
  updatePrivacy(photoVisibility: PhotoVisibility, isHidden: boolean) {
    return this.http.put<void>(`${this.api}/profiles/me/privacy`, { photoVisibility, isHidden });
  }

  // Photo album
  uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Photo[]>(`${this.api}/profiles/me/photos`, fd);
  }
  makePrimaryPhoto(id: number) { return this.http.post<Photo[]>(`${this.api}/profiles/me/photos/${id}/primary`, {}); }
  deletePhoto(id: number) { return this.http.delete<Photo[]>(`${this.api}/profiles/me/photos/${id}`); }

  // Photo requests
  requestPhotos(userId: number) { return this.http.post<void>(`${this.api}/photo-requests/${userId}`, {}); }
  photoRequests() { return this.http.get<PhotoRequest[]>(`${this.api}/photo-requests/received`); }
  respondPhotoRequest(id: number, approve: boolean) { return this.http.post<void>(`${this.api}/photo-requests/${id}/respond`, { approve }); }

  // Safety
  blocked() { return this.http.get<BlockedUser[]>(`${this.api}/blocks`); }
  block(userId: number) { return this.http.post<void>(`${this.api}/blocks/${userId}`, {}); }
  unblock(userId: number) { return this.http.delete<void>(`${this.api}/blocks/${userId}`); }
  report(userId: number, reason: string, details: string) { return this.http.post<void>(`${this.api}/reports/${userId}`, { reason, details }); }
  profile(userId: number) { return this.http.get<ProfileDetail>(`${this.api}/profiles/${userId}`); }
  search(q: SearchQuery) { return this.http.get<Paged<ProfileCard>>(`${this.api}/profiles/search`, { params: toParams(q) }); }
  matches(page = 1, pageSize = 12) {
    return this.http.get<Paged<ProfileCard>>(`${this.api}/profiles/matches`, { params: { page, pageSize } });
  }
  dashboard() { return this.http.get<Dashboard>(`${this.api}/profiles/dashboard`); }
  recent(take = 12) { return this.http.get<ProfileCard[]>(`${this.api}/profiles/recent`, { params: { take } }); }
  shortlistedMe() { return this.http.get<ProfileCard[]>(`${this.api}/shortlist/by-others`); }

  // Notifications
  notifications() { return this.http.get<AppNotification[]>(`${this.api}/notifications`); }
  badges() { return this.http.get<Badges>(`${this.api}/notifications/badges`); }
  readNotification(id: number) { return this.http.post<void>(`${this.api}/notifications/${id}/read`, {}); }
  readAllNotifications() { return this.http.post<void>(`${this.api}/notifications/read-all`, {}); }

  // Saved searches
  savedSearches() { return this.http.get<SavedSearch[]>(`${this.api}/saved-searches`); }
  saveSearch(name: string, query: SearchQuery) { return this.http.post<SavedSearch>(`${this.api}/saved-searches`, { name, query }); }
  deleteSavedSearch(id: number) { return this.http.delete<void>(`${this.api}/saved-searches/${id}`); }

  // ID verification
  verificationStatus() { return this.http.get<VerificationStatus>(`${this.api}/verification/me`); }
  submitVerification(documentType: string, file: File) {
    const fd = new FormData();
    fd.append('documentType', documentType);
    fd.append('file', file);
    return this.http.post<VerificationStatus>(`${this.api}/verification`, fd);
  }
  visitors() { return this.http.get<Visitors>(`${this.api}/profiles/visitors`); }
  unlockContact(userId: number) { return this.http.post<ContactInfo>(`${this.api}/profiles/${userId}/contact`, {}); }

  // Plans & payments
  plans() { return this.http.get<PlansResponse>(`${this.api}/plans`); }
  myPlan() { return this.http.get<MyPlan>(`${this.api}/plans/me`); }
  createOrder(planCode: string) { return this.http.post<Checkout>(`${this.api}/payments/orders`, { planCode }); }
  verifyPayment(body: { orderId: number; razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string; demo?: boolean }) {
    return this.http.post<MyPlan>(`${this.api}/payments/verify`, body);
  }
  cancelOrder(id: number) { return this.http.post<void>(`${this.api}/payments/orders/${id}/cancel`, {}); }
  myOrders() { return this.http.get<Order[]>(`${this.api}/payments/orders`); }
  invoice(id: number) { return this.http.get<Invoice>(`${this.api}/payments/orders/${id}/invoice`); }

  // Account security
  account() { return this.http.get<Account>(`${this.api}/account`); }
  sendEmailVerification() { return this.http.post<{ delivery: string }>(`${this.api}/account/email/send`, {}); }
  verifyEmail(token: string) { return this.http.post<void>(`${this.api}/auth/verify-email`, { token }); }
  sendOtp(phone: string) { return this.http.post<{ delivery: string }>(`${this.api}/account/phone/send-otp`, { phone }); }
  verifyOtp(code: string) { return this.http.post<Account>(`${this.api}/account/phone/verify`, { code }); }
  forgotPassword(email: string) { return this.http.post<void>(`${this.api}/auth/forgot-password`, { email }); }
  resetPassword(token: string, newPassword: string) { return this.http.post<void>(`${this.api}/auth/reset-password`, { token, newPassword }); }

  // Success stories
  stories(take = 30) { return this.http.get<Story[]>(`${this.api}/stories`, { params: { take } }); }
  myStories() { return this.http.get<Story[]>(`${this.api}/stories/mine`); }
  submitStory(s: { coupleNames: string; title: string; story: string; weddingDate?: string | null; city?: string | null }) {
    return this.http.post<Story>(`${this.api}/stories`, s);
  }

  // Interests
  sendInterest(userId: number) { return this.http.post<void>(`${this.api}/interests/${userId}`, {}); }
  receivedInterests() { return this.http.get<Interest[]>(`${this.api}/interests/received`); }
  sentInterests() { return this.http.get<Interest[]>(`${this.api}/interests/sent`); }
  respondInterest(id: number, accept: boolean) { return this.http.post<void>(`${this.api}/interests/${id}/respond`, { accept }); }
  cancelInterest(id: number) { return this.http.delete<void>(`${this.api}/interests/${id}`); }

  // Shortlist
  shortlist() { return this.http.get<ProfileCard[]>(`${this.api}/shortlist`); }
  addShortlist(userId: number) { return this.http.post<void>(`${this.api}/shortlist/${userId}`, {}); }
  removeShortlist(userId: number) { return this.http.delete<void>(`${this.api}/shortlist/${userId}`); }

  // Messages
  conversations() { return this.http.get<Conversation[]>(`${this.api}/messages/conversations`); }
  thread(userId: number) { return this.http.get<Message[]>(`${this.api}/messages/${userId}`); }
  sendMessage(userId: number, content: string) { return this.http.post<Message>(`${this.api}/messages/${userId}`, { content }); }

  // Admin
  adminStats() { return this.http.get<AdminStats>(`${this.api}/admin/stats`); }
  adminUsers(q = '', page = 1) { return this.http.get<Paged<AdminUser>>(`${this.api}/admin/users`, { params: { q, page } }); }
  adminToggleActive(id: number) { return this.http.post<void>(`${this.api}/admin/users/${id}/toggle-active`, {}); }
  adminToggleVerified(id: number) { return this.http.post<void>(`${this.api}/admin/users/${id}/toggle-verified`, {}); }
  adminPayments(status = 'Paid') { return this.http.get<AdminOrder[]>(`${this.api}/admin/payments`, { params: { status } }); }
  adminGrantPlan(userId: number, planCode: string, reason: string) {
    return this.http.post<void>(`${this.api}/admin/users/${userId}/grant-plan`, { planCode, reason });
  }
  adminStories(status = 'Pending') { return this.http.get<Story[]>(`${this.api}/admin/stories`, { params: { status } }); }
  adminReviewStory(id: number, approve: boolean) { return this.http.post<void>(`${this.api}/admin/stories/${id}/review`, { approve }); }
  adminOutbox() { return this.http.get<OutboxMessage[]>(`${this.api}/admin/outbox`); }
  adminClearOutbox() { return this.http.delete<void>(`${this.api}/admin/outbox`); }
  adminVerifications(status = 'Pending') {
    return this.http.get<AdminVerification[]>(`${this.api}/admin/verifications`, { params: { status } });
  }
  /** The ID document as a Blob (needs the admin's token, so it can't be a plain link). */
  adminVerificationDocument(id: number) {
    return this.http.get(`${this.api}/admin/verifications/${id}/document`, { responseType: 'blob' });
  }
  adminReviewVerification(id: number, approve: boolean, note: string) {
    return this.http.post<void>(`${this.api}/admin/verifications/${id}/review`, { approve, note });
  }
  adminReports(status = 'Open') { return this.http.get<AdminReport[]>(`${this.api}/admin/reports`, { params: { status } }); }
  adminResolveReport(id: number, blockUser: boolean, note: string) {
    return this.http.post<void>(`${this.api}/admin/reports/${id}/resolve`, { blockUser, note });
  }
}

function toParams(obj: object): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '' && v !== false) p = p.set(k, String(v));
  }
  return p;
}

/** Pulls a readable message out of an API error response. */
export function errorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const e = err?.error;
  if (typeof e === 'string' && e) return e;
  if (e?.message) return e.message;
  if (e?.errors) return Object.values(e.errors).flat().join(' ');
  if (err?.status === 0) return 'Cannot reach the server. Is the API running?';
  return fallback;
}
