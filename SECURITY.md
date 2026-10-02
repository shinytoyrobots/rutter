# Security Policy

rutter is a personal tool shared as a reference implementation, with no support commitment (see the
README). Security reports are still welcome and will be read.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately instead:

- Use GitHub's [private vulnerability reporting](https://github.com/shinytoyrobots/rutter/security/advisories/new), or
- Email robin@shinytoyrobots.com with the details and, if you can, steps to reproduce.

I will acknowledge a report when I can, but there is no guaranteed response time or fix schedule.

## Scope

rutter runs locally. It reads the notes folder you point it at, writes a search index and session
records on your machine, and makes no network requests. Reports about path handling, file writes
outside the intended folders, or the handling of untrusted note or transcript content are the most
relevant. The README's Privacy Policy section describes exactly what it reads and writes.
