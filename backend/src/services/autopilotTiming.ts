/** Timezone-aware time-slot matching for classic CSV/image Autopilot. */
function localParts(at:Date,timeZone:string):{date:string;minute:number}{
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone,year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23",
  }).formatToParts(at);
  const get=(type:string)=>parts.find(p=>p.type===type)?.value||"";
  const hour=Number(get("hour")),minute=Number(get("minute"));
  if(!Number.isInteger(hour)||!Number.isInteger(minute))throw new Error("Invalid timezone clock");
  return {date:get("year")+"-"+get("month")+"-"+get("day"),minute:hour*60+minute};
}
export function isAutopilotTimeDue(config:{
  is_enabled?:boolean;csv_rows?:unknown[];csv_cursor?:number;
  timezone?:string;upload_times?:string[];last_run_date?:string|Date|null;
},now=new Date()):boolean{
  if(!config.is_enabled||!Array.isArray(config.csv_rows)||config.csv_rows.length===0||
    typeof config.csv_cursor!=="number"||!Number.isInteger(config.csv_cursor)||
    config.csv_cursor<0||config.csv_cursor>=config.csv_rows.length){
    return false;
  }
  const timezone=typeof config.timezone==="string"&&config.timezone?config.timezone:"UTC";
  try{
    const current=localParts(now,timezone);
    if(config.last_run_date){
      const last=new Date(config.last_run_date);
      if(Number.isFinite(last.getTime())){
        const previous=localParts(last,timezone);
        // Prevent a second run for the same minute, including a DST fall-back.
        if(previous.date===current.date&&
          Math.abs(current.minute-previous.minute)<=3)return false;
      }
    }
    return (config.upload_times||[]).some(t=>{
      if(typeof t!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return false;
      const [h,m]=t.split(":").map(Number);
      return Math.abs(current.minute-(h*60+m))<=2;
    });
  }catch{
    // Invalid IANA timezone or malformed date: fail closed, never schedule
    // on the server's unrelated local timezone.
    return false;
  }
}
