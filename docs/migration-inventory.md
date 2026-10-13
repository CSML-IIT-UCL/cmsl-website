# Legacy migration inventory

Inventory date: 13 October 2026. Source pages were read from the public CSML and IIT websites. Imported text and links remain validated by local schemas and no source page is treated as executable input.

## Migrated into this implementation

- The current legacy homepage description is represented by `content/about.md` and four reviewable research records.
- The current group page yielded 18 people: one principal investigator, one researcher, six postdoctoral/visiting entries, five PhD students, one affiliated researcher, three visiting-scientist entries, one former colleague and one administrator. Andreas Maurer appears twice in the source grouping and is stored once as a visiting scientist.
- Massimiliano Pontil is selected as principal investigator from the shared people registry. Source-backed profile prose was migrated for Massimiliano Pontil, Lisa Cuneo, Pietro Novelli, Daniel Felipe Ordoñez Apraez, Daniel Rodrigues Perazzo and Saverio Salzo. Empty source biographies remain empty.
- The current homepage slider's 1,950 × 500 team photograph and the seven real portraits exposed by IIT were downloaded to `media/`. Generic IIT-logo profile images were not misrepresented as portraits.
- CHT@Erzelli is recorded as the team location because it is repeated on current member profiles. The institutional Via Morego footer address is not asserted as the team's street address.
- Four project records connected to the CSML principal investigator were verified from IIT project pages: FAIR, ICSC, ELSA and ELIAS. Exact start/end dates and project destinations were retained. Status is derived from those dates as of the inventory date: ELIAS is active and the other three are completed.
- Two postdoctoral calls visible on the legacy homepage remain `draft: true`: their destinations are preserved, but current open/closed state and deadlines are not asserted.
- The two requested external blog listing sources are configured, with feed URLs left null until a tested feed or adapter exists.

## Explicitly omitted or blocked

- No OpenAlex author ID was inferred by name. The publication cache remains an honest, schema-valid empty snapshot.
- No email address was derived from a portrait endpoint or name. Only addresses visibly published in source profile text are stored.
- Vladimir R. Kostić, Felicia Vigliotti and Pedro Buigues Jorro occur in older/stale profile or blog material but not in the current official group roster; they are not presented as current members.
- Missing portraits use initials. Project/funder cards use verified text identities until official reusable logo files are recorded.
- The CV submission service, X proxy and live social adapter are not configured.

## Source pages

- <https://csml.iit.it/home>
- <https://csml.iit.it/people>
- <https://csml.iit.it/people-details/-/people/massimiliano-pontil>
- <https://csml.iit.it/people-details/-/people/lisa-cuneo>
- <https://csml.iit.it/people-details/-/people/pietro-novelli>
- <https://csml.iit.it/people-details/-/people/daniel-ordonez>
- <https://csml.iit.it/people-details/-/people/daniel-rodrigues>
- <https://csml.iit.it/people-details/-/people/saverio-salzo>
- <https://csml.iit.it/project-details/-/project/134057>
- <https://csml.iit.it/project-details/-/project/150835>
- <https://csml.iit.it/project-details/-/project/98349>
- <https://csml.iit.it/project-details/-/project/128563>
