# UI TEMPLATE / UI DESIGN SPECIFICATION

This document serves as the **UI Design Bible, Component Blueprint, and Page Template Specification** for the **SIH26033 Agricultural Marketplace**. It defines the visual and structural guidelines for the frontend application to ensure consistency, professionalism, and a premium user experience across all user roles (Farmer, FPO, Buyer, Admin).

> **Note for AI Assistants (like Claude):** Use this document as the absolute source of truth for frontend UI implementation. Adhere strictly to the templates, component catalogs, and layout structures defined here when generating or refactoring pages.

---

## 1. Product Identity

* **Product/Platform Name:** SIH26033 Agricultural Marketplace
* **Purpose:** A direct Farmer & FPO to Buyer Agricultural Marketplace for discovering fresh produce, verified local farmers, and transparent pricing.
* **Target Users:** 
  * **Farmers (Sellers):** Individual producers managing inventory, tracking orders, and utilizing AI for pricing.
  * **FPOs (Farmer Producer Organizations):** Aggregators managing farmers, crop commitments, bulk sealing, and settlements.
  * **Buyers:** B2B businesses and consumers searching for produce, bulk sourcing, and submitting RFQs.
  * **Admins:** Platform operators managing verification, users, and platform health.
* **Overall UI Personality:** Professional, trustworthy, transparent, data-driven, and distinctly "Agri-Tech" without feeling like a generic SaaS. It must look premium and reliable.
* **Design Principles:** 
  * **Clarity over Clutter:** Display complex agricultural data (yields, pricing, batches) in scannable formats.
  * **Trust via Transparency:** Clear badging for verified farmers, organic certifications, and FPO backing.
  * **Action-Oriented:** Primary actions (Buy, Sell, Approve, Match) must be prominent and distinct.

---

## 2. Visual Language

The project uses Tailwind CSS v4 and standard shadcn/ui components customized with `okLCH` colors.

* **Primary Colors:** Deep Forest Green (`--primary`) — Signifies agriculture, growth, and trust.
* **Secondary Colors:** Earthy tones / Muted Beige (`--secondary`) — Used for backgrounds, subtle highlights, and secondary actions.
* **Background Colors:** Clean White (`oklch(1 0 0)`) in light mode; Deep Charcoal (`oklch(0.145 0 0)`) in dark mode.
* **Surface Colors (Cards/Popovers):** Matching backgrounds with subtle borders to establish elevation without heavy shadows.
* **Text Hierarchy:**
  * **H1 (Page Titles):** 2xl to 3xl, font-semibold, tracking-tight.
  * **H2/H3 (Section Headers):** lg to xl, font-medium.
  * **Body:** Base size, muted for secondary descriptions (`text-muted-foreground`).
* **Typography:** `Geist Sans` for UI elements and headings; `Geist Mono` for data tables, SKU codes, and pricing (`font-mono`).
* **Border Radius:** Soft corners standard at `0.625rem` (`--radius: 0.625rem`). Cards and inputs feel modern and approachable.
* **Shadows:** Minimalist. Use subtle drop shadows (`shadow-sm`) only for interactive hover states or floating elements (modals/popovers).
* **UI Elements:**
  * **Icons:** `lucide-react`. Keep icon weight consistent (stroke-width: 2).
  * **Buttons:** Solid primary for main actions; outline/ghost for secondary; destructive (Red/Orange) for delete/reject.
  * **Inputs & Forms:** Standard shadcn inputs. Focus state uses ring offset.
  * **Badges:** Colored based on status (Green: Verified/Delivered, Yellow: Pending/Processing, Blue: In-Transit, Red: Rejected).
  * **Tables:** Clean borders, striped rows for readability on dense data, mono-spaced numbers.
  * **Alerts/Toasts:** Used for success/error notifications.

---

## 3. Layout System

