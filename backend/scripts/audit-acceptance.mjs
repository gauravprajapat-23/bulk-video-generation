import {spawnSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import path from "node:path";

const index=process.argv.indexOf("--output");
const out=index>=0?process.argv[index+1]:null;
if(!out||!path.isAbsolute(out)){
  console.error("Usage: npm run accept:audit -- --output ABSOLUTE_REPORT_PATH");
  process.exit(2);
}
const result=spawnSync("npm",["audit","--json"],{
  encoding:"utf8",shell:process.platform==="win32",maxBuffer:20*1024*1024,
  windowsHide:true,timeout:180_000,
});
if(result.error){console.error("npm audit execution failed:",result.error.message);process.exit(2);}
let payload;
try{payload=JSON.parse(result.stdout||"");}
catch{
  console.error("npm audit did not return valid JSON:",(result.stderr||"").slice(0,400));
  process.exit(2);
}
if(!payload.metadata?.vulnerabilities){
  console.error("npm audit did not report vulnerability metadata");
  process.exit(2);
}
const counts=payload.metadata.vulnerabilities;
const issues=Object.entries(payload.vulnerabilities||{}).map(([name,v])=>({
  name,severity:v.severity,isDirect:v.isDirect,range:v.range,
  fixAvailable:v.fixAvailable,
  via:(v.via||[]).map(x=>typeof x==="string"?{dependency:x}:{
    title:x.title,url:x.url,range:x.range,severity:x.severity,
  }),
})).sort((a,b)=>(b.severity==="critical"?5:b.severity==="high"?4:2)-
  (a.severity==="critical"?5:a.severity==="high"?4:2));
const report={
  generatedAt:new Date().toISOString(),
  package:process.env.npm_package_name||"video-maker-backend",
  counts:{critical:counts.critical||0,high:counts.high||0,
    moderate:counts.moderate||0,low:counts.low||0},
  issues,
  status:(counts.critical||0)+(counts.high||0)>0?"blocked":"review",
  note:"Do not run npm audit fix --force without assessing breaking changes and lockfile updates.",
};
mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
writeFileSync(path.resolve(out),JSON.stringify(report,null,2)+"\n",{mode:0o600});
console.log("[accept:audit]",JSON.stringify(report.counts),
  "report:",path.resolve(out),"status:",report.status);
if(report.status==="blocked")process.exitCode=1;
