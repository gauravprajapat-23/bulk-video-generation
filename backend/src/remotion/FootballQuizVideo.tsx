import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, useCurrentFrame } from "remotion";
import type { RenderQuiz, RenderQuizTimeline } from "../services/quizRenderValidation";

export interface QuizRenderProps {
  quiz: RenderQuiz;
  timeline: RenderQuizTimeline;
  audio: {
    musicData: string | null;
    narrationData: string | null;
    effectsEnabled: boolean;
    ticksEnabled: boolean;
    musicVolume: number;
    voiceVolume: number;
    effectsVolume: number;
    ducking: number;
    toneData: Record<string,string>;
  };
}

const GOLD="#edc77c", NAVY="#091827";
const smooth=(n:number)=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};

function Stadium() {
  const frame=useCurrentFrame();
  return <AbsoluteFill style={{background:"radial-gradient(ellipse at 50% 0%, #254858, #0a1b2c 60%, #06111b)",overflow:"hidden"}}>
    <div style={{position:"absolute",width:1100,height:380,left:-220,top:-100,opacity:.25,filter:"blur(38px)",
      transform:`translateX(${Math.sin(frame/120)*65}px) rotate(-25deg)`,
      background:"linear-gradient(90deg, transparent, #edc77c, transparent)"}}/>
    <div style={{position:"absolute",width:1100,height:380,right:-220,top:-100,opacity:.2,filter:"blur(38px)",
      transform:`translateX(${Math.sin(frame/120+2)*65}px) rotate(25deg)`,
      background:"linear-gradient(90deg, transparent, #edc77c, transparent)"}}/>
    <div style={{position:"absolute",left:-200,right:-200,bottom:-230,height:550,borderRadius:"50%",
      border:"2px solid #7b9e8a44",background:"radial-gradient(ellipse at 50% 95%,#17463a,#0b1e28 70%)"}}/>
  </AbsoluteFill>;
}

function Silhouette({revealed, progress}:{revealed:boolean;progress:number}) {
  return <div style={{position:"relative",width:400,height:330,border:"2px solid #bd985e",borderRadius:22,
    background:"#102638",boxShadow:`0 0 ${20+progress*45}px #c4a45b55`,overflow:"hidden"}}>
    <svg width="400" height="330" viewBox="0 0 400 330" aria-label="Stylized mystery player silhouette">
      <ellipse cx="200" cy="108" rx="55" ry="62" fill="#05111b"/>
      <path d="M145 165 C103 170 71 210 54 330 L346 330 C328 210 295 170 255 165 C245 194 156 194 145 165Z" fill="#05111b"/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",fontSize:105,fontWeight:900,
      color:GOLD,textShadow:"0 0 28px #e5ba70aa"}}>{revealed?"★":"?"}</div>
  </div>;
}

