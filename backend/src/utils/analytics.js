export function percentage(mark) {
  return mark.max_marks > 0 ? (Number(mark.marks) / Number(mark.max_marks)) * 100 : 0;
}

export function classify(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

export function analyzeStudent(marks, classAverage = 0) {
  const subjectMap = new Map();
  const semesterMap = new Map();
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const mark of marks) {
    const value = percentage(mark);
    if (!subjectMap.has(mark.subject)) subjectMap.set(mark.subject, []);
    subjectMap.get(mark.subject).push(value);
    if (!semesterMap.has(mark.semester)) semesterMap.set(mark.semester, []);
    semesterMap.get(mark.semester).push(value);
    weightedNumerator += Number(mark.marks);
    weightedDenominator += Number(mark.max_marks);
  }
  const subjectAverages = [...subjectMap].map(([subject, values]) => ({
    subject, average: values.reduce((a, b) => a + b, 0) / values.length
  }));
  const semesterAverages = [...semesterMap].map(([semester, values]) => ({
    semester, average: values.reduce((a, b) => a + b, 0) / values.length
  }));
  const overall = weightedDenominator ? (weightedNumerator / weightedDenominator) * 100 : 0;
  const strongest = subjectAverages.reduce((best, item) => !best || item.average > best.average ? item : best, null);
  const weakest = subjectAverages.reduce((best, item) => !best || item.average < best.average ? item : best, null);
  let improvement = 0;
  if (semesterAverages.length > 1) improvement = semesterAverages.at(-1).average - semesterAverages.at(-2).average;
  return {
    overall: Number(overall.toFixed(1)),
    classification: classify(overall),
    subjectAverages: subjectAverages.map(v => ({ ...v, average: Number(v.average.toFixed(1)) })),
    semesterAverages: semesterAverages.map(v => ({ ...v, average: Number(v.average.toFixed(1)) })),
    strongestSubject: strongest?.subject || null,
    weakestSubject: weakest?.subject || null,
    improvement: Number(improvement.toFixed(1)),
    classAverage: Number(classAverage.toFixed(1)),
    needsAttention: overall < 50
  };
}
