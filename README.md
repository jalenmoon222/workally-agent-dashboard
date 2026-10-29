# Worker Ally Agency Command Center

A static, browser-only Worker Ally agency dashboard prototype built with HTML, CSS, vanilla JavaScript, SVG, and localStorage. It seeds 240 deterministic fictional NYC gig-worker records and includes case management, role previews, filtered analytics, reports, and data management.

## Run locally

Open `index.html` with VS Code Live Server. No package install, build step, backend, or external data service is required. A simple alternative is `python3 -m http.server 5500`, then open `http://localhost:5500`.

## Demo workflow

Use the Workers directory to find a fictional worker, open a profile, and create a case. In Cases, assign an agent, add a note, set a follow-up, record a simulated referral, update status, and record an outcome. Outcomes are only counted as verified when the explicit verification option is selected. Reset the workflow from the Cases view or restore the baseline dataset in Settings.

## Intake import

Settings can import JSON records from the same browser origin using these localStorage keys: `workerAllyIntake`, `worker_ally_intake`, `workerAllyProfile`, `workerAllyCompletedProfile`, or keys beginning with `workerAllyIntake:`. The importer accepts either a top-level profile or a nested `profile` / `worker` object, maps known field aliases, skips records without a name, and skips duplicate source IDs. Unknown or absent answers remain unprovided; the importer does not infer missing information. This adapter cannot be guaranteed to match a chatbot schema that is not present in this repository.

## Data and privacy

All seeded records are fictional. The browser store uses the `workerAllyCommandCenter.v1` key and is local to this browser profile; it is not a shared database. Role switching is only a UI demonstration, not authentication or access control. Organizing-request examples are held in a separate collection and excluded from general pages and exports. Do not enter real worker or sensitive information. This prototype does not claim HIPAA compliance or production security.