* **Marketplace (Buyer-facing) Layout:**
  * **Header:** Top navigation bar (`MarketplaceNavbar`) with Logo, Search Bar, Categories, Cart, and User Profile.
  * **Content Area:** Centered container (`max-w-7xl`, `mx-auto`, `px-4`) for listings, details, and checkout.
  * **Footer:** Comprehensive footer with links, trust badges, and support info.
* **Dashboard (Farmer/FPO/Admin) Layout:**
  * **Sidebar:** Left vertical navigation (`AppShell` > Sidebar). Contains role-specific navigation items. Collapsible on desktop.
  * **Page Header:** Top bar above content containing breadcrumbs, page title, and primary page actions (e.g., "Add Product").
  * **Content Area:** Fluid width (`flex-1`, `p-6` or `p-8`) housing the main forms, tables, and widgets.
* **Responsive Behavior:** 
  * Mobile: Sidebars convert to hamburger menus (Drawers). Grids collapse to 1 column. Tables require horizontal scrolling or convert to card-lists.
  * Tablet: 2-column grids for forms.
  * Desktop: Full sidebar, 3-4 column grid for metric cards.

---

## 4. Role-Based UI Template

### **Farmer (Seller)**
* **Navigation:** Dashboard, Products (Inventory), Orders, Intelligence (AI).
* **Dashboard:** KPI summary (Total Sales, Active Listings, Pending Orders), Recent Activity feed, AI Price Trends snapshot.
* **Product/Inventory:** Grid or list of active crops. Status badges for shelf-life/availability.
* **Orders:** Kanban board or list view of incoming buyer orders and FPO commitments.
* **AI Intelligence:** Graphs showing local market demand vs. current crop maturity.

### **FPO (Farmer Producer Organization)**
* **Navigation:** Dashboard, Members, Produce Commitments, Aggregation, Buyer RFQs, Settlements.
* **Dashboard:** Aggregated metrics (Total Farmers, Total Volume Expected, Pending Settlements).
* **Members:** DataTable of verified farmers under the FPO umbrella.
* **Aggregation & Commitments:** Interface to combine small farmer yields into large "Sealed Batches".
* **Bulk Orders / RFQ:** Matching interface to see Buyer requirements and fulfill them using aggregated batches.
* **Settlements:** Financial breakdown table showing split payments (Buyer -> Platform -> FPO -> Farmers).

### **Buyer**
* **Navigation:** Marketplace, Categories, Sourcing (RFQ), Cart, Orders.
* **Marketplace:** Left sidebar for filters (Crop type, Organic, Distance, FPO-backed). Right grid of `ProductCard`s.
* **Product Detail:** Image gallery, detailed farmer/FPO info, trust badges, pricing tiers based on quantity.
* **Bulk Sourcing (RFQ):** Form-heavy page to submit large requirements.

### **Admin**
* **Navigation:** Dashboard, Users (Farmers/FPOs/Buyers), Verifications, Transactions, Logistics, Audit Logs.
* **Dashboard:** Platform health, GMV (Gross Merchandise Value), user growth charts.
* **Verification:** Split-pane view (Document viewer on left, Approval/Reject form on right) for vetting FPOs and Farmers.

---

## 5. Page Template System

### **Dashboard Template**
```text
[ Page Header: Title + Date Range Picker ]
↓
[ KPI / Statistics: 4-column StatCards (e.g., Revenue, Volume, Orders, Alerts) ]
↓
[ Charts / Graphs: 2-column layout (e.g., Sales Trend | Category Breakdown) ]
↓
[ Recent Activity / Data Table: e.g., Latest Orders or Approvals ]
```

### **Marketplace Listing Template**
```text
[ Marketplace Navbar: Search + Cart ]
↓
[ Breadcrumbs / Category Header ]
↓
[ Layout Split: Left (25%) / Right (75%) ]
  ├─ Left: FilterSidebar (Categories, Price, Distance, Certifications)
  └─ Right: 
       ├─ Active Filters & Sort Dropdown
       ├─ Product Grid (3 or 4 columns of ProductCards)
       └─ PaginationControls
```

