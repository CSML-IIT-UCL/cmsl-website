# CSML website - team editing guide

**Implementation handoff, revision 2 - 13 October 2026.** This is the README to install with the new website. The documents, content templates, and VS Code task example are supplied here; the application commands and GitHub workflows described below must still be implemented and tested in the real repository. This package alone does not run a website. Remove this notice only after those checks pass.

## Which file do I edit?

Most changes require only plain text and a few fields. The website applies its own layout, fonts, colors, and card styles automatically. You do not need to write HTML, CSS, or JavaScript.

| Change | File or folder |
|---|---|
| My profile, links, portrait, role, biography | `content/people/<my-person-id>.md` |
| Add a person | Copy `content/people/_template.md` (or `templates/person.md`) into `content/people/` |
| Add a news item | Copy `content/news/_template.md` (or `templates/news.md`) into `content/news/` |
| Team description | `content/about.md` |
| Research area | Copy `content/research/_template.md` into `content/research/<id>.md` |
| Funded project and funding logos | Copy `content/projects/_template.yaml` into `content/projects/<id>.yaml` |
| Applied-ML collaboration card | Copy `content/collaborations/_template.yaml` into `content/collaborations/<id>.yaml` |
| Open or close a position | Copy `content/openings/_template.md` into `content/openings/<id>.md` |
| Add an external article card manually | Copy `content/blog-entries/_template.yaml` into `content/blog-entries/` |
| Add a blog to automatic discovery | `content/blog-sources.yaml`; see `templates/blog-source.yaml` |
| Exceptional publication-source correction (maintainers only) | `content/publication-overrides.yaml` |
| Correct/exclude an imported blog entry | `content/blog-overrides.yaml` |
| Site contacts, navigation, PI selection | `content/site.yaml` |
| Public social account/API-proxy settings | `content/social.yaml` |
| Approved original images | `media/people/`, `media/research/`, `media/funders/`, etc. |

Every `content/<type>/` folder also keeps its own `_template.*` file (e.g. `content/people/_template.md`) with every field commented. Files starting with `_` are never built or validated as real content, so you can copy one in place without hunting through `templates/` first; `templates/` holds the same files for reference.

Do **not** edit `data/publications.json` or `data/blog.json` by hand. They are generated caches. Do not edit `src/` just to change a biography or announcement. The principal investigator uses the same person record as their normal profile.

## The publishing rule: dev, preview, then PR

```text
Edit -> commit to dev -> automatic build -> inspect /dev/
     -> pull request dev to main -> checks/review -> merge -> production
```

`main` is the default repository branch, but **it is not the editing branch**. Never push directly to it. This includes generated publication updates. Main is protected and accepts changes through PRs only.

A development preview is published at the website base plus `/dev/`. For example, a custom root domain uses `https://<host>/dev/`; a project Pages site uses `https://<owner>.github.io/<repository>/dev/`. The actual links must be filled in by the maintainer during setup and appear in deployment summaries. Production has no added `/dev/` segment.

The preview is public. Its banner/noindex setting does not make confidential content safe to upload. Do not put applicant CVs, private drafts, access keys, or other sensitive files in the repository. Draft entries are excluded from both public builds by default.

### Edit through the GitHub website

1. Open the repository and change the branch selector from **main** to **dev** before editing. Check the branch shown above the file.
2. Open your content file and choose the pencil/edit action. For a new entry, copy the appropriate template into its content folder and choose a unique filename/ID.
3. Change the fields and text; keep the YAML delimiters/indentation intact. Commit to **dev** with a descriptive message. With no direct write access, create a branch/PR targeting **dev**, not main.
4. Open **Actions** and check the `CI` and subsequent deployment result. Every dev push schedules a build, including image-only, data-only, and documentation changes. A failed build leaves the previous preview online; fix the stated error and push again.
5. Open `/dev/`, check the revision shown in the preview banner, and inspect the affected content on desktop and mobile. A page that still shows an older revision is not evidence your latest change worked.
6. Open a pull request with **base: main** and **compare: dev**. List what changed and confirm preview verification. The maintainer checks the whole diff, waits for required checks/review, and merges with a merge commit. Do not delete the shared dev branch after release.
7. The merge updates main and automatically builds/deploys production. Check its deployment summary. Do not assume production changed merely because a PR was opened or an Action refreshed dev data.

The shared dev branch may contain other people's changes. Do not merge the entire release without reviewing them. A local change or dev commit is not a production change.

## Edit or add a profile

