# Product Requirements Document (PRD)

## 1BT Knowledge Management System (1BT-WIKI)

**Version:** 1.0
**Date:** July 2026
**Owner:** Malindu (Full Stack Engineering Intern), 1 Billion Technology
**Status:** Draft — MVP 1 in progress

---

## 1. Overview

### 1.1 Problem Statement

1 Billion Technology employees currently lack a centralized, trustworthy place to create, discover, and validate internal knowledge (technical documentation, procedures, learnings from tech talks). Information is scattered, unmoderated, and hard to verify for accuracy.

### 1.2 Product Vision

1BT-WIKI is an internal, closed knowledge management platform where employees write and share knowledge articles, attend and revisit tech talk events, and reinforce learning through AI-generated quizzes — all gated behind a reviewer-driven quality workflow and restricted exclusively to company accounts.

### 1.3 Goals

- Give every employee a single place to publish and consume vetted internal knowledge.
- Guarantee content quality via mandatory Reviewer approval before publication.
- Increase knowledge retention through AI-generated quizzes tied to published articles.
- Keep the platform fully internal and secure (company-domain SSO only).
- Give Admins visibility and control over content, users, and events.

### 1.4 Non-Goals (Out of Scope for v1.0)

- Discussion forums / Q&A with voting
- AI assistant/search bot over the knowledge base
- Leaderboards
- Real-time (WebSocket) notifications
- Native mobile apps
- Advanced analytics dashboards
- Article version history / rollback

(See Section 9 — Future Enhancements.)

---

## 2. Target Users & Personas

| Role                    | Who                                | Primary Needs                                                                                         |
| ----------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Basic User**          | Any employee with a company email  | Write and share knowledge, learn from others' articles and tech talks, test understanding via quizzes |
| **Reviewer / Approver** | Designated senior/domain employees | Maintain content quality; approve or reject submissions with feedback                                 |
| **Admin**               | System administrators / team leads | Manage users and roles, manage tech talks, configure quizzes, view analytics                          |

### 2.1 Access Model

Access is fully closed: authentication is via Google SSO restricted to the company email domain. There is no public-facing surface.

---

## 3. Core Features (v1.0)

### 3.1 Authentication

Employees sign in via company Google SSO. A JWT is issued and used to authorize every subsequent API call. Non-company-domain sign-in attempts are rejected. Sessions can be securely signed out.

### 3.2 User & Role Management

Admins assign one of three roles (Admin, Reviewer, Basic User) and can activate/deactivate accounts. Deactivated accounts are denied access on next login. Role changes are logged.

### 3.3 Knowledge Articles

- **Create:** Basic Users write articles (title, tags, rich-text body with images) using a rich-text editor, save as Draft, or submit for review.
- **Review workflow:** Draft → Pending → Published (approved) or Rejected (with mandatory feedback). Rejected articles return to Draft for revision and resubmission.
- **Discover:** All authenticated users can browse, search (by title), and sort (title / date / views) published articles from the homepage feed or Articles section.
- **Engage:** Like and comment on published articles.
- **Manage:** Authors view their own articles (with status) on their profile; delete their own Draft articles or request deletion of Published ones. Admins can soft-delete (hide) or hard-delete any article.

### 3.4 Tech Talks (Admin-managed)

Admins create tech talk event records (title, presenters, tags, description, date, slides upload, video iframe URL), save as draft or publish. All users can view, search, and sort tech talks from the homepage and a dedicated section. Admins can hide/show or delete events.

### 3.5 Notifications

In-app notifications fire on: article submitted (→ Reviewer), article approved (→ Author), article rejected with reason (→ Author), and optionally new comment (→ Author).

### 3.6 AI-Generated Quizzes

Users generate a quiz from any Published article (via Gemini API). Users answer, submit (with confirmation), and immediately see results (correct/incorrect count, score). Users can regenerate quizzes and reattempt them, and can view their quiz history, average score, and strongest/weakest topics. Admins configure quiz generation globally (enable/disable, question count, difficulty, question types, daily limits per user).

### 3.7 Admin Dashboard

Central place for user management, tech talk management, quiz configuration, and content/engagement analytics summary widgets.

---

## 4. User Stories & Acceptance Criteria (Representative)

### Epic: Article Authoring & Review

**US-1** — As a Basic User, I want to save an article as a draft so I can finish writing later.

- AC: Draft is visible only to the author.
- AC: Draft can be edited any number of times before submission.

**US-2** — As a Basic User, I want to submit my draft for review so it can be published.

- AC: A confirmation pop-up appears before submission.
- AC: Status changes Draft → Pending; the article becomes read-only to the author until reviewed.
- AC: The Reviewer receives a notification.

**US-3** — As a Reviewer, I want to approve or reject pending articles so only quality content is published.

- AC: Approve requires confirmation and sets status to Published; author is notified.
- AC: Reject requires mandatory written feedback and sets status to Rejected; author is notified with the reason.

**US-4** — As a Basic User, I want to revise a rejected article and resubmit it.

