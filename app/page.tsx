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
  Clock,
  GraduationCap,
  Laptop,
  MapPin,
  Palette,
  Phone,
  Presentation,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { bodyFont, headingFont } from "@/lib/brand";

const NCST_ADDRESS = "4117 Pulaski Rd, New Castle, PA, 16101";
const NCST_PHONE = "(724) 964-8811";
const NCST_PHONE_HREF = "tel:+17249648811";
const NCST_MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12038.212827525525!2d-80.4011784!3d41.0350299!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x4cf7051e8597c6f5!2sNew%20Castle%20School%20of%20Trades!5e0!3m2!1sen!2sus!4v1601328389415!5m2!1sen!2sus";

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
    <main className={`${bodyFont.className} min-h-screen bg-[#f4f5f7] text-[#25303d]`}>
      {/* NCST top announcement bar */}
      <div className="bg-[#faa200] px-5 py-2 text-center text-[12px] font-bold tracking-[.04em] text-[#002d74] sm:px-8">
        <a
          href="https://www.ncstrades.edu/"
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
        >
          New Castle School of Trades — visit ncstrades.edu for programs and admissions
        </a>
      </div>

      {/* NCST navy site header */}
      <header className="bg-[#002d74]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/ncst-logo.png"
              alt="New Castle School of Trades"
              width={160}
              height={41}
              priority
              className="h-auto w-[132px] brightness-0 invert sm:w-[160px]"
            />
            <span className="hidden border-l border-white/25 pl-4 sm:block">
              <span
                className={`${headingFont.className} block text-[15px] font-bold uppercase tracking-[.04em] text-white`}
              >
                Professional Training
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.08em] text-white/65">
                Learning built for your organization
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <a
              href="#solutions"
              className="hidden text-sm font-semibold text-white/75 hover:text-white md:block"
            >
              Solutions
            </a>
            <a
              href="#delivery"
              className="hidden text-sm font-semibold text-white/75 hover:text-white md:block"
            >
              Delivery
            </a>
            <Link
              href="/admin/login"
              className={`${headingFont.className} border-2 border-[#faa200] px-4 py-2 text-[11px] font-bold uppercase tracking-[.06em] text-white transition hover:bg-[#faa200] hover:text-[#002d74]`}
            >
              Administrator
            </Link>
          </nav>
        </div>
      </header>

      {/* Inner banner — matches NCST location page photo strip */}
      <div className="relative h-[220px] overflow-hidden sm:h-[310px] lg:h-[400px]">
        <Image
          src="/ncst-campus.jpg"
          alt="New Castle School of Trades campus in Pennsylvania"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Location-style contact row */}
      <div className="border-b border-[#d9dee7] bg-white">
        <ul className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:flex-wrap sm:justify-between sm:px-8 lg:px-10">
          <li className="flex gap-3 text-sm leading-6 text-[#606b78]">
            <MapPin className="mt-0.5 shrink-0 text-[#faa200]" size={18} aria-hidden="true" />
            <span>{NCST_ADDRESS}</span>
          </li>
          <li className="flex gap-3 text-sm leading-6 text-[#606b78]">
            <Phone className="mt-0.5 shrink-0 text-[#faa200]" size={18} aria-hidden="true" />
            <a href={NCST_PHONE_HREF} className="font-semibold text-[#002d74] hover:underline">
              {NCST_PHONE}
            </a>
          </li>
          <li className="flex gap-3 text-sm leading-6 text-[#606b78]">
            <Clock className="mt-0.5 shrink-0 text-[#faa200]" size={18} aria-hidden="true" />
            <span>
              Mon – Thurs | 8:00 am – 8:00 pm
              <br />
              Friday | 8:00 am – 4:00 pm
              <br />
              Saturday | 9:00 am – 1:00 pm
            </span>
          </li>
        </ul>
      </div>

      {/* Map + learner access — mirrors NCST map / Get More Info layout */}
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="overflow-hidden border border-[#d9dee7] bg-[#f4f5f7]">
              <iframe
                title="NCST campus map"
                src={NCST_MAP_EMBED}
                className="h-[280px] w-full border-0 sm:h-[360px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="border border-[#d9dee7] bg-white p-6 sm:p-8">
              <h3
                className={`${headingFont.className} text-2xl font-bold uppercase text-[#faa200]`}
              >
                Learner access
              </h3>
              <p className="mt-4 text-[#606b78] leading-7">
                Enter the course code supplied by your instructor or organization to begin.
              </p>

              <form onSubmit={handleSubmit} className="mt-6">
                <label htmlFor="course-code" className="text-sm font-bold text-[#002d74]">
                  Course code
                </label>
                <input
                  id="course-code"
                  type="text"
                  autoComplete="off"
                  placeholder="EXAMPLE-123"
                  className="mt-2 w-full border border-[#b1b4ba] bg-white px-4 py-3 font-bold uppercase tracking-[.12em] text-[#25303d] outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-[#9aa0ae] focus:border-[#002d74]"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                />
                {error && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-[#ed1c24]">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={`${headingFont.className} mt-4 inline-flex w-full items-center justify-center gap-2 bg-[#002d74] px-5 py-3.5 text-sm font-bold uppercase tracking-[.06em] text-white transition hover:bg-[#001f52] disabled:cursor-wait disabled:opacity-60 sm:w-auto`}
                >
                  {loading ? "Checking…" : "Start course"}
                  {!loading && <ArrowRight size={17} />}
                </button>
              </form>

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#d9dee7] pt-6 text-center">
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#faa200]`}>1–100s</p>
                  <p className="mt-1 text-xs text-[#606b78]">Learners</p>
                </div>
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#faa200]`}>3</p>
                  <p className="mt-1 text-xs text-[#606b78]">Delivery modes</p>
                </div>
                <div>
                  <p className={`${headingFont.className} text-2xl font-bold text-[#faa200]`}>100%</p>
                  <p className="mt-1 text-xs text-[#606b78]">Customizable</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-[#d9dee7] pt-12">
            <div className="entry-content">
              <p
                className={`${headingFont.className} flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#faa200]`}
              >
                <Sparkles size={14} /> Training without the template
              </p>
              <h1
                className={`${headingFont.className} mt-4 text-4xl font-bold uppercase tracking-[-.025em] text-[#002d74] sm:text-5xl`}
              >
                Training built around the way your organization works.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#606b78]">
                From onboarding and employee development to refreshers and fully custom courses,
                create learning that fits your people, goals, and brand. New Castle School of Trades
                brings the same practical, skills-first approach used on campus to workforce training
                for employers and partner organizations.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[#25303d]">
                {["One learner or hundreds", "Online, in person, or both", "Certificates included"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#faa200] text-[#001f52]">
                        <Check size={13} strokeWidth={3} />
                      </span>
                      {item}
                    </span>
                  ),
                )}
              </div>

              <a
                href="#solutions"
                className={`${headingFont.className} mt-10 inline-flex items-center gap-2 bg-[#faa200] px-6 py-3.5 text-sm font-bold uppercase tracking-[.06em] text-[#002d74] transition hover:bg-[#fcd88a]`}
              >
                Explore training options <ArrowRight size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="bg-[#f2f2f2] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p
                className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#faa200]`}
              >
                Built for your need
              </p>
              <h2
                className={`${headingFont.className} mt-4 text-4xl font-bold uppercase tracking-[-.025em] text-[#faa200] sm:text-5xl`}
              >
                If it can be taught, it can become a course.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#606b78] lg:justify-self-end">
              Start with your existing materials and subject-matter expertise. We shape them into
              clear, engaging learning experiences with activities, assessments, and measurable
              completion.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trainingTypes.map(({ icon: Icon, title, text }, index) => (
              <article
                key={title}
                className="border border-[#d9dee7] border-l-[5px] border-l-[#faa200] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
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

      <section id="delivery" className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10">
          <div>
            <p
              className={`${headingFont.className} text-[10px] font-bold uppercase tracking-[.15em] text-[#faa200]`}
            >
              Flexible delivery
            </p>
            <h2
              className={`${headingFont.className} mt-4 text-4xl font-bold uppercase tracking-[-.025em] text-[#faa200] sm:text-5xl`}
            >
              Meet your learners where they are.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#606b78]">
              Train one person, one team, or hundreds across locations. Choose the format that
              works—or combine formats into one connected program.
            </p>
          </div>

          <div className="grid gap-4">
            {deliveryOptions.map(({ icon: Icon, label, text }) => (
              <article
                key={label}
                className="flex gap-5 border border-[#d9dee7] bg-[#f4f5f7] p-6 sm:items-center sm:p-7"
              >
                <span className="grid h-13 w-13 shrink-0 place-items-center bg-[#002d74] text-[#faa200]">
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
          background: "#002d74",
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
          <div>
            <span className="grid h-14 w-14 place-items-center bg-white/10 text-[#faa200]">
              <Palette size={27} />
            </span>
            <p
              className={`${headingFont.className} mt-7 text-[10px] font-bold uppercase tracking-[.15em] text-[#faa200]`}
            >
              Your company. Your course.
            </p>
            <h2
              className={`${headingFont.className} mt-4 max-w-xl text-4xl font-bold uppercase tracking-[-.025em] sm:text-5xl`}
            >
              Training that feels like it belongs to your organization.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Courses can be branded with your company identity and tailored to your language,
              standards, examples, and expectations.
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
                  <Check className="mt-0.5 shrink-0 text-[#faa200]" size={18} strokeWidth={3} />
                  <span className="font-semibold text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#faa200] py-16">
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
          <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-white/60">
            <a href="#solutions" className="hover:text-white">Solutions</a>
            <a href="#delivery" className="hover:text-white">Delivery</a>
            <a
              href="https://www.ncstrades.edu/locations/new-castle-pa/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              NCST New Castle Campus
            </a>
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
