# Bluethub product site: buyer, sitemap and copy deck

Status: draft for review. Anything assumed is marked **[CONFIRM]**.
Every product claim maps to a feature that exists in `apps/web` today. Features not built yet are labelled **Coming soon**.

---

## 1. Target buyer

| Who | Role in the decision | What they care about |
|---|---|---|
| **Proprietor / school owner** | Signs off spend | Cost, reputation with parents, fewer admin staff hours |
| **Principal** (an *Administrator* in Bluethub) | Chooses and champions | Visibility across classes, staff accountability, results |
| **Head teacher / academic lead** | Makes it work day to day | Teacher workload, exam preparation, lesson quality |
| **School administrator / IT officer** | Sets it up | Setup effort, accounts, passwords, devices |

Market: private primary and secondary schools **[CONFIRM: Nigeria first?]**.

### Top objections and where the site answers them

| Objection | Answer on the site | Section |
|---|---|---|
| "What will it cost?" | Start with a 3-month pilot, then a quote based on school size | Pilot, FAQ |
| "Our internet is unreliable" | Lessons and attendance work offline and sync later | Solution, Features, FAQ |
| "Switching will be a disruption" | We set your school up with you; everyone gets their own login | How it works, FAQ |
| "Is our data safe?" | A separate space per school, encrypted tokens, hashed passwords, role-based access, auto sign-out | Security, FAQ |
| "Teachers won't use it" | Each role sees only what it needs; support during the pilot | Features, FAQ |
| "Parents won't sign up" | The school creates parent accounts and links children; any phone browser works | Features, FAQ |
| "Does it do fees / report cards?" | Not yet: clearly marked Coming soon | Features, FAQ |

---

## 2. Sitemap

- `/` Home (single page, anchored sections)
  `#problem` · `#solution` · `#features` · `#how` · `#results` · `#security` · `#pilot` · `#faq` · `#demo`
- `/*` 404 (noindex)
- `/sitemap.xml`, `/robots.txt`

Nav: Features · How it works · Security · Pilot · FAQ · **Book a demo** (primary)

---

## 3. Copy deck

### SEO
- **Title:** Bluethub · School management and e-learning that works offline
- **Description:** Lessons, assessments, QR attendance and parent updates in one platform for your school, and it keeps working when the internet doesn't. Start a 3-month pilot.

### 1 · Hero
- **Eyebrow:** For primary and secondary schools **[CONFIRM]**
- **H1:** One place to teach, test and track your school.
- **Supporting line:** Bluethub gives your teachers, students and parents one simple platform for lessons, assessments and attendance. And it keeps working when the network doesn't.
- **CTAs:** Book a demo · See how it works
- **Trust cue:** Start with a 3-month pilot. Your school gets its own Bluethub address.
- **Rotating badge:** 3-MONTH PILOT · BOOK A DEMO ·

### 2 · The problem
- **Eyebrow:** Sound familiar?
- **H2:** School still runs on paper, group chats and good luck.
- **Line:** Registers, exercise books, spreadsheets and WhatsApp groups. Things slip through the gaps, and the people who need answers find out last.
- **Pains:**
  - **Registers that eat into lessons.** Calling names, then copying them into a book nobody can search.
  - **Marking that takes every evening.** Teachers retype the same questions and mark every script by hand.
  - **Lessons lost to bad network.** When the connection drops, the class stops, and absent students miss it for good.
  - **Parents who hear at the end of term.** By the time a report goes home, it's too late to help.
  - **Leaders working blind.** No single view of which classes, subjects or teachers need support.
- **CTA:** See how Bluethub fixes this

### 3 · The solution
- **Eyebrow:** The Bluethub way
- **H2:** Everything your school does, finally connected.
- **Line:** Classes, lessons, tests, attendance and parents live in one system, with a home for every role. Set it up once and every page stays in step.
- **Before → after:**
  - Paper registers → QR attendance in seconds, even offline
  - Retyped tests → A shared question bank, marked automatically
  - Missed lessons → Whiteboard lessons students can replay
  - End-of-term surprises → Parents see attendance as it happens
  - Guesswork → Performance by class, subject and teacher
- **CTA:** Book a demo

