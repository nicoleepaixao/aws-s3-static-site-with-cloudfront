// In a real scenario, this would come from your build-time envs (.env.production)
const API_BASE_URL = "https://api.yoursite.com";

const btn = document.getElementById("call-api-btn");
const resultEl = document.getElementById("api-result");

if (btn && resultEl) {
  btn.addEventListener("click", () => {
    const now = new Date().toISOString();
    const payload = {
      message: "Demo API call (frontend only example)",
      apiBaseUrl: API_BASE_URL,
      timestamp: now,
    };

    resultEl.textContent = JSON.stringify(payload, null, 2);
  });
}
