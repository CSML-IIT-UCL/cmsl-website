# CSML website: implementation plan

**Revised:** 13 October 2026 | Revision 2: reviewed publishing, live social APIs, external blog index  
**Status:** Implementation specification; no website, repository settings, or external services have been changed.  
**Companions:** [`AGENTS.md`](AGENTS.md) for coding agents and [`README.md`](README.md) for team-member tutorials. Templates and VS Code configuration examples are included; the website application and GitHub settings still need implementation.

## 1. Goal and agreed scope

Build a new, predominantly self-contained website for the **Computational Statistics and Machine Learning (CSML)** group at the **Istituto Italiano di Tecnologia (IIT)**. Use the existing website as a source of factual content and approved photographs, not as a design reference. Preserve and reuse the official IIT and CSML logo files already in the repository's `media/` directory.

The homepage contains the team photograph, team introduction and principal-investigator profile, research areas, news and social feeds, categorized people, funded projects, and contact information. The additional primary navigation destinations are **Publications**, **Career Opportunities**, and **Blog Posts**. Blog Posts is an index of externally hosted articles, not a local blogging platform. Every person has a real, independently addressable profile page, progressively enhanced into an in-page panel when opened from the homepage.

The supplied [OpenAlex guide](docs/openalex-free-tier-guide.md) is the baseline for weekly publication collection. This plan retains its free-tier approach and explicitly adds production requirements: a single people registry, per-person publication mapping, safer request accounting, per-person cache refreshes, validation, and a dev-first PR-only publishing pipeline. Where the guide example pushes directly to its checked-out branch, this plan requires generated updates to target `dev`, never `main`. It does not add Google Scholar scraping or profile-write automation.

**Low maintenance means no routine publication entry or social-post copying.** Automated bibliography/blog metadata updates enter `dev`; they reach production only after a release PR is merged. Live social posts are the explicit runtime-content exception: displaying a newly posted social item does not modify Git or require a website release. People must still supply changes that no reliable data source can establish: membership, biographies, research descriptions, news, project records, and openings. Those changes should require only copying or editing a short Markdown/YAML file, not changing application code.

### Source-derived facts versus implementation decisions

The old homepage provides research prose and identifies Massimiliano Pontil as principal investigator. Its full people directory contains more entries and role types than its homepage preview. The funded-projects listing is also a migration source, but the text returned during this review did not expose a complete project inventory. Do not treat that as proof that no projects exist. [S1-S4]

The stack, content schemas, layouts, workflow organization, and defaults below are **recommended implementation decisions**, not facts extracted from the legacy website. No repository or `media/` inventory was supplied for inspection. The precise team photograph, portrait asset URLs, complete project inventory, author IDs, and application recipient remain migration/setup tasks.

## 2. Architecture and boundaries

### Recommended stack

| Concern | Decision |
|---|---|
| Website | Astro with static output and TypeScript. |
| Editable content | Markdown with YAML frontmatter for narrative entries; YAML for site-wide settings and short project records. |
| Validation | Astro content collections and a shared schema layer; use those same schemas in command-line validation. |
| Styling | A small, original CSS design system with shared spacing, typography, color, and media-frame tokens. |
| Interactivity | Small client-side modules for navigation, dialogs, publication filters, and carousels. No full-site single-page application. |
| Publications | Python collector adapted from the supplied guide; one normalized, persisted dataset consumed by every publication view. |
| Social content | Live official APIs rendered in shared site components: public Bluesky reads; authenticated X reads through a small approved server-side proxy. |
| Blog Posts | Static cards built from persisted external-article metadata, refreshed by an explicit collector or scheduled Action. |
| Automation | Every push to `main` or `dev` builds that branch; PR validation, explicit refresh workflows, and one coordinated production + `/dev/` deployment. |
| Hosting | GitHub Pages initially, subject to IIT approval; the generated static site must remain portable to IIT hosting. |
| Applications | An IIT-hosted or IIT-approved submission service that accepts CV files and delivers application emails. Separate from the static website. |

Astro supports schema-validated local content collections and static profile routes, and documents deployment to GitHub Pages. GitHub Pages itself is static hosting, not an application-upload or mail server. [S5-S7]

Do not add a database, login system, always-on website backend, CMS service, paid publication API, or framework-specific hosting dependency to the initial implementation. There are two narrow service exceptions: the CV submission service and an authenticated X read proxy. Neither turns the website into a general backend. Do not enable paid X access or create hosting accounts without approval.

Use English for site content initially. Treat color values, breakpoints, image positioning, ordering, and public URLs as configuration or design tokens. Keep the final domain and base path configurable; do not assume the team controls `csml.iit.it` DNS or can replace the existing IIT platform directly.

### Data flow and strict source separation

```text
Human content/media edits -> dev -> branch build -> preview at SITE_BASE/dev/
                                                 |
                                            reviewed PR
                                                 |
                                                main -> production at SITE_BASE/

Weekly/explicit OpenAlex collector -> dev:data/publications.json -> same PR path
Daily/explicit blog collector      -> dev:data/blog.json         -> same PR path

A trusted deployment coordinator publishes ONE bundle:
  root output = validated main commit + that commit's saved data
  dev/ output = validated dev commit + that commit's saved data

Visitor -> Bluesky public API -> live social cards
Visitor -> approved X proxy  -> X API -> live social cards
Applicant -> approved application service -> verified recipient mailbox
```

Ordinary builds, PR checks, local servers, and opening VS Code **never fetch OpenAlex or re-import blog metadata**. A changed author ID does not cause an implicit API request. Builds use the cache in their exact source commit; a production build must not substitute a newer cache from `dev`.

Live social requests occur only in the optional browser widget/proxy, not the static build. Core content remains usable without JavaScript or external networks. Blog metadata and publication snapshots are durable tracked files, not GitHub Actions dependency caches.

`main` remains the GitHub default branch for trusted workflow definitions and scheduled jobs. Contributors must deliberately select `dev` in the GitHub editor. The fact that a schedule executes its workflow from `main` does not authorize it to commit generated content there.

## 3. Repository structure and ownership

Target structure for implementation, not a claim these application files already exist:

```text
AGENTS.md
IMPLEMENTATION_PLAN.md
README.md                         # Team-member tutorials; not REAME.md
package.json / package-lock.json
astro.config.mjs
.node-version / .python-version    # Supported, tested versions pinned at bootstrap
requirements.txt                  # Pinned collector dependencies
.env.example                      # Variable names only; no real credentials
.gitignore

content/                          # HUMAN-EDITED
  site.yaml
  applications.yaml
  social.yaml
  blog-sources.yaml
  about.md
  people/<person-id>.md
  research/<research-id>.md
  news/<date>-<news-id>.md
  projects/<project-id>.yaml
  openings/<opening-id>.md
  blog-entries/<entry-id>.yaml      # Optional manual external-article additions
  blog-overrides.yaml
  publication-overrides.yaml

templates/                        # Copyable, commented, unpublished examples
  person.md
  research.md
  news.md
  project.yaml
  opening.md
  blog-entry.yaml
  blog-source.yaml

media/                            # Approved source assets; original logos intact
  ...existing official assets...
  team/ people/ research/ funders/ projects/ blog/

data/                             # GENERATED, tracked per source branch
  publications.json               # Records, membership coverage, freshness metadata
  blog.json                       # External article cards + per-source freshness

src/
  content.config.ts
  components/                     # PersonCard, Profile, NewsItem, BlogCard, SocialCard
  layouts/
  lib/                            # Schemas, paths, selectors, live-social client
  styles/
  pages/
    index.astro
    publications/index.astro
    publications/page/[page].astro
    careers/index.astro
    blog/index.astro
    people/[id]/index.astro
    404.astro

scripts/
  validate-content.ts
  export-authors.ts
  prepare-media.ts
  dev.mjs                         # Safe local launcher; no install or API refresh
  setup-publications.mjs          # Explicit Python environment setup only
  update-publications.mjs         # Human-facing selector/CLI and collector wrapper
  sync_openalex.py                # Actual API collector, same in Actions/local use
  update-blogs.mjs
  validate-generated-data.ts
  compose-pages.mjs               # Trusted assembly, never execute artifact contents
  migrate-legacy.py               # One-time explicit content acquisition

services/
  social-proxy/                   # X adapter; separately deployed, secrets private

public/
  media/                          # Ignored generated web derivatives

docs/
  openalex-free-tier-guide.md      # User's guide, preserved unchanged
  migration-inventory.md
  media-sources.yaml
  operations.md                  # Protection, hosting, keys, proxy, release/recovery

.vscode/
  tasks.json                     # Launch dev server on trusted folder open

tests/
  fixtures/ unit/ python/ e2e/

.github/
  workflows/
    ci.yml                       # Read-only PR and main/dev push checks/builds
    deploy.yml                   # Trusted combined Pages deployment coordinator
    refresh-publications.yml     # Weekly/manual; generated changes to dev only
    refresh-blogs.yml             # Daily/manual; generated changes to dev only
  dependabot.yml
  CODEOWNERS

.cache/                          # Ignored staging, export, local temporary files
.venv/                           # Ignored local Python environment
```