### **Product Detail Template**
```text
[ Marketplace Navbar ]
↓
[ Breadcrumbs ]
↓
[ Layout Split: Left (60%) / Right (40%) ]
  ├─ Left: ProductGallery (Main image + thumbnails), Description, FPO/Farmer Profile, Reviews
  └─ Right: AddToCartSection (Sticky) -> Price, Quantity Input, Pricing Tiers, CTA Buttons, Trust Badges
↓
[ Related Products ]
```

### **Data Table Template (Admin/FPO)**
```text
[ Page Header: Title + "Create New" Primary Action ]
↓
[ SearchBar + FilterPanel ]
↓
[ DataTable: Sortable headers, Row actions (Edit/Delete) in last column ]
↓
[ Pagination ]
```

---

## 6. Reusable Component Catalog

* **MarketplaceNavbar:** Purpose: Top navigation for buyers. Structure: Logo | Search | Links | Cart/Profile.
* **FilterSidebar:** Purpose: Refine marketplace results. Structure: Accordion groups (Categories, Location, Price).
* **ProductCard:** Purpose: Display a single product. Structure: Image, Title, Price/Unit, FPO Badge, "Add" button.
* **ProductGallery:** Purpose: View product images. Structure: Large main image, horizontal scrollable thumbnails.
* **AddToCartSection:** Purpose: Purchasing logic. Structure: Dynamic price based on quantity, +/- inputs, Primary CTA.
* **PageHeader:** Purpose: Standardize dashboard page titles. Structure: Flex container with Title (H1) on left and Actions (Buttons) on right.
* **StatCard:** Purpose: Display KPIs. Structure: Card > Header (Title + Icon) > Content (Large number + % change).
* **DataTable:** Purpose: Manage tabular data. Behavior: Integrated with sorting, filtering, and pagination.
* **StatusBadge:** Purpose: Visual state indicator. Structure: Pill shape with distinct background/text colors based on state.
* **ListingDetailsModal:** Purpose: Quick view for products without leaving the page.
* **BatchCard (FPO):** Purpose: Show aggregated crop volume. Structure: Crop Name, Total Tonnage, Contributing Farmers count, Readiness Date.
* **SettlementBreakdown:** Purpose: Financial transparency. Structure: Stepper/Timeline showing funds moving from Escrow to FPO to Farmer.

---

## 7. FPO UI Template (Workflow Focus)

The FPO experience must visually guide the user through the aggregation lifecycle:

1. **FPO Registration & Verification:** Form with document upload (KYC, FPO Certificate). Admin approves.
2. **Farmer Membership:** DataTable of farmers. FPO sends invites; farmers accept.
3. **Produce Commitment:** Farmers enter expected yield. FPO sees a combined Dashboard of "Expected Inventory".
4. **Aggregation & Batch Sealing:** 
   * UI: A Drag-and-Drop or Multi-select interface where FPO selects multiple farmer commitments (e.g., 50kg from Farmer A, 100kg from Farmer B) and clicks **"Seal Batch"** (150kg Total).
5. **Buyer RFQ Matching:** Split screen. Left: Buyer RFQs. Right: FPO's Sealed Batches. Button: **"Propose Match"**.
6. **Settlement & Farmer Payout:** A visual breakdown (Receipt style) showing Total Sale - Platform Fee - FPO Commission = Distributed Amount per Farmer.

---

## 8. Marketplace UI Template

* **Search:** Prominent in the `MarketplaceNavbar`. Auto-complete suggestions for crops.
* **Filters:** Left-aligned `FilterSidebar`. Sticky on desktop. Drawer on mobile.
* **Product Cards:** Must clearly show if the product is direct from a Farmer or aggregated by an FPO. Display "Minimum Order Quantity" (MOQ) clearly.
* **Availability:** Use progress bars or text (e.g., "Only 500kg left in current batch") to drive urgency and transparency.

---

## 9. AI UI Template

