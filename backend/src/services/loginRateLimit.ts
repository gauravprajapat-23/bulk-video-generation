/**
 * Best-effort in-process guard for public Google token validation.
 * A reverse proxy/shared datastore rate limit is still required for
 * multi-instance production. Do not trust X-Forwarded-For blindly.
 */
const MAX_IPS=5000;
const WINDOW_MS=5*60_000;
const MAX_ATTEMPTS=60;
const attempts=new Map<string,{start:number,count:number}>();
export function allowGoogleLoginAttempt(ip:string,now=Date.now()):boolean{
  const key=(ip||"unknown").slice(0,160);
  let record=attempts.get(key);
  if(!record||now-record.start>=WINDOW_MS||now<record.start){
    record={start:now,count:0};
  }
  if(!attempts.has(key)&&attempts.size>=MAX_IPS){
    for(const [k,v] of attempts){
      if(now-v.start>=WINDOW_MS)attempts.delete(k);
    }
    if(attempts.size>=MAX_IPS){
      // Reject rather than unbounded memory growth or resetting all quotas.
      return false;
    }
  }
  record.count++;
  attempts.set(key,record);
  return record.count<=MAX_ATTEMPTS;
}
