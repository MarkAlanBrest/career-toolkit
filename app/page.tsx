export default function HomePage() {
  return (
    <main style={{ color: "#2d3b45" }}>

      {/* ── Nav ── */}
      <nav style={{
        background: "#2d3b45",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>
          Canvas Enhancer
        </span>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="#features" style={{ color: "#a8bac4", fontSize: 14, textDecoration: "none" }}>Features</a>
          <a href="#components" style={{ color: "#a8bac4", fontSize: 14, textDecoration: "none" }}>Components</a>
          <a href="#pricing" style={{ color: "#a8bac4", fontSize: 14, textDecoration: "none" }}>Pricing</a>
          <a href="#install" style={{
            background: "#0770a3",
            color: "#fff",
            padding: "7px 16px",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}>Install Free</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: "linear-gradient(135deg, #1a2a35 0%, #2d3b45 60%, #0770a3 100%)",
        color: "#fff",
        padding: "72px 32px 80px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 20,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: 20,
          }}>
            Chrome · Edge · Free to install
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px" }}>
            Beautiful Canvas pages.<br />
            <span style={{ color: "#5ec3f0" }}>No coding required.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#c8d8e4", margin: "0 0 36px" }}>
            Canvas Enhancer adds a professional design toolbar directly inside the Canvas
            editor — plus AI-powered content generation and quiz building for Pro users.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#install" style={{
              background: "#0770a3",
              color: "#fff",
              padding: "14px 30px",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}>
              Install Free — Chrome & Edge
            </a>
            <a href="#pricing" style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              padding: "14px 30px",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}>
              See Pricing
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="features" style={{ padding: "64px 32px", background: "#f8f9fa" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            How it works
          </h2>
          <p style={{ textAlign: "center", color: "#6b7780", marginBottom: 48 }}>
            Install once. Use it every time you edit a Canvas page.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              { step: "1", icon: "🔧", title: "Install the extension", desc: "One click from the Chrome Web Store or Edge Add-ons. Free — no account needed." },
              { step: "2", icon: "📝", title: "Open any Canvas page", desc: "Edit a page, assignment, or discussion as normal." },
              { step: "3", icon: "🖱️", title: "Click a component", desc: "The toolbar appears below the Canvas editor. Pick a category and click to insert." },
              { step: "4", icon: "✨", title: "Instant professional look", desc: "Styled HTML inserts immediately. Students see it right away." },
            ].map(item => (
              <div key={item.step} style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "24px 20px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                <div style={{
                  display: "inline-block",
                  background: "#0770a3",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  lineHeight: "24px",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10,
                }}>{item.step}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "#6b7780", lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features ── */}
      <section style={{ padding: "64px 32px", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            background: "#f0f7ff",
            border: "1px solid #c3dff5",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: "#0770a3",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Pro Features
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
            AI-powered tools built for educators
          </h2>
          <p style={{ color: "#6b7780", fontSize: 16, lineHeight: 1.6, marginBottom: 48, maxWidth: 580 }}>
            Unlock AI Content Builder and Quiz Maker with any paid plan. Generate complete
            course content and quizzes in seconds — directly inside Canvas.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "#0C447C", color: "#fff", padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>AI Content Builder</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Write course content in seconds</div>
              </div>
              <div style={{ padding: "20px", background: "#fafafa" }}>
                {[
                  "Describe your topic — AI writes the content",
                  "Choose tone: academic, friendly, or concise",
                  "Inserts styled HTML directly into Canvas",
                  "Callouts, headers, and formatting included",
                ].map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: "#2d3b45" }}>
                    <span style={{ color: "#0770a3", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "#0C447C", color: "#fff", padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>AI Quiz Maker</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Build complete quizzes instantly</div>
              </div>
              <div style={{ padding: "20px", background: "#fafafa" }}>
                {[
                  "Multiple choice, true/false, short answer, essay",
                  "Set question counts per type",
                  "Creates the quiz directly in Canvas",
                  "Supports Classic and New Quizzes",
                ].map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: "#2d3b45" }}>
                    <span style={{ color: "#0770a3", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Components ── */}
      <section id="components" style={{ padding: "64px 32px", background: "#f8f9fa" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            42 ready-to-use components — all free
          </h2>
          <p style={{ textAlign: "center", color: "#6b7780", marginBottom: 48 }}>
            Every component unlocks the moment you install. No license key required.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              { category: "Dividers", items: ["Simple line", "Bold line", "Dashed line", "Double line", "Colored bar", "Gradient bar"] },
              { category: "Headers", items: ["Section banner", "Solid banner", "Gradient banner", "Underline header", "Dark banner", "Warning banner"] },
              { category: "Callouts", items: ["Tip", "Warning", "Important", "Note", "Custom", "Do Not", "Success", "Did You Know"] },
              { category: "Lists", items: ["Checklist", "Steps", "Icon list ✅", "Icon list ▶", "Badge labels", "Progress tracker"] },
              { category: "Layouts", items: ["Custom columns", "Two columns", "Three columns", "Image + text", "Collapsible"] },
              { category: "Cards", items: ["Card grid", "Instructor Bio", "Welcome", "Tips for Success", "Office Hours", "Due Date", "Course Policies", "Grading Breakdown", "Submit Checklist", "Pull quote", "Button link"] },
            ].map(cat => (
              <div key={cat.category} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: "#2d3b45", color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 14 }}>
                  {cat.category}
                </div>
                <div style={{ padding: "12px 16px", background: "#fff" }}>
                  {cat.items.map(item => (
                    <div key={item} style={{ padding: "4px 0", fontSize: 13, color: "#2d3b45" }}>
                      ✓ {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "64px 32px", background: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Simple, honest pricing
          </h2>
          <p style={{ textAlign: "center", color: "#6b7780", marginBottom: 48 }}>
            The toolbar is free forever. Unlock AI features when you're ready.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, alignItems: "start" }}>

            {/* Free */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px 28px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Free</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 2 }}>$0</div>
              <div style={{ fontSize: 14, color: "#6b7780", marginBottom: 24 }}>forever</div>
              <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 2.2, marginBottom: 28 }}>
                <li>✓ All 42 components</li>
                <li>✓ All future components</li>
                <li style={{ color: "#9ca3af" }}>✗ AI Content Builder</li>
                <li style={{ color: "#9ca3af" }}>✗ AI Quiz Maker</li>
              </ul>
              <a href="#install" style={{
                display: "block",
                background: "#f3f4f6",
                color: "#2d3b45",
                padding: "11px 0",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                textAlign: "center",
              }}>
                Install Free
              </a>
            </div>

            {/* Base */}
            <div style={{ border: "2px solid #0770a3", borderRadius: 12, padding: "32px 28px", position: "relative" }}>
              <div style={{
                position: "absolute",
                top: -13,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0770a3",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 12px",
                borderRadius: 20,
                whiteSpace: "nowrap",
              }}>Most Popular</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0770a3", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Base</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 2 }}>$6.58<span style={{ fontSize: 16, fontWeight: 400, color: "#6b7780" }}>/mo</span></div>
              <div style={{ fontSize: 13, color: "#6b7780", marginBottom: 4 }}>billed annually ($79/yr)</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>or $7.75/mo month-to-month</div>
              <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 2.2, marginBottom: 28 }}>
                <li>✓ Everything in Free</li>
                <li>✓ AI Content Builder</li>
                <li>✓ AI Quiz Maker</li>
                <li>✓ 50 AI generations/month</li>
                <li>✓ License key — instant activation</li>
              </ul>
              <a href="https://canvasenhancer.com/upgrade" style={{
                display: "block",
                background: "#0770a3",
                color: "#fff",
                padding: "12px 0",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                textAlign: "center",
              }}>
                Get Base Plan
              </a>
            </div>

            {/* Pro */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px 28px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Pro</div>
              <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 2 }}>$16.67<span style={{ fontSize: 16, fontWeight: 400, color: "#6b7780" }}>/mo</span></div>
              <div style={{ fontSize: 13, color: "#6b7780", marginBottom: 4 }}>billed annually ($200/yr)</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>or $20/mo month-to-month</div>
              <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 2.2, marginBottom: 28 }}>
                <li>✓ Everything in Base</li>
                <li>✓ 150 AI generations/month</li>
                <li>✓ 3× more capacity</li>
                <li>✓ Ideal for heavy course builders</li>
              </ul>
              <a href="https://canvasenhancer.com/upgrade" style={{
                display: "block",
                background: "#2d3b45",
                color: "#fff",
                padding: "12px 0",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                textAlign: "center",
              }}>
                Get Pro Plan
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── Install CTA ── */}
      <section id="install" style={{
        background: "#2d3b45",
        color: "#fff",
        padding: "64px 32px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>
            Ready to upgrade your Canvas pages?
          </h2>
          <p style={{ fontSize: 16, color: "#c8d8e4", lineHeight: 1.6, marginBottom: 36 }}>
            Install in 10 seconds. The toolbar is free — add a license key anytime
            to unlock AI features.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#" style={{
              background: "#0770a3",
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}>
              Add to Chrome — Free
            </a>
            <a href="#" style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}>
              Add to Edge — Free
            </a>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "#6b8090" }}>
            Compatible with cloud-hosted Canvas (*.instructure.com). Not affiliated with Instructure, Inc.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: "#1a2a35",
        color: "#6b8090",
        padding: "24px 32px",
        textAlign: "center",
        fontSize: 13,
      }}>
        © {new Date().getFullYear()} Canvas Enhancer. Not affiliated with Instructure, Inc. or Canvas LMS.
      </footer>

    </main>
  );
}