The AI features (e.g., `seller/intelligence`) must look like **decision support systems**, not generic chatbots.
* **Visual Style:** Use subtle gradients (e.g., blue/purple) only on borders or icons to indicate AI-driven insights, while keeping the main content grounded.
* **Price Prediction:** Line charts with a solid line for historical data and a dotted/dashed line for AI forecasted future prices. Include a "Confidence Interval" shaded area.
* **Smart Allocation / Best Time to Sell:** Recommendation cards (`AIRecommendationCard`) that explicitly state the 'Why'. 
  * Structure: **Insight:** (e.g., "Hold tomatoes for 2 weeks") -> **Reasoning:** ("Local demand is projected to spike 15% due to upcoming festivals") -> **Action Button:** ("Schedule Listing").

---

## 10. Responsive Rules

* **Dashboards:** Metrics change from 4 columns (Desktop) to 2 columns (Tablet) to 1 column (Mobile).
* **Sidebars:** Hidden behind a hamburger menu (Drawer) on mobile and tablet portrait.
* **Data Tables:** On mobile, tables must either scroll horizontally (with sticky first column) or collapse into a vertical list of cards where each card represents a row.
* **Product Details:** Left/Right split becomes top/bottom stacked on mobile. The `AddToCartSection` becomes a sticky bar at the very bottom of the mobile screen.

---

## 11. UX Rules

* **CTA Hierarchy:** Only ONE primary action per page (solid primary color). All other actions are secondary (outline/ghost) or tertiary (links).
* **Forms & Validation:** Inline validation errors below inputs. Do not wait for submit to show basic errors. Use standard shadcn Form components.
* **Feedback:** Every mutation (Create, Update, Delete, Add to Cart) must trigger a Toast notification (Success or Error).
* **Destructive Actions:** Deleting products or rejecting users must require a Confirmation Modal (`AlertDialog`). Red buttons.
* **Loading States:** Use `Skeleton` components that mimic the shape of the content being loaded, rather than full-page spinners.
* **Empty States:** When a table or grid is empty, show a centered `EmptyState` component with a subtle illustration/icon, a helpful message ("No products found"), and a CTA to resolve it ("Clear Filters" or "Add Product").

---

## 12. Page-by-Page Visual Blueprint

* **`/` (Landing Page)**
  * Purpose: Introduce platform.
  * Layout: Full width. Hero section → Value Props → Featured FPOs/Products → Footer.
  * Primary Action: "Start Sourcing" / "Register as Seller".

* **`/marketplace`**
  * Purpose: Browse products.
  * Layout: Navbar → Filter Sidebar (Left) + Product Grid (Right).
  * Major Components: `MarketplaceNavbar`, `FilterSidebar`, `ProductCard`, `PaginationControls`.

* **`/marketplace/products/[id]`**
  * Purpose: View and buy a product.
  * Layout: 2-column split.
  * Major Components: `ProductGallery`, `AddToCartSection`.

* **`/marketplace/sourcing`**
  * Purpose: B2B Bulk Requirements (RFQ).
  * Layout: Centered wide form.
  * Primary Action: "Submit RFQ".

* **`/cart` & `/checkout`**
  * Purpose: Finalize purchase.
  * Layout: Narrow centered container or 2-column (Cart Items | Order Summary).
  * Primary Action: "Proceed to Payment".

* **`/seller/products` & `/seller/orders`**
  * Purpose: Farmer inventory and order management.
  * Layout: Dashboard Sidebar + Content.
  * Major Components: `PageHeader`, `DataTable`, Status badges.

* **`/seller/intelligence`**
  * Purpose: AI insights for farmers.
  * Layout: Dashboard Sidebar + Dashboard grid.
  * Major Components: Line Charts, `AIRecommendationCard`.

* **`/admin/*` & `/fpo/*`**
  * Purpose: Management portals.
  * Layout: Admin/FPO Sidebar + Content.
  * Major Components: Multi-tab interfaces, `DataTable`, `StatCard`, Modals for quick editing.
