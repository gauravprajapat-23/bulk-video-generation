import type {RenderQuiz} from "./quizRenderValidation";
export interface FactualCheckItem {
  questionId:string;
  answer:string;
  status:"candidate_found"|"not_corroborated"|"lookup_failed";
  sourceTitle:string|null;
  sourceUrl:string|null;
  /** Answer-string presence is not entailment or proof that the answer is correct. */
  evidenceSnippet:string|null;
}
export interface FactualCheckReport {
  provider:"wikipedia_search";
  independentlyVerified:false;
  status:"human_review_required";
  items:FactualCheckItem[];
  checkedAt:string;
}

/**
 * Read-only independent retrieval from a fixed, trusted host (no caller URL).
 * A Wikipedia search excerpt containing an answer is merely corroborating
 * candidate evidence, not proof. Always require creator review to publish.
 */
export async function corroborateStudioQuiz(
  quiz:RenderQuiz,
  search:typeof fetch=fetch,
):Promise<FactualCheckReport>{
  const items:FactualCheckItem[]=[];
  for(const q of quiz.questions){
    const answer=q.options[["A","B","C","D"].indexOf(q.correctOption)];
    const query=(q.question+" "+answer).slice(0,250);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const url=new URL("https://en.wikipedia.org/w/api.php");
      url.searchParams.set("action","query");
      url.searchParams.set("list","search");
      url.searchParams.set("srsearch",query);
      url.searchParams.set("srlimit","3");
      url.searchParams.set("srnamespace","0");
      url.searchParams.set("format","json");
      const response=await search(url.toString(),{signal:controller.signal,
        headers:{Accept:"application/json","User-Agent":"VideoMakerQuizEvidence/1.0"}});
      if(!response.ok)throw new Error("Search provider unavailable");
      const json=await response.json() as {query?:{search?:Array<{title?:string;snippet?:string;pageid?:number}>}};
      const results=Array.isArray(json.query?.search)?json.query!.search!:[];
      const normalized=answer.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
      const match=results.find(r=>{
        const hay=((r.title||"")+" "+(r.snippet||"")).replace(/<[^>]+>/g," ")
          .toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ");
        return normalized.length>2 && hay.includes(normalized);
      });
      if(!match||!Number.isInteger(match.pageid)){
        items.push({questionId:q.id,answer,status:"not_corroborated",
          sourceTitle:null,sourceUrl:null,evidenceSnippet:null});
      }else{
        const snippet=(match.snippet||"").replace(/<[^>]+>/g," ").slice(0,420);
        items.push({questionId:q.id,answer,status:"candidate_found",
          sourceTitle:(match.title||"").slice(0,180),
          sourceUrl:"https://en.wikipedia.org/?curid="+match.pageid,evidenceSnippet:snippet});
      }
    }catch{
      items.push({questionId:q.id,answer,status:"lookup_failed",
        sourceTitle:null,sourceUrl:null,evidenceSnippet:null});
    }finally{clearTimeout(timeout);}
  }
  return {provider:"wikipedia_search",independentlyVerified:false,
    status:"human_review_required",items,checkedAt:new Date().toISOString()};
}
