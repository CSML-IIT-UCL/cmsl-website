---
# Copy into content/people/, or copy content/people/_template.md directly.
# Rename to your-person-id.md; id must match the filename. Keep draft: true
# until the profile is reviewed.
# Stable slug, matches filename
id: example-researcher
# Full display name
name: Example Researcher
# Hide until reviewed
draft: true
# Homepage group (ignored for alumni)
role: postdoc
# Displayed job title
role_label: Postdoctoral Researcher
# active | alumni | affiliated
status: active
# Sort position within group
order: 100
# Public contact address
email: null
# Portrait path under media/
photo: null
# Required when photo is set
photo_alt: null
# Optional ISO 3166-1 alpha-2 nationality code (e.g. IT, CO); must already be listed in
# src/lib/nationality.ts. Shown as a small flag on the portrait when set.
nationality: null
# Profile meta description
research_summary: null
# Topic tags on profile
research_interests: []
# Official IIT profile link
iit_profile: null
# Primary site (falls back to iit_profile)
personal_website: null
# Bare ORCID iD
orcid: null
# Google Scholar profile
scholar_url: null
# GitHub profile
github_url: null
# LinkedIn profile
linkedin_url: null
# X (Twitter) profile
x_url: null
# Bluesky profile
bluesky_url: null
# Current employer (alumni only)
current_affiliation: null
# Other verified links
media_links: []
# Verified OpenAlex author IDs
openalex_ids: []
# Publication collection settings
publications:
  # Included in publication collection
  enabled: true
  # Counted in shared team bibliography
  include_in_team_list: true
  # First year counted in team pool
  start_of_affiliation: null
  # Last year counted in team pool
  end_of_affiliation: null
---
Write a short research biography here. This example stays unpublished
until real information is supplied and draft is changed to false.