`content/people/` is the only editable people/author registry. Export `.cache/authors.json` for Python; do not also maintain the guide's separate editable author list.

`dev` contains proposed content and generated-data updates; `main` contains approved content and generated data. Their snapshots may legitimately differ. There is no separate live-data branch silently feeding production, and no default-branch bot-write exception.

Prepare approved source media into `public/media/`. Never publish repository internals, `.env*`, applicant CVs, raw migration files, or credentials. Local image paths in content are site-relative references resolved by one base-path helper, not hardcoded production-only URLs.

## 4. Page and component specification

### 4.1 Navigation and homepage composition

Use a compact header with the official logos, homepage section links, and the real routes `/publications/`, `/careers/`, and `/blog/` (label: **Blog Posts**). These are navigation links, not JavaScript-only tabs. Prefix them with the current build base, including `/dev/` in preview.

Suggested anchors: `#about`, `#research`, `#updates`, `#people`, `#projects`, and `#contact`. Preserve meaningful anchor navigation, including without JavaScript, with enough scroll offset for the header.

The visual direction is an original, restrained academic website: generous spacing, legible text, clear section hierarchy, subtle borders, and a small accent palette compatible with the existing logos. Avoid copying the old site's CSS, slideshow design, navigation chrome, or page composition. Avoid decorative motion and heavy dependencies.

### 4.2 Team-photo banner

Download the actual team photograph referenced by the old homepage, after confirming which image it is. A CSS background or lazy-loaded image may not appear in a text scrape. Inspect the rendered homepage and its image sources if necessary; do not substitute a generic stock or generated team photo.

Use a responsive, full-width banner inside the site layout. Supply image dimensions, responsive derivatives, descriptive alternative text when informative, and configurable focal positioning. Preserve faces on narrow screens: provide a mobile crop or use a less aggressive fit rather than cutting people out indiscriminately. Keep important title text outside the photograph unless contrast is reliably controlled.

### 4.3 Team focus and PI

On desktop, place the team description on the left and a compact principal-investigator card on the right. Stack them on mobile. The card reads the PI's ordinary person record and includes portrait, name, title, short description, and available professional/media links.

Reference the PI through `site.principal_investigator_id`. Do not create a second biography or a second publication configuration for the PI. Clicking the PI uses the same profile behavior as other members.

### 4.4 Research areas

Interpret the requested **2 x n** behavior as **two rows with a horizontally extending set of columns** on large screens. Four entries display as two rows by two columns. Additional entries extend horizontally inside this section; the page itself must never overflow horizontally.

Use an accessible scroll-snap container with previous/next controls and an indication that more content exists. Do not auto-advance research cards. Keep visual order, DOM order, and keyboard order consistent. On small screens use a readable single-column list rather than retaining a cramped two-row layout.

Each card supports a title, description, optional link, and a GIF/PNG or another approved image. Place the media frame to the left of the text when width permits. Use a common **4:3 frame** and common dimensions, with `cover` as the default fit and a per-entry `contain` override for diagrams whose labels must remain visible. Configure object position rather than modifying source images.

Animated research media must have a usable static poster and a pause/stop mechanism, or be converted to a controllable video while retaining the original. Under reduced-motion preferences, display the poster. Merely applying a CSS animation rule does not stop an animated GIF.

The legacy research description can inform drafts, but it does not establish an official four-line taxonomy. Draft labels such as learning theory and optimization, transfer and reinforcement learning, scientific machine learning, and learning dynamical systems require team review. [S1]

### 4.5 Updates and news

Use two desktop columns with a moderate maximum content height, initially **24rem**. The left column displays authored news, newest publication timestamp first. Each entry has a date, title, short text, and optional link. An optional pinned state is allowed, but pinned records remain clearly dated.

The right column contains a small **Bluesky / X** switch within the same section. Its default view is Bluesky, loaded through the public API when the section becomes visible, subject to approved privacy handling. Render Bluesky and X results through the same site-styled social-card UI, with loading, empty, error, and last-fetched states. Show direct source links at all times. No daily social snapshot or rebuild is required.

Allow independent vertical scrolling where needed, without trapping keyboard focus or preventing the user from continuing down the page. On mobile, stack the columns and prefer natural page scrolling or an explicit expansion control. Distinguish a news publication timestamp from an optional future event date. Future-dated news is not published until its configured timestamp.

### 4.6 People

Group cards into the requested categories: **Senior Academics**, **Post-Docs**, **PhD Students**, and **Research Engineers**. Store category labels and ordering centrally. Add optional categories only for real records, such as **Affiliated / Visiting Researchers**, **Research Support**, and **Alumni**; the source directory includes roles outside the four requested categories. Do not silently reclassify or drop those people. [S2]

Every card shows the available portrait, name, actual role label, and optional short research focus. Hide empty groups. Provide stable alphabetical ordering within a group unless a numeric order is explicitly configured. The PI may also appear in the appropriate people group, but both cards must use the same record.

Support ORCID iD, Google Scholar, GitHub, personal website, IIT profile, email, and additional labeled media links. Omit absent fields cleanly. The main external website button uses the personal website when present and otherwise the IIT profile. Missing pictures use an intentional initials/neutral placeholder; missing IDs never become fabricated identifiers.

### 4.7 Individual profiles and in-page panel

Generate `/people/<id>/` for every published person, under the environment base path (for example `/dev/people/<id>/`). Include biography, research interests, professional links, email when approved for publication, portrait, and that person's publications.

A normal card link points to this real route. With JavaScript, an ordinary click from the homepage opens a roomy dialog or side panel over the current page, using the same profile presentation and publication selector. Load the profile content on demand rather than putting every member's bibliography into the homepage payload.

Provide an explicit close button, Escape handling, focus containment, background inertness, focus restoration, and retained homepage scroll position. Synchronize history so Back closes the panel and Forward can reopen it. Only go back on close when the panel created a history entry; do not send a direct-arrival visitor to an unrelated previous website. Preserve new-tab and modified-click behavior.

Refreshing or sharing `/people/<id>/` opens the standalone page. If profile loading or JavaScript fails, follow the normal link. Do not claim the profile feature is complete with only an inaccessible modal or non-shareable state.

### 4.8 Funded projects

Use a compact, continuously and slowly auto-scrolling horizontal strip of project cards. Each card represents a **project**, not just a deduplicated funding organization: show its acronym/title, associated funder logo or logos, and project link. A project logo may be additional, but must not replace the requested funding-institution identity.

Keep logos uncropped with `object-fit: contain`. Provide visible pause/resume and manual navigation. Pause on pointer hover and keyboard focus; a user-selected pause remains paused. Disable auto-motion for reduced-motion preferences and when the strip is outside the viewport. When all items fit, do not scroll needlessly. Any cloned items used for seamless looping must be hidden from assistive technology, non-focusable, and free of duplicate IDs. The W3C carousel guidance supports user control and keyboard access. [S16]

Store active/completed status and optional dates. Do not present expired projects as currently funded without confirmation. An archived project can remain listed if clearly labeled. Use the official project or institutional page as the destination, not an invented URL.

### 4.9 Contact

Show verified team contact details, PI contact where appropriate, postal address, institution link, and social-profile links. Do not assume the institution-wide footer address is the team's actual working location. Prefer a map link rather than loading a tracking map embed by default. Link approved privacy information and include an accessible footer.

### 4.10 Publications page

Render the combined, deduplicated publications of included team members, grouped by descending publication year. Within a year use descending publication date, then deterministic title/ID tie-breakers. Missing years go in an explicit undated group.

Each entry supports title, authors, year/date, venue, type, DOI, and an open-access destination where available. Visually identify team authors without changing bibliographic author order. Keep preprints and retractions visibly labeled when the source identifies them. Do not equate open access with peer review.