Find your stable ID in `content/people/`; the filename and frontmatter `id` must match. Copy `templates/person.md` for a new person. The template has all supported optional fields and comments.

A small profile looks like this:

```yaml
---
id: example-researcher
name: Example Researcher
draft: true
role: postdoc
role_label: Postdoctoral Researcher
status: active
photo: null
nationality: null
iit_profile: null
personal_website: null
orcid: null
scholar_url: null
github_url: null
linkedin_url: null
x_url: null
bluesky_url: null
current_affiliation: null
openalex_ids: []
publications:
  enabled: true
  include_in_team_list: true
  start_of_affiliation: null
  end_of_affiliation: null
---
Write a short research biography here.
```

Replace the example identity, fill real fields, and set `draft: false` when ready for public preview/review. Leave absent optional fields `null` or omit them as shown in the full template. Use `[]` for empty lists. Never paste placeholder author IDs into a real record.

Valid main role keys are `senior_academic`, `postdoc`, `phd_student`, and `research_engineer`. Additional supported categories are `affiliated_researcher` and `research_support`. `role_label` is your displayed job title; it need not exactly repeat the group label. Membership `status` is `active`, `alumni`, or `affiliated`. Alumni are grouped separately on the homepage under "Alumni", regardless of their former `role`.

The primary external website button uses `personal_website`, or falls back to `iit_profile`. Missing links do not produce empty buttons. `orcid`, `scholar_url`, `github_url`, `linkedin_url`, `x_url`, and `bluesky_url` each render a dedicated app icon when set, and simply do not render when left `null`. Your ORCID, Scholar URL, and OpenAlex IDs serve different purposes: a Scholar link does not import your publications. Have a maintainer verify the OpenAlex identity from ORCID, affiliation, and known publications. Multiple verified IDs are supported when OpenAlex split one person across records.

`nationality` is optional and purely decorative: a two-letter ISO 3166-1 alpha-2 code (e.g. `IT`, `CO`) rendered as a small flag on the bottom-right corner of your portrait, on the homepage card, the in-page panel, and your profile. Leave it `null` to show no flag. The code must already be listed in `src/lib/nationality.ts`; ask a maintainer to add a new country before using its code.

`current_affiliation` only applies to alumni (`status: alumni`): it is the person's current employer/institution, shown on their alumni card and profile above their past CSML `role_label`. Leave it `null` (never guessed) until a maintainer verifies it; the site shows an honest "not yet verified" placeholder instead of fabricating one.

For an alumnus, explicitly decide whether publications remain collected (`publications.enabled`) and whether they count toward the shared team bibliography (`include_in_team_list`), unless the team has agreed otherwise. `start_of_affiliation` and `end_of_affiliation` (plain years, e.g. `2022`/`2025`) scope *which* of a person's works count toward the shared `/publications/` team pool: only works published inside that window are included there. Leaving both `null` means no restriction. This never affects the person's own `/people/<id>/` profile, which always shows their complete publication history regardless of these bounds.

### Add a portrait

Upload an approved picture to `media/people/<my-person-id>.jpg` on dev, then set:

```yaml
photo: /media/people/example-researcher.jpg
photo_alt: Portrait of Example Researcher
```

The website resolves that path correctly in production and under `/dev/`; do not prepend `/dev` yourself. Keep existing official IIT/CSML logos unchanged. Missing portraits have a neutral fallback. Do not upload an image without permission to republish it.

Saving a profile automatically updates its group card, dedicated profile, and in-page panel from the same content record. Publication records do not refresh merely because you changed the profile or an author ID; use the explicit workflow below when needed.

## Add a news item

Copy `templates/news.md` to a filename such as `content/news/2026-10-13-example-announcement.md` and fill the fields:

```yaml
---
id: example-announcement
title: Example announcement
draft: true
published_at: '2026-10-13T09:00:00+02:00'
event_date: null
pinned: false
link: null
image: null
image_alt: null
---
Write the short announcement here. No HTML or layout code is needed.
```

Use a unique ID, an actual date/time with offset, and `draft: false` when ready. A future `published_at` means not yet published. `event_date` describes when an event happens; it does not replace the date the news should appear. Add an optional HTTPS link for details. `image` is an optional `/media/...` path (for example a funder or award logo) shown above the announcement; set `image_alt` whenever `image` is set. The shared news component handles formatting and scrolling.

## Blog Posts: links to externally hosted articles

This tab is a **list of individual articles**, each with its title, author name, optional image, and a direct link to the original externally hosted article. It does not host full copies of articles or just link to authors' blog homepages.

