/**
 * Home page copy, mirroring docs/copy-deck.md.
 * Every product claim maps to a feature in apps/web. Unbuilt features are
 * listed under ROADMAP. `confirm` notes render as markers in dev only.
 */
import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  FileText,
  LibraryBig,
  MessageSquareText,
  CalendarX2,
  ClipboardCheck,
  Clock4,
  FileScan,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  MessageSquareOff,
  NotebookPen,
  QrCode,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Users,
  Wallet,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

export const HERO = {
  eyebrow: "For primary and secondary schools",
  eyebrowConfirm: "Target market: primary and secondary schools (Nigeria first?)",
  title: "One place to teach, test and track your school.",
  lede: "Bluethub gives your teachers, students and parents one simple platform for lessons, assessments and attendance. And it keeps working when the network doesn't.",
  primary: { label: "Book a demo", href: "#demo" },
  secondary: { label: "See how it works", href: "#how" },
  trust: "Start with a 3-month pilot. Your school gets its own Bluethub address.",
  badge: "3-month pilot · book a demo · ",
} as const;

export interface Pain {
  icon: LucideIcon;
  title: string;
  line: string;
}

export const PROBLEM = {
  eyebrow: "Sound familiar?",
  title: "School still runs on paper, group chats and good luck.",
  lede: "Registers, exercise books, spreadsheets and WhatsApp groups. Things slip through the gaps, and the people who need answers find out last.",
  action: { label: "See how Bluethub fixes this", href: "#solution" },
};

export const PAINS: Pain[] = [
  { icon: ClipboardCheck, title: "Registers that eat into lessons", line: "Calling names, then copying them into a book nobody can search." },
  { icon: NotebookPen, title: "Marking that takes every evening", line: "Teachers retype the same questions and mark every script by hand." },
  { icon: WifiOff, title: "Lessons lost to bad network", line: "When the connection drops, the class stops, and absent students miss it for good." },
  { icon: CalendarX2, title: "Parents who hear at the end of term", line: "By the time a report goes home, it's too late to help." },
  { icon: MessageSquareOff, title: "Leaders working blind", line: "No single view of which classes, subjects or teachers need support." },
];

export const SOLUTION = {
  eyebrow: "The Bluethub way",
  title: "Everything your school does, finally connected.",
  lede: "Classes, lessons, tests, attendance and parents live in one system, with a home for every role. Set it up once and every page stays in step.",
  action: { label: "Book a demo", href: "#demo" },
};

export const BEFORE_AFTER: { before: string; after: string }[] = [
  { before: "Paper registers", after: "QR attendance in seconds, even offline" },
  { before: "Retyped tests", after: "A shared question bank, marked automatically" },
  { before: "Missed lessons", after: "Whiteboard lessons students can replay" },
  { before: "End-of-term surprises", after: "Parents see attendance as it happens" },
  { before: "Guesswork", after: "Performance by class, subject and teacher" },
];

export type RoleId = "leaders" | "teachers" | "students" | "parents";

export interface RoleFeature {
  id: RoleId;
  tab: string;
  who: string;
  title: string;
  points: string[];
  note?: string;
}

export const FEATURES_INTRO = {
  eyebrow: "Built for everyone in your school",
  title: "A home for every role.",
  lede: "Each person signs in to a space made for them, with only what they need.",
  action: { label: "Book a demo", href: "#demo" },
};

export const ROLES: RoleFeature[] = [
  {
    id: "leaders",
    tab: "School leaders",
    who: "Principals and administrators",
    title: "See your whole school at a glance.",
    points: [
      "Set up classes, subjects and the full curriculum, topic by topic",
      "Register staff, students and parents, and link parents to their children",
      "Approve lessons before students see them",
      "Track performance by class, subject and teacher",
      "Choose exactly what each staff member can do",
      "Put your school's logo on every screen",
    ],
  },
  {
    id: "teachers",
    tab: "Teachers",
    who: "Subject teachers, class teachers and head teachers",
    title: "Teach once. Reach every student.",
    points: [
      "Record lessons on a digital whiteboard with your voice, even offline",
      "Take attendance by scanning each student's QR code",
      "Build a question bank by topic, or pull questions from scanned papers",
      "Create quizzes and timed assessments that mark themselves",
      "See exactly which questions a class got wrong with Exam Focus",
    ],
    note: "Head teachers also get a whole-class view by topic and by student.",
  },
  {
    id: "students",
    tab: "Students",
    who: "Every learner",
    title: "Learn at their own pace, online or off.",
    points: [
      "Replay any recorded lesson, or download it to watch offline",
      "Answer by choosing, typing, drawing or speaking",
      "See scores by subject and by subtopic",
      "Study together in groups and the class discussion forum",
    ],
  },
  {
    id: "parents",
    tab: "Parents",
    who: "Parents and guardians",
    title: "Know how your child is doing, as it happens.",
    points: [
      "See attendance for each child, session by session",
      "Spot patterns, like a subject they keep missing",
      "Set a practice quiz from topics they were actually taught",
      "Switch between children in one account",
    ],
  },
];

