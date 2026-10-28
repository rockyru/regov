# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

- Use GitHub's **Report a vulnerability** button on the repository's Security tab, or
- write to **hello@regov.app** with "security" in the subject.

Include what you found, how to reproduce it, and what an attacker could do with it. You will get
an answer within a few days. Please give us reasonable time to fix the issue before disclosing it.

## Scope

In scope: this repository's code and the hosted service at regov.app (the run queue and its
limits, the operator pages and their token, the review editor, file serving under `/api/jobs`,
the feedback form, exports, and the crawler's handling of hostile pages).

Out of scope: the government websites RE:GOV reads, denial of service by volume, and findings
that need a stolen operator token.

Please do not run automated scanners against regov.app; each rebuild spends real model credit.
Run the app locally (`npm run sample`) to test.