Initial sources are Vladimir R. Kostić's listing at `https://vladi-slk.github.io/blog.html` and Pietro Novelli's archive at `https://pietronvll.github.io/archive.html`. The seeded source example keeps feed URLs unset until verified; the collector must use a verified feed or a tested listing adapter. The source pages and author attribution were inspected for the implementation plan. See its references S20-S22.

### Add one article manually

Copy `templates/blog-entry.yaml` to `content/blog-entries/<entry-id>.yaml`:

```yaml
id: example-article
draft: true
title: Example article title
author: Example Researcher
person_id: null
url: https://example.org/blog/example-article/
published_at: null
image: null
image_alt: null
```

Replace `url` with the **article URL**, not the archive/homepage. Fill a real title and author and set `draft: false`. The date and image are optional; no image produces a text-only card. A `person_id` can connect the byline to an existing team profile. Do not copy the article body into this file.

### Automatic discovery

Add a source through `content/blog-sources.yaml`, following `templates/blog-source.yaml`. A verified RSS/Atom feed is preferred. When none is available, the source needs a supported, tested HTML adapter; ask the maintainer rather than guessing a feed address.

The daily blog Action updates the cached article index on dev. An explicit local refresh is:

```bash
npm run blogs:update
npm run blogs:update -- --source vladimir-kostic
```

A manual refresh is also available in **Actions -> Refresh blog entries -> Run workflow**. Run its trusted workflow from main; it reads/writes dev content and never commits to main. Preview and release the changes by PR as usual. A failed source import preserves its prior entries. Normal page builds do not fetch these websites.

## Publications: cached, with explicit refresh commands

The group list and personal profiles use a tracked cache sourced directly from each person's verified OpenAlex author ID. The collector queries that author ID, never a name search. Viewing pages, starting the local server, editing an author ID, or rebuilding does not call OpenAlex; an explicit refresh updates the cache. This keeps GitHub Pages static and repeatable and preserves working pages during an API outage.