function QuizFrame({quiz,timeline}:{quiz:RenderQuiz;timeline:RenderQuizTimeline}) {
  const frame=useCurrentFrame();
  const phase=timeline.phases.find(p=>frame>=p.startFrame&&frame<p.endFrame)
    ?? timeline.phases[timeline.phases.length-1];
  const p=phase.durationFrames>0?(frame-phase.startFrame)/phase.durationFrames:0;
  const isCard=["intro","halftime","outro"].includes(phase.kind);
  const revealed=["reveal","transition"].includes(phase.kind);
  const revealProgress=phase.kind==="reveal"?smooth(Math.min(1,p*3.5)):revealed?1:0;
  const introProgress=smooth(Math.min(1,p*4));
  const entrance=phase.kind==="entrance"?smooth(Math.min(1,p*2.7)):phase.kind==="transition"?1-smooth(p):1;
  const q=phase.questionIndex===undefined?null:quiz.questions[phase.questionIndex];
  const remaining=phase.kind==="countdown"?Math.ceil((phase.endFrame-frame)/30):0;
  const countdown=phase.kind==="countdown"?1-p:["entrance","clues"].includes(phase.kind)?1:0;
  const showOptions=["countdown","suspense","reveal","transition"].includes(phase.kind);
  const title=phase.kind==="intro"?quiz.settings.title:phase.kind==="halftime"?"HOW MANY DID YOU GET?":"YOU ARE A FOOTBALL LEGEND";
  const titleLabel=phase.kind==="intro"?"THE ULTIMATE CHALLENGE":phase.kind==="halftime"?"HALF-TIME":"FINAL WHISTLE";
  const correct=q?["A","B","C","D"].indexOf(q.correctOption):-1;
  return <AbsoluteFill style={{backgroundColor:NAVY,color:"#f5f7fa",fontFamily:"Arial, sans-serif"}}>
    <Stadium/>
    <div style={{position:"absolute",inset:75,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #d6ad6844",paddingBottom:22}}>
        <span style={{fontWeight:900,letterSpacing:5,fontSize:33,color:GOLD}}>★ FOOTBALL LEGENDS</span>
        <span style={{fontSize:22,color:"#d1dbe4"}}>{q?`ROUND ${String((phase.questionIndex ?? 0)+1).padStart(2,"0")} / ${quiz.questions.length}`:"CHAMPIONS GOLD"}</span>
      </div>
      {isCard ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",
        textAlign:"center",gap:28,opacity:introProgress,transform:`scale(${.94+.06*introProgress})`}}>
        <div style={{fontSize:118,color:GOLD}}>★</div>
        <div style={{fontSize:27,letterSpacing:10,fontWeight:900,color:GOLD}}>{titleLabel}</div>
        <div style={{fontSize:75,fontWeight:900,maxWidth:1450,lineHeight:1.12}}>{title}</div>
        <div style={{fontSize:30,color:"#c1d0dd"}}>{phase.kind==="intro"?`${quiz.questions.length} QUESTIONS • GUESS THE LEGENDS`:
          phase.kind==="halftime"?"Count your answers. The second half gets harder.":`Comment your score out of ${quiz.questions.length}!`}</div>
      </div> : <div style={{flex:1,display:"flex",alignItems:"center",gap:65,opacity:entrance,
        transform:`translateY(${phase.kind==="entrance"?(1-entrance)*38:0}px)`}}>
        <div style={{width:480,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
          <Silhouette revealed={revealed} progress={phase.kind==="suspense"?.45+Math.sin(p*Math.PI*6)*.5:revealProgress}/>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,maxWidth:480}}>
            {q?.clues.slice(0,phase.kind==="clues"?Math.max(1,Math.ceil(p*q.clues.length)):q.clues.length).map((clue,i)=>
              <span key={i} style={{border:"1px solid #caac75",background:"#19354a",padding:"8px 12px",borderRadius:8,
                fontSize:21,color:GOLD}}>{clue}</span>)}
          </div>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:26,minWidth:0}}>
          <div style={{fontSize:22,color:GOLD,fontWeight:800,textTransform:"uppercase",letterSpacing:3}}>{q?.type.replace("_"," ")} · {q?.difficulty}</div>
          <div style={{fontSize:48,fontWeight:900,lineHeight:1.14}}>{q?.question}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {q?.options.map((answer,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 20px",minHeight:88,
              borderRadius:12,fontSize:28,fontWeight:700,
              border:`2px solid ${revealed&&correct===i?"#71e5a3":"#b59d76"}`,
              background:revealed&&correct===i?"#156d4a":"#1b3548",
              opacity:revealed&&correct!==i?1-.62*revealProgress:1,
              boxShadow:revealed&&correct===i?`0 0 ${revealProgress*25}px #42e4a255`:"none"}}>
              <span style={{display:"grid",placeItems:"center",width:46,height:46,borderRadius:8,
                background:revealed&&correct===i?"#d5ffe1":GOLD,color:"#132534",flexShrink:0}}>{["A","B","C","D"][i]}</span>
              {answer}
            </div>)}
          </div>
          {revealed&&<div style={{fontSize:23,color:"#f5dfae",lineHeight:1.25,opacity:revealProgress,
            padding:18,border:"1px solid #bba06e",borderRadius:10,background:"#55452555"}}>
            <strong>ANSWER REVEALED</strong> — {q?.explanation}
          </div>}
        </div>
      </div>}
      {!isCard&&<div style={{height:100,display:"flex",alignItems:"center",gap:25,borderTop:"1px solid #cdb47a44"}}>
        <svg width="75" height="75" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="43" stroke="#4a6474" strokeWidth="8" fill="#112d3c"/>
          <circle cx="50" cy="50" r="43" stroke={remaining<=3&&phase.kind==="countdown"?"#e26958":GOLD}
            strokeWidth="8" fill="none" strokeDasharray={`${(270*countdown).toFixed(2)} 270`} transform="rotate(-90 50 50)"/>
          <text x="50" y="59" fontSize="27" fontWeight="bold" textAnchor="middle" fill={GOLD}>{phase.kind==="countdown"?remaining:"•"}</text>
        </svg>
        <div style={{flex:1,height:13,background:"#405667",borderRadius:12,overflow:"hidden"}}>
          <div style={{width:`${Math.round(countdown*100)}%`,height:"100%",background:remaining<=3&&phase.kind==="countdown"?"#e26958":GOLD}}/>
        </div>
        <div style={{fontSize:38,color:GOLD,width:75,textAlign:"right"}}>{phase.kind==="countdown"?String(remaining).padStart(2,"0"):phase.kind==="suspense"?"!":revealed?"★":"—"}</div>
      </div>}
    </div>
  </AbsoluteFill>;
}