Provide search and filters by year, person, and publication type. Generate crawlable, static paginated results as a baseline; add client-side filtering using a compact index loaded only on this page. Avoid embedding a full group bibliography in the homepage. Display the last successful refresh and source attribution. Personal profiles and this page must read the same normalized records and overrides.

### 4.11 Blog Posts: external article index

The `/blog/` page lists **individual posts**, not merely two links to authors' blog homepages. Each entry displays its **title**, **author name**, and **optional article image**, with a normal link directly to the original external article. A date and small source label may be shown when reliably available. An excerpt is optional and unnecessary for the initial design.

Use responsive, site-styled cards or compact list rows. Missing images produce a deliberate text-only layout, not a broken image or generic stock replacement. Keep titles as accessible text. Clicking the title/card opens the external article using an ordinary link; preserve modified-click/new-tab behavior. Do not create local article-body routes, iframe the original page, copy its layout, or require visitors to go through an intermediate local detail page.

Initial sources requested by the team:

- Vladimir R. Kostić: `https://vladi-slk.github.io/blog.html`.
- Pietro Novelli: `https://pietronvll.github.io/archive.html`.

Both listing pages were inspected on 13 October 2026; the latter's homepage identifies its author. Exact feed endpoints and reusable article-image availability remain discovery tasks, not assumed facts. [S20-S22]

Sort by verified publication date descending, then deterministic title/URL tie-breakers. Entries with no date remain visible in an undated group. Deduplicate by validated canonical article URL, without merging different posts with similar titles. A person may have several posts and a post may name several authors. Keep the original hosting destination and author attribution.

## 5. Editable content contracts

Create the following copyable templates in `templates/`, with concise comments and complete examples. Template files themselves are never published. Users supply data and prose only; they must not write HTML, CSS, component imports, or page layouts. Shared components apply the site typography, spacing, card, image, and link styles automatically. Quoted dates, omission rules, valid categories, and required fields must be explained in the README.

### 5.1 Person: `content/people/<person-id>.md`

```yaml
---
id: example-researcher
name: Example Researcher
draft: true
role: postdoc
role_label: Postdoctoral Researcher
status: active                   # active | alumni | affiliated
order: 100
email: null
photo: null                      # /media/people/example-researcher.jpg
photo_alt: null
research_summary: null
research_interests: []
iit_profile: null
personal_website: null
orcid: null                      # Bare, validated ORCID iD
scholar_url: null
github_url: null
media_links: []                   # Objects with label and url
openalex_ids: []                  # Verified A... identifiers; never name guesses
publications:
  enabled: true
  include_in_team_list: true
---
Write a short research biography here. This example stays unpublished
until real information is supplied and draft is changed to false.
```

Use an ID that remains stable when a name or role changes. The supported role enum includes `senior_academic`, `postdoc`, `phd_student`, `research_engineer`, `affiliated_researcher`, and `research_support`; keep display labels separate from grouping keys. Alumni status is independent of a person's former role.

Allow multiple verified OpenAlex IDs for a person with a split author record. Reject an author ID accidentally assigned to two different people. A person with no verified ID still gets a profile; their publications show an unavailable/not-linked state, not a misleading claim that they have no publications. For alumni retained on the website, the two publication flags explicitly decide whether to continue harvesting and whether to include their works in the aggregate. Disable group inclusion by default when moving someone to alumni.

### 5.2 Research area

```yaml
---
id: example-research-area
title: Example research area
draft: true
order: 10
media:
  src: null
  alt: null
  fit: cover
  position: center
  poster: null
link: null
---
Add a short, approved description of this research direction.
```

If no media is provided, render a balanced text-only card; do not reserve a broken-image rectangle. An actual animated asset requires a configured static alternative.

### 5.3 News entry

```yaml
---
id: example-announcement
title: Example announcement
draft: true
published_at: '2026-10-13T09:00:00+02:00'
event_date: null
pinned: false
link: null
---
Write a short announcement. Use the link field for additional details.
```

### 5.4 Funded project

```yaml
id: example-project
title: Example project
acronym: EXAMPLE
draft: true
status: active                   # active | completed
start_date: null
end_date: null
project_url: null
project_logo: null
funders: []                      # Each: name, logo, logo_alt, optional url
order: 10
```

A production project card needs a verified destination and at least one named funder. Publish a textual funder name while awaiting an approved logo rather than downloading an unrelated image. Do not invent grants, dates, or institutional relationships.

### 5.5 Opening

```yaml
---
id: example-opening
title: Example research position
draft: true
application_type: postdoc        # phd | postdoc | research_engineer | open
status: open                     # open | closed
published_at: '2026-10-13T09:00:00+02:00'
deadline_at: null                # Explicit offset or Z when present
position_reference: null
description_url: null
apply_url: null                  # Official application portal, when applicable
---
Describe the position briefly, linking to the authoritative call.
```

An explicit closed state wins. Otherwise, an opening becomes closed after its deadline. A null deadline means no published deadline, not a made-up rolling deadline. A daily cache-only deployment rebuild updates the static state without refreshing external datasets; a small client check can also disable an expired apply action if a scheduled build was missed. The official application service remains the authority for accepting submissions.

### 5.6 Site and application settings

`site.yaml` owns site title, PI ID, navigation, role labels/order, hero source and focal point, logo paths, public contact details, social-section presentation, and configurable publication/media presentation limits. `content/social.yaml` owns API-facing public settings; secrets never belong in YAML.

```yaml
# content/applications.yaml: configuration shape, not a ready service
mode: external_form              # external_form | endpoint | email_draft | disabled
privacy_notice_url: null
max_cv_size_mb: 10                # Proposed limit; must match the approved service
accepted_cv_types: [application/pdf]
types:
  phd:
    label: PhD application
    subject_tag: PHD
    form_url: null
  postdoc:
    label: Postdoctoral application
    subject_tag: POSTDOC
    form_url: null
  research_engineer:
    label: Research engineer application
    subject_tag: ENGINEER
    form_url: null
  open:
    label: Open application
    subject_tag: OPEN
    form_url: null
```

The private submission service owns the verified recipient address and mail credentials. An explicitly public contact or email-draft fallback can use an approved address from site settings. Do not assume browser-supplied hidden fields can securely choose recipients or email subjects.

Validate IDs, URL schemes, local asset existence, real dates, role keys, references, and required published fields. Convert optional empty strings to absence where appropriate. Reject executable URL schemes and path traversal. Error messages must identify the file, field, and expected correction. Do not make optional data mandatory just to simplify components.

### 5.7 External blog entry and source configuration

`templates/blog-entry.yaml` is for an optional manual link, not local article content:

```yaml
id: example-external-post
draft: true
title: Example article title
author: Example Researcher
person_id: null                 # Optional existing content/people ID
url: https://example.org/blog/example-article/
published_at: null              # Optional quoted ISO date
image: null                     # Optional approved local or HTTPS article image
image_alt: null
```

Published entries require a real title, author, and HTTPS article URL. A linked `person_id` can resolve the display name from the existing people record; do not create a duplicate profile to support a blog card. Support additional authors through a validated extension of this schema when needed. Empty optional values do not reserve broken UI elements.

`content/blog-sources.yaml` is the easy-to-edit list of automated sources. Each source has `id`, `enabled`, `listing_url`, `author_name`, optional `person_id`, optional verified `feed_url`, and a supported `adapter` (`auto`, `rss_atom`, or a named tested HTML adapter). Adding an arbitrary website is not a promise that every layout is supported.

Copyable source examples and the two requested listing URLs are included with this handoff. Keep unverified feed URLs null; do not claim a guessed `/feed.xml` or `/atom.xml` is working. `blog-overrides.yaml` handles rare exclusions or metadata corrections without editing generated JSON.

## 6. One-time migration and media acquisition