OpenAlex is the publication source of record. Team members should correct their publication list in OpenAlex and then request a refresh; they should not maintain a second bibliography in this repository. `content/publication-overrides.yaml` is reserved for exceptional, reviewed source errors or exclusions that cannot be corrected normally in OpenAlex. Today only `exclusions` are supported: each entry unlinks one person from one OpenAlex work (for example when OpenAlex merged an unrelated namesake into a member's author profile) and takes effect at the next build, on every page, without a cache refresh.

The team publications page can be sorted by date or by citation count. Citation counts come from OpenAlex and are used only for ordering; they are never displayed because OpenAlex undercounts compared with other indexes.

The shared `/publications/` page only counts a person's works toward that common pool within their `start_of_affiliation`/`end_of_affiliation` window (see "Edit or add a profile" above); their own `/people/<id>/` profile always shows their complete history regardless of that window.

The weekly Action performs a full refresh using the configured verified author IDs and free API plan. It writes to **dev**; a release PR is still needed for production. The implementation follows the supplied [OpenAlex guide](docs/openalex-free-tier-guide.md), with the stricter release/cache rules in [the plan](IMPLEMENTATION_PLAN.md).

### Refresh through GitHub Actions (no local installation)

1. Open **Actions -> Refresh publications -> Run workflow**. Choose **main** for the trusted workflow definition; the workflow itself always targets **dev** for data.
2. Choose scope **selected** and enter one or more stable person IDs, or deliberately choose **all**. The form must not accept an ambiguous name as an author identity. The implementation accepts comma-separated person IDs and validates them before querying.
3. Leave unusual drop-acceptance overrides disabled unless a maintainer has investigated a known correction. Run the workflow and read its summary.
4. On success, the Action commits the validated cache to dev and explicitly starts dev CI. Check `/dev/publications/` or `/dev/people/<id>/`, including the actual refresh time and source revision.
5. Release through the normal dev-to-main PR. API/validation failure preserves the previous cache. No direct main write is permitted.

A bot push made with GitHub's default workflow token does not itself trigger normal push CI; the explicit dispatch is intentional. See implementation-plan reference S18.

### Set up local publication refresh once

Normal content editing requires Node dependencies only. Publication collection additionally needs the supported Python version recorded in `.python-version`.

```bash
npm ci
npm run publications:setup
```

The setup command creates `.venv/` and installs pinned collector dependencies. It does not fetch publications. Configure `OPENALEX_API_KEY` in ignored `.env.local` (or your shell environment). Use a free lab-controlled OpenAlex key; never commit a key, put it in YAML, or expose it with a `PUBLIC_` name. No billing or prepaid credits are needed for the intended OpenAlex setup. Other applications sharing the key also use its allowance. Without a key, add `--anonymous` to an update command to use OpenAlex's small free keyless daily allowance (no billing); a full `--all` refresh needs only a few dozen requests.

The helper validates these prerequisites and reports what to fix. It must not silently install packages just because you opened the workspace.

### Refresh one person or a selected group locally

Start on dev. List the real person IDs without an API call:

```bash
npm run publications:list
```

Then use the ID from that output, not a guessed name:

```bash
npm run publications:update -- --person example-researcher
npm run publications:update -- --person first-id --person second-id
```

For the complete roster, deliberately choose:

```bash
npm run publications:update -- --all
```

The easy-to-launch file exposes the same interface:

```bash
node scripts/update-publications.mjs --person example-researcher
```

Running that helper with no arguments in an interactive terminal opens a person selector. Noninteractive use requires an explicit selection. A validation-only candidate can be fetched with:

```bash
npm run publications:update -- --person example-researcher --dry-run
```

**Dry-run still calls the API and uses quota; it only prevents cache replacement.** A targeted refresh keeps other people's memberships and freshness unchanged. A shared paper remains deduplicated, though source metadata for that shared paper can improve. The global full-refresh timestamp advances only after a successful full refresh.

The local helper does not commit or push. Inspect the summary and diff, check your local profile, then explicitly commit the generated file to dev:

```bash
git diff -- data/publications.json
git add data/publications.json
git commit -m "Refresh publications for selected members"
git push origin dev
```

These commands assume you are already on dev with only the intended change staged. Do not use `git add .` blindly or overwrite other work. The helper refuses tracked-cache replacement on main and warns before overwriting uncommitted generated changes. Keep identity corrections and approved overrides in the editable configuration files, not generated JSON.

### Interpreting freshness and errors

A profile reports its own last successful refresh. The group page distinguishes a complete-lab refresh from a partial update. No verified OpenAlex ID means "not linked", not "this person has no publications". Changing IDs marks coverage stale until explicitly refreshed.

For an unknown person ID, fix the selection before retrying. For a missing key, configure the local environment/protected automation-environment secret. For rate-limit, quota, timeout, suspicious deletion, or malformed-data errors, retain the last-good cache and read the report. Never bypass the drop guard by deleting the old cache. Maintainers can investigate and explicitly authorize a legitimate correction.

## Other content updates

For a research area, copy `content/research/_template.md` (or `templates/research.md`), fill the title/body, and optionally set media/alt text. Images use a common frame; choose `contain` for a diagram whose labels would be cropped. Animated media needs a static poster and motion controls supplied by the UI.

For a project, copy `content/projects/_template.yaml` (or `templates/project.yaml`), fill its real project link, status, and funder identity. Use approved funder logos. Mark completed projects accurately. For an opening, copy `content/openings/_template.md` (or `templates/opening.md`) and use the official call/application URL. Set status to closed or use the actual deadline. A general email expression of interest is not a substitute for a formal recruitment portal.

For an applied-ML collaboration card (the horizontally scrolling strip under Research), copy `content/collaborations/_template.yaml` (or `templates/collaboration.yaml`). Fill in the real PI name, lab name, and a verified `lab_url` — published entries require it. `lab_logo` is optional; omit it to fall back to the lab's name as text, as several partner groups have no distinct logo beyond their host institution's own mark. Never invent a PI, lab, or link; leave `draft: true` until a maintainer verifies the collaboration.

All these edits use dev, preview, and a main PR. Do not change the application service/recipient as an ordinary content edit without the responsible maintainer's review.

## Live social feeds

Bluesky posts are read in the visitor's browser at visit time, lazily once the Updates section scrolls into view - never during the site build. Settings live in `content/social.yaml`:

```yaml
bluesky:
  enabled: true
  actor: pontilgroup.bsky.social
  max_items: 8
  session_cache_seconds: 300
```

It calls the public `app.bsky.feed.getAuthorFeed` API directly (no credentials, no proxy), filters out replies/reposts, caches results in the visitor's session for `session_cache_seconds`, and renders through the shared social-card list. If the feed can't be reached, the panel shows a retry button and a direct link to the profile; the rest of the page is unaffected.

There is no live X feed. X's read API has no free tier, and a static GitHub Pages site can't keep a paid API's bearer token secret without a separately hosted proxy service - that's a bigger, costed decision than a content edit, so the homepage only links directly to the X profile instead. API credentials never belong in content files or browser code. Local/CI builds and tests never need live credentials.

## Start a live local server

After cloning the real implemented repository, use its pinned Node version. Check that you have no uncommitted work before switching branches:

```bash
git status
git switch dev
git pull --ff-only origin dev
npm ci
npm run dev
```

If the local dev branch does not yet exist, use `git switch --track origin/dev`. If the pull cannot fast-forward, stop and resolve it with the maintainer; do not force-reset shared work.

Open the URL printed in the terminal, normally **`http://127.0.0.1:4321/`**. Edits to content, local media, and source code should reload automatically. Successful explicit publication updates should also appear without manually restarting. Stop with **Ctrl+C**. Opening this server never publishes changes or refreshes publications.

Use the same site under the staging prefix when checking links/assets:

```bash
npm run dev:staging
```

Its normal local URL is **`http://127.0.0.1:4321/dev/`**. Do not run both servers on the same port. A port-conflict error is not permission to kill an unrelated process; stop your previous server or use the documented port override.

To inspect a built static site instead of live-editing it:

```bash
npm run build
npm run preview
```

Or test the staging build:

```bash
npm run build:staging
npm run preview:staging
```

Use the URL printed by the preview command. Static preview serves the last build; rebuild after edits. Neither command downloads new publications/blog posts. Internet access may still be needed for the initial explicit dependency installation, and optional live social widgets may make runtime requests.

## VS Code: start the server when opening the project

The repository includes `.vscode/tasks.json`.

After initial `npm ci`, open the **project folder** in VS Code, not just a single file. Trust the workspace only after checking the repository. When VS Code asks whether automatic tasks are allowed, allow them for this project. The **CSML: Start live preview** task then starts the server in a dedicated terminal on later folder opens.

VS Code will not automatically execute tasks in an untrusted workspace. Do not disable Workspace Trust or globally loosen security to bypass this. Use **Tasks: Manage Automatic Tasks** to change permission, **Tasks: Run Task -> CSML: Start live preview** to start manually, and **Tasks: Terminate Task** or Ctrl+C to stop it. Task behavior is documented in implementation-plan references S32-S33.

The task runs only the local server. It never installs dependencies, refreshes publications, switches branches, or deploys. A separate **CSML: Update one person's publications** task asks for the person ID and runs only when you explicitly select it.

## Validation and common fixes

Run `npm run content:validate` to check fields before committing. Validation errors must name the file and field. Use spaces, not tabs, for YAML indentation; keep frontmatter between `---` markers; quote dates and values containing YAML punctuation when needed. `null` means absent, `[]` means an empty list, and `draft: false` permits public rendering.

A missing image error means the source path/filename or case does not match. A correct localhost page with broken `/dev/` links is a base-path bug, not something to work around by hardcoding production URLs. A successful CI result with an old preview can mean deployment is pending/failed; check the deployment summary and displayed revision.

Do not test real CV submission on dev. It is disabled or uses an explicitly configured sandbox. Never commit a test CV containing personal information.

## Maintainer setup and recovery

Implement the exact package commands and workflow names used in this README. Fill in the real production/preview links and supported Node/Python versions; install/test the example tasks. Keep `main` default, enforce PR-only changes, require the dev source/checks/review, preserve the long-lived dev branch, and protect workflow paths.

Configure the OpenAlex secret in a protected automation environment restricted to main, an approved host/base, the combined Pages deployment, daily/weekly schedules, and the separately approved X/CV services. Do not give untrusted PR code secrets or deployment rights. A failed dev build must not erase production, and a broken latest dev head must not prevent a validated main release from retaining the last good preview.

Scheduled jobs may be delayed or disabled by GitHub; check the Actions tab when freshness is unexpectedly old, re-enable where necessary, then run the dedicated refresh workflow. Never add live OpenAlex collection to a build as a recovery shortcut. A new cache still goes through dev and PR review.

Rollback by reverting the unwanted change through dev and a PR into main, or use the controlled redeployment procedure for a previously validated main/dev revision pair. Never force-push main or replace only half of the combined site. Record approvals and the exact deployed revisions.

Detailed architecture, source references, required tests, and unresolved service dependencies are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Coding-agent requirements are in [AGENTS.md](AGENTS.md). The implementation must add `docs/operations.md` with the actual settings, owners, deployment record/recovery commands, and secret rotation procedure once configured.
