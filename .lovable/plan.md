# Dynamic crew chips and inline crew creation

## What will change
- Replace the secondary crew dropdown with a compact chip grid showing every active studio crew member.
- Make each chip a one-tap multi-select control with clear selected, available, and already-booked states.
- Keep per-event role selection visible only for selected crew, preserving scheduling conflict warnings.
- Add a `+ Add Crew` chip that opens a small form for name, primary role, and phone/WhatsApp.
- After saving, refresh the shared crew directory, select the new member automatically, and show their chip immediately.

## Data and synchronization
- Continue saving event crew through the existing project assignment records used by Upcoming Events, schedule previews, and WhatsApp reminders.
- Do not add a duplicate `assigned_crew` field; the existing assignment records are the app's normalized crew array and already power all dependent screens.
- Apply the upgraded selector everywhere crew can be assigned, including quick booking, project creation/editing, schedules, and crew management.

## Technical details
- Reuse the existing staff create mutation and cache invalidation.
- Normalize phone numbers to the existing Indian WhatsApp format and validate input before saving.
- Preserve the 180-minute double-booking rules and block unavailable crew from being newly selected.
- Use existing design tokens and dialog/button components, with mobile-safe wrapping and touch targets.

## Verification
- Check type safety and the app build.
- Verify the booking dialog on mobile: all chips render, toggling works, adding crew selects the new member, and the old dropdown is gone.