1. **Inventory the repository first.** Identify the existing framework, files, official logo locations, build commands, and deployment settings. The tree above is the target for a new repository, not permission to delete existing work.
2. **Inventory the source site.** Start with the homepage, full people directory, PI profile, funded-projects listing and linked detail pages. Follow actual pagination and relevant group-scoped links. Do not mistake the homepage's short people preview for the complete team. [S1-S4]
3. **Extract into staging.** Collect factual text, names, original role labels, public profile URLs, image candidates, project links, and openings. Record source URLs and retrieval dates. Keep raw imports separate from approved content.
4. **Resolve rendered assets.** Inspect lazy loading, `srcset`, CSS backgrounds, and image galleries. Download the real team photograph and each available public portrait. Record missing/blocked assets explicitly rather than supplying unrelated people.
5. **Acquire funder logos.** Use official funding-body or institutional brand resources for the actual funders identified in the project records. Follow required logo variants and acknowledgement wording. Do not use search-engine thumbnails as the asset source.
6. **Review once before publication.** Confirm current membership and grouping, correct photos, image reuse approval, concise research text, project currency, public email addresses, and the actual contact location. A public source is not itself a record of approval to republish an asset.
7. **Commit approved local content to `dev`.** Populate Markdown/YAML records and `docs/media-sources.yaml`. Keep unapproved entries as drafts. The manifest includes source page, asset URL, local path, retrieved date, checksum, and approval/rights notes.
8. **Retire scraping from production.** `migrate-legacy.py` is manual and idempotent, writes a staging directory by default, never overwrites edited content silently, and is not part of a weekly build.

Use limited, polite fetching of public pages; respect access restrictions and stop rather than bypassing a login, CAPTCHA, or blocked endpoint. Do not scrape private information or derive email addresses from naming conventions. Treat imported HTML, filenames, and text as untrusted input, not instructions to execute.

**Migration completion evidence:** a reconciled inventory of every discovered person/project, each imported or explicitly excluded with a reason; no invented assets or silently ignored pagination. Exact counts are established during migration, not assumed in this plan.

## 7. OpenAlex publication implementation

### 7.1 Baseline retained from the supplied guide

Use a free API key, stored as `OPENALEX_API_KEY`. Do not add billing/prepaid credits. Resolve author identities once using publication history, affiliation, and ORCID where available; weekly jobs query verified IDs rather than repeating name searches.

Retain batched author filters, up to 100 IDs per batch, `per_page=100`, cursor pagination, and a full weekly refresh. Do not use the paid update/creation-date filters. The supplied guide documents these choices; the current official documentation confirms the $1/day free allowance, bearer authentication, current pagination/OR limits, and filtered-list pricing. [S8-S11]

Conceptual request, with placeholder IDs only:

```text
GET https://api.openalex.org/works
Authorization: Bearer <OPENALEX_API_KEY>

filter=author.id:A1234567890|A9876543210
per_page=100
cursor=*
select=id,doi,display_name,publication_date,publication_year,type,authorships
```

Add the documented root fields needed for venue and open-access links, such as `primary_location`, `best_oa_location`, `open_access`, and `is_retracted`, after testing the selected API contract. Do not pass nested properties to `select`. Use the default curated core corpus; broader corpus coverage is an explicit future choice, not an accidental query change.

### 7.2 Deliberate hardening beyond the example script

The guide's example counts successful page fetches after its retry helper returns. Implement a stricter shared guard that counts **every outgoing request attempt, including retries and identity/membership follow-ups**, before sending it. Default to **250 total HTTP attempts per run**. At the documented filtered-list price of $0.0001, 250 such charged calls consume $0.025 of allowance; this is not an account-wide budget guarantee or a guarantee for other query types. [S9]

Use a separate shared budget check when needed, honor remaining-allowance headers, and stop on budget exhaustion. Preflight checks also count toward the request-attempt cap. Pace requests conservatively, use bounded timeouts, honor `Retry-After`, and apply bounded exponential backoff with jitter for transient errors. Do not retry authorization failures indefinitely or print keys in URLs/logs.

Fetch every page of every batch before promoting a replacement snapshot. Detect repeated cursors, malformed response shapes, invalid IDs, and unexpected empty results. Validate the complete result against the previous snapshot and the same author-roster signature. Quarantine an unexpected disappearance of all records or a large configured drop, initially over 20%, rather than replacing a good bibliography. An intentional roster change or an explicitly approved correction has an auditable override, not an automatic permanent block.

Keep the last valid snapshot on failure. Do not permanently union every historical result into the new snapshot: a successful full refresh must be able to remove corrected or wrongly attributed records. Build a new candidate, validate it, and promote it atomically; include records, membership coverage, and successful-refresh metadata in one validated candidate file, then replace that file atomically. Record a failed attempt in job/local diagnostics, not as a successful refresh.

### 7.3 Mapping and deduplication

Export each person ID and their verified author IDs from the content layer. Collect and deduplicate works by OpenAlex work ID. Store matched person IDs on normalized records, then use that mapping for both the group list and person-specific selectors. Never match authors merely because their display names look similar.

**Truncated authorship handling:** OpenAlex documents a 100-author cap on the returned `authorships` array. A batched result must therefore not be assigned to every author in its query batch, and the array must not always be assumed complete. [S12]

For potentially truncated or unmatched batched results, make bounded author-scoped confirmation queries for the affected work IDs. Record confirmed mappings; if the API cannot establish a mapping, report the ambiguity and preserve an honest incomplete/unavailable state rather than fabricating attribution or claiming complete personal coverage. Count these follow-ups in the same cap. Add fixtures specifically for large-author works.

Normalize DOI URLs and flag suspected duplicate records sharing an exact DOI. Merge distinct work IDs only through an explicit, reviewed alias/override rule. Do not fuzzy-merge titles or automatically discard a preprint because a related published paper exists.

### 7.4 Publication scope and record contract

The default aggregate means **publications by configured current team members**, including work before joining IIT. It is not a verified list of publications produced exclusively while at IIT. Display a short scope note. Do not silently add institution or membership-date filters. `include_in_team_list` controls inclusion; profile lists can remain broader.

Follow the supplied guide's lack of a publication-type restriction initially: preserve returned work types and offer visible filtering. Any later inclusion policy must be explicit and documented. Missing metadata stays absent; it is not filled with invented venues, author IDs, dates, or DOI links.

The normalized `data/publications.json` contract should contain a version, the queried author-roster signature, covered author IDs, mapping warnings, and records with:

```text
id, source, source_url, doi, title, publication_year, publication_date,
type, authors[], member_ids[], venue, landing_page_url,
open_access_url, is_retracted
```

Preserve author order, retain authoritative source IDs, and store only information used by the site or required for traceability. Build personal/group indices from this file rather than maintaining duplicate edited bibliographies. Keep successful-refresh timestamps and per-person coverage in the snapshot envelope, outside the bibliographic records. Records remain deterministically serialized when unchanged, while the envelope records a real successful check. Operational failures belong in workflow/local reports and never advance success timestamps.

Provide `content/publication-overrides.yaml` for rare reviewed additions, exclusions, metadata patches, and explicit duplicate aliases. Manual additions need a stable local ID, member IDs, and a source URL. Apply overrides through one shared pipeline so an excluded record cannot reappear on someone's profile. This is an exception mechanism, not routine curation.

### 7.5 Durable cache and strictly explicit refreshes

Commit the generated `data/publications.json` to Git. Keep a schema-valid empty snapshot for bootstrap, clearly identified as not yet synced; never fabricate papers. The build and each personal profile read this file plus reviewed overrides. Neither rendering, searching publications, opening a profile, changing an author configuration, launching VS Code, nor `npm run dev/build/preview/check` may contact OpenAlex.

Only these entry points perform live publication reads:

1. Weekly `refresh-publications.yml` (full roster).
2. Its manual **Run workflow** action (all people or an explicit person-ID selection).
3. The documented local `update-publications.mjs` helper (same collector and validators).

Use this command contract:

```bash
npm run publications:list
npm run publications:setup
npm run publications:update -- --person example-researcher
npm run publications:update -- --person first-id --person second-id
npm run publications:update -- --all
npm run publications:update -- --person example-researcher --dry-run
# Equivalent easy-to-launch file:
node scripts/update-publications.mjs --person example-researcher
```

`publications:list` is offline. `publications:setup` explicitly creates `.venv/` and installs pinned Python dependencies; it does not query OpenAlex. An argument-free updater prompts for people only in an interactive terminal; noninteractive use without `--all` or `--person` fails with usage instructions. The wrapper validates selections before HTTP requests, loads the private local key only for this command, exports the canonical registry, and invokes the same Python collector used in Actions. `--dry-run` may call the API and use quota, but must not replace files. `sync:publications`, if retained for compatibility, is an alias for this explicit interface, not a hidden full refresh.

Local updates never commit, push, or open a PR automatically. Refuse to replace the tracked cache while checked out on `main`; explain how to switch to `dev`. Permit `--dry-run` on `main`. Warn before overwriting an uncommitted generated snapshot and support an explicit staging/output path for diagnosis. No forced branch switching, stash, reset, or credential printing.

