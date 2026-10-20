<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep booking confirmation name normalization, event-wise crew role counts, and payment calculations in the shared booking-confirmation helper so previews and WhatsApp messages use identical data rules; never include crew personal names in client-facing coverage text.
- Keep saved booking presets and package templates in shared authenticated tables, with built-in defaults and legacy packages preserved; apply price and deliverables only on explicit selection so negotiated values survive edits.
- Use RecordDialog field rendering and after-field slots for booking-specific controls instead of duplicating its form state and submission logic.
