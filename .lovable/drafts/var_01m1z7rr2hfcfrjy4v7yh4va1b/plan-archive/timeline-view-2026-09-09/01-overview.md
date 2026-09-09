# Timeline view

A new read-only screen under EVENTS: one horizontal time axis with today fixed in the middle, past to the left, future to the right. Opens showing the last six months and the next six months.

Everything dated in the app appears on it: maintenance, directives and bulletins, money, and hour readings. You scroll the mouse wheel to zoom and drag to move through time. Zoomed out, events sit on one line and crowd together into counted clusters. As you zoom in, they smoothly separate into four coloured lanes, one per category, and a detail list fills in underneath.

Nothing on this screen can change data. Clicking an event opens a small read-only summary card, and that card has a link that takes you to the full record on its own page.

Confirmed events are solid dots; anything estimated from your flying rate is drawn hollow with a dashed edge and labelled "Projected" wherever it appears in text.

Below 900px wide (phones) the screen shows a short message and a button back to Calendar instead.

## Decisions from your answers

- Click = read-only popup, with an explicit link to the full record page.
- First version shows real and firmly scheduled money only. No modelled future spend.
- Flying-hours-per-month is calculated automatically from your counter history, with an editable override in the Insights assumptions area.
- Built one step at a time; you review each step before the next.
