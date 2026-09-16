export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: "offline-recording",
    question: "How does offline recording work exactly?",
    answer:
      "Teachers use the Bluethub mobile or desktop app to record lessons directly on their device. The recording is stored locally. When the teacher's device connects to Wi-Fi or mobile data, the recording automatically uploads to the school's cloud database where students can access it.",
  },
  {
    id: "parent-access",
    question: "Can parents access the platform on a basic smartphone?",
    answer:
      "Yes. Bluethub is optimised for low-end Android devices and runs smoothly on modest data connections. Parents can also receive SMS notifications as a fallback if they don't have a smartphone.",
  },
  {
    id: "question-bank",
    question: "How are questions organised in the question bank?",
    answer:
      "Questions are organised in a hierarchy: Subject → Topic → Subtopic. Each subtopic has its own exclusive question pool. When a teacher sets a quiz or test for a specific subtopic, only questions from that subtopic are used — preventing confusion between related topics.",
  },
  {
    id: "register-school",
    question: "Who can register a school on Bluethub?",
    answer:
      "Any school administrator, proprietor, or IT coordinator can register a school. Once registered, the admin can add classes, arms, subjects, teachers, and students. Each user receives their own login credentials and role-based access.",
  },
  {
    id: "data-security",
    question: "Is student data secure and private?",
    answer:
      "Absolutely. Bluethub uses end-to-end encryption for all data. Student data is never shared with third parties. Parents can only see data for their own children. We are compliant with Nigerian data protection regulations.",
  },
  {
    id: "coming-modules",
    question: "What other modules are coming to Bluethub?",
    answer:
      "We're currently building modules for Agriculture education, Health & Wellness training, and Vocational skills programmes. These will be released progressively and will be accessible through the same Bluethub portal.",
  },
];