Keep `OPENALEX_API_KEY` in ignored `.env.local` for the helper or in the process environment; Actions uses a protected, main-only automation environment secret. Do not put it in any `PUBLIC_` variable or browser bundle. Pin and document supported Node/Python versions at implementation.

### 7.6 Targeted refresh must preserve unrelated people

A one-person refresh is not a truncated full-lab refresh. Track the verified author-ID set and last successful refresh separately for each person in a `coverage_by_person` envelope. Also record `last_full_refresh_at`; a targeted refresh must not advance that field.

For selected people, fetch their complete author histories, establish mappings, and replace only their membership relationships with the validated results. Keep every unselected person's existing work memberships and coverage timestamps unchanged. A shared paper remains one record globally: its source metadata may legitimately improve during a targeted update, but this does not mean all coauthors were refreshed. Remove an obsolete selected-person association without deleting a paper still linked to an unselected person. Garbage-collect only records no longer required by any included mapping, while preserving separately applied manual additions/overrides.

Apply disappearance guards per selected person, not by comparing a one-person response with the entire lab bibliography. Resolve ambiguous mappings or fail the selected update safely. For a multi-person request, validate all selected results before promoting the candidate; failure leaves the original snapshot intact. A full refresh still replaces the eligible complete dataset rather than retaining wrong historical associations forever.

Changing `openalex_ids` produces a visible missing/stale-coverage warning until the next explicit refresh; it must not silently relabel old attribution as verified for the new identity. Unknown IDs/people, incomplete pagination, or missing API keys never erase cached data. Show per-person freshness on profiles and an honest full/partial-refresh description on the group page.

## 8. Live social APIs and external-blog collection

### 8.1 Bluesky: public live reads

Use the official AppView API:

```text
GET https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed
    ?actor=pontilgroup.bsky.social&filter=posts_no_replies&limit=10
```

Public AppView reads can be unauthenticated; verify the endpoint's actual response and browser CORS behavior during integration. The public host has its own caching, so describe this as **live/on-demand, possibly briefly cached**, not a guaranteed instantaneous stream. [S13, S23]

Fetch when the social section becomes visible, subject to the institution's privacy requirements, with an explicit refresh button and bounded timeout. Do not continuously poll in background tabs. Exclude reposts/replies using actual response fields; endpoint filters alone are not a guarantee about every feed item. Store at most a short in-memory/session cache, initially five minutes, to avoid repeated requests within a visit. No daily Git commit, repository social snapshot, or website rebuild is needed.

Render text, author, timestamp, original-post link, and supported optional media in a shared `SocialCard` component. Escape text; handle UTF-8 facet offsets correctly or initially render plain text plus the original link. Follow source labels/moderation constraints. No live request may block the rest of the homepage.

### 8.2 X: authenticated API through a narrow read proxy

X does provide a user-posts API. The supported integration is a backend request to `GET https://api.x.com/2/users/{id}/tweets`, using a verified account ID and bearer credentials. Resolve `PontilGroup` to its user ID once during setup; never invent that ID or repeatedly search by name. Request only fields needed for the card UI. [S24-S25]

The browser calls an IIT-approved endpoint such as `https://approved-api-host.example/social/x`; that endpoint calls X. A static GitHub Pages deployment cannot keep a bearer token secret or run this proxy. The service must be deployed separately, with its public URL configured in `content/social.yaml`. An API file committed inside an Astro static site is not an operational server. [S7]

X currently documents pay-per-use access. A developer account/app, the required read entitlement, and an explicitly approved spending limit are setup dependencies. Do not describe X reads as guaranteed free, buy credits, enable auto-top-up, or expose credentials to avoid this dependency. The OpenAlex free-tier constraint remains unchanged and does not imply X access is free. [S26]

Proxy requirements: fixed account and upstream endpoint (not an open URL proxy), allowlisted request parameters, output schema validation, no write APIs, no forwarded browser authorization headers, shared bounded cache, request coalescing, global quota/spend cap, rate limiting, timeouts, and a circuit breaker on quota/auth failures. Use a proposed ten-minute upstream cache, configurable to the approved budget. CORS is not authentication or a spending safeguard; internet clients can still call a public proxy. Return `fetched_at`, `expires_at`, and stale/unavailable status. Expire old content within the provider's permitted retention/deletion rules rather than showing it indefinitely.

Render X using the same website UI as Bluesky. Respect X display/attribution and developer requirements before launch. An official embed or direct link is a clearly labeled fallback only, not a replacement silently counted as completion of the requested API integration. Until access/proxy approval is available, show an unavailable state plus the profile link; other content and builds still work. [S27]

### 8.3 Public social configuration

```yaml
bluesky:
  enabled: true
  actor: pontilgroup.bsky.social
  max_items: 8
  session_cache_seconds: 300
x:
  enabled: false                   # Enable after approved proxy + API test
  handle: PontilGroup
  proxy_url: null                  # Public service URL, NEVER a secret
  max_items: 8
```

Secrets live only in the proxy's secret store. Use mock responses for PR/browser tests and local development by default; live local social requests are optional and must not be required for the local server to start. The development website must never submit test job applications to production or leak private server credentials.

### 8.4 External blog metadata: automated but build-independent

Unlike social content, persist blog-card metadata in `data/blog.json` so `/blog/` works without client JavaScript, cross-origin HTML access, or live source availability. Refresh once daily through `refresh-blogs.yml`, manually through **Run workflow**, or explicitly with `npm run blogs:update [-- --source <source-id>]`. Updates commit to `dev` and follow the same preview/PR release policy as publications.

For each configured source, discover RSS/Atom from actual advertised links; prefer a verified feed when available. Otherwise use a small, named HTML adapter for the observed blog listing, with saved fixtures and tests. Do not guess a feed URL and report success, repeatedly crawl unrelated pages, or rely on brittle selectors without a failed-parser state. Record the chosen adapter and verified endpoint in source configuration.

Collect only article URL, title, author name(s), optional date, optional article image/alternative text, source ID, and provenance. Follow only bounded, allowlisted article URLs to obtain missing metadata such as Open Graph images. Validate schemes, redirects, size/time limits, and image origins; do not fetch private-network addresses or execute imported scripts. Do not download full article bodies into the public website or reproduce excerpts by default.

An article image can be referenced remotely with an ordinary lazy-loaded image element when appropriate, or copied locally after permission. Do not make the static build download remote images every time. Missing, blocked, or unapproved images fall back to text-only cards. Do not substitute a profile avatar for an article image without labeling the different purpose.

Preserve each source's last-good entries on fetch/parser failure. A paginated/windowed feed must not erase historical posts merely because they leave its recent window: upsert discovered entries; prune only on confirmed removal/explicit override or a verified complete-source reconciliation. Keep independent source freshness and actionable errors. Manual `content/blog-entries/*.yaml` entries and `blog-overrides.yaml` pass through the same URL deduplication and rendering pipeline.

## 9. Career opportunities and applications

### Listings and instructions

List verified open positions with role, brief description, deadline when known, and official description/application links. Do not automatically treat a legacy job listing as still open. Show a clear no-openings state while retaining the instructions for prospective PhD applicants and open applications.

Separate general expressions of interest from formal applications. Where a call requires an official recruitment portal, say so and use that portal; emailing the PI must not be presented as completing the formal process.

### Required CV-upload path

A `mailto:` URL can prepare an email draft, but does not supply a portable mechanism to attach a selected CV or enforce its presence. It therefore **does not satisfy the required CV-upload functionality**. The mailto standard defines message addressing and draft fields, not a secure upload service. [S15]

**Preferred implementation:** the Careers page sends applicants to an IIT-hosted or IIT-approved hosted form. That service requires a CV upload, classifies the application, and emails Massimiliano Pontil at a separately verified mailbox. Use its supported field mapping rather than assuming that arbitrary URL parameters can configure email delivery.

An embedded/native form posting to an approved endpoint is an alternative only when IIT and the static host permit it. It must use the same server-side checks and actual service response. Do not add SMTP credentials to the site or use a public repository, GitHub issue, or Actions artifact as the inbox.

The submission contract includes applicant name, email, application type, optional position reference, a short message, and a required PDF CV. Initially propose a 10 MB limit, adjusted to the actual service's validated limit. Additional documents are optional unless an official call requires them.

Generate subjects **on the service**, for example:

