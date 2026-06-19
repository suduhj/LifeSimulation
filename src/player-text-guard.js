export const FORBIDDEN_PLAYER_TEXT_TERMS = [
  "人生课程",
  "年度变化",
  "旧线索",
  "背景回响",
  "主轴",
  "副轴",
  "curriculumSlot",
  "threeLayerFocus",
  "annualFactPackage",
  "backgroundThreads",
  "assetRoles",
];

const RAW_ID_RE = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/g;

export function detectForbiddenPlayerText(value) {
  const fields = collectPlayerTextFields(value);
  const matches = [];

  for (const [path, text] of fields) {
    for (const term of FORBIDDEN_PLAYER_TEXT_TERMS) {
      if (text.includes(term)) matches.push({ path, term, reason: "forbidden_backend_term" });
    }
    for (const match of text.matchAll(RAW_ID_RE)) {
      matches.push({ path, term: match[0], reason: "raw_backend_id" });
    }
  }

  return uniqueMatches(matches);
}

export function hasForbiddenPlayerText(value) {
  return detectForbiddenPlayerText(value).length > 0;
}

export function collectPlayerTextFields(value) {
  if (typeof value === "string") return [["text", value]];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const fields = [];
  if (typeof value.playerText?.title === "string") fields.push(["playerText.title", value.playerText.title]);
  if (typeof value.playerText?.body === "string") fields.push(["playerText.body", value.playerText.body]);
  if (Array.isArray(value.playerText?.visibleChanges)) {
    value.playerText.visibleChanges.forEach((text, index) => {
      if (typeof text === "string") fields.push([`playerText.visibleChanges[${index}]`, text]);
    });
  }
  if (Array.isArray(value.choices)) {
    value.choices.forEach((choice, index) => {
      if (typeof choice?.text === "string") fields.push([`choices[${index}].text`, choice.text]);
      if (typeof choice?.fuzzySuccessLabel === "string") fields.push([`choices[${index}].fuzzySuccessLabel`, choice.fuzzySuccessLabel]);
    });
  }
  if (Array.isArray(value.visibleChanges)) {
    value.visibleChanges.forEach((change, index) => {
      if (typeof change?.text === "string") fields.push([`visibleChanges[${index}].text`, change.text]);
    });
  }
  return fields;
}

function uniqueMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    const key = `${match.path}:${match.term}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
