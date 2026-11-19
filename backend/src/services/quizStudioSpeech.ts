import fs from "node:fs/promises";
import path from "node:path";
import {getVideoMetadata} from "@remotion/renderer";
import type {RenderQuiz,RenderQuizTimeline} from "./quizRenderValidation";

export interface TimedSpeechCue {
  frame:number;
  durationFrames:number;
  dataUri:string;
  questionIndex:number;
  phase:"question"|"reveal";
}
const RATE_LIMIT_BYTES=512_000;
const SPEECH_MODEL="tts-1";
const VOICE="alloy";

/**
 * Optional hosted speech. Explicit operator opt-in is required for per-job
 * TTS cost. Clip duration is measured and must fit its exact Remotion window.
 * Audio is deliberately composed from separate cues rather than one untimed
 * narration file so 20 questions remain synchronized.
 */
export async function generateTimedStudioSpeech(
  quiz:RenderQuiz,timeline:RenderQuizTimeline,tempDir:string,
):Promise<TimedSpeechCue[]>{
  if(process.env.QUIZ_STUDIO_TTS_ENABLED!=="true")return [];
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw new Error("OpenAI server key required for narration");
  const cues:TimedSpeechCue[]=[];
  for(let i=0;i<quiz.questions.length;i++){
    const q=quiz.questions[i];
    for(const phaseName of ["question","reveal"] as const){
      const phase=timeline.phases.find(p=>p.questionIndex===i&&p.kind===(phaseName==="question"?"entrance":"reveal"));
      if(!phase)throw new Error("Missing narration timeline phase");
      const text=phaseName==="question"?q.question:
        q.options[["A","B","C","D"].indexOf(q.correctOption)]+". "+q.explanation;
      if(text.length>360)throw new Error("Narration script exceeds maximum length");
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),45_000);
      let bytes:Buffer;
      try{
        const response=await fetch("https://api.openai.com/v1/audio/speech",{
          method:"POST",signal:controller.signal,
          headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
          body:JSON.stringify({model:SPEECH_MODEL,voice:VOICE,input:text,response_format:"mp3",speed:1.12}),
        });
        if(!response.ok)throw new Error("TTS provider rejected a narration clip (HTTP "+response.status+")");
        const data=await response.arrayBuffer();
        if(!data.byteLength||data.byteLength>RATE_LIMIT_BYTES)throw new Error("Narration clip size outside policy");
        bytes=Buffer.from(data);
      }finally{clearTimeout(timeout);}
      const file=path.join(tempDir,"tts-"+i+"-"+phaseName+".mp3");
      await fs.writeFile(file,bytes);
      const meta=await getVideoMetadata(file);
      const seconds=meta.durationInSeconds;
      const extra=timeline.phases.find(p=>p.questionIndex===i &&
        p.kind===(phaseName==="question"?"clues":"transition"));
      const slotFrames=phase.durationFrames+(extra?.durationFrames??0);
      const maxSeconds=slotFrames/timeline.fps-.15;
      if(typeof seconds!=="number"||!Number.isFinite(seconds)||seconds<=0||
        seconds>maxSeconds)throw new Error("Narration clip "+i+" "+phaseName+" exceeds its "+maxSeconds.toFixed(1)+" second window");
      cues.push({frame:phase.startFrame,durationFrames:slotFrames,
        dataUri:"data:audio/mpeg;base64,"+bytes.toString("base64"),questionIndex:i,phase:phaseName});
    }
  }
  return cues;
}
