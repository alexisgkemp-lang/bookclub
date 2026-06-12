const form = document.querySelector("#create-form");
const button = document.querySelector("#submit-button");
const status = document.querySelector("#form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  button.disabled = true;
  button.textContent = "Generating...";
  status.textContent = "Calling ElevenLabs and creating the reading page.";

  const payload = {
    title: document.querySelector("#title").value,
    text: document.querySelector("#text").value
  };

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    window.location.href = data.url;
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.textContent = "Generate page";
  }
});

async function readResponse(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "The server returned an unreadable response."
    };
  }
}
