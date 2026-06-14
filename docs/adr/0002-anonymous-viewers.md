# Viewers are anonymous — no viewer identity is captured

A room is shared through a single public link, and anyone holding that link can view it without signing in, entering an email, or otherwise identifying themselves. The system records no identity for viewers; the only activity it keeps is aggregate view and download counts.

This is a deliberate scope boundary that defines the product as a simple file-sharing app rather than a virtual data room (VDR). VDR-style products gate access behind an email and attribute every view to a person; we explicitly chose not to, in order to keep the product and its data model simple.

## Consequences

- We can answer "how many times was this viewed?" but never "who viewed it?".
- Adding email-gating or per-viewer attribution later is a real feature, not a config change, and would reopen this decision.
