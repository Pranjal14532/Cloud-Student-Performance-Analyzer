import test from "node:test";
import assert from "node:assert/strict";
import { analyzeStudent, classify } from "../src/utils/analytics.js";

test("classifies transparent percentage bands", () => {
  assert.equal(classify(85), "Excellent");
  assert.equal(classify(70), "Good");
  assert.equal(classify(50), "Average");
  assert.equal(classify(49), "Needs Improvement");
});

test("calculates subject, semester and overall analytics", () => {
  const result = analyzeStudent([
    { subject:"Math", semester:"Semester 1", marks:80, max_marks:100 },
    { subject:"Science", semester:"Semester 1", marks:60, max_marks:100 },
    { subject:"Math", semester:"Semester 2", marks:90, max_marks:100 },
    { subject:"Science", semester:"Semester 2", marks:70, max_marks:100 }
  ], 72);
  assert.equal(result.overall, 75);
  assert.equal(result.strongestSubject, "Math");
  assert.equal(result.weakestSubject, "Science");
  assert.equal(result.improvement, 10);
  assert.equal(result.classAverage, 72);
});