```text
[CSML][PHD] Applicant Name
[CSML][POSTDOC][POSITION-REFERENCE] Applicant Name
[CSML][ENGINEER] Applicant Name
[CSML][OPEN] Applicant Name
```

Use a fixed validated recipient and allowlisted application types. Strip header-breaking characters and bound field lengths. Use the service's verified sender and the applicant email as validated Reply-To. The recipient receives the CV attachment; replacing it with an authenticated download link requires explicit acceptance of that delivery change.

Require server-side file presence, size and type checks, safe filenames, appropriate malware handling, abuse controls, private handling/storage, and an IIT-reviewed applicant privacy notice and retention process. The backend must not rely on the browser's `required` attribute or reported MIME type alone. OWASP describes the relevant file-upload safeguards. [S17]

Display an accurate accepted/failed state, prevent accidental duplicate sends where supported, and never show success before the service accepts the submission. Do not upload anything before the applicant submits. Do not send real applications during automated tests; use a designated test recipient and a harmless fixture in an explicitly authorized integration test.

### Launch dependency, not a hidden downgrade

No approved endpoint, mailbox, pricing arrangement, or retention policy was provided. Build and test the front-end integration contract, but mark production CV submission as blocked until these are configured and tested end to end. Do not assume a free managed-form plan supports attachments.

An email-draft mode may be offered as a clearly labeled temporary fallback requiring applicants to attach their CV themselves. It must not be reported as completion of the upload requirement. The main website can be deployed without an enabled application form, but the full requested Careers feature is not accepted until the CV-to-email path works.

## 10. Branch policy, GitHub Actions, and two-version deployment

### 10.1 Branch policy is enforceable configuration

- **`dev`** is the shared preview/integration branch. Team members commit content/media there, or merge a working-branch PR into `dev`. Never tell browser editors to accept GitHub's default `main` destination.
- **`main`** is the default and production branch. Changes enter it only by a **PR from `dev`**, after checks and preview verification. Configure an active ruleset requiring PRs, required checks, resolved discussions, no force pushes/deletion, and no ordinary admin/bot bypass. At least one approving review is the recommended release default. GitHub supports required PR/status rules; the repository must actually have them enabled. An `AGENTS.md` sentence alone is not enforcement. [S28]
- Add a required `release-source` check for PRs into `main`: same-repository head branch is `dev`. Protect workflow/security paths with CODEOWNERS review. Do not auto-merge a whole `dev` branch because a bibliography bot made its latest commit; unrelated editorial changes may be waiting there.
- Use merge commits for the long-lived `dev -> main` promotion so ancestry is retained. Do not require linear history while prescribing merge commits. Keep `dev` aligned by merging `origin/main` into it when needed; never force-reset the shared preview branch. Do not delete `dev` after releases.
- Bootstrap an empty repository's branch/workflow settings once with an authorized maintainer; enable protection immediately after the minimal initial setup. This is not a recurring production-push exception.

Production content and caches cannot change without the PR release path. Runtime social posts are an intentional exception because they are read from external accounts, not committed website edits. Daily rebuilding of already-approved date-sensitive content changes visibility according to those approved dates, not by fetching new editorial material.

### 10.2 URL and build contracts

| Environment | Exact content source | URL under the configured site base |
|---|---|---|
| Production | Validated `main` commit, including its own data cache | `/` |
| Shared development preview | Validated `dev` commit, including its own data cache | `/dev/` |
| Local live server | Local working tree | `http://127.0.0.1:4321/` |
| Local base-path test | Local working tree | `http://127.0.0.1:4321/dev/` |

The public preview is `https://<approved-host>/dev/` for root hosting, or `https://<owner>.github.io/<repository>/dev/` for a standard project Pages site. Keep `SITE_ORIGIN` and `SITE_BASE_PATH` separate; append `dev/` to the configured site base, not blindly to the domain root.

Use Astro's environment-dependent `base`, shared helpers based on `import.meta.env.BASE_URL`, and separate output/cache directories. Test internal links, portraits, fonts, CSS, scripts, dialogs, publication pagination, and fetch URLs under both bases. A content reference `/media/...` is resolved through this helper and must not escape to production when rendered in `/dev/`. [S29]

Every dev page has a visible **Development preview** banner, source revision/build timestamp, and `noindex` robots metadata. Exclude preview URLs from the production sitemap. A root robots disallow may be supplementary, but is not access control or a substitute for `noindex`. Draft/private data must not be exposed merely because the path says `/dev/`. By default drafts remain excluded in both public builds; local draft viewing is a separate explicit option.

Disable real application submission and production analytics in preview; offer a labeled sandbox only when configured. Production canonical URLs come from the production base. Do not register root-scoped service workers/cookies/storage that allow preview behavior to override production. Same-origin `/dev/` is a review convenience, not a security isolation boundary; do not publish arbitrary fork PR code there.

### 10.3 Why GitHub Pages needs one combined artifact

GitHub documents one Pages site per repository. For this project, use a **single combined Pages deployment**, not two independently replacing deployments. Build main and dev separately, then compose: [S7, S30]

```text
site-artifact/
  index.html                     # ONLY from the selected main build
  publications/ careers/ blog/ people/ media/ ...
  dev/
    index.html                   # ONLY from the selected dev build
    publications/ careers/ blog/ people/ media/ ...
  deployment-manifest.json       # main SHA, dev SHA, data hashes, build time
```

The main build must not emit the reserved top-level `dev/` subtree. The trusted composer copies only static output, rejects symlinks/path traversal, and never executes code from the output. A push to either branch replaces the intended version while preserving the other version in the same artifact.

Keep a last-successful deployment record containing both source SHAs and content/data hashes. Use the GitHub deployment record or the known HTTPS deployment manifest, validating referenced commits before rebuilding. Do not rely on expiring Actions artifacts as the only recovery mechanism. A failed changed-branch build leaves its last deployed version serving. A good main release must be able to reuse/rebuild the recorded last-good dev SHA rather than being blocked by a newer broken dev head (and vice versa). If a safe sibling version cannot be reconstructed, fail without replacing the live combined site.

### 10.4 Workflows and triggers

| Workflow | Trigger | Required behavior |
|---|---|---|
| `ci.yml` (name: `CI`) | **Every push to `main` and `dev`**, without path exclusions | Validate/test and build the affected exact revision using its saved caches and correct base. No live ingestion or deployment secrets. |
| `ci.yml` | PRs targeting `dev` or `main` | Validate proposed integration; test both URL bases. Required checks include `release-source` for main PRs. No writes or production credentials. |
| `ci.yml` | `workflow_dispatch` on dev | Explicit CI after bot data pushes, or manual retry. Validate branch and optional expected SHA. |
| `deploy.yml` | `workflow_run` after successful `CI` for same-repository main/dev push or approved dev dispatch | Run trusted coordinator from default branch `main`, select validated revisions, assemble and deploy the combined artifact. Never deploy fork/PR events. |
| `deploy.yml` | Daily `43 5 * * *` UTC; manual dispatch on main | Rebuild approved main and validated dev with saved caches to reevaluate date-sensitive news/openings; recovery. No publication, social, or blog ingestion. |
| `refresh-publications.yml` | Weekly `17 6 * * 1` UTC; manual dispatch on main | Trusted collector reads the dev roster/cache, performs full or targeted refresh, commits only generated publication paths to dev, explicitly dispatches dev CI. |
| `refresh-blogs.yml` | Daily `19 5 * * *` UTC; manual dispatch on main | Trusted collector reads dev source config/cache, refreshes blog metadata, commits only generated blog paths to dev, explicitly dispatches dev CI. |

Every push schedules the branch build; a failed build is reported, not deployed. Superseded revisions may be marked superseded for deployment, but a stale run must not overwrite a newer published version. Do not use commit-message skip tokens or path filters for normal main/dev changes.

`workflow_run` runs its workflow from the default branch and can have write privileges. Gate it on upstream success, repository identity, event type, and allowed branch before processing data. Build branch source in isolated read-only jobs; only trusted main-side compose/deploy code has Pages permissions. Never execute downloaded artifact scripts or untrusted PR code in a privileged job, and never restore an untrusted build cache into that job. [S31]

### 10.5 Bot updates and token-trigger behavior

A push made with `GITHUB_TOKEN` does **not** fire the ordinary push workflow. Therefore after committing a refreshed cache to `dev`, the refresh workflow explicitly dispatches `ci.yml` on `dev` with the expected new SHA; its successful CI completion triggers the trusted deploy coordinator. `workflow_dispatch` is supported even with `GITHUB_TOKEN`. If the dev head moved, validate/build the newer head rather than force-pushing or deploying the stale one. [S18]

