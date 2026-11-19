export interface StudioAssetLicenseInput {
  channelId:string; kind:"music"|"image"|"video"|"font";label:string;sourceUrl:string|null;
  licenseName:string;licenseEvidenceUrl:string;attribution:string;
  commercialUseAllowed:boolean;youtubeUseAllowed:boolean;expiresAt:string|null;
}
function httpsUrl(value:string):boolean{
  try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname.length>3;}catch{return false;}
}
export function validateStudioAssetLicense(input:unknown):StudioAssetLicenseInput{
  if(!input||typeof input!=="object")throw new Error("Invalid asset license");
  const x=input as Partial<StudioAssetLicenseInput>;
  if(typeof x.channelId!=="string"||x.channelId.length<3||x.channelId.length>200)throw new Error("Invalid channel");
  if(!["music","image","video","font"].includes(String(x.kind)))throw new Error("Invalid asset type");
  if(typeof x.label!=="string"||x.label.trim().length<3||x.label.length>150)throw new Error("Invalid asset label");
  if(typeof x.licenseName!=="string"||x.licenseName.trim().length<3||x.licenseName.length>180)throw new Error("License name required");
  if(typeof x.licenseEvidenceUrl!=="string"||x.licenseEvidenceUrl.length>1000||!httpsUrl(x.licenseEvidenceUrl))
    throw new Error("License evidence must be an HTTPS URL");
  if(x.sourceUrl!==null&&x.sourceUrl!==undefined&&(typeof x.sourceUrl!=="string"||x.sourceUrl.length>1000||!httpsUrl(x.sourceUrl)))
    throw new Error("Asset source must be HTTPS");
  if(typeof x.attribution!=="string"||x.attribution.length>600)throw new Error("Invalid attribution");
  if(typeof x.commercialUseAllowed!=="boolean"||typeof x.youtubeUseAllowed!=="boolean")throw new Error("Explicit license permissions required");
  if(x.expiresAt!==null&&x.expiresAt!==undefined&&(typeof x.expiresAt!=="string"||!Number.isFinite(Date.parse(x.expiresAt))))
    throw new Error("Invalid license expiry");
  return {channelId:x.channelId,kind:x.kind as StudioAssetLicenseInput["kind"],label:x.label.trim(),
    sourceUrl:x.sourceUrl??null,licenseName:x.licenseName.trim(),licenseEvidenceUrl:x.licenseEvidenceUrl,
    attribution:x.attribution,commercialUseAllowed:x.commercialUseAllowed,
    youtubeUseAllowed:x.youtubeUseAllowed,expiresAt:x.expiresAt??null};
}
export function isAssetEligible(asset:{commercial_use_allowed:boolean;youtube_use_allowed:boolean;
  revoked_at:Date|string|null;expires_at:Date|string|null},now=Date.now()):boolean {
  const exp=asset.expires_at?new Date(asset.expires_at).getTime():null;
  return asset.commercial_use_allowed===true&&asset.youtube_use_allowed===true&&
    !asset.revoked_at&&(exp===null||(Number.isFinite(exp)&&exp>now));
}
/** Ledger records are not proof of rights: operator must validate their evidence. No arbitrary URL downloads. */