export type RoadmapPreviewId = "fees" | "reports" | "sms" | "timetable" | "calendar" | "library";

export interface RoadmapItem {
  id: RoadmapPreviewId;
  name: string;
  line: string;
  icon: LucideIcon;
  confirm?: string;
}

export interface RoadmapGroup {
  id: "next" | "later";
  label: string;
  when: string;
  items: RoadmapItem[];
}

/** Ordered by priority, not alphabetically. Order and timing are [CONFIRM]. */
export const ROADMAP = {
  eyebrow: "Roadmap",
  title: "Built for today. Growing with your school.",
  lede: "Everything above is live now. Here's what we're building next, in the order school leaders ask for it.",
  cta: { label: "Request a feature", subject: "Feature request for Bluethub" },
  timingConfirm: "Priority order and timing for each group.",
  groups: [
    {
      id: "next",
      label: "Next up",
      when: "Early 2027",
      items: [
        { id: "fees", icon: Wallet, name: "Fee tracking", line: "See who has paid, who owes and what's overdue, without chasing receipts." },
        { id: "reports", icon: FileText, name: "Report cards", line: "Turn the scores already in Bluethub into end-of-term reports in minutes." },
        { id: "sms", icon: MessageSquareText, name: "SMS alerts", line: "Reach parents without data or a smartphone, for absences, results and notices." },
      ],
    },
    {
      id: "later",
      label: "Later",
      when: "2027",
      items: [
        { id: "timetable", icon: CalendarClock, name: "Timetables", line: "Build a clash-free timetable for every class, teacher and room.", confirm: "'Clash-free' promise." },
        { id: "calendar", icon: CalendarDays, name: "School calendar", line: "Terms, exams, holidays and events in one calendar staff and parents can see." },
        { id: "library", icon: LibraryBig, name: "Library", line: "Track books, loans and returns, and spot what's overdue at a glance." },
      ],
    },
  ] as RoadmapGroup[],
};

export const HOW = {
  eyebrow: "Getting started",
  title: "Up and running without the upheaval.",
  lede: "We set Bluethub up with you, so your staff can keep teaching.",
  action: { label: "Start your 3-month pilot", href: "#pilot" },
  steps: [
    { title: "Book a demo", line: "See Bluethub with your classes in mind, and agree what your pilot should prove." },
    {
      title: "We set up your school",
      line: "Your own Bluethub address and logo, with your classes, subjects and curriculum.",
      confirm: "Who performs setup?",
    },
    { title: "Add your people", line: "Register teachers, students and parents. Everyone gets their own login and role." },
    {
      title: "Go live",
      line: "Teachers start recording, testing and taking attendance, with our support through the first weeks.",
      confirm: "What onboarding support is included?",
    },
  ] as { title: string; line: string; confirm?: string }[],
};

export interface Benefit {
  icon: LucideIcon;
  title: string;
  line: string;
}

export const RESULTS = {
  eyebrow: "What changes",
  title: "Less admin. More teaching.",
  lede: "Here's what Bluethub takes off your staff's plate from day one.",
};

export const BENEFITS: Benefit[] = [
  { icon: WifiOff, title: "Teaching survives bad network", line: "Lessons and attendance work offline and sync when you're back online." },
  { icon: BookOpenCheck, title: "Fewer evenings marking", line: "Quizzes and objective questions mark themselves." },
  { icon: FileScan, title: "No more retyping past papers", line: "Pull questions straight from scanned papers into your bank." },
  { icon: QrCode, title: "Registers that count themselves", line: "Attendance rates and absence lists build automatically." },
  { icon: Target, title: "Exam prep that targets weak spots", line: "Exam Focus shows the questions a class keeps missing." },
  { icon: Users, title: "Parents who stay involved", line: "Attendance and practice quizzes, right on their phone." },
];

/** Product facts that are true today (counted up on scroll). */
export const FACTS = [
  { value: 4, label: "ways students can answer", detail: "Choose, type, draw or speak" },
  { value: 3, label: "types of attendance session", detail: "Class, subject or topic" },
  { value: 6, label: "kinds of user, each with its own access", detail: "From principal to parent" },
];

