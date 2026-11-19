export type QuizStudioTemplate = "football_gold" | "general_trivia" | "science_lab" | "history_archive";
export type QuizPublishPolicy = "private_review" | "unlisted_review";
export type QuizScheduleMode = "daily" | "weekdays";

export interface StudioProfileInput {
  channelId: string;
  niche: string;
  topic: string;
  template: QuizStudioTemplate;
  questionCount: number;
  scheduleMode: QuizScheduleMode;
  scheduleTimeUtc: string;
  publishPolicy: QuizPublishPolicy;
  enabled: boolean;
}

const templates:ReadonlySet<string>=new Set(["football_gold","general_trivia","science_lab","history_archive"]);
const publishPolicies:ReadonlySet<string>=new Set(["private_review","unlisted_review"]);
const scheduleModes:ReadonlySet<string>=new Set(["daily","weekdays"]);
export function validateStudioProfile(input:unknown):StudioProfileInput {
  if (!input || typeof input!=="object")throw new Error("Profile object required");
  const p=input as Partial<StudioProfileInput>;
  if(typeof p.channelId!=="string"||!p.channelId.trim()||p.channelId.length>200)throw new Error("Invalid YouTube channel");
  if(typeof p.niche!=="string"||p.niche.trim().length<3||p.niche.length>250)throw new Error("Niche must be 3–250 characters");
  if(typeof p.topic!=="string"||!p.topic.trim()||p.topic.length>110)throw new Error("Topic must be 1–110 characters");
  if(typeof p.template!=="string"||!templates.has(p.template))throw new Error("Unsupported template");
  if(typeof p.questionCount!=="number"||!Number.isInteger(p.questionCount)||p.questionCount<5||p.questionCount>20)throw new Error("Question count must be 5–20");
  if(typeof p.scheduleMode!=="string"||!scheduleModes.has(p.scheduleMode))throw new Error("Invalid schedule mode");
  if(typeof p.scheduleTimeUtc!=="string"||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.scheduleTimeUtc))throw new Error("Schedule must be UTC HH:MM");
  if(typeof p.publishPolicy!=="string"||!publishPolicies.has(p.publishPolicy))throw new Error("Invalid publication policy");
  if(typeof p.enabled!=="boolean")throw new Error("Invalid enabled state");
  return {channelId:p.channelId.trim(),niche:p.niche.trim(),topic:p.topic.trim(),
    template:p.template as QuizStudioTemplate,questionCount:p.questionCount,
    scheduleMode:p.scheduleMode as QuizScheduleMode,scheduleTimeUtc:p.scheduleTimeUtc,
    publishPolicy:p.publishPolicy as QuizPublishPolicy,enabled:p.enabled};
}

/** UTC slot makes repeat scheduling timezone- and DST-independent. */
export function dueStudioSlot(profile:Pick<StudioProfileInput,"scheduleMode"|"scheduleTimeUtc"|"enabled">,at:Date):string|null{
  if(!profile.enabled||!Number.isFinite(at.getTime()))return null;
  if(profile.scheduleMode==="weekdays"&&[0,6].includes(at.getUTCDay()))return null;
  const minute=at.toISOString().slice(11,16);
  if(minute!==profile.scheduleTimeUtc)return null;
  return at.toISOString().slice(0,10)+"T"+minute+"Z";
}

const limited=(s:string,n:number)=>s.trim().slice(0,n);
export function generateStudioMetadata(args:{niche:string;topic:string;template:QuizStudioTemplate;count:number}){
  const title=limited(`${args.topic} | ${args.count} Question Quiz`,100);
  const description=limited(`Challenge yourself: ${args.topic}. ${args.count} questions about ${args.niche}.\nReview each answer before the reveal.\n#quiz #trivia`,5000);
  const tags=["quiz","trivia",limited(args.niche,35)].filter(Boolean);
  return {title,description,tags,categoryId:"27"};
}

/** Deterministic content quality checks, not a claim of factual truth. */
export function inspectStudioQuiz(quiz:{questions:Array<{id:string;question:string;explanation:string;options:string[];correctOption:string;clues:string[]}>}){
  const reasons:string[]=[];
  const seen=new Set<string>();
  for(const q of quiz.questions){
    const key=q.question.toLowerCase().replace(/\W+/g," ").trim();
    if(seen.has(key))reasons.push("Repeated question text");
    seen.add(key);
    if(q.question.length<15)reasons.push("Question too short: "+q.id);
    if(q.explanation.length<15)reasons.push("Explanation too short: "+q.id);
    if(q.options.some(o=>o.length<2))reasons.push("Answer option too short: "+q.id);
    if(!["A","B","C","D"].includes(q.correctOption))reasons.push("Invalid answer key: "+q.id);
    if(q.clues.some(c=>c.length<3))reasons.push("Unhelpful clue: "+q.id);
  }
  return {passed:reasons.length===0,reasons:reasons.slice(0,25)};
}