### 4 · Features by role
- **Eyebrow:** Built for everyone in your school
- **H2:** A home for every role.
- **Line:** Each person signs in to a space made for them, with only what they need.

**School leaders** (principals and administrators)
- **Heading:** See your whole school at a glance.
- Set up classes, subjects and the full curriculum, topic by topic
- Register staff, students and parents, and link parents to their children
- Approve lessons before students see them
- Track performance by class, subject and teacher
- Choose exactly what each staff member can do
- Put your school's logo on every screen
- *Mockup:* admin dashboard, "Performance by Classroom"

**Teachers** (subject teachers, class teachers and head teachers)
- **Heading:** Teach once. Reach every student.
- Record lessons on a digital whiteboard with your voice, even offline
- Take attendance by scanning each student's QR code
- Build a question bank by topic, or pull questions from scanned papers
- Create quizzes and timed assessments that mark themselves
- See exactly which questions a class got wrong with Exam Focus
- *Note:* Head teachers also get a whole-class view by topic and by student.
- *Mockup:* whiteboard recording

**Students**
- **Heading:** Learn at their own pace, online or off.
- Replay any recorded lesson, or download it to watch offline
- Answer by choosing, typing, drawing or speaking
- See scores by subject and by subtopic
- Study together in groups and the class discussion forum
- *Mockup:* assessment with a drawn answer

**Parents**
- **Heading:** Know how your child is doing, as it happens.
- See attendance for each child, session by session
- Spot patterns, like a subject they keep missing
- Set a practice quiz from topics they were actually taught
- Switch between children in one account
- *Mockup:* parent overview

- **Coming soon strip:** Fee tracking · Report cards · Timetables · SMS alerts · Library · School calendar
- **CTA:** Book a demo

### 5 · How it works
- **Eyebrow:** Getting started
- **H2:** Up and running without the upheaval.
- **Line:** We set Bluethub up with you, so your staff can keep teaching.
- **Steps:**
  1. **Book a demo.** See Bluethub with your classes in mind, and agree what your pilot should prove.
  2. **We set up your school.** Your own Bluethub address and logo, with your classes, subjects and curriculum. **[CONFIRM who does setup]**
  3. **Add your people.** Register teachers, students and parents. Everyone gets their own login and role.
  4. **Go live.** Teachers start recording, testing and taking attendance, with our support through the first weeks. **[CONFIRM support]**
- **CTA:** Start your 3-month pilot

### 6 · Benefits and results
- **Eyebrow:** What changes
- **H2:** Less admin. More teaching.
- **Line:** Here's what Bluethub takes off your staff's plate from day one.
- **Benefits:**
  - **Teaching survives bad network.** Lessons and attendance work offline and sync when you're back online.
  - **Fewer evenings marking.** Quizzes and objective questions mark themselves.
  - **No more retyping past papers.** Pull questions straight from scanned papers into your bank.
  - **Registers that count themselves.** Attendance rates and absence lists build automatically.
  - **Exam prep that targets weak spots.** Exam Focus shows the questions a class keeps missing.
  - **Parents who stay involved.** Attendance and practice quizzes, right on their phone.
- **Product facts (count-up):** 4 ways students can answer · 3 types of attendance session · 6 kinds of user, each with its own access
- **Placeholders (to supply):** Schools on Bluethub · Hours saved per teacher each week · Change in attendance; two testimonial slots (a principal, a parent)

### 7 · Security and privacy
- **Eyebrow:** Security and privacy
- **H2:** Your school's data stays your school's.
- **Line:** Every school runs in its own separate space, and every sign-in is protected.
- **Points:**
  - **A separate space for every school.** Each school has its own address, and its data is kept apart from every other school's. **[CONFIRM: "encrypted per school" wording]**
  - **Encrypted sign-in tokens.** Sessions use encrypted, expiring tokens that renew securely.
  - **Passwords never travel in plain text.** They're hashed before they leave the device.
  - **Automatic sign-out.** Idle sessions end after 30 minutes.
  - **Access by role.** People see only what their role allows. Parents see only their own children.
  - **Staff permissions you control.** Administrators decide what each staff member can do.
- **Note:** Hosting location, backups and NDPR compliance **[CONFIRM before publishing any claim]**
- **CTA:** Ask us about security

