# CSML website - team editing guide

Most changes only need plain text in a content file - no HTML, CSS, or JavaScript. The website applies its own layout, fonts, colors, and card styles automatically.

## Which file do I edit?

| Change | File or folder |
|---|---|
| My profile, links, portrait, role, biography | `content/people/<my-person-id>.md` |
| Add a person | Copy `content/people/_template.md` into `content/people/` |
| Add a news item | Copy `content/news/_template.md` into `content/news/` |
| Add or edit an applied-ML collaboration card | Copy `content/collaborations/_template.yaml` into `content/collaborations/` |
| Team description | `content/about.md` |
| Research area | Copy `content/research/_template.md` into `content/research/<id>.md` |
| Funded project and funding logos | Copy `content/projects/_template.yaml` into `content/projects/<id>.yaml` |
| Open or close a position | Copy `content/openings/_template.md` into `content/openings/<id>.md` |
| Add an external article card manually | Copy `content/blog-entries/_template.yaml` into `content/blog-entries/` |
| Add a blog to automatic discovery | `content/blog-sources.yaml` |
| Site contacts, navigation, PI selection | `content/site.yaml` |
| Exceptional publication-source correction (maintainers only) | `content/publication-overrides.yaml` |

Every `content/<type>/` folder keeps its own `_template.*` file (e.g. `content/people/_template.md`) with every field commented. Files starting with `_` are never built or validated as real content, so you can copy one in place directly; `templates/` holds the same files for reference.

Do **not** edit `data/publications.json` or `data/blog.json` by hand - they are generated caches. Do not edit `src/` just to change a biography or announcement.

## How a change goes live

```text
Edit a content file -> preview locally -> commit -> push -> CI builds/checks it -> it deploys
```

There's currently no separate preview branch: once you push, CI builds and deploys it. So **preview locally first** (see "Preview your change locally" below) and, if someone else asked for the change, show them the running page before you push - see the [recommended workflow](#recommended-workflow-develop-locally-confirm-visually-then-commit) under "Local guardrails." A failed build keeps the previous version online; fix the reported error and push again.

### Edit through the GitHub website

