const COOKIE_NAME = "hasSubmitted";

// Formspree form ID — create a form at https://formspree.io and set the recipient there
const FORMSPREE_FORM_ID = "xvzrblbl"; // e.g. "xyzabcde"

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="));
}

function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${value}; expires=${d.toUTCString()}; path=/`;
}

/* ---- Submission lock ---- */
if (getCookie(COOKIE_NAME)) {
  document.getElementById("already-submitted").classList.remove("hidden");
  document.getElementById("quiz").classList.add("hidden");
}

/* ---- Timer ---- */
let startTime = Date.now();
setInterval(() => {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById("timer").textContent = `Time: ${seconds}s`;
}, 1000);

/* ---- Question definition ---- */
const questions = [
  { id: "nerdy", text: 'Would you call yourself "nerdy"?', type: "yesno" },
  { id: "know_this", text: "Do you know what this is?", type: "yesno" },
  { id: "gender", text: "What is your gender?", type: "select",
    options: ["Male", "Female", "Other", "Prefer Not to Say"]
  },
  { id: "birth", text: "When were you born?", type: "date" },
  { id: "socials", text: "Which of these do you use or would use?", type: "multi",
    options: ["Discord", "Signal", "WhatsApp", "None"]
  },
  { id: "single", text: "Are you single?", type: "yesno" },
  { id: "interest", text: "What are you interested in?", type: "select",
    options: ["Men", "Women", "Both", "Neither", "Prefer Not to Say"]
  },
  { id: "matter", text: "Do you believe your responses matter?", type: "yesno" },
  { id: "timed", text: "Were you aware you're being timed?", type: "yesno" }, // text replaced with elapsed time when shown
  { id: "lonely", text: "Do you get lonely?", type: "yesno" },
  { id: "happy", text: "Do you consider yourself a happy person?", type: "yesno" },
  { id: "name", text: "What is your name?", type: "text" },
  { id: "know_me", text: "Do you know who I am?", type: "yesno" },
  {
    id: "who",
    text: "Who?",
    type: "text",
    condition: answers => answers.know_me === "Yes"
  },
  {
    id: "would_like_to",
    text: "Would you like to?",
    type: "yesno",
    condition: answers => answers.know_me === "No"
  }
];

let current = 0;
const answers = {};
const box = document.getElementById("question-box");

/* ---- Rendering ---- */
function renderQuestion() {
  if (current >= questions.length) {
    finish();
    return;
  }
  const q = questions[current];

  if (q.condition && !q.condition(answers)) {
    current++;
    return renderQuestion();
  }

  let questionText = q.text;
  if (q.id === "timed") {
    const timerEl = document.getElementById("timer");
    timerEl.classList.remove("hidden");
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = `Time: ${seconds}s`;
    questionText = `You've been answering questions for ${seconds} seconds. Were you aware you're being timed?`;
  }
  box.innerHTML = `<h2>${questionText}</h2>`;
  const group = document.createElement("div");
  group.className = "option-group";

  if (q.type === "yesno") {
    ["Yes", "No"].forEach(v => {
      const btn = document.createElement("button");
      btn.textContent = v;
      btn.onclick = () => answer(q.id, v);
      group.appendChild(btn);
    });
  }

  if (q.type === "select") {
    const sel = document.createElement("select");
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose...";
    sel.appendChild(placeholder);
    q.options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    });
    const err = document.createElement("div");
    err.className = "error-msg";
    const btn = document.createElement("button");
    btn.textContent = "Next";
    btn.onclick = () => {
      err.textContent = "";
      if (!sel.value.trim()) {
        err.textContent = "Please choose an option.";
        return;
      }
      answer(q.id, sel.value);
    };
    group.append(sel, err, btn);
  }

  if (q.type === "text" || q.type === "date") {
    const input = document.createElement("input");
    input.type = q.type;
    const err = document.createElement("div");
    err.className = "error-msg";
    const btn = document.createElement("button");
    btn.textContent = "Next";
    btn.onclick = () => {
      err.textContent = "";
      const val = q.type === "text" ? input.value.trim() : input.value;
      if (!val) {
        err.textContent = q.type === "date" ? "Please pick a date." : "Please enter an answer.";
        return;
      }
      answer(q.id, q.type === "text" ? val : input.value);
    };
    group.append(input, err, btn);
  }

  if (q.type === "multi") {
    q.options.forEach(o => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = o;
      label.append(cb, " ", o);
      group.appendChild(label);
    });
    const err = document.createElement("div");
    err.className = "error-msg";
    const btn = document.createElement("button");
    btn.textContent = "Next";
    btn.onclick = () => {
      err.textContent = "";
      const selected = [...group.querySelectorAll("input:checked")].map(i => i.value);
      if (selected.length === 0) {
        err.textContent = "Please select at least one option.";
        return;
      }
      answer(q.id, selected);
    };
    group.append(err, btn);
  }

  box.appendChild(group);
}

function answer(id, value) {
  answers[id] = value;
  box.classList.add("out");

  setTimeout(() => {
    box.classList.remove("out");
    current++;
    current < questions.length ? renderQuestion() : finish();
  }, 400);
}

/* ---- Result ---- */
function ageInYearsAsOf(birthDateStr, asOfDate) {
  if (!birthDateStr) return null;
  // Parse as local date to avoid UTC "YYYY-MM-DD" shifting to previous day in some timezones
  const [y, m, d] = birthDateStr.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  let age = asOfDate.getFullYear() - birth.getFullYear();
  const monthDiff = asOfDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birth.getDate())) age--;
  return age;
}

function finish() {
  setCookie(COOKIE_NAME, "true");
  document.getElementById("quiz").classList.add("hidden");

  const result = document.getElementById("result");
  result.classList.remove("hidden");

  // Default: Option B. Option A only if all conditions are met.
  const isFemale = answers.gender === "Female";
  const isSingle = answers.single === "Yes";
  const isInterestMen = answers.interest === "Men" || answers.interest === "Both";

  const today = new Date();
  // A = user's age as of today
  const userAgeA = ageInYearsAsOf(answers.birth, today);
  // B = reference person's age as of today (reference person "born" September 14th, 2004)
  const referenceAgeB = ageInYearsAsOf("2004-09-14", today);

  const minAge = userAgeA != null && referenceAgeB != null
    ? Math.min(userAgeA, referenceAgeB)
    : null;
  const maxAge = userAgeA != null && referenceAgeB != null
    ? Math.max(userAgeA, referenceAgeB)
    : null;
  const ageRuleOk = minAge != null && maxAge != null && Math.round(maxAge / 2.0 + 7.0) <= minAge;

  const option =
    isFemale && isSingle && isInterestMen && ageRuleOk && (answers.would_like_to === "Yes" || answers.know_me === "Yes")
      ? "Option A"
      : "Option B";

  if (option === "Option A") {
    result.innerHTML = `
      <h2>It looks like we'd be compatible.</h2>
      <p>Would you like to leave your contact information below?</p>
      <form id="option-a-contact" class="option-group">
        <textarea id="contact-info" rows="3" placeholder="Email, phone, or other contact..."></textarea>
        <div class="error-msg" id="contact-error"></div>
        <button type="submit">Submit</button>
      </form>
    `;
    result.querySelector("#option-a-contact").addEventListener("submit", (e) => {
      e.preventDefault();
      const contactEl = document.getElementById("contact-info");
      const errEl = document.getElementById("contact-error");
      const contact = contactEl.value.trim();
      errEl.textContent = "";
      if (!contact) {
        errEl.textContent = "Please enter your contact information.";
        return;
      }
      if (FORMSPREE_FORM_ID !== "YOUR_FORM_ID") {
        sendOptionAEmail(answers, contact);
      }
      result.innerHTML = `
        <h2>Thanks</h2>
        <p>We'll be in touch.</p>
      `;
    });
  } else {
    result.innerHTML = `
      <h2>Unfortunately, it doesn't seem like we'd be compatible.</h2>
      <p>Thanks for taking the time to answer.</p>
    `;
  }
}

function sendOptionAEmail(answers, contactInfo) {
  const answersText = Object.entries(answers)
    .map(([q, a]) => `${q}: ${Array.isArray(a) ? a.join(", ") : a}`)
    .join("\n");
  const message = `Contact information:\n${contactInfo}\n\n--- Answers ---\n${answersText}`;
  fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _subject: "Quiz: Option A – contact info",
      message
    })
  }).catch(() => {});
}

/* ---- Start ---- */
renderQuestion();