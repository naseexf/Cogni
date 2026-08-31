# CogniLearn Hub

Build a private, internal web portal for CogniLearn, an initiative of JHF IT Innovations Pvt. Ltd. (Kozhikode, Kerala) that runs a structured internship program called "Experienceship" for engineering college students. This portal is for the CogniLearn team only — it should feel like a real internal operating tool (think Notion + Linear + a lightweight CRM), not a marketing site or public-facing page.

I'm attaching the CogniLearn logo. Use it in the sidebar/header, the login screen, the browser favicon, and anywhere else branding naturally belongs. Derive the portal's color palette from the logo's colors rather than picking a generic blue SaaS theme — I want this to feel unmistakably like CogniLearn, not a template. If the logo has a dark, moody aesthetic, lean into a clean dark-mode-first design; otherwise pick a palette that complements it. Use a professional, modern sans-serif font pairing (e.g. a strong grotesk for headings, a clean readable sans for body text). Avoid default purple-gradient AI-app styling — this should look like serious internal software.

Global requirements (apply everywhere)
Auth: Simple team login (email + password) with two roles: Admin (full access, can edit everything) and Member (can view everything, can edit tasks/documents they own or are assigned to, cannot delete core records like partnership pipeline stages or org chart). Include a basic "Forgot password" flow. No public sign-up — accounts are created by an Admin from within the app (Team Directory page has an "Add team member" action that creates a login).
Persistent left sidebar navigation with sections: Dashboard, Partnership Pipeline, Tasks & Phases, Calendar, Documents & Reports, Intern Tracker, Brand & Asset Library, Templates, Team Directory, Org Chart, Announcements. Active page highlighted. Collapsible on smaller screens.
Top bar: search (global search across tasks, documents, partnerships, interns), current user avatar/name with a dropdown for profile/logout, notification bell for mentions/assignments/due dates.
Responsive: must work cleanly on desktop (primary use case) and reasonably on tablet/mobile — team members should be able to check tasks and the calendar from a phone.
No dead ends: every page needs a populated empty state with a clear call-to-action (e.g. "No tasks yet — create your first one") rather than a blank screen. Every list/table needs sorting and filtering. Every form needs inline validation and clear error messages — no silent failures, no unhandled states, no broken links. Test every interactive element before considering it done.
Seed data: Populate the app with realistic placeholder data reflecting this exact context, so it demonstrates real use from first load:
Partnerships: AWH Engineering College (Active — Experienceship track running), KMCT College of Engineering (In Progress — pivoting proposal toward a Technology Business Incubator model, two-tier structure: Experienceship + Incubation), Mohandas College of Engineering (Active).
Sample tasks under a "KMCT Proposal" initiative: e.g. "Draft TBI framing section," "Add NAAC/NBA alignment language," "Research Kerala Startup Mission + DST NIDHI-PRAYAS linkages," "Internal review round 2."
Sample intern batch: ~39 students split across "AWH Batch" and "General Batch."
Sample documents: "AWH Career Testdrive — Event Report," "AWH Promotional Poster — Lovable Prompt," "KMCT Two-Tier Proposal — Draft v3."
Sample org chart: JHF IT Innovations at top, CogniLearn as a division, roles beneath including "Stakeholder Engagement Executive."
Page 1 — Dashboard (home)

The default landing page after login. A single-glance overview:

Greeting with the user's name and today's date.
"This week" card: upcoming sessions/events pulled from the Calendar.
"My tasks" card: tasks assigned to the logged-in user, sorted by due date, with quick-complete checkboxes.
Partnership pipeline snapshot: small status cards for each active college partnership showing current stage.
Recent announcements feed (latest 3-4, with a "view all" link).
Recently added/updated documents (latest 4-5).
All cards link through to their full page.
Page 2 — Partnership Pipeline

A CRM-style board for managing college partnerships end to end.

Kanban view with stages: Prospecting → Proposal Sent → Under Review → Negotiation → Signed/Active → On Hold.
Each college is a card showing: college name, logo/initial avatar, current stage, key contact person + role, last activity date, next action, tags (e.g. "TBI," "Experienceship," "Priority").
Clicking a card opens a detail view with: full activity timeline/notes log (add dated notes), linked documents (proposals, correspondence), linked tasks, contact details, and a stage-change control.
Also offer a simple table/list view toggle for the same data.
Ability to add a new college partnership from scratch.
Page 3 — Tasks & Phases

Project/task tracker, organized by initiative (not just one flat list).

