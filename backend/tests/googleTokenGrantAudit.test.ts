import assert from "node:assert/strict";
import {test} from "node:test";
import {isAcceptedGoogleAccessGrant} from "../src/services/googleTokenGrant";

const client="audit-app-123.apps.googleusercontent.com";
const grant={azp:client,expires_in:"3600",
  scope:"https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"};
test("Google access token intended for this client may be used to request login",()=>{
  assert.equal(isAcceptedGoogleAccessGrant(grant,client),true);
});
test("Google user token from a different OAuth client is rejected",()=>{
  assert.equal(isAcceptedGoogleAccessGrant({...grant,azp:"other-client.apps.googleusercontent.com"},client),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,azp:undefined,aud:client},client),true);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,azp:undefined,aud:"other"},client),false);
});
test("expired tokens and missing requested email scope cannot grant a local session",()=>{
  assert.equal(isAcceptedGoogleAccessGrant({...grant,expires_in:"0"},client),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,expires_in:undefined},client),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,scope:"https://www.googleapis.com/auth/userinfo.profile"},client),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,scope:undefined},client),false);
});