Scope `actions: write` only to the dispatch job, `contents: write` only to the whitelisted generated-data commit job, and `pages: write`/`id-token: write` only to deployment. Keep source-build and external-fetch jobs free of unnecessary write credentials. Put the OpenAlex key in a protected automation environment restricted to main, not an unrestricted repository secret available to dev-edited workflows. Likewise restrict the Pages deployment environment to the trusted main coordinator. Checkouts used to execute branch build code use `persist-credentials: false`. Do not pass source secrets into reusable build jobs. Use trusted collector code from main and treat dev YAML/JSON as validated data, not executable instructions. Changed collector logic is tested with mocks first and becomes privileged automation only after review into main.

Serialize both refresh workflows with one `dev-data-writes` group. Capture dev HEAD, stage/validate candidate output, and push a normal fast-forward generated-data commit only if the input revision is still current. On a concurrent edit, refetch/revalidate with bounded retries; never reset, force-push, or discard the edit. All jobs report targeted people/sources, changed files, counts, last-success times, and the resulting source SHA.

A publication/blog update is now visible at `/dev/`, not at production. A member or maintainer opens/updates the `dev -> main` release PR, checks the preview, and merges when ready. Automated release PR creation is optional and does not authorize auto-merging. GitHub currently requires approval for certain `GITHUB_TOKEN`-created PR workflow runs; document this if enabling that convenience. [S18]

### 10.6 Deployment ordering and failure handling

Use one concurrency group for **all combined deployments**, not independent production/dev groups that race to replace the same site. Do not cancel an active final publish halfway through. Record exact selected SHAs and hashes; recheck freshness/selected revision eligibility before publish. Coalesce stale pending requests into a reconciliation of current validated heads, and retain last-good sibling revisions explicitly when their newer heads fail.

Publish a job summary with production and preview URLs, selected revisions, cache ages, and any retained old revision. A refresh failure must not advance freshness or create a success claim; a validation/deployment failure leaves the last working website intact. Recovery rebuilds recorded source commits and their own caches, not an unreviewed fresh API response.

Pin Actions to verified immutable revisions and package dependencies to lockfiles. Document repository/host plan limits, disabled schedules, manual recovery, and ownership. Scheduled workflows can be delayed/dropped and can be disabled after prolonged public-repository inactivity; do not promise indefinite zero maintenance. Do not reintroduce hidden OpenAlex catch-up from daily deployment/builds: recovery is the dedicated refresh workflow. [S19]

## 11. README, local server, and VS Code experience

### 11.1 Member-facing README

Use the correct filename **`README.md`**. Include explicit browser-only tutorials: select `dev`; choose the content file or copy a template; edit fields/text; commit to dev (or PR into dev); wait for the build; open `/dev/`; inspect the revision shown; open `dev -> main` PR; pass checks/review and merge; confirm production.

Document each editable file, minimum required fields, valid roles, quoted dates, optional omissions, and image paths. A user adding a profile/news item must never need HTML/CSS/JS. Explain the external-blog card fields, automated source configuration, and that a link points to the **article**, not just its blog homepage.

Document full and targeted publication refreshes, readable person IDs, one-time Python/key setup, manual GitHub Actions inputs, local helper paths, `--dry-run` quota use, generated-file restrictions, per-person versus full freshness, and the fact that production waits for PR merge. Do not imply a Scholar URL configures OpenAlex automatically. Include error and recovery examples.

### 11.2 Local live preview

After explicit dependency setup:

```bash
npm ci
npm run dev
```

The standard local URL is `http://127.0.0.1:4321/`. `npm run dev:staging` runs the same app at `/dev/` to test prefixed URLs. Provide `npm run build`, `npm run preview`, `npm run build:staging`, and `npm run preview:staging`; a static preview is not the live-reloading editing server. Print the actual URL/port and Ctrl+C stop instructions.

Use Astro's development server, not the generic VS Code Live Server extension. The launcher checks prerequisites and shows the exact explicit setup command if missing. It must not automatically install dependencies, retrieve publications, switch branches, open a public network interface, or publish changes. Bind to loopback by default and handle port conflicts without killing unrelated processes.

Live reload must cover content YAML/frontmatter/Markdown, new/deleted files, local image changes, and successful cache-file updates, not only files in `src/`. Add tested watcher/asset-preparation integration where the framework does not detect these paths automatically. No live API key is needed for normal editing; optional social cards can use fixtures.

### 11.3 VS Code automatic startup

Install `.vscode/tasks.json` in the implemented repository. A copyable example is supplied at `examples/.vscode/tasks.json`. Its `CSML: Start live preview` task runs `npm run dev` with `runOptions.runOn: folderOpen`, a single task instance, and a dedicated terminal. Add a second nonautomatic task with a person-ID prompt for an explicit publication refresh.

VS Code requires a **trusted workspace** and the user's permission for automatic tasks. Never disable Workspace Trust, set global security exemptions, or claim that opening an untrusted folder can safely bypass the prompt. Explain the one-time permission step, **Tasks: Manage Automatic Tasks**, the manual **Tasks: Run Task** fallback, and how to terminate/disable the server. Opening a single file is not the same as opening the project folder. [S32-S33]

Record what is actually delivered: this handoff supplies the documents/templates/task example; the application scripts, tested watcher behavior, GitHub rulesets, workflow files, hosting, and proxy setup are implementation work. Remove README's implementation-status notice only after verifying its commands in the actual repository.

## 12. Delivery phases and acceptance gates

### Phase 0 - Inventory and release policy

Inspect the repository and original media; establish real content/asset inventory; record origin/base, hosting authority, main/dev branches, release reviewers, author-key ownership, X access/proxy dependencies, and CV service requirements.

**Accepted when:** sources are inventoried, main PR-only enforcement is configured or explicitly recorded as not yet applied, and no unknown person/author ID/service is fabricated.

### Phase 1 - Editable content, local preview, and shell

Create Astro static output, shared schemas, source-path helpers, templates, people/news rendering, navigation including Blog Posts, source-preserving media preparation, committed empty/fixture caches, and member README. Implement local launchers/watchers and VS Code task configuration.

**Accepted when:** a clean dependency-installed checkout runs without API keys, opening an approved/trusted workspace starts the live server, profile/news edits and new images reload correctly, and drafts remain excluded from public builds.

### Phase 2 - Two-branch builds and preview infrastructure

Implement push/PR CI, trusted combined deployment, root and `/dev/` bases, preview banner/noindex, exact revision manifest, protected main, and read-only/sandbox preview application behavior.

**Accepted when:** a dev content change affects `/dev/` only; a reviewed PR merge changes production; either rebuild preserves the sibling site; a failed build retains the last good version; real direct main pushes are rejected; bot pushes explicitly lead to CI/deployment.

### Phase 3 - Approved homepage migration and profiles

Reconcile team photo, portraits, roles, PI, contact location, research, project/funder assets, and openings. Build responsive homepage sections, shared profiles, deep links, and accessible motion/dialog behavior.

**Accepted when:** the full migration inventory is reconciled and every original homepage requirement has a real implementation or an explicit missing-data state, including mobile and keyboard behavior.

### Phase 4 - Publication cache and targeted refresh

Implement safe free-tier collection, per-person membership/coverage, deterministic normalized records, overrides, static group/personal lists, local interactive/CLI update helper, and weekly/manual dev-only refresh workflow.

**Accepted when:** a single-person update preserves unrelated memberships and freshness, a shared work appears once globally and on correct profiles, API failure is atomic, unknown person selection fails early, no ordinary build contacts OpenAlex, and a refresh does not change production before PR merge.

### Phase 5 - External blog index and live social APIs

Implement daily/explicit feed-or-tested-HTML metadata imports for the two requested blogs; shared external-link cards; native-styled Bluesky API results; and the approved X proxy/API adapter. Do not substitute blog homepages for article entries or claim an X link is API completion.

**Accepted when:** cards show title, author, optional image, and the actual external article link; no local full article is hosted; source outages preserve cards; social requests need no rebuild; credentials are absent from browser/artifacts; rate/quota failures leave the homepage useful. X completion stays blocked until real access/proxy approval and tests succeed.

### Phase 6 - Careers, testing, and handover

Implement/test the approved CV submission path and organized subjects, finish accessibility/base-path/failure tests, exercise maintainer recovery, and test browser-only edits with a team member. Never send real applications in automated tests.

