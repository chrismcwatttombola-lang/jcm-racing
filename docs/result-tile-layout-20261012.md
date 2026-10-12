Result detail presentation update, 12 October 2026. Confidence sits beside time/course; finish sits beside outcome. Separate selected-horse, race-winner/margins, selection-reason, racecard, Racing Post video and result-source tiles. Winning selections omit beaten distance. Existing outcome and supplementary-evidence checks retained. No data or accounting changes. Exact Racing Post replay links remain unavailable; no API video or inferred replay URLs substituted. Browser CI validates the mobile arrangement.

Follow-up: removed visible Result source tile, retaining underlying evidence. When an exact Racing Post replay is unavailable, the video tile links to verified https://www.racingpost.com/results/ with caption “View race videos here”. No claim that this general video page is an exact replay.


Latest update: the Race video tile now always opens https://www.sportinglife.com/racing/results with caption “View race videos here” and a login note, as requested. This supersedes the Racing Post video destination; racecard links retain their existing destinations. No race-specific replay is claimed.


Added Race results tile between Racecard and Race video. Today's 15 picks have race-specific Sporting Life result URLs checked against the dated meeting listing and race identity. URL validation restricts the destination to Sporting Life results with matching date and course. Missing or invalid links display an unavailable message. This adds navigation only; outcome, settlement and accuracy logic are unchanged.


## Sporting Life navigation and fallback — 12 October 2026
User requests uniform Sporting Life racecards, race results and video navigation. All 15 current racecard destinations were retrieved from the matching Sporting Life race-result pages. Racing API Pro remains PRIMARY; Sporting Life is the accepted fallback when API evidence is unavailable. Accept only completed results with exact date, scheduled London time, course and selected horse match; record result_source=SPORTING_LIFE, verification_status=WEBSITE_CONFIRMED, actual result_source_url/retrieved_at, result_website_race_id matching the URL, and the normal matching evidence fields. Preserve existing provider race/horse IDs where available. Missing, conflicting or unknown evidence stays Pending. Sporting Life acceptance does not confer official accuracy: official_accuracy_eligible=false remains mandatory. No existing results are reclassified by this change.
