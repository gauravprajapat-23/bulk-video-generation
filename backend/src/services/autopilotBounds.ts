/**
 * Upper bounds for the older CSV/image Autopilot renderer. Designs are
 * untrusted JSON stored through authenticated API routes; Node canvas must
 * never be allowed to allocate arbitrary pixel dimensions or page counts.
 */
export function validateAutopilotRenderBounds(input:unknown):void{
  if(!input||typeof input!=="object")throw new Error("Autopilot configuration missing");
  const config=input as Record<string,unknown>;
  const design=config.design_data as Record<string,unknown>|null;
  if(!design||typeof design!=="object")throw new Error("Autopilot design missing");
  const width=design.width,height=design.height;
  if(typeof width!=="number"||typeof height!=="number"||
    !Number.isInteger(width)||!Number.isInteger(height)||
    width<64||height<64||width>1920||height>1920||width*height>1920*1080){
    throw new Error("Autopilot canvas resolution exceeds production limits");
  }
  const pages=design.pages;
  if(!Array.isArray(pages)||!pages.length||pages.length>20){
    throw new Error("Autopilot allows 1–20 pages per video");
  }
  for(const page of pages){
    if(!page||typeof page!=="object")throw new Error("Invalid Autopilot page");
    const p=page as Record<string,unknown>;
    if(!Array.isArray(p.elements)||p.elements.length>100){
      throw new Error("Autopilot page exceeds 100 elements");
    }
    if(p.durationMs!==undefined&&(typeof p.durationMs!=="number"||
      !Number.isFinite(p.durationMs)||p.durationMs<100||p.durationMs>120000)){
      throw new Error("Autopilot page duration must be between 100ms and 120s");
    }
    for(const element of p.elements){
      if(!element||typeof element!=="object")throw new Error("Invalid Autopilot element");
      const el=element as Record<string,unknown>;
      for(const field of ["x","y","width","height","fontSize","opacity"]){
        const value=el[field];
        if(value!==undefined&&(typeof value!=="number"||!Number.isFinite(value)||
          Math.abs(value)>4096)){
          throw new Error("Autopilot design element dimensions are invalid");
        }
      }
      if(typeof el.text==="string"&&el.text.length>3000){
        throw new Error("Autopilot text element exceeds 3000 characters");
      }
    }
  }
  if(!Array.isArray(config.csv_rows)||config.csv_rows.length>10000){
    throw new Error("Autopilot CSV row count exceeds limit");
  }
  for(const row of config.csv_rows){
    if(!row||typeof row!=="object"||Array.isArray(row)){
      throw new Error("Autopilot CSV row is invalid");
    }
    const entries=Object.entries(row);
    if(entries.length>100)throw new Error("Autopilot CSV exceeds 100 columns");
    if(entries.some(([key,value])=>key.length>120||
      typeof value!=="string"||value.length>2000)){
      throw new Error("Autopilot CSV cell exceeds 2000 characters");
    }
  }
  if(typeof config.videos_per_day!=="number"||
    !Number.isInteger(config.videos_per_day)||config.videos_per_day<1||config.videos_per_day>10){
    throw new Error("Autopilot videos per day must be 1–10");
  }
}
