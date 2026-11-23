import { Link } from "react-router-dom";
import { MenyoWordmark } from "../components/common/MenyoLogo";

const setupSteps = [
  {
    title: "Build your digital menu",
    description: "Group dishes into categories that guests can scan quickly, such as mains, sides, and drinks. Add names, prices, photos, and any options that affect the order, such as serving size or extras.",
  },
  {
    title: "Create a QR code for each table",
    description: "In the Menyo dashboard, open Tables and choose Add Table. Give each table a label staff can recognize. Use Print QR Card to generate its card. A table-specific code tells the kitchen where the order came from.",
  },
  {
    title: "Test the guest and kitchen views",
    description: "Scan a card with a phone camera and check that the right table and menu open. Place a test order, confirm the kitchen sees the items and their options, and check the order status from the guest's phone.",
  },
  {
    title: "Print the cards and put them on the tables",
    description: "Use a high-contrast print and leave clear space around the QR code. Test a printed card under your dining room lighting before printing the rest. Place the corresponding card at each table.",
  },
];

export const QrMenuGuidePage = () => (
  <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A]">
    <header className="border-b border-[#050F2A]/10 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" aria-label="Menyo home"><MenyoWordmark height={26} /></Link>
        <a href="/#pricing" className="text-sm font-semibold hover:underline">See pricing</a>
      </nav>
    </header>

    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <article className="rounded-3xl border border-[#050F2A]/10 bg-white p-6 sm:p-10">
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">How to create a QR code menu for your restaurant</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#050F2A]/75">
          A QR code menu opens in a guest’s phone browser. With Menyo, guests can order from the same menu and your kitchen receives the order with the table details.
        </p>

        <ol className="mt-9 list-decimal space-y-6 pl-6 marker:font-bold">
          {setupSteps.map((step) => (
            <li key={step.title} className="pl-2">
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-[#050F2A]/75">{step.description}</p>
            </li>
          ))}
        </ol>

        <section className="mt-9 border-t border-[#050F2A]/10 pt-7">
          <h2 className="text-xl font-bold">Do you need new QR codes when your menu changes?</h2>
          <p className="mt-2 leading-relaxed text-[#050F2A]/75">
            You can update prices, add a dish, or mark an item sold out in the dashboard. The table card keeps pointing to the same menu, so guests see the update on their next scan.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/demo" className="rounded-full bg-[#050F2A] px-5 py-3 text-sm font-bold text-white">
            Try the live QR menu demo
          </Link>
          <Link to="/signup" className="rounded-full border border-[#050F2A]/25 px-5 py-3 text-sm font-bold">
            Start your free trial
          </Link>
        </div>
      </article>
    </main>
  </div>
);
