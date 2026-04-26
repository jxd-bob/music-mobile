# Release Flow

This repository publishes Android release APKs from `master`.

## One-time GitHub setup

Add these repository secrets in `jxd-bob/music-mobile`:

- `KEYSTORE_STORE_FILE`
- `KEYSTORE_STORE_FILE_BASE64`
- `KEYSTORE_KEY_ALIAS`
- `KEYSTORE_PASSWORD`
- `KEYSTORE_KEY_PASSWORD`

Expected values for this repo:

- `KEYSTORE_STORE_FILE`: keystore file name under `android/app/`
- `KEYSTORE_STORE_FILE_BASE64`: base64 content of the keystore file
- `KEYSTORE_KEY_ALIAS`: signing alias
- `KEYSTORE_PASSWORD`: keystore password
- `KEYSTORE_KEY_PASSWORD`: key password

## Release steps

1. Update `publish/changeLog.md` with the new release notes.
2. Run `node publish <version>`.

This updates:

- `package.json`
- `publish/version.json`
- `CHANGELOG.md`

3. Commit the release files and push to `master`.
4. GitHub Actions workflow `.github/workflows/release.yml` will:
   - build signed release APKs
   - create tag `v<version>`
   - create a GitHub Release
   - upload the APK assets
5. Workflow `.github/workflows/publish-version-info.yml` verifies:
   - release tag matches `package.json`
   - `publish/version.json` matches `package.json`
   - expected APK assets exist in the release

## Local verification

After the release is published, these URLs should work:

- `https://raw.githubusercontent.com/jxd-bob/music-mobile/master/publish/version.json`
- `https://github.com/jxd-bob/music-mobile/releases/tag/v<version>`
