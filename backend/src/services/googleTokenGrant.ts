export interface GoogleAccessGrant {
  azp?:unknown; issued_to?:unknown; aud?:unknown; audience?:unknown;
  sub?:unknown; expires_in?:unknown; scope?:unknown;
}
/** Reject tokens minted for a different OAuth client, including same-user tokens. */
export function isAcceptedGoogleAccessGrant(grant:GoogleAccessGrant,clientId:string):boolean{
  if(!grant||!clientId)return false;
  const issuedTo=grant.azp||grant.issued_to||grant.aud||grant.audience;
  if(typeof issuedTo!=="string"||issuedTo!==clientId)return false;
  if(grant.expires_in===undefined||!Number.isFinite(Number(grant.expires_in))||
    Number(grant.expires_in)<=0)return false;
  if(typeof grant.scope!=="string")return false;
  return grant.scope.split(/\s+/).includes("https://www.googleapis.com/auth/userinfo.email");
}
