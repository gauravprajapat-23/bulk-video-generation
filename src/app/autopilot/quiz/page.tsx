"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, FileUp, Youtube, RefreshCcw, Sparkles, ShieldCheck } from "lucide-react";
import { getBackendToken } from "@/lib/backendClient";

interface Channel { channel_id:string; channel_title:string }
interface ChannelProfile {
  id:string;channel_id:string;niche:string;topic:string;template_key:string;
  question_count:number;schedule_mode:string;schedule_time_utc:string;
  publish_policy:string;enabled:boolean;
}
interface AutomationJob {
  id:string;topic:string;niche:string;channel_id:string;status:string;
  progress:number;youtube_video_url:string|null;error_message:string|null;
  created_at:string;
  review_status?:"pending"|"approved"|"rejected";
  publication_status?:"not_requested"|"publishing"|"published"|"needs_review";
  evidence_report?:{verified:false;withSources:number;count:number;warning:string};
  quality_report?:{passed:boolean;reasons:string[]};
}
const API=process.env.NEXT_PUBLIC_API_BASE_URL;

export default function QuizAutomationPage(){
  const [niche,setNiche]=useState("Football legends and famous players");
  const [topic,setTopic]=useState("Football Legends — Guess the Player");
  const [count,setCount]=useState(10);
  const [csv,setCsv]=useState<File|null>(null);
  const [channels,setChannels]=useState<Channel[]>([]);
  const [channelId,setChannelId]=useState("");
  const [jobs,setJobs]=useState<AutomationJob[]>([]);
  const [profiles,setProfiles]=useState<ChannelProfile[]>([]);
  const [templateKey,setTemplateKey]=useState("general_trivia");
  const [scheduleMode,setScheduleMode]=useState("weekdays");
  const [scheduleTime,setScheduleTime]=useState("13:00");
  const [publishPolicy,setPublishPolicy]=useState("private_review");
  const [profileBusy,setProfileBusy]=useState(false);
  const [reviewBusy,setReviewBusy]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [ready,setReady]=useState(false);
  const authFetch=useCallback(async(path:string,init:RequestInit={})=>{
    const token=getBackendToken();
    if(!API)throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    if(!token)throw new Error("Sign in and connect your YouTube channel first");
    const response=await fetch(API+path,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers},cache:"no-store"});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||"Backend request failed");
    return body;
  },[]);
  const refresh=useCallback(async()=>{
    try{
      const [available,queued,savedProfiles]=await Promise.all([
        authFetch("/youtube/channels"),authFetch("/quiz-automation/jobs"),authFetch("/quiz-automation/profiles"),
      ]);
      setChannels(available);
      setChannelId(current=>current||available?.[0]?.channel_id||"");
      setJobs(queued);
      setProfiles(savedProfiles);
      setReady(true);
    }catch(err){setError(err instanceof Error?err.message:"Unable to load channel or jobs");}
  },[authFetch]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    if(!jobs.some(job=>["queued","generating","rendering","uploading"].includes(job.status)))return;
    const t=window.setInterval(()=>void refresh(),5000);
    return()=>window.clearInterval(t);
  },[jobs,refresh]);
  async function saveProfile(enable:boolean){
    setProfileBusy(true);setError("");
    try{
      await authFetch("/quiz-automation/profiles",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({channelId,niche,topic,template:templateKey,
          questionCount:count,scheduleMode,scheduleTimeUtc:scheduleTime,
          publishPolicy,enabled:enable})});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Could not save profile");}
    finally{setProfileBusy(false);}
  }
  async function toggleProfile(profile:ChannelProfile,enabled:boolean){
    setProfileBusy(true);setError("");
    try{
      await authFetch(`/quiz-automation/profiles/${profile.id}/state`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled})});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Could not change schedule");}
    finally{setProfileBusy(false);}
  }
  async function reviewJob(job:AutomationJob,decision:"approve"|"reject"){
    setReviewBusy(job.id);setError("");
    try{
      if(decision==="approve"){
        const ok=window.confirm("I have checked question accuracy, rights, narration, video quality and the private YouTube upload. Approve for a separate publication decision?");
        if(!ok)return;
      }
      await authFetch(`/quiz-automation/jobs/${job.id}/review`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({decision})});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Unable to save review");}
    finally{setReviewBusy(null);}
  }
  async function publishJob(job:AutomationJob){
    if(job.review_status!=="approved")return;
    const ok=window.confirm("This will make the video PUBLIC on the selected YouTube channel. Continue?");
    if(!ok)return;
    setReviewBusy(job.id);setError("");
    try{
      await authFetch(`/quiz-automation/jobs/${job.id}/publish`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({confirmation:"PUBLISH_PUBLIC"})});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Publication needs attention");await refresh();}
    finally{setReviewBusy(null);}
  }
  async function submit(){
    setLoading(true);setError("");
    try{
      const payload=new FormData();
      payload.set("niche",niche);payload.set("topic",topic);
      payload.set("questionCount",String(count));payload.set("channelId",channelId);
      if(csv)payload.set("csv",csv);
      await authFetch("/quiz-automation/jobs",{method:"POST",body:payload});
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:"Unable to create automation");}
    finally{setLoading(false);}
  }
  return <div className="mx-auto max-w-5xl space-y-6">
    <div>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"><Bot size={16}/> Backend automation</p>
      <h1 className="mt-2 font-sora text-3xl font-bold text-text">AI Quiz → MP4 → YouTube</h1>
      <p className="mt-2 text-sm text-muted">Describe your niche or upload prepared quiz questions. The server generates and renders the video, then uploads it privately to the connected channel for review.</p>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="space-y-4 rounded-xl border border-border bg-panel p-5">
        <label className="block space-y-1 text-sm text-muted">Channel niche and audience
          <textarea rows={3} value={niche} maxLength={250} onChange={e=>setNiche(e.target.value)}
            placeholder="Football history, legendary players and challenging quizzes for fans"
            className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text"/>
        </label>
        <label className="block space-y-1 text-sm text-muted">Video topic
          <input value={topic} maxLength={120} onChange={e=>setTopic(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text"/>
        </label>
        <label className="block space-y-1 text-sm text-muted">Connected YouTube channel
          <select value={channelId} onChange={e=>setChannelId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg p-3 text-sm text-text">
            {!channels.length&&<option value="">Connect a channel first</option>}
            {channels.map(c=><option key={c.channel_id} value={c.channel_id}>{c.channel_title}</option>)}
          </select>
        </label>
        <div className="rounded-lg border border-border bg-bg p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text"><FileUp size={18}/> Optional prepared quiz CSV
            <input type="file" accept=".csv,text/csv" className="ml-auto max-w-52 text-xs text-muted"
              onChange={e=>{const f=e.target.files?.[0]||null;if(f&&f.size>100000){setError("CSV must be under 100KB");return;}setCsv(f);}}/>
          </label>
          <p className="mt-2 text-xs text-muted">If no CSV is uploaded, the configured AI provider generates 5–20 questions from your niche. AI-generated facts should be checked before making the private video public. Currently this uses the Champions Gold football-branded visual template, even for other niches.</p>
          <a href="/templates/football-legends-quiz-20.csv" download className="mt-2 inline-block text-xs text-accent hover:underline">Download example CSV schema</a>
        </div>
        {!csv&&<label className="block space-y-1 text-sm text-muted">AI question count: {count}
          <input type="range" min={5} max={20} step={1} value={count}
            onChange={e=>setCount(Number(e.target.value))} className="w-full"/>
        </label>}
        <div className="flex items-start gap-2 rounded-lg border border-emerald-600/25 bg-emerald-900/10 p-3 text-xs text-muted">
          <ShieldCheck size={18} className="shrink-0 text-emerald-400"/>
          Videos upload as private. The channel owner must review and publish them from YouTube Studio. No public publishing without explicit future opt-in.
        </div>
        <button disabled={loading||!channelId||!ready} type="button" onClick={()=>void submit()}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          <Sparkles size={17}/>{loading?"Submitting…":"Start automatic video job"}
        </button>
      </section>
      <aside className="space-y-3 rounded-xl border border-border bg-panel p-5">
        <h2 className="font-semibold text-text">How it works</h2>
        <ol className="list-inside list-decimal space-y-3 text-sm leading-relaxed text-muted">
          <li>Provide niche and CSV, or use AI question generation</li>
          <li>Backend validates all questions and builds the timeline</li>
          <li>Remotion generates a 1080p H.264 MP4 with original effects</li>
          <li>The authorized channel receives the video privately</li>
          <li>Review accuracy, rights, and quality before publishing</li>
        </ol>
        <p className="text-xs text-muted">Requires an authenticated YouTube connection and the server automation switch. This is a queued one-video job, not recurring daily scheduling yet.</p>
        <Link href="/youtube" className="inline-flex items-center gap-2 text-sm text-accent hover:underline"><Youtube size={15}/> Connect YouTube channel</Link>
      </aside>
    </div>
    <section className="space-y-4 rounded-xl border border-border bg-panel p-5">
      <h2 className="font-sora text-xl font-bold text-text">Recurring channel studio</h2>
      <p className="text-sm text-muted">Save a channel profile to generate a new AI quiz at the specified UTC time. Each scheduled video is private or unlisted for review. Public publication requires separate approval and a server-enabled, explicitly confirmed action.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-muted">Visual identity
          <select value={templateKey} onChange={e=>setTemplateKey(e.target.value)}
            className="block w-full rounded-lg border border-border bg-bg p-3 text-sm text-text">
            <option value="general_trivia">General trivia</option>
            <option value="football_gold">Football champions gold</option>
            <option value="science_lab">Science lab</option>
            <option value="history_archive">History archive</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-muted">Cadence
          <select value={scheduleMode} onChange={e=>setScheduleMode(e.target.value)}
            className="block w-full rounded-lg border border-border bg-bg p-3 text-sm text-text">
            <option value="daily">Daily</option><option value="weekdays">Weekdays only</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-muted">Schedule (UTC)
          <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
            className="block w-full rounded-lg border border-border bg-bg p-3 text-sm text-text"/>
        </label>
        <label className="space-y-1 text-sm text-muted">YouTube visibility
          <select value={publishPolicy} onChange={e=>setPublishPolicy(e.target.value)}
            className="block w-full rounded-lg border border-border bg-bg p-3 text-sm text-text">
            <option value="private_review">Private — owner review</option>
            <option value="unlisted_review">Unlisted — owner review</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={profileBusy||!channelId} onClick={()=>void saveProfile(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text disabled:opacity-50">Save disabled</button>
        <button type="button" disabled={profileBusy||!channelId} onClick={()=>void saveProfile(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save & enable schedule</button>
      </div>
      <p className="text-xs text-muted">Enabling requires server-side AI and scheduling configuration. Optional server TTS may incur per-video costs. Factual checks remain creator-reviewed; only original graphic backgrounds are included, and externally licensed music/images are not yet integrated. To publish publicly, reconnect your YouTube channel with video-update permission.</p>
      {profiles.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg p-3">
        <div><p className="text-sm font-semibold text-text">{p.topic}</p>
          <p className="text-xs text-muted">{p.template_key.replaceAll("_"," ")} · {p.schedule_mode} at {p.schedule_time_utc} UTC · {p.publish_policy.replaceAll("_"," ")}</p></div>
        <button type="button" disabled={profileBusy} onClick={()=>void toggleProfile(p,!p.enabled)}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text disabled:opacity-50">{p.enabled?"Pause automation":"Enable automation"}</button>
      </div>)}
    </section>
    <section className="space-y-3 rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text">Automation jobs</h2>
        <button type="button" onClick={()=>void refresh()} aria-label="Refresh automation jobs" className="text-muted hover:text-text"><RefreshCcw size={17}/></button>
      </div>
      {!jobs.length&&<p className="text-sm text-muted">No automation jobs yet.</p>}
      {jobs.map(job=><div key={job.id} className="rounded-lg border border-border bg-bg p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text">{job.topic}</span>
          <span className="text-xs uppercase tracking-wide text-muted">{job.status.replace("_"," ")}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-panel2"><div className="h-full rounded-full bg-accent"
          style={{width:`${Math.max(0,Math.min(100,job.progress))}%`}}/></div>
        {job.error_message&&<p className="mt-2 text-xs text-red-300">{job.error_message}</p>}
        {job.quality_report&&<p className="mt-2 text-xs text-muted">
          Structural quality: {job.quality_report.passed?"Passed":"Review needed"}
        </p>}
        {job.evidence_report&&<p className="mt-1 text-xs text-amber-300">
          Factual verification: human review required · {job.evidence_report.withSources}/{job.evidence_report.count} supplied source links (not independently verified)
        </p>}
        {job.status==="completed"&&<div className="mt-3 space-y-2">
          <p className="text-xs text-muted">Review: {job.review_status||"pending"} · Publication: {job.publication_status||"not_requested"}</p>
          {(!job.review_status||job.review_status==="pending")&&<div className="flex gap-2">
            <button type="button" disabled={reviewBusy===job.id} onClick={()=>void reviewJob(job,"approve")}
              className="rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50">Approve reviewed video</button>
            <button type="button" disabled={reviewBusy===job.id} onClick={()=>void reviewJob(job,"reject")}
              className="rounded-lg border border-red-600 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Reject</button>
          </div>}
          {job.review_status==="approved"&&(job.publication_status||"not_requested")==="not_requested"&&
            <button type="button" disabled={reviewBusy===job.id} onClick={()=>void publishJob(job)}
              className="rounded-lg border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50">Publish publicly (separate confirmation)</button>}
          {job.publication_status==="needs_review"&&<p className="text-xs text-amber-300">YouTube update outcome may be uncertain. Check Studio before any further action.</p>}
        </div>}

        {job.youtube_video_url&&<a href={job.youtube_video_url} target="_blank" rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-accent hover:underline">Open uploaded video on YouTube</a>}
      </div>)}
    </section>
  </div>;
}
