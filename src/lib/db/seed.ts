/**
 * Seed script — realistic demo data for every supported vertical.
 * Run with: npm run db:seed
 *
 * Idempotent: skips seeding when the platform organization already exists.
 * All demo organizations are flagged isDemo=true.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "./index";
import { newId } from "../ids";
import { hashPassword } from "../auth/passwords";
import { PLAN_DEFINITIONS, type PlanTier } from "../plans";

type Db = Awaited<ReturnType<typeof getDb>>;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface DemoOrgSpec {
  name: string;
  slug: string;
  industry: (typeof schema.industryEnum.enumValues)[number];
  plan: PlanTier;
  ownerName: string;
  ownerEmail: string;
  receptionist: { name: string; tone: string; greeting: string };
  profile: {
    phone: string;
    city: string;
    state: string;
    timeZone: string;
    serviceAreas: string[];
  };
  disclaimers: string[];
  faqs: Array<{ q: string; a: string; category: string }>;
  qualification: Array<{
    prompt: string;
    type: (typeof schema.questionTypeEnum.enumValues)[number];
    required: boolean;
    scoreImpact: number;
  }>;
  calls: Array<{
    fromNumber: string;
    callerName: string;
    minutesAgo: number;
    durationSeconds: number;
    status: (typeof schema.callStatusEnum.enumValues)[number];
    outcome: (typeof schema.callOutcomeEnum.enumValues)[number] | null;
    sentiment: string;
    urgency: string;
    reason: string;
    summary: string;
    smsSummary: string;
    transcript: Array<{ role: string; text: string }>;
    lead?: {
      status: (typeof schema.leadStatusEnum.enumValues)[number];
      classification: (typeof schema.leadClassificationEnum.enumValues)[number];
      score: number;
      service: string;
      answers: Array<{ q: string; a: string }>;
    };
    appointment?: { service: string; inDays: number; hour: number; durationMinutes: number };
  }>;
}

const DEMO_ORGS: DemoOrgSpec[] = [
  {
    name: "BrightPath Realty",
    slug: "brightpath-realty",
    industry: "realtor",
    plan: "growth",
    ownerName: "Rachel Brightman",
    ownerEmail: "owner@brightpathrealty.example",
    receptionist: {
      name: "Sophie",
      tone: "warm_friendly",
      greeting:
        "Thank you for calling BrightPath Realty, this is Sophie. How can I help you today?",
    },
    profile: {
      phone: "+19105550110",
      city: "Wilmington",
      state: "NC",
      timeZone: "America/New_York",
      serviceAreas: ["Wilmington", "Wrightsville Beach", "Leland", "Carolina Beach"],
    },
    disclaimers: [],
    faqs: [
      { q: "What areas do you serve?", a: "We serve Wilmington, Wrightsville Beach, Leland, and Carolina Beach.", category: "General" },
      { q: "Do you help first-time buyers?", a: "Absolutely — our agents specialize in walking first-time buyers through every step, including lender referrals.", category: "Buying" },
      { q: "How do I get a home valuation?", a: "We offer free home valuations. I can collect your property address and an agent will prepare a market analysis within one business day.", category: "Selling" },
    ],
    qualification: [
      { prompt: "Are you looking to buy or sell?", type: "multiple_choice", required: true, scoreImpact: 0 },
      { prompt: "What area are you interested in?", type: "short_text", required: true, scoreImpact: 5 },
      { prompt: "What is your budget range?", type: "budget_range", required: false, scoreImpact: 10 },
      { prompt: "Have you been preapproved for a mortgage?", type: "yes_no", required: false, scoreImpact: 20 },
      { prompt: "What is your timeline?", type: "multiple_choice", required: false, scoreImpact: 15 },
    ],
    calls: [
      {
        fromNumber: "+19105550187",
        callerName: "Jordan Ellis",
        minutesAgo: 90,
        durationSeconds: 262,
        status: "completed",
        outcome: "appointment_booked",
        sentiment: "positive",
        urgency: "medium",
        reason: "Showing request — 412 Maple Grove Lane",
        summary:
          "Jordan Ellis requested a showing of 412 Maple Grove Lane. Preapproved to $450K, no current agent, actively touring. Showing booked Saturday 2:00 PM.",
        smsSummary: "New showing booked: Jordan Ellis, 412 Maple Grove Ln, Sat 2PM. Preapproved $450K. HOT lead.",
        transcript: [
          { role: "assistant", text: "Thank you for calling BrightPath Realty, this is Sophie. How can I help you today?" },
          { role: "caller", text: "Hi, I saw the listing on Maple Grove Lane. Could I set up a showing this weekend?" },
          { role: "assistant", text: "Absolutely — may I get your name and best callback number?" },
          { role: "caller", text: "Jordan Ellis, 910-555-0187." },
          { role: "assistant", text: "Saturday I have 10:30 AM or 2:00 PM. Which works better?" },
          { role: "caller", text: "2 PM works great." },
          { role: "assistant", text: "You're all set for Saturday at 2:00 PM. I've texted you a confirmation." },
        ],
        lead: {
          status: "appointment_booked",
          classification: "hot",
          score: 92,
          service: "Property showing",
          answers: [
            { q: "Are you looking to buy or sell?", a: "Buying" },
            { q: "Have you been preapproved for a mortgage?", a: "Yes — $450,000" },
            { q: "What is your timeline?", a: "Actively touring" },
          ],
        },
        appointment: { service: "Property showing — 412 Maple Grove Ln", inDays: 2, hour: 14, durationMinutes: 45 },
      },
      {
        fromNumber: "+19105550023",
        callerName: "Priya Natarajan",
        minutesAgo: 60 * 26,
        durationSeconds: 180,
        status: "completed",
        outcome: "lead_captured",
        sentiment: "neutral",
        urgency: "low",
        reason: "Home valuation request",
        summary:
          "Priya Natarajan requested a valuation for 2201 Live Oak Dr. Considering selling in 3-6 months. Contact info captured; CMA to be prepared.",
        smsSummary: "Valuation request: Priya Natarajan, 2201 Live Oak Dr, selling in 3-6 mo.",
        transcript: [
          { role: "assistant", text: "Thank you for calling BrightPath Realty, this is Sophie. How can I help you today?" },
          { role: "caller", text: "I'd like to know what my house might be worth." },
          { role: "assistant", text: "Happy to help — may I get the property address and your contact information?" },
          { role: "caller", text: "2201 Live Oak Drive. I'm Priya Natarajan, 910-555-0023." },
          { role: "assistant", text: "Thank you! An agent will prepare a free market analysis within one business day." },
        ],
        lead: {
          status: "new",
          classification: "warm",
          score: 68,
          service: "Home valuation",
          answers: [
            { q: "Are you looking to buy or sell?", a: "Selling" },
            { q: "What is your timeline?", a: "3-6 months" },
          ],
        },
      },
      {
        fromNumber: "+19105550344",
        callerName: "",
        minutesAgo: 60 * 5,
        durationSeconds: 0,
        status: "missed",
        outcome: "follow_up_required",
        sentiment: "neutral",
        urgency: "medium",
        reason: "Missed call — text-back sent",
        summary: "Missed call from (910) 555-0344. Missed-call text-back sent within 30 seconds.",
        smsSummary: "Missed call from (910) 555-0344 — text-back sent.",
        transcript: [],
      },
    ],
  },
  {
    name: "Harbor Home Services",
    slug: "harbor-home-services",
    industry: "home_services",
    plan: "premium",
    ownerName: "Mike Harbor",
    ownerEmail: "owner@harborhome.example",
    receptionist: {
      name: "Ava",
      tone: "calm_reassuring",
      greeting:
        "Thank you for calling Harbor Home Services, this is Ava. How can I help you today?",
    },
    profile: {
      phone: "+19105550220",
      city: "Wilmington",
      state: "NC",
      timeZone: "America/New_York",
      serviceAreas: ["Wilmington", "Hampstead", "Leland", "Southport"],
    },
    disclaimers: [
      "For life-threatening emergencies such as fire or gas leaks, please hang up and dial 911. We are not an emergency service.",
    ],
    faqs: [
      { q: "Do you offer emergency service?", a: "Yes, we have an on-call technician for urgent HVAC and plumbing issues. For life-threatening emergencies, always call 911 first.", category: "Service" },
      { q: "What are your service hours?", a: "Regular hours are Monday through Friday 8 AM to 6 PM, Saturday 9 AM to 2 PM, with 24/7 on-call for emergencies.", category: "Hours" },
      { q: "Do you give free estimates?", a: "Yes — estimates for installations and replacements are free. Diagnostic visits for repairs have a service fee that's credited toward the work.", category: "Pricing" },
    ],
    qualification: [
      { prompt: "What service do you need?", type: "service_type", required: true, scoreImpact: 10 },
      { prompt: "What is the service address?", type: "address", required: true, scoreImpact: 5 },
      { prompt: "How urgent is the issue?", type: "urgency_level", required: true, scoreImpact: 20 },
      { prompt: "Are you an existing customer?", type: "yes_no", required: false, scoreImpact: 5 },
      { prompt: "Briefly describe the issue.", type: "long_text", required: false, scoreImpact: 0 },
    ],
    calls: [
      {
        fromNumber: "+19105550917",
        callerName: "Maria Gonzalez",
        minutesAgo: 45,
        durationSeconds: 150,
        status: "completed",
        outcome: "call_transferred",
        sentiment: "negative",
        urgency: "high",
        reason: "AC failure — vulnerable resident, escalated",
        summary:
          "Maria Gonzalez reported failed AC with an 84-year-old resident at home. Flagged urgent per escalation rules and transferred to on-call technician.",
        smsSummary: "URGENT: AC down at 88 Seabreeze Ct (elderly resident). Transferred to on-call tech.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Harbor Home Services, this is Ava. How can I help you today?" },
          { role: "caller", text: "Our AC died and my 84-year-old mother lives with us. It's really hot. Can someone come today?" },
          { role: "assistant", text: "I'm so sorry — let's treat this as a priority. Can I get your name, address, and callback number?" },
          { role: "caller", text: "Maria Gonzalez, 88 Seabreeze Court, 910-555-0917." },
          { role: "assistant", text: "Thank you, Maria. I'm flagging this urgent and transferring you to our on-call technician now." },
        ],
        lead: {
          status: "qualified",
          classification: "hot",
          score: 88,
          service: "AC repair",
          answers: [
            { q: "What service do you need?", a: "AC repair — no cooling" },
            { q: "How urgent is the issue?", a: "Emergency (vulnerable resident)" },
            { q: "Are you an existing customer?", a: "No" },
          ],
        },
      },
      {
        fromNumber: "+19105550366",
        callerName: "Tom Becker",
        minutesAgo: 60 * 30,
        durationSeconds: 210,
        status: "completed",
        outcome: "appointment_booked",
        sentiment: "positive",
        urgency: "low",
        reason: "Water heater replacement estimate",
        summary:
          "Tom Becker requested a free estimate for a water heater replacement. Booked Thursday 9:00 AM.",
        smsSummary: "Estimate booked: Tom Becker, water heater replacement, Thu 9AM.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Harbor Home Services, this is Ava. How can I help you today?" },
          { role: "caller", text: "My water heater is 15 years old — I'd like a quote on replacing it." },
          { role: "assistant", text: "We offer free estimates for replacements. I have Thursday at 9:00 AM or Friday at 1:00 PM." },
          { role: "caller", text: "Thursday at 9 works." },
          { role: "assistant", text: "Booked! You'll receive a confirmation text shortly." },
        ],
        lead: {
          status: "appointment_booked",
          classification: "warm",
          score: 71,
          service: "Water heater replacement",
          answers: [
            { q: "What service do you need?", a: "Water heater replacement" },
            { q: "How urgent is the issue?", a: "This week" },
            { q: "Are you an existing customer?", a: "Yes" },
          ],
        },
        appointment: { service: "Water heater replacement estimate", inDays: 3, hour: 9, durationMinutes: 60 },
      },
      {
        fromNumber: "+19105550481",
        callerName: "",
        minutesAgo: 60 * 3,
        durationSeconds: 25,
        status: "abandoned",
        outcome: "follow_up_required",
        sentiment: "neutral",
        urgency: "medium",
        reason: "Caller hung up during greeting — text-back sent",
        summary: "Caller disconnected during greeting. Missed-call text-back sent; awaiting reply.",
        smsSummary: "Missed call from (910) 555-0481 — text-back sent.",
        transcript: [],
      },
    ],
  },
  {
    name: "Serenity Med Spa",
    slug: "serenity-med-spa",
    industry: "med_spa",
    plan: "growth",
    ownerName: "Dr. Lena Okafor",
    ownerEmail: "owner@serenitymedspa.example",
    receptionist: {
      name: "Elena",
      tone: "professional",
      greeting: "Thank you for calling Serenity Med Spa, this is Elena. How may I help you today?",
    },
    profile: {
      phone: "+19105550330",
      city: "Wilmington",
      state: "NC",
      timeZone: "America/New_York",
      serviceAreas: ["Wilmington"],
    },
    disclaimers: [
      "I'm not able to provide medical advice — our licensed providers will address clinical questions during your consultation.",
    ],
    faqs: [
      { q: "Do you offer free consultations?", a: "Yes — new-client consultations with our licensed aestheticians are complimentary.", category: "Consultations" },
      { q: "What injectables do you offer?", a: "We offer a full range of injectables administered by licensed medical providers. Specific recommendations require a consultation.", category: "Services" },
      { q: "What is your cancellation policy?", a: "We ask for 24 hours notice to cancel or reschedule. Late cancellations may incur a fee.", category: "Policies" },
    ],
    qualification: [
      { prompt: "Are you a new or existing client?", type: "multiple_choice", required: true, scoreImpact: 5 },
      { prompt: "What service are you interested in?", type: "service_type", required: true, scoreImpact: 10 },
      { prompt: "Do you have any allergies or concerns to note?", type: "long_text", required: false, scoreImpact: 0 },
      { prompt: "Do you have a preferred provider?", type: "short_text", required: false, scoreImpact: 0 },
    ],
    calls: [
      {
        fromNumber: "+19105550272",
        callerName: "Dana Whitfield",
        minutesAgo: 60 * 4,
        durationSeconds: 240,
        status: "completed",
        outcome: "appointment_booked",
        sentiment: "positive",
        urgency: "low",
        reason: "New client facial consultation",
        summary:
          "Dana Whitfield, new client, booked a complimentary skin consultation Friday 11:00 AM. Allergy noted: salicylic acid. No medical advice given.",
        smsSummary: "New consult: Dana Whitfield, Fri 11AM. Allergy: salicylic acid.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Serenity Med Spa, this is Elena. How may I help you today?" },
          { role: "caller", text: "I'm interested in a facial but not sure which one is right for my skin." },
          { role: "assistant", text: "A complimentary consultation with a licensed aesthetician is the perfect place to start. Are you a new client?" },
          { role: "caller", text: "Yes, first time. I'm Dana Whitfield." },
          { role: "assistant", text: "Welcome, Dana! Any allergies our team should know about?" },
          { role: "caller", text: "I'm allergic to salicylic acid." },
          { role: "assistant", text: "Noted. I have Thursday 1:00 PM or Friday 11:00 AM — which do you prefer?" },
          { role: "caller", text: "Friday at 11." },
          { role: "assistant", text: "Wonderful — you'll receive a confirmation text with our intake form." },
        ],
        lead: {
          status: "appointment_booked",
          classification: "warm",
          score: 74,
          service: "Skin consultation",
          answers: [
            { q: "Are you a new or existing client?", a: "New" },
            { q: "What service are you interested in?", a: "Facial — needs consultation" },
            { q: "Do you have any allergies or concerns to note?", a: "Salicylic acid allergy" },
          ],
        },
        appointment: { service: "New client consultation", inDays: 4, hour: 11, durationMinutes: 30 },
      },
      {
        fromNumber: "+19105550655",
        callerName: "Kim Tran",
        minutesAgo: 60 * 50,
        durationSeconds: 95,
        status: "completed",
        outcome: "faq_resolved",
        sentiment: "positive",
        urgency: "low",
        reason: "Cancellation policy question",
        summary: "Kim Tran asked about the cancellation policy. Answered from approved FAQs; no follow-up needed.",
        smsSummary: "FAQ resolved: cancellation policy question from Kim Tran.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Serenity Med Spa, this is Elena. How may I help you today?" },
          { role: "caller", text: "What's your cancellation policy?" },
          { role: "assistant", text: "We ask for 24 hours notice to cancel or reschedule; late cancellations may incur a fee. Anything else I can help with?" },
          { role: "caller", text: "That's all, thanks!" },
        ],
      },
    ],
  },
  {
    name: "Carter Legal Group",
    slug: "carter-legal-group",
    industry: "law_office",
    plan: "growth",
    ownerName: "Alicia Carter",
    ownerEmail: "owner@carterlegal.example",
    receptionist: {
      name: "Grace",
      tone: "professional",
      greeting:
        "Thank you for calling Carter Legal Group, this is Grace. Please note I'm a virtual receptionist — I can't provide legal advice, and this call doesn't create an attorney-client relationship. How can I help you today?",
    },
    profile: {
      phone: "+19105550440",
      city: "Wilmington",
      state: "NC",
      timeZone: "America/New_York",
      serviceAreas: ["New Hanover County", "Brunswick County", "Pender County"],
    },
    disclaimers: [
      "I can't provide legal advice, and this call does not create an attorney-client relationship.",
    ],
    faqs: [
      { q: "What types of cases do you handle?", a: "Carter Legal Group focuses on personal injury, family law, and estate planning matters in southeastern North Carolina.", category: "Practice areas" },
      { q: "Do you offer free consultations?", a: "Personal injury consultations are free. Family law and estate planning consultations have a flat fee that's quoted when booking.", category: "Consultations" },
      { q: "What should I bring to a consultation?", a: "Any documents related to your matter — police reports, correspondence, contracts, or court filings — plus a photo ID.", category: "Consultations" },
    ],
    qualification: [
      { prompt: "What type of legal matter is this regarding?", type: "multiple_choice", required: true, scoreImpact: 10 },
      { prompt: "When did the incident occur?", type: "date", required: false, scoreImpact: 10 },
      { prompt: "In what county or jurisdiction?", type: "short_text", required: true, scoreImpact: 5 },
      { prompt: "Do you currently have another attorney representing you in this matter?", type: "yes_no", required: true, scoreImpact: 15 },
      { prompt: "Name of the opposing party, if any (for conflict check)?", type: "short_text", required: false, scoreImpact: 0 },
    ],
    calls: [
      {
        fromNumber: "+19105550339",
        callerName: "Marcus Reid",
        minutesAgo: 60 * 8,
        durationSeconds: 300,
        status: "completed",
        outcome: "appointment_booked",
        sentiment: "neutral",
        urgency: "medium",
        reason: "Auto accident — new client intake",
        summary:
          "Marcus Reid: auto accident in Wilmington two weeks ago, no existing representation. Consultation booked Tuesday 9:30 AM. Disclaimer delivered at greeting. Conflict check needed before consultation.",
        smsSummary: "New PI intake: Marcus Reid, auto accident, consult Tue 9:30AM. Run conflict check.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Carter Legal Group, this is Grace. Please note I'm a virtual receptionist — I can't provide legal advice, and this call doesn't create an attorney-client relationship. How can I help you today?" },
          { role: "caller", text: "I was in a car accident two weeks ago and I think I need a lawyer." },
          { role: "assistant", text: "I'm sorry to hear that. May I have your name and callback number?" },
          { role: "caller", text: "Marcus Reid, 910-555-0339." },
          { role: "assistant", text: "Where did the accident occur, and do you have any other attorney on this matter?" },
          { role: "caller", text: "Here in Wilmington. No other attorney." },
          { role: "assistant", text: "Attorney Carter has openings Tuesday 9:30 AM or Wednesday 3:00 PM." },
          { role: "caller", text: "Tuesday morning." },
          { role: "assistant", text: "Booked for Tuesday 9:30 AM. You'll receive an email confirmation with what to bring." },
        ],
        lead: {
          status: "appointment_booked",
          classification: "hot",
          score: 85,
          service: "Personal injury consultation",
          answers: [
            { q: "What type of legal matter is this regarding?", a: "Auto accident — personal injury" },
            { q: "In what county or jurisdiction?", a: "New Hanover County (Wilmington)" },
            { q: "Do you currently have another attorney representing you in this matter?", a: "No" },
          ],
        },
        appointment: { service: "New client consultation", inDays: 5, hour: 9, durationMinutes: 60 },
      },
      {
        fromNumber: "+19105550522",
        callerName: "Unknown",
        minutesAgo: 60 * 20,
        durationSeconds: 45,
        status: "completed",
        outcome: "spam",
        sentiment: "neutral",
        urgency: "low",
        reason: "Telemarketing call",
        summary: "Robocall offering marketing services. Classified as spam; no lead created.",
        smsSummary: "Spam call filtered.",
        transcript: [
          { role: "assistant", text: "Thank you for calling Carter Legal Group, this is Grace..." },
          { role: "caller", text: "[Automated marketing message detected]" },
        ],
      },
    ],
  },
  {
    name: "New Hope Community Church",
    slug: "new-hope-community-church",
    industry: "church",
    plan: "basic",
    ownerName: "Pastor James Daniels",
    ownerEmail: "office@newhopechurch.example",
    receptionist: {
      name: "Ruth",
      tone: "faith_centered",
      greeting: "Thank you for calling New Hope Community Church, this is Ruth. How may I serve you today?",
    },
    profile: {
      phone: "+19105550550",
      city: "Wilmington",
      state: "NC",
      timeZone: "America/New_York",
      serviceAreas: ["Wilmington"],
    },
    disclaimers: [],
    faqs: [
      { q: "What time are Sunday services?", a: "We gather Sundays at 9:00 AM and 11:00 AM, with children's ministry available at both services.", category: "Services" },
      { q: "How do I submit a prayer request?", a: "You can share it with me right now and I'll route it to our prayer team — or to pastoral staff only, if you prefer it kept confidential.", category: "Prayer" },
      { q: "Can we rent the fellowship hall?", a: "Yes, the fellowship hall is available to members and community groups. I can take your details and our facilities coordinator will follow up.", category: "Facilities" },
    ],
    qualification: [
      { prompt: "May I have your name?", type: "short_text", required: true, scoreImpact: 0 },
      { prompt: "What is the best number to reach you?", type: "phone", required: true, scoreImpact: 0 },
      { prompt: "How may we help you today?", type: "long_text", required: true, scoreImpact: 0 },
      { prompt: "May we follow up with you?", type: "yes_no", required: false, scoreImpact: 0 },
      { prompt: "Would you like this kept confidential to pastoral staff?", type: "yes_no", required: false, scoreImpact: 0 },
    ],
    calls: [
      {
        fromNumber: "+19105550214",
        callerName: "Linda Harmon",
        minutesAgo: 60 * 2,
        durationSeconds: 200,
        status: "completed",
        outcome: "emergency_escalation",
        sentiment: "negative",
        urgency: "high",
        reason: "Pastoral care — hospital visit request (confidential)",
        summary:
          "Linda Harmon requested pastoral care — husband hospitalized at St. Mary's, room 304. Marked URGENT and CONFIDENTIAL (pastoral staff only). Pastor Daniels alerted immediately.",
        smsSummary: "URGENT pastoral care: Linda Harmon, husband at St. Mary's rm 304. CONFIDENTIAL — pastoral staff only.",
        transcript: [
          { role: "assistant", text: "Thank you for calling New Hope Community Church, this is Ruth. How may I serve you today?" },
          { role: "caller", text: "My husband is in the hospital... I was hoping someone could pray with us, or maybe a pastor could visit." },
          { role: "assistant", text: "I'm so sorry to hear that. May I have your name and the best number to reach you?" },
          { role: "caller", text: "Linda Harmon, 910-555-0214. He's at St. Mary's, room 304." },
          { role: "assistant", text: "Would you like this kept confidential to the pastoral staff, or may we share it with the prayer team as well?" },
          { role: "caller", text: "Pastoral staff only, please." },
          { role: "assistant", text: "Of course. Pastor Daniels will be notified right away. You and your husband are in our prayers, Linda." },
        ],
        lead: {
          status: "follow_up_required",
          classification: "existing_customer",
          score: 0,
          service: "Pastoral care",
          answers: [
            { q: "How may we help you today?", a: "Hospital visit / prayer — husband at St. Mary's rm 304" },
            { q: "Would you like this kept confidential to pastoral staff?", a: "Yes" },
          ],
        },
      },
      {
        fromNumber: "+19105550808",
        callerName: "Amy Chen",
        minutesAgo: 60 * 28,
        durationSeconds: 120,
        status: "completed",
        outcome: "faq_resolved",
        sentiment: "positive",
        urgency: "low",
        reason: "Service times — new to the area",
        summary:
          "Amy Chen, new to the area, asked about Sunday service times. Welcome text with directions sent with permission. Connections team follow-up recommended.",
        smsSummary: "New visitor inquiry: Amy Chen asked service times. Welcome text sent.",
        transcript: [
          { role: "assistant", text: "Thank you for calling New Hope Community Church, this is Ruth. How may I serve you today?" },
          { role: "caller", text: "What time are your Sunday services? We just moved here." },
          { role: "assistant", text: "Welcome to the neighborhood! Sundays at 9:00 and 11:00 AM, with children's ministry at both. May I text you directions?" },
          { role: "caller", text: "Yes please. I'm Amy Chen." },
          { role: "assistant", text: "Sent! We'd love to see you Sunday, Amy. Have a blessed day!" },
        ],
        lead: {
          status: "new",
          classification: "warm",
          score: 60,
          service: "Visitor welcome",
          answers: [
            { q: "How may we help you today?", a: "Service times — new to the area" },
            { q: "May we follow up with you?", a: "Yes" },
          ],
        },
      },
    ],
  },
];

async function seedPlans(db: Db) {
  const tierToId: Record<PlanTier, string> = { basic: "", growth: "", premium: "" };
  for (const def of Object.values(PLAN_DEFINITIONS)) {
    const planId = newId("plan");
    tierToId[def.tier] = planId;
    await db.insert(schema.plans).values({
      id: planId,
      tier: def.tier,
      name: def.name,
      description: def.tagline,
      monthlyPriceCents: def.monthlyPriceCents,
      usageBased: def.usageBased,
    });
    for (const feature of def.features) {
      await db.insert(schema.planFeatures).values({
        id: newId("pft"),
        planId,
        featureKey: feature,
        enabled: true,
      });
    }
    for (const [limitKey, limitValue] of Object.entries(def.limits)) {
      await db.insert(schema.planFeatures).values({
        id: newId("pft"),
        planId,
        featureKey: `limit:${limitKey}`,
        enabled: true,
        limitValue: limitValue,
      });
    }
  }
  return tierToId;
}

async function seedIndustryTemplates(db: Db) {
  const templates: Array<{ industry: (typeof schema.industryEnum.enumValues)[number]; name: string; template: object }> = [
    {
      industry: "realtor",
      name: "Realtor",
      template: {
        greeting: "Thank you for calling {{business_name}}, this is {{receptionist_name}}. How can I help you today?",
        callGoals: ["buyer_inquiry", "seller_inquiry", "showing_request", "property_availability", "home_valuation", "rental_inquiry"],
        qualificationFields: ["buying_or_selling", "preferred_area", "budget_range", "timeline", "preapproval_status", "current_property_status", "best_callback_time"],
        appointmentTypes: ["Property showing", "Listing consultation", "Buyer consultation"],
        disclaimers: [],
        followUp: "Hi {{caller_name}}, thanks for calling {{business_name}}! Reply here anytime and we'll help you with your home search.",
      },
    },
    {
      industry: "home_services",
      name: "Home Services",
      template: {
        greeting: "Thank you for calling {{business_name}}, this is {{receptionist_name}}. How can I help you today?",
        callGoals: ["service_booking", "emergency_triage", "quote_request", "existing_customer_routing"],
        categories: ["HVAC", "Plumbing", "Electrical", "Roofing", "Cleaning", "Landscaping", "Handyman", "Pest control"],
        qualificationFields: ["service_needed", "address", "property_type", "urgency", "existing_customer", "issue_description", "preferred_time"],
        appointmentTypes: ["Service call", "Free estimate", "Maintenance visit"],
        disclaimers: ["For life-threatening emergencies such as fire or gas leaks, hang up and dial 911. We are not an emergency service."],
        followUp: "Hi, this is {{business_name}}. We're sorry we missed your call. How can we help you today?",
      },
    },
    {
      industry: "med_spa",
      name: "Med Spa & Salon",
      template: {
        greeting: "Thank you for calling {{business_name}}, this is {{receptionist_name}}. How may I help you today?",
        callGoals: ["new_appointment", "service_information", "pricing_question", "reschedule", "cancellation", "consultation"],
        qualificationFields: ["desired_service", "new_or_existing", "preferred_provider", "preferred_date", "allergies_or_concerns", "consultation_needed"],
        appointmentTypes: ["Consultation", "Treatment", "Follow-up"],
        disclaimers: ["I'm not able to provide medical advice — our licensed providers will address clinical questions during your visit."],
        followUp: "Hi {{caller_name}}, this is {{business_name}}. We're sorry we missed you! Reply here to book or ask a question.",
      },
    },
    {
      industry: "law_office",
      name: "Law Office",
      template: {
        greeting: "Thank you for calling {{business_name}}, this is {{receptionist_name}}. Please note I'm a virtual receptionist — I can't provide legal advice, and this call doesn't create an attorney-client relationship. How can I help you today?",
        callGoals: ["new_client_intake", "consultation_request", "existing_case_inquiry", "office_information", "document_question"],
        qualificationFields: ["matter_type", "jurisdiction", "incident_date", "opposing_party", "existing_representation", "urgency", "conflict_check_info"],
        appointmentTypes: ["New client consultation", "Case review"],
        disclaimers: ["This call does not create an attorney-client relationship and nothing in it constitutes legal advice."],
        followUp: "This is {{business_name}}. We're sorry we missed your call — reply here and our intake team will follow up. (This message is not legal advice.)",
      },
    },
    {
      industry: "church",
      name: "Church Office",
      template: {
        greeting: "Thank you for calling {{business_name}}, this is {{receptionist_name}}. How may I serve you today?",
        callGoals: ["service_times", "event_information", "prayer_requests", "pastoral_care", "benevolence_inquiry", "facility_rental", "ministry_information", "staff_directory", "office_overflow"],
        qualificationFields: ["caller_name", "contact_info", "reason", "ministry_or_staff_requested", "urgency", "follow_up_permission", "confidentiality_preference"],
        appointmentTypes: ["Pastoral meeting", "Facility tour"],
        disclaimers: [],
        routing: "Prayer and pastoral-care requests are routed respectfully according to configured confidentiality rules.",
        followUp: "Hello, this is {{business_name}}. We're sorry we missed your call — how may we serve you?",
      },
    },
  ];
  for (const t of templates) {
    await db.insert(schema.industryTemplates).values({
      id: newId("tmpl"),
      industry: t.industry,
      name: t.name,
      template: t.template,
    });
  }
}

async function seedDemoOrg(db: Db, spec: DemoOrgSpec, planId: string, now: Date) {
  const orgId = newId("org");
  await db.insert(schema.organizations).values({
    id: orgId,
    name: spec.name,
    slug: spec.slug,
    industry: spec.industry,
    isDemo: true,
  });

  // Owner user + membership
  const ownerId = newId("user");
  await db.insert(schema.users).values({
    id: ownerId,
    email: spec.ownerEmail,
    name: spec.ownerName,
    passwordHash: await hashPassword("demo-password-123"),
  });
  await db.insert(schema.organizationMembers).values({
    id: newId("mem"),
    organizationId: orgId,
    userId: ownerId,
    role: "owner",
  });

  // Subscription
  await db.insert(schema.subscriptions).values({
    id: newId("sub"),
    organizationId: orgId,
    planId,
    status: "active",
    currentPeriodStart: new Date(now.getTime() - 10 * DAY),
    currentPeriodEnd: new Date(now.getTime() + 20 * DAY),
  });

  // Business profile + hours
  await db.insert(schema.businessProfiles).values({
    id: newId("bp"),
    organizationId: orgId,
    businessName: spec.name,
    mainPhone: spec.profile.phone,
    city: spec.profile.city,
    state: spec.profile.state,
    timeZone: spec.profile.timeZone,
    serviceAreas: spec.profile.serviceAreas,
    primaryContactName: spec.ownerName,
    primaryContactEmail: spec.ownerEmail,
    notificationPhone: spec.profile.phone,
  });
  for (let day = 0; day <= 6; day++) {
    const isClosed = spec.industry === "church" ? day === 6 : day === 0;
    await db.insert(schema.businessHours).values({
      id: newId("bh"),
      organizationId: orgId,
      dayOfWeek: day,
      isClosed,
      opensAt: isClosed ? null : "09:00",
      closesAt: isClosed ? null : "17:00",
    });
  }

  // Receptionist + version snapshot
  const receptionistId = newId("recep");
  await db.insert(schema.aiReceptionists).values({
    id: receptionistId,
    organizationId: orgId,
    name: spec.receptionist.name,
    status: "active",
    tone: spec.receptionist.tone,
    greeting: spec.receptionist.greeting,
    callGoals: ["answer_questions", "capture_leads", "schedule_appointments"],
    complianceStatements: spec.disclaimers,
  });
  const versionId = newId("rv");
  await db.insert(schema.receptionistVersions).values({
    id: versionId,
    organizationId: orgId,
    receptionistId,
    versionNumber: 1,
    label: "Initial configuration",
    configSnapshot: {
      name: spec.receptionist.name,
      tone: spec.receptionist.tone,
      greeting: spec.receptionist.greeting,
      disclaimers: spec.disclaimers,
    },
    publishedAt: new Date(now.getTime() - 9 * DAY),
    createdByUserId: ownerId,
  });

  // Phone number
  await db.insert(schema.phoneNumbers).values({
    id: newId("pn"),
    organizationId: orgId,
    receptionistId,
    e164: spec.profile.phone,
    label: "Main line",
    provider: "twilio",
    capabilities: { voice: true, sms: true },
  });

  // FAQs
  for (const [i, faq] of spec.faqs.entries()) {
    await db.insert(schema.faqs).values({
      id: newId("faq"),
      organizationId: orgId,
      receptionistId,
      question: faq.q,
      answer: faq.a,
      category: faq.category,
      sortOrder: i,
    });
  }

  // Qualification flow
  const flowId = newId("qf");
  await db.insert(schema.qualificationFlows).values({
    id: flowId,
    organizationId: orgId,
    receptionistId,
    name: "Default intake",
  });
  const questionIdByPrompt = new Map<string, string>();
  for (const [i, q] of spec.qualification.entries()) {
    const qid = newId("qq");
    questionIdByPrompt.set(q.prompt, qid);
    await db.insert(schema.qualificationQuestions).values({
      id: qid,
      organizationId: orgId,
      flowId,
      prompt: q.prompt,
      questionType: q.type,
      required: q.required,
      sortOrder: i,
      leadScoreImpact: q.scoreImpact,
    });
  }

  // Appointment types
  const defaultTypes: Record<string, Array<{ name: string; duration: number; buffer: number }>> = {
    realtor: [
      { name: "Property showing", duration: 45, buffer: 15 },
      { name: "Buyer consultation", duration: 60, buffer: 0 },
    ],
    home_services: [
      { name: "Service call", duration: 90, buffer: 30 },
      { name: "Free estimate", duration: 60, buffer: 15 },
    ],
    med_spa: [
      { name: "New client consultation", duration: 30, buffer: 10 },
      { name: "Treatment", duration: 60, buffer: 15 },
    ],
    law_office: [{ name: "New client consultation", duration: 60, buffer: 15 }],
    church: [{ name: "Pastoral meeting", duration: 45, buffer: 15 }],
  };
  for (const t of defaultTypes[spec.industry] ?? []) {
    await db.insert(schema.appointmentTypes).values({
      id: newId("at"),
      organizationId: orgId,
      name: t.name,
      durationMinutes: t.duration,
      bufferMinutes: t.buffer,
      minNoticeHours: 2,
      confirmationMessage:
        "Hi {{caller_name}}! Your {{appointment_type}} with {{business_name}} is confirmed for {{time}}. Reply C to cancel.",
    });
  }

  // Notification settings
  await db.insert(schema.notificationSettings).values({
    id: newId("ns"),
    organizationId: orgId,
    recipientName: spec.ownerName,
    recipientEmail: spec.ownerEmail,
    recipientPhone: spec.profile.phone,
  });

  // Data retention defaults
  await db.insert(schema.dataRetentionSettings).values({
    id: newId("drs"),
    organizationId: orgId,
    recordingEnabled: false,
    legalDisclaimer: spec.disclaimers[0] ?? null,
  });

  // Onboarding complete for demo orgs
  await db.insert(schema.onboardingProgress).values({
    id: newId("ob"),
    organizationId: orgId,
    currentStep: 10,
    completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    isComplete: true,
    activatedAt: new Date(now.getTime() - 9 * DAY),
  });

  // Calls, transcripts, summaries, leads, appointments
  for (const call of spec.calls) {
    const startedAt = new Date(now.getTime() - call.minutesAgo * 60 * 1000);
    const callerId = newId("caller");
    await db.insert(schema.callers).values({
      id: callerId,
      organizationId: orgId,
      phone: call.fromNumber,
      name: call.callerName || null,
      lastTextBackAt: call.status === "missed" || call.status === "abandoned" ? startedAt : null,
    });

    let leadId: string | null = null;
    if (call.lead) {
      leadId = newId("lead");
      await db.insert(schema.leads).values({
        id: leadId,
        organizationId: orgId,
        callerId,
        name: call.callerName || null,
        phone: call.fromNumber,
        callReason: call.reason,
        requestedService: call.lead.service,
        status: call.lead.status,
        classification: call.lead.classification,
        score: call.lead.score,
        crmSyncStatus: "synced",
        createdAt: startedAt,
      });
      for (const answer of call.lead.answers) {
        await db.insert(schema.leadAnswers).values({
          id: newId("la"),
          organizationId: orgId,
          leadId,
          questionId: questionIdByPrompt.get(answer.q) ?? null,
          questionPrompt: answer.q,
          answer: answer.a,
        });
      }
    }

    const callId = newId("call");
    await db.insert(schema.callRecords).values({
      id: callId,
      organizationId: orgId,
      receptionistId,
      callerId,
      leadId,
      direction: "inbound",
      status: call.status,
      outcome: call.outcome,
      fromNumber: call.fromNumber,
      toNumber: spec.profile.phone,
      startedAt,
      endedAt: new Date(startedAt.getTime() + call.durationSeconds * 1000),
      durationSeconds: call.durationSeconds,
      sentiment: call.sentiment,
      urgency: call.urgency,
      isUnread: call.minutesAgo < 60 * 6,
      provider: "retell",
      providerCallId: newId("prov"),
    });

    if (call.transcript.length > 0) {
      await db.insert(schema.callTranscripts).values({
        id: newId("tr"),
        organizationId: orgId,
        callRecordId: callId,
        segments: call.transcript,
        provider: "retell",
      });
    }

    await db.insert(schema.callSummaries).values({
      id: newId("cs"),
      organizationId: orgId,
      callRecordId: callId,
      smsSummary: call.smsSummary,
      detailedSummary: call.summary,
      reasonForCalling: call.reason,
      sentiment: call.sentiment,
    });

    // Call events timeline
    const events =
      call.status === "missed" || call.status === "abandoned"
        ? ["call_received", "missed_call_detected", "text_back_sent"]
        : ["call_received", "greeting_played", "intent_identified", "summary_generated", "owner_notified"];
    for (const [i, eventType] of events.entries()) {
      await db.insert(schema.callEvents).values({
        id: newId("ce"),
        organizationId: orgId,
        callRecordId: callId,
        eventType,
        occurredAt: new Date(startedAt.getTime() + i * 5000),
      });
    }

    // Missed-call text-back SMS
    if (call.status === "missed" || call.status === "abandoned") {
      await db.insert(schema.smsMessages).values({
        id: newId("sms"),
        organizationId: orgId,
        callerId,
        relatedCallId: callId,
        direction: "outbound",
        fromNumber: spec.profile.phone,
        toNumber: call.fromNumber,
        body: `Hi, this is ${spec.name}. We are sorry we missed your call. How can we help you today?`,
        isTextBack: true,
        status: "delivered",
        provider: "twilio",
      });
    }

    if (call.appointment && leadId) {
      const startsAt = new Date(now.getTime() + call.appointment.inDays * DAY);
      startsAt.setHours(call.appointment.hour, 0, 0, 0);
      await db.insert(schema.appointments).values({
        id: newId("appt"),
        organizationId: orgId,
        leadId,
        callRecordId: callId,
        callerName: call.callerName,
        callerPhone: call.fromNumber,
        service: call.appointment.service,
        startsAt,
        endsAt: new Date(startsAt.getTime() + call.appointment.durationMinutes * 60 * 1000),
        status: "confirmed",
        confirmationSent: true,
        calendarSyncStatus: "synced",
        crmSyncStatus: "synced",
      });
    }

    // Usage records
    if (call.durationSeconds > 0) {
      await db.insert(schema.usageRecords).values({
        id: newId("ur"),
        organizationId: orgId,
        usageType: "voice_minutes",
        quantity: String(Math.ceil(call.durationSeconds / 60)),
        callRecordId: callId,
        periodStart: new Date(now.getTime() - 10 * DAY),
        recordedAt: startedAt,
      });
    }
  }
}

async function main() {
  const db = await getDb();
  const now = new Date();

  const existing = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, "flownet-platform"))
    .limit(1);
  if (existing.length > 0) {
    console.log("Seed data already present — skipping. Run `npm run db:reset` to reseed.");
    process.exit(0);
  }

  console.log("Seeding plans…");
  const planIds = await seedPlans(db);

  console.log("Seeding industry templates…");
  await seedIndustryTemplates(db);

  console.log("Seeding FlowNet platform organization + admin…");
  const platformOrgId = newId("org");
  await db.insert(schema.organizations).values({
    id: platformOrgId,
    name: "FlowNet Automation",
    slug: "flownet-platform",
    industry: "other",
  });
  const adminId = newId("user");
  await db.insert(schema.users).values({
    id: adminId,
    email: "admin@flownetautomation.example",
    name: "Net Callicutt",
    passwordHash: await hashPassword("admin-password-123"),
    isPlatformAdmin: true,
  });
  await db.insert(schema.organizationMembers).values({
    id: newId("mem"),
    organizationId: platformOrgId,
    userId: adminId,
    role: "super_admin",
  });

  for (const spec of DEMO_ORGS) {
    console.log(`Seeding ${spec.name}…`);
    await seedDemoOrg(db, spec, planIds[spec.plan], now);
  }

  console.log("\n✓ Seed complete.");
  console.log("  Admin portal:  admin@flownetautomation.example / admin-password-123");
  console.log("  Client portal: owner@brightpathrealty.example / demo-password-123");
  console.log("  (every demo org owner uses demo-password-123)");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