- AC: Editing a Rejected article resets its status to Draft.
- AC: Resubmission re-enters the full approval workflow (no reviewer reassignment).

### Epic: Discovery & Engagement

**US-5** — As any authenticated user, I want to search and sort articles so I can find relevant knowledge quickly.

- AC: Search matches on title; sort options are title, created date, views.

**US-6** — As any authenticated user, I want to like and comment on articles.

- AC: One like per user per article; likes can be toggled off.
- AC: Comment owners can edit/delete their own comments; Admins can delete any comment.

### Epic: AI Quizzes

**US-7** — As a user, I want to generate a quiz from a published article to test my understanding.

- AC: Quiz generation is only available for Published articles.
- AC: Empty submissions are rejected; a confirmation is shown before submitting.
- AC: Results show total/correct/incorrect/score immediately after submission.

### Epic: Administration

**US-8** — As an Admin, I want to manage user roles and account status.

- AC: Only Admins can change roles or activate/deactivate accounts.
- AC: Deactivated users are blocked at login.

**US-9** — As an Admin, I want to publish tech talk events.

- AC: Save & Publish requires confirmation.
- AC: Editing a published event resets it to Draft until republished.

---

## 5. Prioritized Feature List

| ID   | Feature                                                 | Priority |
| ---- | ------------------------------------------------------- | -------- |
| FR1  | Secure role-based authentication via company Google SSO | High     |
| FR2  | Article create/edit/submit workflow                     | High     |
| FR3  | Reviewer approval required before publish               | High     |
| FR4  | Role-based access control (Admin/Reviewer/User)         | High     |
| FR7  | Reviewer dashboard for pending articles                 | High     |
| FR8  | Admin user management                                   | High     |
| FR5  | Likes and comments                                      | Medium   |
| FR6  | In-app notifications                                    | Medium   |
| FR9  | Tech talk management                                    | Medium   |
| FR10 | AI quiz generation and results                          | Medium   |
| FR12 | Author's own-article view with status                   | Medium   |
| FR13 | Search and sort on feed/articles                        | Medium   |
| FR11 | Admin AI quiz configuration                             | Low      |
| FR14 | Quiz history / progress tracking                        | Low      |

---

## 6. Release Plan (4 MVPs / 10 working days)

| MVP       | Scope                                                                     | Target      |
| --------- | ------------------------------------------------------------------------- | ----------- |
| **MVP 1** | Project setup, CI/CD, Auth (JWT+JWKS), User management, base architecture | In progress |
| **MVP 2** | Articles full CRUD, Review workflow, Comments, Likes                      | Day 5       |
| **MVP 3** | Tech Talks, AI Quiz Generator, Progress tracking                          | Day 8       |
| **MVP 4** | Admin Dashboard, final testing & hardening                                | Day 10      |

### Current status snapshot (see TRD/ARD for detail)

- ✅ Auth (Google SSO via Neon Auth, JWT+JWKS verification), RBAC middleware, `GET/PATCH /users/me` — complete and confirmed working end-to-end, pending Lahiru's formal review (he is on leave).
- ⬜ Articles backend — not started (next up, MVP 2).
- ⬜ Notifications, Tech Talks, Quizzes — not started (MVP 3).
- ⬜ Admin Dashboard — not started (MVP 4).

---

## 7. Success Metrics (Qualitative for internal MVP)

- All three roles can complete their core workflows end-to-end without support intervention.
- Articles cannot reach other employees without Reviewer approval (zero bypass).
- Non-company email accounts cannot authenticate (zero bypass).
- Quiz generation only ever succeeds against Published articles.
- CI pipeline (lint, test, build) passes on every PR into `dev` and `main`.

---

## 8. Constraints & Assumptions

- Internal use only; no external/public access.
- Employees have reliable internet access during working hours.
- Company provides domain-restricted Google SSO (delivered via Neon Auth).
- A provisioned AI/LLM API (Gemini) is available for quiz generation.
- Vercel and Neon Database credentials are provisioned ahead of deployment.

---

## 9. Future Enhancements (Post-v1.0)

| Feature                          | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| Discussion Forums / Q&A          | Threaded questions and answers with community voting  |
| Answer Voting & Verified Answers | Best-answer surfacing in forums                       |
| AI Assistant Bot                 | Conversational search over the knowledge base         |
| Leaderboards                     | Ranking by quiz scores, contributions, engagement     |
| Real-Time Notifications          | WebSocket-based push instead of polling               |
| Mobile Application               | Native iOS/Android clients                            |
| Advanced Analytics               | Most-viewed articles, knowledge gaps, learning trends |
| Content Version History          | Edit history with rollback                            |

---

## 10. Open Items

- Formal review/sign-off of the Auth architecture pivot (JWT+JWKS) by Lahiru (Auth domain owner), currently on leave.
- Database schema and seed data not yet created.
- Minor: GSAP `.active-indicator` target-not-found warning in `Sidebar.tsx` (cosmetic, not auth-related).
