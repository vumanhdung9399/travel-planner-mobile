# FE → mobile parity review

Reference: `D:/Code/travel-planner-fe`, running at `http://127.0.0.1:5173`.
Mobile preview: `http://localhost:8082`. Comparison viewport: 390 × 844.

## Acceptance criterion

Use the rendered FE as the visual reference. Match each screen's layout, fonts,
images, spacing, labels, controls, and API behavior. Do not mark parity complete
based only on TypeScript, matching data, or the presence of equivalent features.
Check populated, empty, loading, error, filter, modal, and permission-dependent
states. Preserve existing uncommitted work.

## Current status

| Area | Implemented in this review | Remaining verification |
| --- | --- | --- |
| Shared appearance | Manrope and DM Serif Display with licenses; FE cover asset; sans-serif page titles; shared top bar; drawer destinations | Native font weights, all core RN Text components, dark mode, safe areas |
| Overview | Hero layout, member avatars, task rows, category budget ring, group thumbnails, create action | Compare final screenshots against FE, including empty/error states |
| Groups | Uses FE cover asset and shared header/title | Compare list/card sizing, menus, creation form, group detail and permissions |
| Trips | Three phase tabs, counts, group/sort/favorite filters, create group selection, preparation card, refresh on return | Final visual comparison, favorites persistence, create/edit flows |
| Trip detail shell | FE 420px cover, stable title, horizontal sections below cover ordered Overview/Timeline/Tasks/Finance/Management; main navigation at bottom; one parent scroll/refresh; deep-link and management visibility handling | Final screenshots, long-content scrolling on Android/iOS, safe areas |
| Trip overview tab | Details first; readiness computed from dates/members/tasks/timeline/funds; nearest-day timeline preview; quick links; weather header | Documents are still a separate mobile screen; offline and routes retain differences in expansion/layout; final screenshots |
| Timeline | FE day cards, compact date/filter row, activity icon/color rail, card typography and spacing; day/time/reminder/type filtering; ISO/HH:mm time handling | Final UI comparison, filter combinations, save/reopen, AI flow; creation/filter sheets still need rendered comparison |
| Expenses/fund/balance | Compact expense cards; shared finance subtabs and summary; contribution rows in one card; settlement summary and member heading; refresh totals after approval/delete | Full rendered comparison of forms, exact split, approval, settlement, export and error states |
| Tasks/Management | FE card sizes and mobile full-width task entry; management remains leader/open-trip only; both respond to parent refresh | Rendered permission/assignment/filter/closed-trip comparison and dialogs |
| Maps | Map background with search and bottom active-route panel | Native map rendering, opening routes and location behavior; web adapter is a placeholder |
| Profile | FE sections/stats, travel-style chips and editor, account/settings/support sections | Final screenshots; preference save/reload without changing real user data unnecessarily |
| Authentication | Auth titles retain serif styling after shared page-title change | Login/register/verification/reset forms and native Google login |
| Notifications/chat/polls/documents | Existing implementations retained | Full source and rendered-state review still required |

## Browser blocker

Browser navigation/screenshot comparison was rejected by automatic approval
review with an account usage-limit message. Do not bypass through another UI
automation path. Resume visual comparison after access is restored.

No complete visual-parity claim has been made for this review. Runtime
TypeScript/lint checks are separate from visual and native-device acceptance.

## Trip-detail verification

- TypeScript noEmit: passed after the detail changes.
- ESLint: passed for the detail screen, all seven section components, expense/balance cards and new helpers.
- `node scripts/check-trip-detail.cjs`: 21 checks passed (financial aliases, management visibility, unknown links, ISO/HH:mm clocks, nearest-day selection and bounds).
- `git diff --check`: passed (Git reports line-ending notices only).
- Expo production web export: passed, 63 static routes; existing config warns about a missing favicon. Temporary export output was removed after verification.
- Browser visual acceptance remains blocked by the account usage limit; do not interpret these code checks as screenshot verification.
