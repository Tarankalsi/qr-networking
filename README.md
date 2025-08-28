# QR-Based Digital Business Card API

## 📝 Project Description
This backend API powers a **QR-Based Digital Business Card System** for events and exhibitions. It enables exhibitors and visitors to exchange contacts seamlessly using QR codes, capture leads automatically, and manage profiles.

---

## 🎯 Problem Statement
Traditional networking at large events (150+ exhibitors) is inefficient:

- Paper business cards get lost or forgotten
- Visitors fill contact forms repeatedly
- Exhibitors struggle to track and follow up leads
- Manual data entry is error-prone and slow

---

## 💡 Solution Overview
The API provides endpoints to:

- Manage exhibitor profiles
- Generate and serve QR codes
- Register and manage visitors
- Track lead capture and interactions
- Save Contact Details
- Authenticate sessions securely

---

## 🚀 Key Features
- **Smart QR Generation** – Unique QR codes for each exhibitor
- **Visitor Registration** – One-time registration per event
- **Lead Capture** – Automatic visitor info collection
- **Exchange Contacts** – Exchange Contact Details
- **Real-time Analytics** – Track visitor interactions
- **Secure Authentication** – Session and token-based authentication

---

## 🛠️ Technical Highlights
- **Backend:** Node.js + Express
- **Database:** PostgreSql
- **File Storage:** S3 Cloud storage for logos and QR codes
- **API:** RESTful endpoints with authentication
- **Security:** Input validation, secure session handling
- **Scalability:** Supports multi-booth events



---

## ⚡ API Endpoints Overview

### **Admin / Event Organizer**
| Method | URL | Description |
|--------|-----|-------------|
| POST   | `/admin/exhibitor/create-exhibitor` | Register an exhibitor |
| GET    | `/admin/exhibitor/:eventId` | Get all exhibitors for an event |
| PATCH  | `/admin/exhibitor/:exhibitorId/toggle-status` | Activate/deactivate exhibitor |
| GET    | `/admin/exhibitor/:exhibitorId/resend-credentials` | Resend login credentials to exhibitor |

### **Exhibitor**
| Method | URL | Description |
|--------|-----|-------------|
| POST   | `/auth/login` | Exhibitor login |
| GET    | `/auth/qr-analytics` | Get QR scan analytics |
| PUT    | `/profile/upload` | Update exhibitor profile |
| PATCH  | `/profile/publish` | Publish/unpublish profile |
| PATCH  | `/profile/toggle-networking` | Enable/disable networking |
| GET    | `/profile/analytics` | Profile interaction analytics |
| GET    | `/public/profile/:slug` | Fetch exhibitor profile by slug |
| POST   | `/auth/refresh-token` | Refresh JWT token |

### **Visitor**
| Method | URL | Description |
|--------|-----|-------------|
| POST   | `/visitor/register` | Register visitor |
| POST   | `/visitor/session/check` | Check visitor session |
| POST   | `/visitor/profile/:slug/save-contact` | Save exhibitor contact (vCard) |
| POST   | `/visitor/profile/:slug/interaction` | Get visitor interaction status |

## 📂 Project Structure