Initiatives are groupings like "KMCT Proposal," "AWH Operations," "Mohandas Partnership," "Intern Batch Management," "Brand & Comms" — each initiative has its own kanban board with columns: To Do → In Progress → In Review → Done.
Tasks have: title, description, assignee, due date, priority (Low/Medium/High), status, linked partnership (optional), linked documents (optional), comments/notes thread.
Drag-and-drop between columns.
A separate "My Tasks" filtered view and an "Overdue" filtered view accessible from the top of the page.
Ability to create new initiatives.
Page 4 — Calendar
Month and week views toggle.
Events represent sessions, college visits, deadlines, and internal meetings.
Each event has: title, date/time, location (or "online"), linked college/partnership (optional), linked task/initiative (optional), description, and an attendee/owner field.
Color-code events by type (Session, Deadline, Internal, College Visit).
Click a date to quickly add an event; click an event to see/edit full details.
"Upcoming" list view as an alternative to the grid, for quick scanning.
Page 5 — Documents & Reports
A repository, not just a file dump: each document entry has a title, type (Proposal, Event Report, Promotional Material, Lovable Prompt, Internal Note, Other), linked college/partnership (optional), upload date, uploaded-by, and tags.
Support file upload (PDF, DOCX, images) with preview thumbnails where possible, plus the option to paste in text-based content directly (useful for things like saved Lovable prompts or WhatsApp message drafts that aren't really "files").
Folder or tag-based filtering (e.g. filter by college, by document type).
Search bar searches titles, tags, and text content.
Version note field so updates to a document (e.g. "Proposal v3") are trackable without losing history — simple version list on the document detail view is enough, no need for full diffing.
Page 6 — Intern Tracker
Table of interns: name, phone number, college, batch (e.g. AWH Batch, General Batch), status (Applied/Active/Completed/Dropped), start date, notes.
Filter/sort by batch, college, and status.
Bulk import via CSV upload (so the existing Excel tracker can be migrated in).
Batch-level summary view: counts by status per batch, per college.
Quick add / quick edit inline in the table, not just a modal for every small change.
Page 7 — Brand & Asset Library
A visual grid gallery for reusable creative assets: posters, logo files, business card designs, and saved Lovable prompts used to generate/rebuild design pieces.
Each asset has: thumbnail, title, type (Poster, Logo, Business Card, Lovable Prompt, WhatsApp Template, Other), associated event/college (optional), and the actual content (image upload for visual assets, text block for prompts/message templates — with a one-click "Copy" button on any text-based asset).
Tag-based filtering.
Page 8 — Templates Hub
A small library of reusable starting-point templates: Proposal Template, Event Report Template, WhatsApp Promo Message Template, Business Card Brief Template.
Each template is a structured text document with placeholder sections (e.g. Proposal Template includes headers like "Overview," "Experienceship Track," "Incubation Track," "NAAC/NBA Alignment," "Funding Linkages") that a user can duplicate into a new Document (Page 5) and fill in.
"Use this template" button that creates a pre-filled draft in Documents & Reports.
Page 9 — Team Directory
Grid or list of team members: name, role/title, email, phone (optional), which initiatives they're currently involved in.
Admins can add/remove team members and assign roles (Admin/Member) from here — this is also where new logins get created.
Page 10 — Org Chart
Visual hierarchy: JHF IT Innovations at the top, CogniLearn as a division beneath it, roles/positions beneath that.
Simple box-and-line chart, not overly fancy — clarity over cleverness. Clicking a box shows that person's details (pulled from Team Directory) if a real person is assigned to the role.
Admins can edit the structure (add/remove/rename boxes, redraw reporting lines).
Page 11 — Announcements
Simple reverse-chronological feed of team updates. Any team member can post; posts support basic text formatting and can @mention people or link to a task/document/partnership.
Pin important announcements to the top.
Functional & quality bar
This needs to work end to end with no broken buttons, no placeholder "coming soon" pages, and no console errors. Every button either does something real or is removed.
Data should persist properly (use Lovable's built-in database/Supabase integration) — this is not a static mockup, it's meant to be used daily by a small team.
Favor clarity and speed of use over visual flourish: this tool needs to make a busy person's week easier, not slow them down with unnecessary animation or friction. Loading states and skeleton screens where data is fetching, never a blank white flash.
Keep the UI consistent across all 11 pages — same spacing system, same card/table styling, same button styles, same iconography style throughout.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cognilearnportal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9ecce99d-0f63-40f0-80b5-d3fd25f1c45d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