**Accepted when:** production CV handling meets the original requirement or remains explicitly blocked; README commands and workflows match reality; source revisions/last-success ages are visible; release/recovery instructions have been exercised.

## 13. Test matrix and command interface

| Area | Required checks |
|---|---|
| Editorial content | Minimal/full person and news; omitted optional fields; shared styles; draft exclusion; invalid YAML/URLs/ORCID/roles; duplicate IDs; image existence; no user-authored layout required. |
| Original homepage | Hero/mobile crop; PI single record; research 0/1/4/5/8 in two desktop rows; no page overflow; news scrolling; grouped people; project pause/reduced motion; contact. |
| Profiles | Same records/overrides as group list; correct base; on-demand dialog; focus/Escape/Back/Forward; deep links, modified clicks, and JS disabled. |
| Publication ingestion | Pagination/cursor loops; 429/quota/retry cap; malformed/empty/large-drop data; truncated author lists; deterministic records; atomic failure; manual overrides. |
| Targeted refresh | One/multiple people; shared work retained; removed attribution; unselected membership/timestamps unchanged; global full timestamp unchanged; no-ID/changed-ID warning; early invalid selection; dry-run writes nothing; refuse tracked writes on main. |
| Cached builds | Block OpenAlex and blog-origin networks during build/dev/CI; missing key does not break them; author-config changes do not fetch; cache is from the exact branch commit. |
| Blogs | Both real listings; advertised feed discovery or tested adapter; title/byline/URL required; optional/broken image; relative/canonical URLs; pagination/window retention; duplicate link; partial-source failure; manual additions/overrides; no local article-body route. |
| Live social | Actual response adapter; empty/error/timeout; bounded refresh; hidden-tab behavior; attribution; token scan; proxy allowlist/quotas; CORS failure; no source needed for static build. |
| Release | Direct main push rejected; PR must originate dev; no bypass; reviewer/check gate; no implicit promotion of pending dev edits; every main/dev push builds including data-only and README-only pushes. |
| Combined deploy | Root and repository base paths; dev links/assets/dialogs remain prefixed; sibling retained; concurrent events; stale deployment prevented; old dev cannot block valid main release; exact SHA/hash manifest; safe rollback. |
| Automation security | Read-only PR jobs; trusted collector/coordinator; no fork deployment; no executing artifacts with write tokens; GITHUB_TOKEN push explicitly dispatches CI; generated write allowlist; concurrent dev edit preserved. |
| Local/VS Code | Fresh dependencies; missing prerequisite message; allow/deny trust/tasks; reopen starts one server; occupied port; Ctrl+C/terminate; content/image/cache reload; no automatic install/API calls; no public bind by default. |
| Careers | Required CV/server validation; safe subject/recipient handling; actual delivery; false-success prevention; preview cannot submit production applications; no private public artifacts. |

Measure representative mobile/tablet/desktop widths, keyboard flow, reduced motion, and accessible names/contrast. Preserve original performance targets: first-party initial homepage JS around 50 KB compressed, optimized hero around 400 KB where quality permits, lazy off-screen media, and no full bibliography payload on the homepage. Optional social scripts/data load after the section is needed.

Required commands to implement and test, not commands claimed present in this documentation-only handoff:

```text
npm ci
npm run dev
npm run dev:staging
npm run content:validate
npm run content:export-authors
npm run check
npm test
npm run build
npm run build:staging
npm run preview
npm run preview:staging
npm run test:e2e
npm run validate:production
npm run publications:setup
npm run publications:list
npm run publications:update -- --person <person-id>
npm run publications:update -- --all
npm run blogs:update
```

`npm test` runs both front-end and Python collector tests through a documented wrapper. Python/test/browser dependencies require explicit setup. No `prebuild`, `postinstall`, `dev`, or VS Code task may hide a publication refresh. Blog/source collection is likewise explicit. Live social components are separate runtime behavior, not a build dependency.

## 14. Outstanding setup inputs and launch constraints

Required inputs: actual repository/media inventory; host/origin/base and domain authority; branch-ruleset capability and authorized maintainers; approved portraits/team photo and accurate source content; verified OpenAlex IDs/free key; approved X app/read access/budget and separately deployed proxy; verified CV recipient, approved upload service, and privacy/retention rules.

The supplied package is an implementation handoff, not a completed website or applied GitHub configuration. Blog sources and platform docs were inspected; no actual repository was modified, no API key used, no deployment performed, and no production form/API integration tested. Unknown facts remain draft fields or explicit dependencies.

Main PR-only publishing intentionally means a weekly cache refresh is **automatically ready for review on dev**, not automatically visible in production. Enabling auto-merge would be a separate explicit governance choice with generated-only diff safeguards; it must never merge unreviewed editorial/code changes as a side effect.

## References and verification notes

The source guide bundled under `docs/openalex-free-tier-guide.md` is the user's supplied document, preserved unchanged. Its minimal push-to-current-branch example is reference material only and is superseded by this plan's dev-only refresh and PR-only production policy. Other retained original content requirements remain in force. External documentation below was consulted on **13 October 2026**. Recheck API and platform contracts when implementing; pin working dependencies and test the actual integration rather than assuming documentation examples are timeless.

- **S1 - Legacy CSML homepage:** https://csml.iit.it/home
- **S2 - Full legacy people directory:** https://csml.iit.it/people-details?center=&facility=&job=&line=372
- **S3 - PI profile:** https://csml.iit.it/people-details/-/people/massimiliano-pontil
- **S4 - Funded-projects listing:** https://csml.iit.it/funded-projects
- **S5 - Astro content collections:** https://docs.astro.build/en/guides/content-collections/
- **S6 - Astro on GitHub Pages:** https://docs.astro.build/en/guides/deploy/github/
- **S7 - GitHub Pages overview:** https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- **S8 - OpenAlex pricing:** https://help.openalex.org/access/pricing/
- **S9 - OpenAlex example costs:** https://help.openalex.org/access/example-costs/
- **S10 - OpenAlex authentication and limits:** https://help.openalex.org/api/authentication/
- **S11 - OpenAlex pagination:** https://help.openalex.org/api/paging/
- **S12 - OpenAlex authorships and truncation:** https://help.openalex.org/data/authorships/
- **S13 - Bluesky official API reference:** https://endpoints.bsky.app/ ; feed guide: https://bsky.network/docs/bluesky-api/viewing-feeds/
- **S14 - Official X timeline embedding:** https://help.x.com/en/using-x/embed-x-feed
- **S15 - Mailto standard, RFC 6068:** https://www.rfc-editor.org/rfc/rfc6068.html
- **S16 - W3C accessible carousels:** https://www.w3.org/WAI/tutorials/carousels/
- **S17 - OWASP file-upload safeguards:** https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **S18 - GitHub token-trigger behavior:** https://docs.github.com/en/actions/concepts/security/github_token
- **S19 - Scheduled workflow behavior:** https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- **Additional OpenAlex contracts:** https://help.openalex.org/api/filtering/ ; https://help.openalex.org/api/selecting-fields/ ; https://help.openalex.org/data/works/corpus/
- **Hosting allowance verification:** https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

### Revision 2 references (verified 13 October 2026)

- **S20 - Vladimir's blog listing:** https://vladi-slk.github.io/blog.html
- **S21 - Pietro's article archive:** https://pietronvll.github.io/archive.html
- **S22 - Pietro's author identity:** https://pietronvll.github.io/
- **S23 - Bluesky API hosts/public reads:** https://bsky.network/docs/api-directory/
- **S24 - X user-post API:** https://docs.x.com/x-api/users/get-posts
- **S25 - X bearer authentication:** https://docs.x.com/fundamentals/authentication/oauth-2-0/bearer-tokens
- **S26 - X pricing:** https://docs.x.com/x-api/getting-started/pricing
- **S27 - X developer guidelines:** https://docs.x.com/developer-guidelines
- **S28 - GitHub branch rules:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- **S29 - Astro base and site options:** https://docs.astro.build/en/reference/configuration-reference/
- **S30 - GitHub Pages custom artifact workflows:** https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- **S31 - GitHub workflow_run and schedule events:** https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- **S32 - VS Code tasks/automatic tasks:** https://code.visualstudio.com/docs/debugtest/tasks
- **S33 - VS Code Workspace Trust:** https://code.visualstudio.com/docs/editing/workspaces/workspace-trust
