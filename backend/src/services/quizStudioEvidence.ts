import type {RenderQuiz} from "./quizRenderValidation";
import {parseAutoQuizCsv} from "./quizAutomationContent";

export interface QuizEvidenceItem {
  questionId:string;
  answer:string;
  sourceUrl:string|null;
  status:"source_provided_unverified"|"needs_source";
}
export interface QuizEvidenceReport {
  verified:false;
  status:"human_review_required";
  count:number;
  withSources:number;
  items:QuizEvidenceItem[];
  warning:string;
}

/**
 * No LLM-provided citations are accepted as proof of correctness.
 * User-provided CSV sources are metadata for a reviewer, not verification.
 * No untrusted URL is fetched by the server, avoiding SSRF and fake proof.
 */
export function buildQuizEvidenceReport(quiz:RenderQuiz,csv:string|null):QuizEvidenceReport{
  const sourceMap=new Map<string,string>();
  if(csv){
    // Reuse the same bounded CSV reader used to build the quiz.
    // Import here only when evidence is requested, not on scheduler load.
    const rows=parseAutoQuizCsv(csv);
    for(const row of rows){
      const url=row.source||"";
      if(url.length>0 && url.length<=500){
        try{
          const parsed=new URL(url);
          if(parsed.protocol==="https:"&&!parsed.username&&!parsed.password&&
            !/^(localhost|127\.|10\.|192\.168\.|172\.|169\.254\.)/i.test(parsed.hostname)){
            sourceMap.set(row.question_id,parsed.toString());
          }
        }catch{ /* unsupported or malformed citation */ }
      }
    }
  }
  const items=quiz.questions.map(q=>{
    const sourceUrl=sourceMap.get(q.id)||null;
    return {questionId:q.id,
      answer:q.options[["A","B","C","D"].indexOf(q.correctOption)],
      sourceUrl,status:sourceUrl?"source_provided_unverified" as const:"needs_source" as const};
  });
  return {verified:false,status:"human_review_required",count:items.length,
    withSources:items.filter(x=>x.sourceUrl).length,items,
    warning:"Source links and LLM-generated facts are not independently checked. Creator must verify answers, media rights and narration before public publishing."};
}
