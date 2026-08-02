"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Check,
  GraduationCap,
  KeyRound,
  Laptop,
  Palette,
  Presentation,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { headingFont } from "@/lib/brand";

const trainingTypes = [
  {
    icon: Users,
    title: "Employee onboarding",
    text: "Give every new hire a consistent, confident start with training built around your organization.",
  },
  {
    icon: GraduationCap,
    title: "Employee training",
    text: "Turn policies, processes, and expertise into clear courses people can apply on the job.",
  },
  {
    icon: RefreshCw,
    title: "Refresher courses",
    text: "Reinforce important knowledge, introduce updates, and keep essential skills current.",
  },
  {
    icon: Sparkles,
    title: "Custom programs",
    text: "Build a focused learning experience for a specific role, initiative, standard, or business need.",
  },
];

const deliveryOptions = [
  {
    icon: Laptop,
    label: "Online",
    text: "Self-paced learning available wherever your people work.",
  },
  {
    icon: Presentation,
    label: "In person",
    text: "Instructor-led sessions designed for active participation.",
  },
  {
    icon: BookOpen,
    label: "Blended",
    text: "Combine live instruction with online learning and follow-up.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!code.trim()) {
      setError("Enter the course code you received.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/enroll?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError("That course code was not recognized.");
        setLoading(false);
        return;
      }

      if (data.claimed) {
        router.push(`/training/${data.course.slug}?code=${encodeURIComponent(code)}`);
      } else {
        router.push(`/enroll?code=${encodeURIComponent(code)}`);
      }
    } catch {
      setError("We could not connect. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f5f7] text-[#25303d]">
      <div className="flex min-h-[34px] items-center justify-between bg-[#001f52] px-5 py-2 text-[11px] tracking-[.04em] text-white/75 sm:px-8 lg:px-10">
        <span>New Castle School of Trades — Professional Training</span>
        <a
          href="https://www.ncstrades.edu/"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-white hover:underline"
        >
          Visit ncstrades.edu
        </a>
      </div>

      <header className="relative z-20 border-b border-[#d9dee7] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/ncst-logo.png"
              alt="New Castle School of Trades"
              width={150}
              height={39}
              priority
              className="h-auto w-[132px] sm:w-[150px]"
            />
            <span className="hidden border-l border-[#d9dee7] pl-4 sm:block">
              <span className="block text-[15px] font-bold uppercase tracking-[.04em] text-[#002d74]">
                Professional Training
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.08em] text-[#606b78]">
                Learning built for your organization
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <a
              href="#solutions"
              className="hidden text-sm font-semibold text-[#606b78] hover:text-[#002d74] md:block"
            >
              Solutions
            </a>
            <a
              href="#delivery"
              className="hidden text-sm font-semibold text-[#606b78] hover:text-[#002d74] md:block"
            >
              Delivery
            </a>
            <Link
              href="/admin/login"
              className="border border-[#002d74] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[.06em] text-[#002d74] transition hover:bg-[#002d74] hover:text-white"
            >
              Administrator
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/ncst-campus.jpg)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,31,82,.97) 0%, rgba(0,45,116,.92) 48%, rgba(0,45,116,.78) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-10 lg:py-24">
          <div>
            <p
              className={`${headingFont.className} inline-flex items-center gap-2 border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#f5a800]`}
            >
              <Sparkles size={14} /> Training without the template
            </p>
            <h1
              className={`${headingFont.className} mt-7 max-w-3xl text-4xl font-bold uppercase leading-[.98] tracking-[-.025em] text-white sm:text-5xl lg:text-6xl`}
            >
              Training built around the way your organization works.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/78 sm:text-xl">
              From onboarding and employee development to refreshers and fully
              custom courses, create learning that fits your people, goals, and
              brand.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/90">
              {["One learner or hundreds", "Online, in person, or both", "Certificates included"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f5a800] text-[#001f52]">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {item}
                  </span>
                ),
              )}
            </div>

            <a
              href="#solutions"
              className={`${headingFont.className} mt-10 inline-flex items-center gap-2 bg-[#f5a800] px-6 py-3.5 text-sm font-bold uppercase tracking-[.06em] text-[#001f52] transition hover:bg-[#fcd88a]`}
            >
              Explore training options <ArrowRight size={17} />
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -left-7 top-12 hidden bg-[#f5a800] p-4 text-[#001f52] shadow-xl sm:block">
              <Award size={24} />
            </div>
            <div className="border border-white/10 bg-[#001f52]/90 p-7 text-white shadow-[0_35px_90px_rgba(0,31,82,.35)] backdrop-blur-sm sm:p-9">
              <p
                className={`${headingFont.className} flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#f5a800]`}
              >
                <KeyRound size={15} /> Learner access
              </p>
              <h2 className={`${headingFont.className} mt-5 text-3xl font-bold uppercase tracking-tight`}>
                Ready to begin?
              </h2>
              <p className="mt-3 leading-7 text-white/70">
                Enter the course code supplied by your instructor or organization.
              </p>

              <form onSubmit={handleSubmit} className="mt-7">
                <label htmlFor="course-code" className="text-sm font-bold text-white/85">
                  Course code
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="course-code"
                    type="text"
                    autoComplete="off"
                    placeholder="EXAMPLE-123"
                    className="min-w-0 flex-1 border border-white/15 bg-white px-4 py-3.5 font-bold uppercase tracking-[.12em] text-[#25303d] outline-none ring-[#f5a800] placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:ring-3"
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={`${headingFont.className} inline-flex items-center justify-center gap-2 bg-[#f5a800] px-5 py-3.5 text-sm font-bold uppercase tracking-[.06em] text-[#001f52] transition hover:bg-[#fcd88a] disabled:cursor-wait disabled:opacity-60`}
                  >
                    {loading ? "Checking…" : "Start course"}
                    {!loading && <ArrowRight size={17} />}
                  </button>
                </div>
                {error && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-[#ffb7a9]">
                    {error}
                  </p>
                )}
              </form>

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#f5a800]`}>1–100s</p>
                  <p className="mt-1 text-xs text-white/50">Learners</p>
                </div>
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#f5a800]`}>3</p>
                  <p className="mt-1 text-xs text-white/50">Delivery modes</p>
                </div>
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#f5a800]`}>100%</p>
                  <p className="mt-1 text-xs text-white/50">Customizable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p
                className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#f5a800]`}
              >
                Built for your need
              </p>
              <h2
                className={`${headingFont.className} mt-4 text-4xl font-bold uppercase tracking-[-.025em] text-[#002d74] sm:text-5xl`}
              >
                If it can be taught, it can become a course.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#606b78] lg:justify-self-end">
              Start with your existing materials and subject-matter expertise. We
              shape them into clear, engaging learning experiences with activities,
              assessments, and measurable completion.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trainingTypes.map(({ icon: Icon, title, text }, index) => (
              <article
                key={title}
                className="group border border-[#d9dee7] bg-[#f4f5f7] p-6 transition hover:-translate-y-1 hover:border-[#002d74]/25 hover:shadow-[0_20px_45px_rgba(0,45,116,.08)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center bg-[#e9eef7] text-[#002d74]">
                    <Icon size={23} />
                  </span>
                  <span className={`${headingFont.className} text-sm font-bold text-[#002d74]/20`}>
                    0{index + 1}
                  </span>
                </div>
                <h3 className={`${headingFont.className} mt-7 text-xl font-bold uppercase text-[#002d74]`}>
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#606b78]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="delivery" className="bg-[#e9eef7] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10">
          <div>
            <p
              className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#002d74]`}
            >
              Flexible delivery
            </p>
            <h2
              className={`${headingFont.className} mt-4 text-4xl font-bold uppercase tracking-[-.025em] text-[#002d74] sm:text-5xl`}
            >
              Meet your learners where they are.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#606b78]">
              Train one person, one team, or hundreds across locations. Choose the
              format that works—or combine formats into one connected program.
            </p>
          </div>

          <div className="grid gap-4">
            {deliveryOptions.map(({ icon: Icon, label, text }) => (
              <article
                key={label}
                className="flex gap-5 border border-[#d9dee7] bg-white p-6 sm:items-center sm:p-7"
              >
                <span className="grid h-13 w-13 shrink-0 place-items-center bg-[#002d74] text-[#f5a800]">
                  <Icon size={24} />
                </span>
                <div>
                  <h3 className={`${headingFont.className} text-xl font-bold uppercase text-[#002d74]`}>
                    {label}
                  </h3>
                  <p className="mt-1.5 leading-6 text-[#606b78]">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-20 text-white sm:py-24"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,31,82,.98), rgba(0,45,116,.94)), radial-gradient(circle at 80% 20%, #416da7, transparent 45%)",
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <span className="grid h-14 w-14 place-items-center bg-white/10 text-[#f5a800]">
              <Palette size={27} />
            </span>
            <p
              className={`${headingFont.className} mt-7 text-[10px] font-bold uppercase tracking-[.15em] text-[#f5a800]`}
            >
              Your company. Your course.
            </p>
            <h2
              className={`${headingFont.className} mt-4 max-w-xl text-4xl font-bold uppercase tracking-[-.025em] sm:text-5xl`}
            >
              Training that feels like it belongs to your organization.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Courses can be branded with your company identity and tailored to
              your language, standards, examples, and expectations.
            </p>
          </div>

          <div className="border border-white/10 bg-white/[.06] p-7 sm:p-9">
            <p className="flex items-center gap-2 text-sm font-bold text-white/55">
              <Building2 size={17} /> Custom course experience
            </p>
            <div className="mt-7 space-y-4">
              {[
                "Company branding and visual identity",
                "Content shaped around your policies and processes",
                "Knowledge checks and final assessments",
                "Trackable progress and completion records",
                "Printable certificates of completion",
              ].map((item) => (
                <div key={item} className="flex gap-3 bg-white/[.06] px-4 py-3.5">
                  <Check className="mt-0.5 shrink-0 text-[#f5a800]" size={18} strokeWidth={3} />
                  <span className="font-semibold text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5a800] py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p
              className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#001f52]/70`}
            >
              Learning that leads somewhere
            </p>
            <h2
              className={`${headingFont.className} mt-3 text-3xl font-bold uppercase tracking-tight text-[#001f52] sm:text-4xl`}
            >
              Every completed course can end with a certificate.
            </h2>
          </div>
          <div className="flex items-center gap-4 bg-[#fcd88a] px-5 py-4 text-[#001f52]">
            <Award size={31} />
            <div>
              <p className="font-extrabold">Certificate of completion</p>
              <p className="text-sm text-[#001f52]/70">A clear record of learner achievement</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#001f52] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <Image
              src="/ncst-logo.png"
              alt=""
              width={120}
              height={31}
              className="h-auto w-[110px] brightness-0 invert"
            />
            <div>
              <p className={`${headingFont.className} font-bold uppercase tracking-[.04em]`}>
                Professional Training
              </p>
              <p className="text-xs text-white/55">New Castle School of Trades</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-semibold text-white/60">
            <a href="#solutions" className="hover:text-white">Solutions</a>
            <a href="#delivery" className="hover:text-white">Delivery</a>
            <a href="https://www.ncstrades.edu/" target="_blank" rel="noreferrer" className="hover:text-white">
              NCST Main Site
            </a>
            <Link href="/admin/login" className="hover:text-white">Administrator</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
