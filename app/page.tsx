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
          ✏️ Canvas Enhancer
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
            Chrome · Edge · Free 14-Day Trial
          </div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px" }}>
            Beautiful Canvas pages.<br />
            <span style={{ color: "#5ec3f0" }}>No coding required.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#c8d8e4", margin: "0 0 36px" }}>
            Canvas Enhancer adds a professional design toolbar directly inside the Canvas
            editor. Insert styled callouts, headers, tables, layouts, and full page templates
            with a single click.
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
            <a href="#components" style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              padding: "14px 30px",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}>
              See All Components
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
              { step: "1", icon: "🔧", title: "Install the extension", desc: "One click from the Chrome Web Store or Edge Add-ons. No account needed." },
              { step: "2", icon: "📝", title: "Open any Canvas page", desc: "Edit a page, assignment, or discussion as normal." },
              { step: "3", icon: "🖱️", title: "Click a component", desc: "The toolbar appears below the Canvas editor. Pick a category and click." },
              { step: "4", icon: "✨", title: "Instant professional look", desc: "The styled HTML inserts immediately. Students see it right away." },
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

      {/* ── Components ── */}
      <section id="components" style={{ padding: "64px 32px", background: "#fff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            33 ready-to-use components
          </h2>
          <p style={{ textAlign: "center", color: "#6b7780", marginBottom: 48 }}>
            Free components work forever. Pro components unlock with a $5/month license.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              {
                category: "Dividers",
                free: ["Simple line", "Bold line", "Dashed line", "Double line"],
                pro: ["Colored bar", "Gradient bar"],
              },
              {
                category: "Headers",
                free: ["Section banner", "Accent bar", "Underline header"],
                pro: ["Blue banner", "Gradient banner", "Warning banner"],
              },
              {
                category: "Callouts",
                free: ["Tip", "Warning", "Important", "Note", "Do Not"],
                pro: ["Success", "Did You Know"],
              },
              {
                category: "Lists",
                free: ["Checklist", "Numbered steps", "Badge labels"],
                pro: ["Progress tracker"],
              },
              {
                category: "Layouts",
                free: [],
                pro: ["Two columns", "Three columns", "Image + text card", "Collapsible section"],
              },
              {
                category: "Cards",
                free: [],
                pro: ["Icon feature card", "Pull quote", "Button link", "Styled table", "Rubric / grading box"],
              },
              {
                category: "Media",
                free: [],
                pro: ["Video embed", "Resource link list"],
              },
              {
                category: "Templates",
                free: [],
                pro: ["Weekly Lesson", "Assignment Brief", "Lab Instructions"],
              },
            ].map(cat => (
              <div key={cat.category} style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
              }}>
                <div style={{ background: "#2d3b45", color: "#fff", padding: "10px 16px", fontWeight: 700, fontSize: 14 }}>
                  {cat.category}
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {cat.free.map(item => (
                    <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13 }}>
                      <span>{item}</span>
                      <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>FREE</span>
                    </div>
                  ))}
                  {cat.pro.map(item => (
                    <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13 }}>
                      <span>{item}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: "#0770a3",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 3,
                      }}>PRO</span>
                    </div>
                  ))}
                  {cat.free.length === 0 && (
                    <p style={{ fontSize: 11, color: "#9da7ae", margin: "4px 0 0" }}>All Pro — unlocked during 14-day trial</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "64px 32px", background: "#f8f9fa" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Simple pricing
          </h2>
          <p style={{ textAlign: "center", color: "#6b7780", marginBottom: 48 }}>
            Try everything free for 14 days. No credit card required.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "28px 24px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7780", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Free</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>$0</div>
              <div style={{ fontSize: 13, color: "#9da7ae", marginBottom: 20 }}>forever</div>
              <ul style={{ listStyle: "none", padding: 0, fontSize: 13, lineHeight: 2 }}>
                <li>✅ 4 Dividers</li>
                <li>✅ 3 Headers</li>
                <li>✅ 5 Callouts</li>
                <li>✅ 3 Lists</li>
                <li style={{ color: "#9da7ae" }}>✗ Layouts, Cards, Media</li>
                <li style={{ color: "#9da7ae" }}>✗ Templates</li>
              </ul>
            </div>
            <div style={{
              background: "#0770a3",
              border: "2px solid #055d87",
              borderRadius: 10,
              padding: "28px 24px",
              color: "#fff",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#f59e0b",
                color: "#fff",
                padding: "3px 12px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}>MOST POPULAR</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Pro</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4 }}>$5</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>/month</div>
              <ul style={{ listStyle: "none", padding: 0, fontSize: 13, lineHeight: 2 }}>
                <li>✅ All 33 components</li>
                <li>✅ 3 full page templates</li>
                <li>✅ All future components</li>
                <li>✅ License key — instant activation</li>
                <li>✅ No account required</li>
              </ul>
              <a href="#install" style={{
                display: "block",
                marginTop: 20,
                background: "#fff",
                color: "#0770a3",
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}>
                Start 14-Day Free Trial
              </a>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "#9da7ae", marginTop: 20 }}>
            No account. No login. No data collected.
          </p>
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
            Install takes 10 seconds. Your trial starts immediately — full Pro access,
            no credit card required.
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