### 8 · Pilot offer
- **Eyebrow:** Pilot offer
- **H2:** Try Bluethub for three months.
- **Line:** Run it with real classes, see what changes, then decide. **[CONFIRM: free or paid pilot]**
- **Included:** Your own school address and branding · Setup of classes, subjects and curriculum · Accounts for staff, students and parents · Every current feature for every role · A review together at the end **[CONFIRM]**
- **CTA:** Start your pilot · Questions? Talk to us

### 9 · FAQ
1. **What does Bluethub cost?** Every school starts with a 3-month pilot so you can see the value first. After that, pricing depends on the size of your school, and we'll give you a clear quote. **[CONFIRM]**
2. **Our internet is unreliable. Will it still work?** Yes. Teachers can record lessons and take attendance with no connection. Everything is saved on the device and syncs automatically when the network returns. Students can also download lessons to watch offline.
3. **Do we need special devices?** No. Bluethub runs in the web browser on phones, tablets and laptops, and can be installed like an app. QR attendance uses the phone's camera. **[CONFIRM minimum specs]**
4. **How long does setup take, and who does it?** **[CONFIRM]** We set up your school's address, logo, classes and subjects with you, then you add your staff, students and parents.
5. **Will our teachers need training?** Each role only sees what it needs, so it's quick to learn. We walk your staff through it during the pilot. **[CONFIRM]**
6. **How do parents get access?** Your school creates a parent account and links it to their children. Parents sign in from any phone browser.
7. **Is our data safe?** Each school has its own separate space. Sign-ins use encrypted tokens, passwords are hashed, idle sessions end automatically, and everyone sees only what their role allows.
8. **Can we bring in our existing records?** During setup we add your classes, subjects, staff and students. **[CONFIRM how existing records are imported]**
9. **Do you handle fees and report cards?** Not yet. Fee tracking, report cards, timetables, SMS alerts, a library and a school calendar are coming soon.

### 10 · Demo request
- **Eyebrow:** Book a demo
- **H2:** See Bluethub with your school in mind.
- **Line:** Tell us a little about your school. We'll set up a demo and plan your 3-month pilot together.
- **Fields:** Your name · Your role (Proprietor or owner / Principal / Head teacher / School administrator / Teacher / Other) · School name · Work email ("We'll only use this to arrange your demo.") · Phone, optional ("Useful if email is slow to reach you.") · Number of students, optional (Under 200 / 200–500 / 500–1,000 / Over 1,000) · Anything we should know?, optional
- **Submit:** Book my demo
- **Errors:** "Please tell us your name." · "Which best describes your role?" · "Please add your school's name." · "We need an email to reach you." · "That email doesn't look right. Try name@school.com."
- **Error summary:** "{n} things need fixing before we can send this."
- **Success:** "Your demo request is ready to send." / "We've opened your email app with your details filled in. Press send and it reaches us. We reply within two working days." **[CONFIRM reply time]**
- **Fallback:** "Nothing opened? Email us at hello@bluethub.com." **[CONFIRM email]**

### 11 · Footer
- **Line:** One place to teach, test and track your school.
- **Columns:** Product (Features, How it works, Security, Pilot, FAQ) · Get started (Book a demo, Start your pilot, Email us)
- **Legal:** Privacy policy · Terms of service (coming soon) **[CONFIRM]**

### 404
- **H1:** This page skipped class.
- **Line:** The link may be old or mistyped. Let's get you somewhere useful.
- **CTAs:** Back to the homepage · Book a demo

---

## 4. Open [CONFIRM] items
1. Target market and school types (primary, secondary, Nigeria).
2. Who performs setup and what onboarding support is included.
3. Free or paid pilot; what is included; what happens after.
4. Wording for per-school data separation / encryption; hosting, backups, NDPR.
5. Minimum device requirements.
6. How existing records are brought in.
7. Contact email and reply-time promise; social links; legal pages.

## 5. Assets still needed
- Real product screenshots (the site ships faithful mockups built from the app's real screens until then)
- Figures for the three result placeholders
- Two testimonials (a principal, a parent)
- 1200×630 social preview image (`public/og-image.png`)
