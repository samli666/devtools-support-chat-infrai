import assert from "node:assert/strict";
import { redactTranscript } from "../src/support_chat.ts";

const input = "Build failed in release 42\npatient: Ada Example\nnext step: inspect logs";
const output = redactTranscript(input);
assert.equal(output, "Build failed in release 42\npatient: [redacted]\nnext step: inspect logs");
console.log("privacy decision: sensitive transcript fields are redacted before email");