1. Open the file you want to change and use the pencil (edit) icon. For a new entry, copy the matching `_template.*` file into its content folder first and give it a unique filename/ID.
2. Edit the fields and text; keep the YAML delimiters and indentation intact. Commit with a short, descriptive message (or open a pull request if you don't have write access).
3. Open the **Actions** tab and check the `CI` run for your commit, then the deploy run. A failed build leaves the previous version live - fix the stated error and push again.
4. Open the live site and check your change on desktop and mobile.

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

Replace the example identity, fill real fields, and set `draft: false` when ready to go public. Leave absent optional fields `null` or omit them as shown in the full template. Use `[]` for empty lists. Never paste placeholder author IDs into a real record.

Valid main role keys are `senior_academic`, `postdoc`, `phd_student`, and `research_engineer`. Additional supported categories are `affiliated_researcher` and `research_support`. `role_label` is your displayed job title; it need not exactly repeat the group label. Membership `status` is `active`, `alumni`, or `affiliated`. Alumni are grouped separately on the homepage under "Alumni", regardless of their former `role`.

The primary external website button uses `personal_website`, or falls back to `iit_profile`. Missing links do not produce empty buttons. `orcid`, `scholar_url`, `github_url`, `linkedin_url`, `x_url`, and `bluesky_url` each render a dedicated app icon when set, and simply do not render when left `null`. Your ORCID, Scholar URL, and OpenAlex IDs serve different purposes: a Scholar link does not import your publications. Have a maintainer verify the OpenAlex identity from ORCID, affiliation, and known publications. Multiple verified IDs are supported when OpenAlex split one person across records.

`nationality` is optional and purely decorative: a two-letter ISO 3166-1 alpha-2 code (e.g. `IT`, `CO`) rendered as a small flag on the bottom-right corner of your portrait. Leave it `null` to show no flag. The code must already be listed in `src/lib/nationality.ts`; ask a maintainer to add a new country before using its code.

`current_affiliation` only applies to alumni (`status: alumni`): it is the person's current employer/institution, shown on their alumni card and profile. Leave it `null` (never guessed) until a maintainer verifies it.

For an alumnus, explicitly decide whether publications remain collected (`publications.enabled`) and whether they count toward the shared team bibliography (`include_in_team_list`). `start_of_affiliation` and `end_of_affiliation` (plain years, e.g. `2022`/`2025`) scope *which* of a person's works count toward the shared `/publications/` team pool; leaving both `null` means no restriction. This never affects the person's own `/people/<id>/` profile, which always shows their complete publication history.

### Add a portrait

Upload an approved picture to `media/people/<my-person-id>.jpg`, then set:

```yaml
photo: /media/people/example-researcher.jpg
photo_alt: Portrait of Example Researcher
```

Keep existing official IIT/CSML logos unchanged. Missing portraits get a neutral fallback. Do not upload an image without permission to republish it.

Saving a profile automatically updates its group card, dedicated profile page, and in-page panel from the same content record. Publication records do not refresh merely because you changed the profile or an author ID - see "Publications" below.

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

Use a unique ID, an actual date/time with offset, and `draft: false` when ready. A future `published_at` means not yet published. `event_date` describes when an event happens; it does not replace the date the news should appear. Add an optional HTTPS link for details. `image` is an optional `/media/...` path (e.g. a funder or award logo) shown above the announcement; set `image_alt` whenever `image` is set.

## Add or edit an applied-ML collaboration

This is the horizontally scrolling strip of partner-lab cards under Research. Copy `content/collaborations/_template.yaml` into `content/collaborations/<id>.yaml`:

```yaml
id: example-collaboration
draft: true
speciality: Example speciality
lab_name: Example Lab
institution: null
lab_logo: null
lab_logo_alt: null
lab_url: null
pi_name: Example Name
pi_photo: null
pi_photo_alt: null
order: 10
```

Fill in the real `pi_name`, `lab_name`, and a verified `lab_url` - published entries require it. `lab_logo`/`pi_photo` are optional; omit a logo to fall back to showing the lab's name as text, since several partner groups have no distinct logo beyond their host institution's own mark. Never invent a PI, lab, or link; leave `draft: true` until it's verified.

## Other content: research areas, projects, openings

**Research area** - copy `content/research/_template.md`, fill the title/body, and optionally set `media` (image/GIF path, `fit: cover|contain`, focal `position`, and a `poster` for animated media).

**Funded project** - copy `content/projects/_template.yaml`, fill the real `project_url`, `status` (`active`/`completed`), and a verified `funders` list with official logos. Mark completed projects accurately - never imply ongoing funding that has ended.

**Opening** - copy `content/openings/_template.md` and use the official call/`apply_url`. Set `status: closed` or an actual `deadline_at` once a position closes. A general email expression of interest is not a substitute for a formal application portal.

## Blog Posts: links to externally hosted articles

This tab is a **list of individual articles**, each with its title, author name, optional image, and a direct link to the original externally hosted article. It does not host full copies of articles or just link to authors' blog homepages.

Initial sources are Vladimir R. Kostić's listing at `https://vladi-slk.github.io/blog.html` and Pietro Novelli's archive at `https://pietronvll.github.io/archive.html`.

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

Replace `url` with the **article URL**, not the archive/homepage. Fill a real title and author and set `draft: false`. The date and image are optional; no image produces a text-only card. `person_id` can connect the byline to an existing team profile. Do not copy the article body into this file.

### Automatic discovery

Add a source through `content/blog-sources.yaml` (see `templates/blog-source.yaml`). A verified RSS/Atom feed is preferred; otherwise ask a maintainer to add a tested HTML adapter rather than guessing a feed address.

The cached article index refreshes automatically on a schedule, or a maintainer can trigger it manually in **Actions -> Refresh blog entries -> Run workflow**, or locally with `npm run blogs:update`. A failed source import keeps its prior entries. Normal page builds never fetch these websites directly, so a newly discoverable post only appears after the next refresh.

## Publications

The group list and personal profiles show a cached bibliography built from each person's verified OpenAlex author ID - never edit `data/publications.json` by hand. Fix your publication list in OpenAlex itself, then ask for a refresh; don't maintain a second bibliography in this repository. `content/publication-overrides.yaml` is reserved for the rare case OpenAlex can't be corrected directly (e.g. unlinking a work OpenAlex wrongly merged from a namesake).

**Refresh via GitHub Actions:** **Actions -> Refresh publications -> Run workflow**, scope `selected` with one or more person IDs, or `all`. A failed refresh keeps the previous cache, so nothing breaks if OpenAlex is briefly unreachable.

**Refresh locally** (needs the Python version pinned in `.python-version`, set up once with `npm run publications:setup`):

```bash
npm run publications:list
npm run publications:update -- --person example-researcher
```

Review the diff, then commit and push `data/publications.json` like any other change. A targeted refresh only touches the selected people's membership edges; everyone else's freshness is untouched.

## Live social feeds

Bluesky posts are read in the visitor's browser at visit time, lazily once the Updates section scrolls into view - never during the site build. Settings live in `content/social.yaml`:

```yaml
bluesky:
  enabled: true
  actor: pontilgroup.bsky.social
  max_items: 8
  session_cache_seconds: 300
```

If the feed can't be reached, the panel shows a retry button and a direct link to the profile; the rest of the page is unaffected. There is no live X feed - the homepage links directly to the X profile instead.

## Preview your change locally

```bash
npm ci
npm run dev
```

Open the URL printed in the terminal, normally **`http://127.0.0.1:4321/`**. Edits to content, local media, and source code reload automatically. Stop with **Ctrl+C**. Opening this server never publishes changes or refreshes publications.

To inspect a built static site instead of live-editing it:

```bash
npm run build
npm run preview
```

Static preview serves the last build; rebuild after edits. Neither command downloads new publications/blog posts.

## VS Code: start the server when opening the project

The repository includes `.vscode/tasks.json`. After an initial `npm ci`, open the **project folder** in VS Code (not just a single file) and allow automatic tasks when prompted. The **CSML: Start live preview** task then starts the server in a dedicated terminal on later folder opens.

Use **Tasks: Manage Automatic Tasks** to change permission, **Tasks: Run Task -> CSML: Start live preview** to start manually, and **Tasks: Terminate Task** or Ctrl+C to stop it. The task only runs the local server - it never installs dependencies, refreshes publications, or deploys.

## Local guardrails (automatic)

`npm install` wires up the hooks in `.githooks/` via `git config core.hooksPath` - no extra setup, no new dependency to install or remember. This applies the same way whether a person or a coding agent is committing.

**On every `git commit`:** `npm run content:validate` runs and blocks the commit if any YAML/Markdown content fails its schema (bad frontmatter field, wrong role key, broken link, etc.). It only checks `content/`, so it stays fast (well under a second).

**On every `git push`:** `npm run check` (content validation + `astro check`) and a full production `npm run build` run and block the push if the site doesn't typecheck or doesn't actually build. This is the same first step CI runs, just caught before you leave your machine instead of a few minutes later in Actions.

These hooks are a courtesy, not a security boundary: anyone can skip one with `git commit --no-verify` / `git push --no-verify`, and CI runs the same checks again regardless. **CI is the real gate** - a local hook passing does not mean anything was merged or deployed, and skipping a hook does not skip CI.

### If a hook blocks you, debug it visually

A failing `content:validate` error names the file and field directly - fix that field and retry the commit.

A failing `astro check`/`build` on push is more easily understood by looking at the page, not just the error text:

```bash
npm run dev
```

Open `http://127.0.0.1:4321/` and navigate to the page you changed; most layout/type issues are obvious once rendered. Astro's dev server shows the same error overlay the hook reported, with a clickable source location. If you need to see exactly what the hook built (not just live-edit):

```bash
npm run build
npm run preview
```

This builds and serves the same static output the pre-push hook and CI both check - if it looks right here, the push will pass. Fix the reported file, re-run `npm run dev` to confirm, then retry the push.

### Recommended workflow: develop locally, confirm visually, then commit

The hooks above only catch what a script can check (schema, types, build). They cannot tell you a page actually looks and works right. Before committing:

1. Run `npm run dev` and keep it running while you edit.
2. Open the affected page(s) in the browser and check them at both desktop and mobile widths. For anything interactive (a dialog, filter, carousel), actually use it - a page that builds is not the same as a page that works.
3. If someone else asked for the change, show them the running page or a screenshot and get their confirmation it looks/behaves as expected **before** committing, not after. A quick look at a live server catches things the hooks structurally cannot: wrong content, a broken layout, a feature that silently does nothing.
4. Only then `git commit`/`git push`. Treat a passing hook as "didn't break the build," not as "this is correct" - those are different claims.

This applies equally to a coding agent making the change: run the dev server and look at the rendered result, and when the task came from a person, wait for their explicit confirmation that it works before committing.

## Validation and common fixes

Run `npm run content:validate` to check fields before committing. Validation errors name the file and field. Use spaces, not tabs, for YAML indentation; keep frontmatter between `---` markers; quote dates and values containing YAML punctuation when needed. `null` means absent, `[]` means an empty list, and `draft: false` permits public rendering.

A missing image error means the source path/filename or case does not match. Never commit a test CV or any file containing real personal data.

## For maintainers

Deployment, branching policy, secrets, and recovery procedures are documented in [`AGENTS.md`](AGENTS.md) and [`docs/operations.md`](docs/operations.md), not here. Detailed architecture, source references, and acceptance tests are in [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).
