export const TONE_OPTIONS = [
  ["warm_friendly", "Warm and friendly"],
  ["professional", "Professional"],
  ["calm_reassuring", "Calm and reassuring"],
  ["energetic", "Energetic"],
  ["concise", "Concise"],
  ["faith_centered", "Faith-centered (churches)"],
] as const;

export const CALL_GOAL_OPTIONS = [
  ["answer_questions", "Answer questions"],
  ["capture_leads", "Capture leads"],
  ["schedule_appointments", "Schedule appointments"],
  ["transfer_calls", "Transfer calls"],
  ["take_messages", "Take messages"],
  ["office_overflow", "Handle office overflow"],
  ["route_emergencies", "Route emergency calls"],
  ["collect_intake", "Collect intake information"],
] as const;

export const QUESTION_TYPE_OPTIONS = [
  ["short_text", "Short text"],
  ["long_text", "Long text"],
  ["yes_no", "Yes or no"],
  ["number", "Number"],
  ["date", "Date"],
  ["time", "Time"],
  ["multiple_choice", "Multiple choice"],
  ["address", "Address"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["service_type", "Service type"],
  ["budget_range", "Budget range"],
  ["urgency_level", "Urgency level"],
] as const;
