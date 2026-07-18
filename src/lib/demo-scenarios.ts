/**
 * Scripted demo call scenarios for the public demo experience.
 * All content is simulated demonstration data and is labeled as such in the UI.
 */

export interface DemoTurn {
  role: "ai" | "caller";
  text: string;
}

export interface DemoScenario {
  id: string;
  industry: string;
  title: string;
  businessName: string;
  receptionistName: string;
  transcript: DemoTurn[];
  qualification: Array<{ question: string; answer: string }>;
  booking: { offered: string[]; selected: string; confirmation: string } | null;
  summary: string;
  leadScore: number;
  classification: "hot" | "warm" | "cold";
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "realtor-showing",
    industry: "Realtor",
    title: "Realtor showing request",
    businessName: "BrightPath Realty",
    receptionistName: "Sophie",
    transcript: [
      { role: "ai", text: "Thank you for calling BrightPath Realty, this is Sophie. How can I help you today?" },
      { role: "caller", text: "Hi, I saw the listing on Maple Grove Lane. Could I set up a showing this weekend?" },
      { role: "ai", text: "Absolutely — 412 Maple Grove Lane is a beautiful one. May I get your name and the best number to reach you?" },
      { role: "caller", text: "Jordan Ellis, 555-201-8842." },
      { role: "ai", text: "Thanks, Jordan. Are you currently working with an agent, and have you been preapproved for a mortgage?" },
      { role: "caller", text: "No agent yet, and yes, preapproved up to $450,000." },
      { role: "ai", text: "Perfect. Saturday I have 10:30 AM or 2:00 PM available with our listing agent. Which works better?" },
      { role: "caller", text: "2:00 PM works." },
      { role: "ai", text: "You're all set for Saturday at 2:00 PM at 412 Maple Grove Lane. I've texted you a confirmation — anything else I can help with?" },
    ],
    qualification: [
      { question: "Buying or selling?", answer: "Buying" },
      { question: "Preapproval status", answer: "Preapproved — $450,000" },
      { question: "Working with an agent?", answer: "No" },
      { question: "Timeline", answer: "Actively touring" },
    ],
    booking: {
      offered: ["Saturday 10:30 AM", "Saturday 2:00 PM"],
      selected: "Saturday 2:00 PM — Property showing, 412 Maple Grove Lane",
      confirmation: "Hi Jordan! Confirmed: showing at 412 Maple Grove Ln, Sat 2:00 PM with BrightPath Realty. Reply C to cancel.",
    },
    summary:
      "Jordan Ellis (555-201-8842) requested a showing of 412 Maple Grove Lane. Preapproved to $450K, no current agent, actively touring. Showing booked Saturday 2:00 PM. Recommended next action: listing agent confirms and prepares comps.",
    leadScore: 92,
    classification: "hot",
  },
  {
    id: "hvac-emergency",
    industry: "Home Services",
    title: "HVAC emergency inquiry",
    businessName: "Harbor Home Services",
    receptionistName: "Ava",
    transcript: [
      { role: "ai", text: "Thank you for calling Harbor Home Services, this is Ava. How can I help you today?" },
      { role: "caller", text: "Our AC died and my mother lives with us — she's 84. It's really hot. Can someone come today?" },
      { role: "ai", text: "I'm so sorry — let's treat this as a priority. Can I get your name, address, and callback number?" },
      { role: "caller", text: "Maria Gonzalez, 88 Seabreeze Court, 555-448-9917." },
      { role: "ai", text: "Thank you, Maria. You're inside our service area. Because this is urgent, I'm flagging it for our on-call technician and transferring you now. If we get disconnected, we'll call you right back at this number." },
    ],
    qualification: [
      { question: "Service needed", answer: "AC repair — no cooling" },
      { question: "Urgency", answer: "Emergency (vulnerable resident)" },
      { question: "Address in service area?", answer: "Yes — 88 Seabreeze Court" },
      { question: "Existing customer?", answer: "No" },
    ],
    booking: null,
    summary:
      "Maria Gonzalez (555-448-9917) reported a failed AC with an elderly resident at home — flagged urgent per escalation rules and transferred to the on-call technician. Recommended next action: confirm technician dispatch and follow up within 30 minutes.",
    leadScore: 88,
    classification: "hot",
  },
  {
    id: "medspa-consult",
    industry: "Med Spa",
    title: "Med spa consultation",
    businessName: "Serenity Med Spa",
    receptionistName: "Elena",
    transcript: [
      { role: "ai", text: "Thank you for calling Serenity Med Spa, this is Elena. How may I help you today?" },
      { role: "caller", text: "I'm interested in a facial treatment but I'm not sure which one is right for my skin." },
      { role: "ai", text: "A complimentary consultation with one of our licensed aestheticians would be the perfect place to start — they can assess your skin and recommend options. I can't provide medical advice myself, but I can get you booked. Are you a new client?" },
      { role: "caller", text: "Yes, first time. I'm Dana Whitfield." },
      { role: "ai", text: "Welcome, Dana! Do you have any allergies or skin sensitivities our team should know about before your visit?" },
      { role: "caller", text: "I'm allergic to salicylic acid." },
      { role: "ai", text: "Noted for your file — thank you for sharing that. I have Thursday at 1:00 PM or Friday at 11:00 AM for a consultation. Which do you prefer?" },
      { role: "caller", text: "Friday at 11." },
      { role: "ai", text: "Wonderful — Friday at 11:00 AM with our aesthetician. You'll receive a confirmation text with our intake form shortly." },
    ],
    qualification: [
      { question: "New or existing client?", answer: "New" },
      { question: "Desired service", answer: "Facial — needs consultation" },
      { question: "Allergies or concerns", answer: "Salicylic acid allergy" },
      { question: "Consultation needed?", answer: "Yes" },
    ],
    booking: {
      offered: ["Thursday 1:00 PM", "Friday 11:00 AM"],
      selected: "Friday 11:00 AM — New client consultation",
      confirmation: "Hi Dana! Your consultation at Serenity Med Spa is confirmed for Fri 11:00 AM. Please complete your intake form: {{link}}. Reply C to cancel.",
    },
    summary:
      "Dana Whitfield, new client, booked a complimentary skin consultation for Friday 11:00 AM. Allergy noted: salicylic acid. No medical advice was given; treatment recommendations deferred to the licensed aesthetician.",
    leadScore: 74,
    classification: "warm",
  },
  {
    id: "law-intake",
    industry: "Law Office",
    title: "Law office intake",
    businessName: "Carter Legal Group",
    receptionistName: "Grace",
    transcript: [
      { role: "ai", text: "Thank you for calling Carter Legal Group, this is Grace. Please note I'm a virtual receptionist — I can't provide legal advice, and this call doesn't create an attorney-client relationship. How can I help you today?" },
      { role: "caller", text: "I was in a car accident two weeks ago and I think I need a lawyer." },
      { role: "ai", text: "I'm sorry to hear that, and I can help you get a consultation scheduled. May I have your name and callback number?" },
      { role: "caller", text: "Marcus Reid, 555-772-3309." },
      { role: "ai", text: "Thank you, Marcus. To route this correctly: where did the accident occur, and do you currently have any other attorney representing you in this matter?" },
      { role: "caller", text: "Here in Wilmington. No other attorney." },
      { role: "ai", text: "Understood. Attorney Carter has consultation openings Tuesday at 9:30 AM or Wednesday at 3:00 PM. Which works for you?" },
      { role: "caller", text: "Tuesday morning." },
      { role: "ai", text: "You're booked for Tuesday at 9:30 AM. You'll get an email confirmation with what to bring. We look forward to speaking with you, Marcus." },
    ],
    qualification: [
      { question: "Legal matter type", answer: "Auto accident — personal injury" },
      { question: "Incident date", answer: "Two weeks ago" },
      { question: "Jurisdiction", answer: "Wilmington, NC" },
      { question: "Existing representation?", answer: "No" },
    ],
    booking: {
      offered: ["Tuesday 9:30 AM", "Wednesday 3:00 PM"],
      selected: "Tuesday 9:30 AM — New client consultation",
      confirmation: "Confirmed: consultation with Carter Legal Group, Tue 9:30 AM. This confirmation is not legal advice and does not create an attorney-client relationship.",
    },
    summary:
      "Marcus Reid (555-772-3309): auto accident in Wilmington two weeks ago, no existing representation. Consultation booked Tuesday 9:30 AM. Disclaimer delivered at greeting. Recommended next action: run conflict check before consultation.",
    leadScore: 85,
    classification: "hot",
  },
  {
    id: "church-service-times",
    industry: "Church",
    title: "Church service-time inquiry",
    businessName: "New Hope Community Church",
    receptionistName: "Ruth",
    transcript: [
      { role: "ai", text: "Thank you for calling New Hope Community Church, this is Ruth. How may I serve you today?" },
      { role: "caller", text: "Hi! What time are your Sunday services? We just moved to the area." },
      { role: "ai", text: "Welcome to the neighborhood! We gather Sundays at 9:00 AM and 11:00 AM, with children's ministry at both services. Would you like me to text you directions and a welcome link?" },
      { role: "caller", text: "That would be great. I'm Amy Chen." },
      { role: "ai", text: "Wonderful to meet you, Amy — I've sent that over. Is there anything else I can help with, or anyone on our staff you'd like to hear from?" },
      { role: "caller", text: "No, that's all. Thank you!" },
      { role: "ai", text: "You're so welcome. We'd love to see you Sunday, Amy. Have a blessed day!" },
    ],
    qualification: [
      { question: "Reason for calling", answer: "Service times — new to the area" },
      { question: "Permission to follow up?", answer: "Yes — welcome text sent" },
    ],
    booking: null,
    summary:
      "Amy Chen, new to the area, asked about Sunday service times (9:00 & 11:00 AM). Welcome text with directions sent with permission. Recommended next action: connections team follow-up this week.",
    leadScore: 60,
    classification: "warm",
  },
  {
    id: "church-pastoral-care",
    industry: "Church",
    title: "Church pastoral-care request",
    businessName: "New Hope Community Church",
    receptionistName: "Ruth",
    transcript: [
      { role: "ai", text: "Thank you for calling New Hope Community Church, this is Ruth. How may I serve you today?" },
      { role: "caller", text: "My husband is in the hospital... I was hoping someone could pray with us, or maybe a pastor could visit." },
      { role: "ai", text: "I'm so sorry to hear that — thank you for reaching out to us. I want to make sure our pastoral care team gets this right away. May I have your name and the best number to reach you?" },
      { role: "caller", text: "Linda Harmon, 555-390-2214. He's at St. Mary's, room 304." },
      { role: "ai", text: "Thank you, Linda. Would you like this kept confidential to the pastoral staff, or may we share it with the prayer team as well?" },
      { role: "caller", text: "Pastoral staff only, please." },
      { role: "ai", text: "Of course — pastoral staff only. Pastor Daniels will be notified right away and someone will call you shortly. You and your husband are in our prayers, Linda." },
    ],
    qualification: [
      { question: "Reason for calling", answer: "Pastoral care — hospital visit request" },
      { question: "Urgency", answer: "High" },
      { question: "Confidentiality preference", answer: "Pastoral staff only" },
      { question: "Permission to follow up?", answer: "Yes" },
    ],
    booking: null,
    summary:
      "Linda Harmon (555-390-2214) requested pastoral care — husband hospitalized at St. Mary's, room 304. Marked URGENT and CONFIDENTIAL (pastoral staff only) per routing rules. Pastor Daniels alerted immediately. Recommended next action: pastoral call within the hour.",
    leadScore: 0,
    classification: "warm",
  },
];
