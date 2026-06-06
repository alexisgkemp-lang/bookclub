const RESEND_EVENTS_ENDPOINT = "https://api.resend.com/events/send";
const EVENT_NAME = "bookclub.signup";

const pageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Atomic Book Club</title>
    <meta
      name="description"
      content="Join the Atomic Book Club for thoughtful reads, sharp prompts, and good conversation."
    >
    <style>
      :root {
        color-scheme: light;
        --ink: #17201b;
        --muted: #5b665f;
        --paper: #f8f5ef;
        --line: #d8d0c4;
        --accent: #28786f;
        --accent-dark: #175850;
        --focus: #b8472f;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          linear-gradient(135deg, rgba(40, 120, 111, 0.14), transparent 36%),
          linear-gradient(315deg, rgba(184, 71, 47, 0.12), transparent 34%),
          var(--paper);
        color: var(--ink);
      }

      .page-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .signup-panel {
        width: min(100%, 720px);
        padding: clamp(28px, 7vw, 64px);
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 24px 80px rgba(23, 32, 27, 0.12);
      }

      .eyebrow {
        margin: 0 0 14px;
        font-size: 0.82rem;
        font-weight: 750;
        letter-spacing: 0;
        text-transform: uppercase;
        color: var(--accent-dark);
      }

      h1 {
        margin: 0;
        max-width: 11ch;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(3rem, 12vw, 5.8rem);
        line-height: 0.94;
        font-weight: 700;
        letter-spacing: 0;
      }

      .lede {
        max-width: 42rem;
        margin: 26px 0 0;
        font-size: clamp(1.08rem, 2.6vw, 1.35rem);
        line-height: 1.55;
        color: var(--muted);
      }

      .signup-form {
        margin-top: 36px;
      }

      label {
        display: block;
        margin-bottom: 10px;
        font-size: 0.95rem;
        font-weight: 700;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }

      input,
      button {
        min-height: 54px;
        border-radius: 8px;
        font: inherit;
      }

      input {
        width: 100%;
        border: 1px solid var(--line);
        padding: 0 16px;
        color: var(--ink);
        background: #fffdf9;
      }

      input:focus {
        border-color: var(--focus);
        outline: 3px solid rgba(184, 71, 47, 0.2);
      }

      button {
        border: 0;
        padding: 0 24px;
        background: var(--accent);
        color: white;
        font-weight: 800;
        cursor: pointer;
      }

      button:hover {
        background: var(--accent-dark);
      }

      button:disabled {
        cursor: wait;
        opacity: 0.72;
      }

      .form-note,
      .form-message {
        margin: 12px 0 0;
        min-height: 1.4em;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .form-message {
        font-weight: 700;
        color: var(--accent-dark);
      }

      @media (max-width: 560px) {
        .page-shell {
          place-items: stretch;
          padding: 14px;
        }

        .signup-panel {
          min-height: calc(100vh - 28px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        button {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class="page-shell">
      <section class="signup-panel" aria-labelledby="page-title">
        <div class="intro">
          <p class="eyebrow">Atomic Community</p>
          <h1 id="page-title">Join the Atomic Book Club</h1>
          <p class="lede">
            A simple reading circle for curious people. Get the next book,
            discussion prompts, and meeting notes straight to your inbox.
          </p>
        </div>

        <form class="signup-form" id="signup-form" action="/api/signup" method="post">
          <label for="email">Email address</label>
          <div class="form-row">
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              placeholder="you@example.com"
              required
            >
            <button type="submit">Join</button>
          </div>
          <p class="form-note">No spam. Just book club notes and updates.</p>
          <p class="form-message" id="form-message" role="status" aria-live="polite"></p>
        </form>
      </section>
    </main>

    <script>
      const form = document.querySelector("#signup-form");
      const message = document.querySelector("#form-message");
      const button = form.querySelector("button");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "";
        button.disabled = true;
        button.textContent = "Joining";

        try {
          const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || "Something went wrong.");
          }

          form.reset();
          message.textContent = "You are in. Check your inbox soon.";
        } catch (error) {
          message.textContent = error.message || "Something went wrong. Please try again.";
        } finally {
          button.disabled = false;
          button.textContent = "Join";
        }
      });
    </script>
  </body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/signup") {
      return handleSignup(request, env);
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(pageHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleSignup(request, env) {
  if (!env.RESEND_API_KEY) {
    return json({ message: "Resend is not configured yet." }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ message: "Please submit the form again." }, 400);
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return json({ message: "Please enter a valid email address." }, 400);
  }

  const resendResponse = await fetch(RESEND_EVENTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: EVENT_NAME,
      name: EVENT_NAME,
      email,
      payload: {
        firstName: "",
      },
    }),
  });

  if (!resendResponse.ok) {
    let details = "Resend could not start the book club automation.";

    try {
      const body = await resendResponse.json();
      details = body.message || body.error || details;
    } catch {
      // Keep the friendly fallback message.
    }

    return json({ message: details }, 502);
  }

  return json({ ok: true });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