/** Figures Bluethub will supply later; shown as labelled placeholders. */
export const RESULT_PLACEHOLDERS = ["Schools on Bluethub", "Hours saved per teacher each week", "Change in attendance"];

export const TESTIMONIAL_PLACEHOLDERS = [
  { hint: "A principal on what changed for their staff and school.", who: "Name, Principal, School" },
  { hint: "A parent on staying close to their child's learning.", who: "Name, Parent, School" },
];

export interface SecurityPoint {
  icon: LucideIcon;
  title: string;
  line: string;
  confirm?: string;
}

export const SECURITY = {
  eyebrow: "Security and privacy",
  title: "Your school's data stays your school's.",
  lede: "Every school runs in its own separate space, and every sign-in is protected.",
  action: { label: "Ask us about security", href: "#demo" },
  confirm: "Hosting location, backups and NDPR compliance: confirm before adding any claim.",
};

export const SECURITY_POINTS: SecurityPoint[] = [
  {
    icon: ShieldCheck,
    title: "A separate space for every school",
    line: "Each school has its own address, and its data is kept apart from every other school's.",
    confirm: "Wording for per-school (multi-tenant) encryption.",
  },
  { icon: KeyRound, title: "Encrypted sign-in tokens", line: "Sessions use encrypted, expiring tokens that renew securely." },
  { icon: Fingerprint, title: "Passwords never travel in plain text", line: "They're hashed before they leave the device." },
  { icon: Clock4, title: "Automatic sign-out", line: "Idle sessions end after 30 minutes." },
  { icon: LockKeyhole, title: "Access by role", line: "People see only what their role allows. Parents see only their own children." },
  { icon: SlidersHorizontal, title: "Staff permissions you control", line: "Administrators decide what each staff member can do." },
];

export const PILOT = {
  eyebrow: "Pilot offer",
  title: "Try Bluethub for three months.",
  lede: "Run it with real classes, see what changes, then decide.",
  ledeConfirm: "Free or paid pilot?",
  included: [
    "Your own school address and branding",
    "Setup of classes, subjects and curriculum",
    "Accounts for staff, students and parents",
    "Every current feature for every role",
    "A review together at the end",
  ],
  includedConfirm: "Confirm what the pilot includes.",
  primary: { label: "Start your pilot", href: "#demo" },
  secondary: { label: "Questions? Talk to us", href: "#faq" },
  badge: "3-month pilot · start this term · ",
};

export const FAQ: { q: string; a: string; confirm?: string }[] = [
  {
    q: "What does Bluethub cost?",
    a: "Every school starts with a 3-month pilot so you can see the value first. After that, pricing depends on the size of your school, and we'll give you a clear quote.",
    confirm: "Pricing approach after the pilot.",
  },
  {
    q: "Our internet is unreliable. Will it still work?",
    a: "Yes. Teachers can record lessons and take attendance with no connection. Everything is saved on the device and syncs automatically when the network returns. Students can also download lessons to watch offline.",
  },
  {
    q: "Do we need special devices?",
    a: "No. Bluethub runs in the web browser on phones, tablets and laptops, and can be installed like an app. QR attendance uses the phone's camera.",
    confirm: "Minimum device requirements.",
  },
  {
    q: "How long does setup take, and who does it?",
    a: "We set up your school's address, logo, classes and subjects with you. Then you add your staff, students and parents, and you're ready to go.",
    confirm: "Setup time and who does it.",
  },
  {
    q: "Will our teachers need training?",
    a: "Each role only sees what it needs, so it's quick to learn. We walk your staff through it during the pilot.",
    confirm: "Training offered during the pilot.",
  },
  {
    q: "How do parents get access?",
    a: "Your school creates a parent account and links it to their children. Parents sign in from any phone browser.",
  },
  {
    q: "Is our data safe?",
    a: "Each school has its own separate space. Sign-ins use encrypted tokens, passwords are hashed, idle sessions end automatically, and everyone sees only what their role allows.",
  },
  {
    q: "Can we bring in our existing records?",
    a: "During setup we add your classes, subjects, staff and students with you, so you start with your own school's structure.",
    confirm: "How existing records are imported.",
  },
  {
    q: "Do you handle fees and report cards?",
    a: "Not yet. Fee tracking, report cards, timetables, SMS alerts, a library and a school calendar are coming soon.",
  },
];

export const DEMO = {
  eyebrow: "Book a demo",
  title: "See Bluethub with your school in mind.",
  lede: "Tell us a little about your school. We'll set up a demo and plan your 3-month pilot together.",
  points: ["A 30-minute walkthrough for your leadership team", "Your questions about setup, data and pricing answered", "A pilot plan built around your school"],
  pointsConfirm: "Demo length and format.",
};