type QuizToneCue = {key:string;from:number;type:"intro"|"tick"|"urgent"|"suspense"|"reveal"};

export function QuizVideo({quiz,timeline,audio}:QuizRenderProps) {
  const voiceActive=audio.narrationData!==null;
  return <AbsoluteFill>
    <QuizFrame quiz={quiz} timeline={timeline}/>
    {audio.musicData && <Audio src={audio.musicData} loop volume={f=>{
      const fade=Math.min(1,f/60,(timeline.totalFrames-f)/60);
      return Math.max(0,fade)*audio.musicVolume*(voiceActive?audio.ducking:1);
    }}/>}
    {audio.narrationData&&<Audio src={audio.narrationData} volume={audio.voiceVolume}/>}
    {timeline.phases.flatMap((phase):QuizToneCue[]=>{
      if (phase.questionIndex===undefined) {
        if (!audio.effectsEnabled || !["intro","halftime","outro"].includes(phase.kind)) return [];
        return [{key:`${phase.kind}-${phase.startFrame}`,from:phase.startFrame,type:"intro" as const}];
      }
      if (phase.kind==="countdown"&&audio.ticksEnabled) {
        return Array.from({length:phase.durationFrames/30},(_,i)=>({
          key:`tick-${phase.questionIndex}-${i}`,from:phase.startFrame+i*30,type:(i>=phase.durationFrames/30-3?"urgent":"tick") as "urgent"|"tick",
        }));
      }
      if (audio.effectsEnabled&&["suspense","reveal"].includes(phase.kind))
        return [{key:`${phase.kind}-${phase.questionIndex}`,from:phase.startFrame,
          type:phase.kind as "suspense"|"reveal"}];
      return [];
    }).map(cue=><Sequence key={cue.key} from={cue.from} durationInFrames={Math.min(24,timeline.totalFrames-cue.from)}>
      <Audio src={audio.toneData[cue.type]} volume={audio.effectsVolume}/>
    </Sequence>)}
  </AbsoluteFill>;
}

export const QuizRemotionRoot:React.FC=()=> <Composition id="FootballLegendsQuiz" component={QuizVideo}
  fps={30} width={1920} height={1080} durationInFrames={300}
  calculateMetadata={({props})=>({durationInFrames:props.timeline.totalFrames})}
  defaultProps={{quiz:{settings:{title:"Football Legends"},questions:[]},timeline:{phases:[],totalFrames:300,fps:30,width:1920,height:1080},
    audio:{musicData:null,narrationData:null,effectsEnabled:false,ticksEnabled:false,musicVolume:0,effectsVolume:0,
      voiceVolume:0,ducking:1,toneData:{}}} as QuizRenderProps}/>;
