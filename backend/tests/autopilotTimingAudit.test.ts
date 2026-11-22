import assert from "node:assert/strict";
import {test} from "node:test";
import {isAutopilotTimeDue} from "../src/services/autopilotTiming";
const base={is_enabled:true,csv_rows:[{headline:"ok"}],csv_cursor:0,
  timezone:"Asia/Kolkata",upload_times:["10:00"],last_run_date:null};
test("legacy Autopilot uses configured IANA timezone, not host-local clock",()=>{
  assert.equal(isAutopilotTimeDue(base,new Date("2026-11-22T04:30:00Z")),true);
  assert.equal(isAutopilotTimeDue(base,new Date("2026-11-22T10:00:00Z")),false);
  assert.equal(isAutopilotTimeDue({...base,timezone:"UTC"},new Date("2026-11-22T10:00:00Z")),true);
});
test("the same slot cannot fire twice within its local three-minute suppression window",()=>{
  assert.equal(isAutopilotTimeDue({...base,last_run_date:"2026-11-22T04:30:00Z"},
    new Date("2026-11-22T04:31:00Z")),false);
});
test("invalid timezone, malformed slots and exhausted CSV fail closed",()=>{
  assert.equal(isAutopilotTimeDue({...base,timezone:"Mars/Olympus_Mons"},new Date("2026-11-22T04:30:00Z")),false);
  assert.equal(isAutopilotTimeDue({...base,upload_times:["100:00"]},new Date("2026-11-22T04:30:00Z")),false);
  assert.equal(isAutopilotTimeDue({...base,csv_cursor:1},new Date("2026-11-22T04:30:00Z")),false);
  assert.equal(isAutopilotTimeDue({...base,is_enabled:false},new Date("2026-11-22T04:30:00Z")),false);
});
