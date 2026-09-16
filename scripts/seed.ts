/**
 * Seeds real marketplace rows for the 3 dummy auth users (see plans/test-users.md),
 * replacing the hardcoded component arrays. Idempotent: clears these users' app
 * rows first, then re-inserts.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/seed.ts
 */
import { sql, inArray, eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import {
  profile, workExperience, education, profileSkill, certification, project,
  company, product, job, recommendation, notification,
  salesOrder, orderItem, ledgerEntry, vendorWallet, quoteRequest,
} from "../lib/db/schema";

async function main() {
  const res = await db.execute(
    sql`select id, email, name from "user" where email in ('pro@nomarc.test','exhibitor@nomarc.test','buyer@nomarc.test')`,
  );
  const users = res.rows as { id: string; email: string; name: string }[];
  const byEmail = (e: string) => users.find((u) => u.email === e);
  const pro = byEmail("pro@nomarc.test");
  const exh = byEmail("exhibitor@nomarc.test");
  const buyer = byEmail("buyer@nomarc.test");
  if (!pro || !exh || !buyer) {
    console.error("Missing seeded auth users — run scripts/seed-auth.ts first.");
    process.exit(1);
  }
  const ids = [pro.id, exh.id, buyer.id];

  // ── clear prior app rows for these users (idempotent) ──
  // Clear orders first (FK cascade handles orderItem + ledgerEntry)
  await db.execute(sql`DELETE FROM sales_order WHERE buyer_user_id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`);
  await db.execute(sql`DELETE FROM vendor_wallet WHERE company_id IN (SELECT id FROM company WHERE owner_user_id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}))`);
  await db.execute(sql`DELETE FROM quote_request WHERE buyer_user_id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`);
  await db.delete(workExperience).where(inArray(workExperience.userId, ids));
  await db.delete(education).where(inArray(education.userId, ids));
  await db.delete(profileSkill).where(inArray(profileSkill.userId, ids));
  await db.delete(certification).where(inArray(certification.userId, ids));
  await db.delete(project).where(inArray(project.userId, ids));
  await db.delete(recommendation).where(inArray(recommendation.recommendeeUserId, ids));
  await db.delete(notification).where(inArray(notification.userId, ids));
  await db.delete(job).where(inArray(job.ownerUserId, ids));
  await db.delete(company).where(inArray(company.ownerUserId, ids));
  await db.delete(profile).where(inArray(profile.userId, ids));

  // ── Professional ──
  await db.insert(profile).values({
    userId: pro.id, headline: "Graduate Architect", availability: "open_to_work",
    location: "Lagos, Nigeria", rate: "Open to offers", yearsExperience: 3,
    successScore: 92, completeness: 90, verified: true,
    bio: "Graduate Architect specializing in residential architecture, interior design, and sustainable building practices. I focus on transforming concepts into functional, practical realities through meticulous spatial planning, detailed technical drafting, and MEP layout coordination.",
  });
  await db.insert(workExperience).values([
    { userId: pro.id, title: "Graduate Architect", company: "Studio Contour", workplaceType: "remote", location: "Ikeja, Lagos state, Nigeria", startDate: "2025-03-01", current: true, description: "Contribute to the design and execution of architectural projects across residential and mixed-use developments." },
    { userId: pro.id, title: "Project Architect", company: "FormLab", workplaceType: "onsite", location: "Lagos, Nigeria", startDate: "2021-01-01", endDate: "2024-12-01", description: "Led technical drafting and BIM coordination for commercial builds." },
  ]);
  await db.insert(education).values([
    { userId: pro.id, school: "Obafemi Awolowo University, Ile-Ife, Osun State", degree: "B.Sc", field: "Architecture", startYear: 2020, endYear: 2024 },
  ]);
  await db.insert(profileSkill).values([
    { userId: pro.id, name: "Autodesk AutoCAD" }, { userId: pro.id, name: "Autodesk Revit" },
    { userId: pro.id, name: "SketchUp" }, { userId: pro.id, name: "Adobe Photoshop" }, { userId: pro.id, name: "Blender" },
    { userId: pro.id, name: "Interior Design", kind: "specialization" },
    { userId: pro.id, name: "Residential Architecture", kind: "specialization" },
    { userId: pro.id, name: "Sustainable Design", kind: "specialization" },
  ]);
  await db.insert(certification).values([
    { userId: pro.id, name: "LEED Green Associate", issuer: "USGBC", year: 2022 },
    { userId: pro.id, name: "Autodesk Revit Certified User", issuer: "Autodesk", year: 2020 },
  ]);
  await db.insert(project).values([
    { userId: pro.id, title: "Chevron Luxury Apartment", role: "Architect", location: "Lekki, Lagos", coverUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80" },
    { userId: pro.id, title: "Rainbow Glass Apartments and Suites", role: "Architect", location: "Maitama, Abuja", coverUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80" },
    { userId: pro.id, title: "Modern Residential Building", role: "Lead Architect", location: "Ikoyi, Ogun", coverUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80" },
  ]);

  // ── Exhibitor company + catalog ──
  const [co] = await db.insert(company).values({
    ownerUserId: exh.id, name: "Titan SteelCo", tagline: "Core Building Materials • Ikeja, Lagos, Nigeria",
    industry: "Core Building Materials", headquarters: "Ikeja, Lagos State, Nigeria", yearFounded: 2004,
    companySize: "201+ employees", verified: true, completeness: 95,
    categories: ["Reinforcement Bars (Rebar)", "Structural Steel", "Heavy Framework", "Industrial Metals"],
    about: "West Africa's leading supplier of structural steel and reinforcement bars, with over two decades of experience in high-volume procurement for commercial, industrial, and heavy civil engineering projects.",
  }).returning({ id: company.id });

  const productRows = await db.insert(product).values([
    {
      companyId: co.id, name: "High-Yield TMT Rebar (Y12)", sku: "TSC-RB-Y12",
      category: "Reinforcement Bars", description: "12mm high-yield deformed reinforcement bar. Meets BS 4449:2005 Grade B500B. Ideal for foundations, columns, beams, and slabs. Per tonne pricing.",
      retailMin: 450000, retailMax: 520000, wholesaleMin: 380000, wholesaleMax: 420000,
      availability: "in_stock", stock: 5000, unit: "tonne",
      tags: ["Reinforcement Bars", "Structural Steel", "TMT Rebar"],
      coverUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80",
      gallery: ["https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80", "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=800&q=80"],
    },
    {
      companyId: co.id, name: "Structural Steel H-Beams (UC 254×254)", sku: "TSC-HB-254",
      category: "Structural Steel", description: "Universal column H-beam, 254×254mm cross-section. Hot-rolled structural steel grade S275JR. For load-bearing frames, bridges, industrial structures.",
      retailMin: 185000, retailMax: 220000, wholesaleMin: 165000, wholesaleMax: 185000,
      availability: "in_stock", stock: 120, unit: "length",
      tags: ["Heavy Framework", "Structural Steel", "H-Beam"],
      coverUrl: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=800&q=80",
    },
    {
      companyId: co.id, name: "Portland Cement (Dangote, 50kg)", sku: "TSC-CM-DG50",
      category: "Cement", description: "Dangote 3X Portland cement, 50kg bag. Grade 42.5R, rapid strength gain. Nigeria's most trusted cement brand for structural and general-purpose concrete.",
      retailMin: 5800, retailMax: 6500, wholesaleMin: 5200, wholesaleMax: 5600,
      availability: "in_stock", stock: 2000, unit: "bag",
      tags: ["Cement", "Core Building Materials", "Dangote"],
      coverUrl: "https://images.unsplash.com/photo-1590496793929-36417d3117de?w=800&q=80",
    },
    {
      companyId: co.id, name: "Corrugated Roofing Sheets (0.45mm, 3m)", sku: "TSC-RF-045",
      category: "Roofing", description: "Pre-painted corrugated aluminium roofing sheets. 0.45mm gauge, 3-metre length. Long-span profile with 25-year colour warranty. Available in burgundy, blue, green.",
      retailMin: 8500, retailMax: 12000, wholesaleMin: 7200, wholesaleMax: 8200,
      availability: "in_stock", stock: 800, unit: "sheet",
      tags: ["Roofing", "Aluminium", "Long-span"],
      coverUrl: "https://images.unsplash.com/photo-1632823471565-1ecdf5c6d3d7?w=800&q=80",
    },
    {
      companyId: co.id, name: "Granite Chippings (¾ inch, per tonne)", sku: "TSC-GR-34",
      category: "Aggregates", description: "Crushed granite aggregate, ¾-inch grade. Clean, well-graded chippings for concrete mixing, drainage, and road construction. Sourced from certified quarries.",
      retailMin: 35000, retailMax: 45000, wholesaleMin: 28000, wholesaleMax: 33000,
      availability: "in_stock", stock: 500, unit: "tonne",
      tags: ["Aggregates", "Core Building Materials", "Granite"],
      coverUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    },
    {
      companyId: co.id, name: "Galvanized Steel Coils (1.2mm)", sku: "TSC-GC-12",
      category: "Industrial Metals", description: "Hot-dip galvanized steel coil, 1.2mm thickness. Z275 coating for superior corrosion resistance. For roofing, cladding, HVAC ductwork, and general fabrication.",
      retailMin: 450000, retailMax: 520000, wholesaleMin: 380000, wholesaleMax: 420000,
      availability: "made_to_order", stock: 0, unit: "coil",
      tags: ["Industrial Metals", "Galvanized Steel", "Coils"],
      coverUrl: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80",
    },
    {
      companyId: co.id, name: "PVC Conduit Pipes (20mm, bundle of 50)", sku: "TSC-PVC-20",
      category: "Electrical", description: "Heavy-gauge PVC electrical conduit pipe, 20mm diameter, 3m length. Orange flame-retardant grade. Sold in bundles of 50 pieces.",
      retailMin: 18000, retailMax: 22000, wholesaleMin: 15000, wholesaleMax: 17500,
      availability: "in_stock", stock: 350, unit: "bundle",
      tags: ["Electrical", "PVC", "Conduit"],
      coverUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    },
    {
      companyId: co.id, name: "Floor Tiles (60×60cm Vitrified, box of 4)", sku: "TSC-FT-6060",
      category: "Finishing Materials", description: "60×60cm polished vitrified porcelain floor tiles. High-gloss finish, scratch-resistant, low water absorption. Per box of 4 tiles (1.44m² coverage).",
      retailMin: 8000, retailMax: 15000, wholesaleMin: 6500, wholesaleMax: 8500,
      availability: "in_stock", stock: 1200, unit: "box",
      tags: ["Tiles", "Finishing Materials", "Porcelain"],
      coverUrl: "https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=800&q=80",
    },
    {
      companyId: co.id, name: "Sandcrete Blocks (9-inch, per 1000)", sku: "TSC-BLK-9",
      category: "Blocks", description: "Standard 9-inch (225mm) hollow sandcrete blocks. Machine-vibrated, cured for 28 days. Meets NIS 87:2004 strength requirements. Priced per 1,000 blocks.",
      retailMin: 280000, retailMax: 350000, wholesaleMin: 240000, wholesaleMax: 275000,
      availability: "in_stock", stock: 50, unit: "lot of 1000",
      tags: ["Blocks", "Core Building Materials", "Sandcrete"],
      coverUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80",
    },
    {
      companyId: co.id, name: "Sharp Sand (1 Trip / 20 Tonnes)", sku: "TSC-SS-20T",
      category: "Sand", description: "Washed sharp sand (plastering/concrete grade). One tipper trip = approx. 20 tonnes. Sourced from approved borrow pits. Delivery within Lagos metropolis included.",
      retailMin: 120000, retailMax: 150000, wholesaleMin: 95000, wholesaleMax: 115000,
      availability: "in_stock", stock: 100, unit: "trip",
      tags: ["Sand", "Aggregates", "Building Materials"],
      coverUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80",
    },
    {
      companyId: co.id, name: "Armoured Cable (16mm², 3-core, per metre)", sku: "TSC-CAB-16",
      category: "Electrical", description: "16mm² 3-core steel wire armoured (SWA) power cable. XLPE insulated, PVC sheathed. For underground and industrial power distribution. Sold per metre.",
      retailMin: 4800, retailMax: 6200, wholesaleMin: 4000, wholesaleMax: 4600,
      availability: "in_stock", stock: 2000, unit: "metre",
      tags: ["Electrical", "Cables", "Armoured Cable"],
      coverUrl: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=800&q=80",
    },
    {
      companyId: co.id, name: "12mm Iron Rods (bundle of 12)", sku: "TSC-IR-12B",
      category: "Reinforcement Bars", description: "12mm mild steel round bar (iron rod). Bundle of 12 pieces, each 12m length. For general construction: lintels, tie beams, ring beams.",
      retailMin: 52000, retailMax: 65000, wholesaleMin: 45000, wholesaleMax: 52000,
      availability: "in_stock", stock: 300, unit: "bundle",
      tags: ["Rebar", "Reinforcement Bars", "Iron Rods"],
      coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80",
    },
  ]).returning({ id: product.id, name: product.name, coverUrl: product.coverUrl, retailMin: product.retailMin });

  console.log(`✓ seeded ${productRows.length} products`);

  // ── Orders (buyer placed, vendor fulfils) ──
  const orderData = [
    { status: "completed", payment: "paid", escrow: "released", dayOffset: -14, items: [{ idx: 0, qty: 2 }, { idx: 2, qty: 50 }] },
    { status: "completed", payment: "paid", escrow: "released", dayOffset: -10, items: [{ idx: 4, qty: 5 }] },
    { status: "completed", payment: "paid", escrow: "released", dayOffset: -7, items: [{ idx: 7, qty: 20 }, { idx: 8, qty: 1 }] },
    { status: "processing", payment: "paid", escrow: "held", dayOffset: -3, items: [{ idx: 1, qty: 4 }, { idx: 3, qty: 100 }] },
    { status: "processing", payment: "paid", escrow: "held", dayOffset: -2, items: [{ idx: 6, qty: 3 }] },
    { status: "shipped", payment: "paid", escrow: "held", dayOffset: -1, items: [{ idx: 10, qty: 50 }] },
    { status: "pending", payment: "pending", escrow: "held", dayOffset: 0, items: [{ idx: 9, qty: 2 }] },
    { status: "cancelled", payment: "refunded", escrow: "refunded", dayOffset: -20, items: [{ idx: 5, qty: 1 }] },
  ];

  const addresses = [
    "15 Admiralty Way, Lekki Phase 1, Lagos", "24 Adeola Odeku St, Victoria Island, Lagos",
    "7 Gana Street, Maitama, Abuja", "Plot 42, Trans-Amadi Industrial Layout, Port Harcourt",
    "12 Allen Avenue, Ikeja, Lagos", "3 Awolowo Road, Ikoyi, Lagos",
    "Block B, Wuse Zone 5, Abuja", "88 Stadium Road, Port Harcourt",
  ];
  const phones = ["08012345678", "09087654321", "07033445566", "08199887766", "09012233445", "08055667788", "07044332211", "08166998877"];

  let totalAvailable = 0;
  let totalHeld = 0;

  for (let i = 0; i < orderData.length; i++) {
    const od = orderData[i];
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() + od.dayOffset);

    const lines = od.items.map((it) => {
      const p = productRows[it.idx];
      return { productId: p.id, name: p.name, qty: it.qty, unitPrice: p.retailMin ?? 0, image: p.coverUrl };
    });
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const vat = Math.round(subtotal * 0.075);
    const shipping = subtotal > 500000 ? 0 : 15000;
    const commission = Math.round(subtotal * 0.10);
    const vendorNet = subtotal - commission;
    const total = subtotal + vat + shipping;
    const ref = `NMC-${String(i + 1).padStart(4, "0")}`;

    const [order] = await db.insert(salesOrder).values({
      buyerUserId: buyer.id, vendorCompanyId: co.id, vendorUserId: exh.id,
      customerName: buyer.name || "Tunde Bello", customerCompany: "Cubic Studio",
      status: od.status, payment: od.payment, escrowState: od.escrow,
      subtotal, shipping, vat, commission, vendorNet, total,
      deliveryMethod: "delivery", address: addresses[i], phone: phones[i],
      paymentRef: `demo_${ref}`, provider: "demo",
      createdAt: orderDate,
    }).returning({ id: salesOrder.id });

    await db.insert(orderItem).values(lines.map((l) => ({ orderId: order.id, ...l })));

    // Ledger entries for completed/processing/shipped orders
    if (od.payment === "paid" && od.status !== "cancelled") {
      const entryStatus = od.escrow === "released" ? "available" : "held";
      await db.insert(ledgerEntry).values([
        { vendorCompanyId: co.id, orderId: order.id, type: "sale", amount: vendorNet, status: entryStatus, note: `Sale #${ref}`, createdAt: orderDate },
        { vendorCompanyId: co.id, orderId: order.id, type: "commission", amount: commission, status: "paid", note: "Marketplace Commission (10%)", createdAt: orderDate },
      ]);
      if (entryStatus === "available") totalAvailable += vendorNet;
      else totalHeld += vendorNet;
    }
  }

  // Vendor wallet
  await db.insert(vendorWallet).values({
    companyId: co.id, balanceAvailable: totalAvailable, balanceHeld: totalHeld,
  }).onConflictDoUpdate({
    target: vendorWallet.companyId,
    set: { balanceAvailable: totalAvailable, balanceHeld: totalHeld, updatedAt: new Date() },
  });

  console.log(`✓ seeded 8 orders (available: ₦${totalAvailable.toLocaleString()}, held: ₦${totalHeld.toLocaleString()})`);

  // ── Quote Requests ──
  await db.insert(quoteRequest).values([
    {
      productId: productRows[0].id, buyerUserId: buyer.id, exhibitorUserId: exh.id,
      quantity: "10 tonnes", requiredBy: new Date("2026-08-01").toISOString(), deliveryLocation: "Lagos, Nigeria",
      message: "We need 10 tonnes of Y12 TMT Rebar for a 3-storey residential project in Lekki. Please quote your best wholesale price with delivery.",
      status: "pending",
    },
    {
      productId: productRows[1].id, buyerUserId: buyer.id, exhibitorUserId: exh.id,
      quantity: "20 pieces", requiredBy: new Date("2026-07-15").toISOString(), deliveryLocation: "Abuja, Nigeria",
      message: "Looking for 20 pieces of UC 254×254 H-Beams for a warehouse project. Can you supply within 2 weeks?",
      status: "quoted",
    },
    {
      productId: productRows[3].id, buyerUserId: buyer.id, exhibitorUserId: exh.id,
      quantity: "500 sheets", requiredBy: new Date("2026-09-01").toISOString(), deliveryLocation: "Port Harcourt, Nigeria",
      message: "Need 500 roofing sheets (0.45mm) in burgundy. Estate development project — may have follow-up orders.",
      status: "accepted",
    },
  ]);
  console.log("✓ seeded 3 quote requests");

  // ── Jobs (employer = buyer) ──
  await db.insert(job).values([
    { ownerUserId: buyer.id, title: "Senior Architect", company: "UrbanGrid Studios", location: "Lagos, Nigeria", employmentType: "Full-time", workModel: "On-site", experienceLevel: "Intermediate level", salaryMin: 600000, salaryMax: 900000, description: "Lead the spatial planning and technical design for building projects, overseeing hyperrealistic renders and complex MEP coordination from concept to handover." },
    { ownerUserId: buyer.id, title: "Project Manager", company: "Cubic Studio", location: "Lagos, Nigeria", employmentType: "Full-time", workModel: "On-site", experienceLevel: "Senior", salaryMin: 400000, salaryMax: 600000, description: "Experienced Project Manager to monitor and supervise an estate construction development project at Ibeju-Lekki, Lagos." },
  ]);

  // ── Recommendation ──
  await db.insert(recommendation).values({
    recommenderUserId: buyer.id, recommendeeUserId: pro.id, relationship: "Worked together",
    positionAtTime: "Project Manager", status: "approved",
    body: "An invaluable partner on our recent mixed-use development — balanced complex spatial planning with a striking, modern aesthetic. Highly recommended.",
  });

  await db.insert(notification).values([
    { userId: pro.id, type: "recommendation", title: "New recommendation", body: "Tunde Bello recommended you.", href: "/dashboard" },
    { userId: exh.id, type: "quote", title: "New quote request", body: "A buyer requested a quote for High-Yield TMT Rebar.", href: "/dashboard/quotes" },
    { userId: exh.id, type: "order", title: "New order received", body: "Tunde Bello placed an order for ₦1,240,000.", href: "/dashboard/orders" },
    { userId: buyer.id, type: "order", title: "Order shipped", body: "Your order #NMC-0006 has been shipped.", href: "/dashboard/my-orders" },
  ]);

  // ── Buyer profile ──
  await db.insert(profile).values({
    userId: buyer.id, headline: "Project Manager", availability: "hiring",
    location: "Lagos, Nigeria", yearsExperience: 8, successScore: 75, completeness: 60,
    bio: "Construction project manager with 8 years of experience in residential and commercial developments. Currently managing an estate project in Ibeju-Lekki.",
  });

  const counts = await db.execute(sql`select
    (select count(*) from profile) as profiles,
    (select count(*) from product) as products,
    (select count(*) from job) as jobs,
    (select count(*) from project) as projects,
    (select count(*) from sales_order) as orders,
    (select count(*) from ledger_entry) as ledger_entries,
    (select count(*) from quote_request) as quotes`);
  console.log("✓ seeded:", counts.rows[0]);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
