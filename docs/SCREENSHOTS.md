# Review screenshots

The review screenshots that used to live under `docs/screenshots`, `docs/images` and
`docs/fps-map/img` (52 images, 32 MB) were removed from the working tree on 2026-11-09 to keep
clones and CI checkouts light. They are still in the repository's history: every link in the
docs now points at the last commit that carried them
(`50ce54c88987e137155e68d05810c630874a4a23`), served raw from GitHub.

To restore them locally:

```sh
git checkout 50ce54c88987e137155e68d05810c630874a4a23 -- docs/screenshots docs/images docs/fps-map/img
```

New review captures belong in the project's docs on claude.ai (or a release asset), not in git.
