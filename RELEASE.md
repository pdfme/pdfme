# How to release and publish

To create a new release on NPM, follow these steps:

1. Create a new tag of the form `x.y.z`.
2. Push the tag to GitHub.
3. Wait for the CI to finish.

The following tag naming is supported:

- `x.y.z` for stable releases
- `x.y.z-rc.n` for release candidates
- `x.y.z-beta.n` for beta releases
- `x.y.z-alpha.n` for alpha releases

The CI will automatically publish the release to NPM if the tag is of the form `x.y.z`, and will publish the release to the `next` tag on NPM if the tag is of the form `x.y.z-rc.n`, `x.y.z-beta.n` or `x.y.z-alpha.n`.

Additonally the CI creates releases to the `dev` tag on NPM for every commit to the `main` branch.
Releases to the `dev` tag follow the following naming scheme: 

- `x.y.z-dev.n`, where `x.y.z` is the version of the last stable release and `n` is the number of commits since the last stable release.
- `x.y.z-[rc|beta|alpha].n-dev.m`, where `x.y.z-[rc|beta|alpha].n` is the version of the last pre-release and `m` is the number of commits since the last pre-release.
