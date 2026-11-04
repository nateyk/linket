"""Exercise the real producer and verifier with synthetic, nonfunctional credentials."""

import hashlib
import io
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
SHA = "a" * 40
NAME = "linket-aaaaaaa-20261031-150000.tar.gz"
CANARY = b"SYNTHETIC_CREDENTIAL_CANARY_NEVER_A_REAL_SECRET"
KEY = b"-----BEGIN " + b"PRIVATE KEY-----\n" + b"QUJD" * 24 + b"\n-----END PRIVATE KEY-----\n"
PUBLIC_KEY = KEY.replace(b"PRIVATE", b"PUBLIC")
BASE = {
    "RELEASE_SHA": (SHA + "\n").encode(),
    "CI_META": ("CI_SHA=" + SHA + "\n").encode(),
    "artisan": b"<?php // synthetic boot entry",
    "public/build/manifest.json": b"{}",
    "vendor/autoload.php": b"<?php // synthetic Composer entry",
    "bootstrap/app.php": b"<?php // required boot source",
    "config/app.php": b"<?php return ['key' => env('APP_KEY')];",
    "env.example": b"APP_KEY=\nCREATOR_AI_MCP_OAUTH_ENABLED=false\n",
    "vendor/composer/ca-bundle/res/cacert.pem": b"-----BEGIN CERTIFICATE-----\nSYNTHETIC_PUBLIC_CA\n-----END CERTIFICATE-----\n",
    "vendor/example/header-format.php": b'<?php $format = "-----BEGIN ' + b'PUBLIC KEY-----\\n%s\\n"; $header = "-----BEGIN PUBLIC KEY-----\\r\\n" . $data;',
}
FORBIDDEN = [
    "storage/oauth-private.key", "storage/oauth-public.key",
    "storage/nested/passport/oauth-private.key", "storage/nested/passport/oauth-public.key",
    "keys/rotation/signing.key", "shared/keys/2026/signing.pem",
    "config/alternate/oauth-private.key", "config/alternate/oauth-public.key",
    "custom/passport-private.pem", "custom/passport-public.pem",
    ".env", ".env.testing", ".env.production", ".env.local", ".env.backup",
    "config/.env.production", "backup/.env.old", ".envrc", ".env~",
    "bootstrap/cache/config.php", "bootstrap/cache/routes-v7.php",
    "storage/app/digital-products/paid.pdf", "storage/logs/laravel.log",
    "public/storage/cached-secret.txt", ".ssh/id_ed25519", ".aws/credentials",
    "auth.json", ".npmrc", ".netrc", ".git-credentials", ".bootstrap-admin.json", "backup.sql.gz",
]


class ArtifactSecurity(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="linket-artifact-security-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.archive = self.root / NAME

    def digest(self):
        Path(str(self.archive) + ".sha256").write_text(
            hashlib.sha256(self.archive.read_bytes()).hexdigest() + "  " + NAME + "\n"
        )

    def fixture(self, extras=(), prefix="./", base=None, fmt=tarfile.PAX_FORMAT):
        with tarfile.open(self.archive, "w:gz", format=fmt) as archive:
            for name, data in (BASE if base is None else base).items():
                entry = tarfile.TarInfo(prefix + name)
                entry.size = len(data)
                archive.addfile(entry, io.BytesIO(data))
            for name, data, kind, target in extras:
                entry = tarfile.TarInfo(name)
                entry.type = kind
                entry.linkname = target
                if kind == tarfile.REGTYPE:
                    entry.size = len(data)
                archive.addfile(entry, io.BytesIO(data) if kind == tarfile.REGTYPE else None)
        self.digest()

    def verify(self):
        result = subprocess.run(
            ["bash", str(ROOT / "deploy/verify-release-artifact.sh"), str(self.archive), SHA],
            capture_output=True,
        )
        self.assertNotIn(CANARY, result.stdout + result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)
        return result

    def test_valid_release_and_relative_names(self):
        for prefix in ("./", ""):
            with self.subTest(prefix=prefix):
                self.fixture(prefix=prefix)
                result = self.verify()
                self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_valid_gnu_long_names(self):
        self.fixture([("./" + "long/" * 40 + "source.txt", b"ordinary source", tarfile.REGTYPE, "")], fmt=tarfile.GNU_FORMAT)
        result = self.verify()
        self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_forbidden_members_from_an_untrusted_producer(self):
        for path in FORBIDDEN:
            for prefix in ("./", ""):
                with self.subTest(path=prefix + path):
                    self.fixture([(prefix + path, CANARY, tarfile.REGTYPE, "")])
                    self.assertNotEqual(self.verify().returncode, 0, "accepted " + path)

    def test_key_material_under_alternative_configured_names(self):
        for path, content in (
            ("custom/current-signing.data", KEY),
            ("config/passport-inline.php", b"<?php return '" + KEY.replace(b"\n", b"\\n") + b"';"),
            ("alternate/public.data", PUBLIC_KEY),
            ("custom/encrypted.data", KEY.replace(b"PRIVATE KEY", b"ENCRYPTED PRIVATE KEY")),
            ("custom/ssh.data", KEY.replace(b"PRIVATE KEY", b"OPENSSH PRIVATE KEY")),
            ("vendor/custom/current.data", b"x" * 65520 + KEY),
            ("custom/wrapped.data", KEY.replace(b"QUJD" * 24, b"QUJDQUJD\n" * 12)),
            ("custom/spaced.data", KEY.replace(b"QUJD" * 24, b"\n" * 70000 + b"QUJD" * 24)),
            ("custom/header-spaces.data", KEY.replace(b"KEY-----\n", b"KEY-----" + b" " * 70000 + b"\n")),
            ("custom/header-tabs.data", KEY.replace(b"KEY-----\n", b"KEY----- \t\t\n")),
            ("custom/header-vtab.data", KEY.replace(b"KEY-----\n", b"KEY-----\x0b\n")),
            ("custom/header-formfeed.data", KEY.replace(b"KEY-----\n", b"KEY-----\x0c\n")),
            ("custom/header-nul.data", KEY.replace(b"KEY-----\n", b"KEY-----\x00\n")),
            ("custom/header-high-byte.data", KEY.replace(b"KEY-----\n", b"KEY-----\xa0\n")),
            ("custom/header-boundary.data", b"x" * (65536 - 27 - 1000) + KEY.replace(b"KEY-----\n", b"KEY-----" + b" " * 1000 + b"\n")),
        ):
            with self.subTest(path=path):
                self.fixture([("./" + path, content, tarfile.REGTYPE, "")])
                self.assertNotEqual(self.verify().returncode, 0, "accepted key in " + path)

    def test_links_and_special_members(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.FIFOTYPE,
                     tarfile.CHRTYPE, tarfile.BLKTYPE, b"V", b"Z"):
            with self.subTest(kind=kind):
                self.fixture([("./custom/entry", b"", kind, "../../outside")])
                self.assertNotEqual(self.verify().returncode, 0, "accepted type " + repr(kind))

    def test_sparse_dumpdir_and_pax_metadata_fail_closed(self):
        for kind in (b"S", b"D", tarfile.XGLTYPE):
            with self.subTest(kind=kind):
                self.fixture([("./unexpected", b"", kind, "")])
                self.assertNotEqual(self.verify().returncode, 0, "accepted raw type " + repr(kind))

    def test_noncanonical_and_duplicate_paths(self):
        for path in ("../escape", "/absolute", "./nested/../../escape",
                     "./storage/../artisan", "./nested/./entry", "./nested//entry",
                     "././artisan", "./back\\slash", "./line\nbreak", "./carriage\rreturn",
                     "./tab\tentry", "./artisan", "artisan", "./artisan/child", "./RELEASE_SHA/"):
            with self.subTest(path=repr(path)):
                self.fixture([(path, CANARY, tarfile.REGTYPE, "")])
                self.assertNotEqual(self.verify().returncode, 0, "accepted " + repr(path))

    def test_pax_and_gnu_long_names_cannot_hide_keys(self):
        for fmt in (tarfile.PAX_FORMAT, tarfile.GNU_FORMAT):
            with self.subTest(fmt=fmt):
                self.fixture([("./" + "deep/" * 40 + "oauth-private.key", CANARY, tarfile.REGTYPE, "")], fmt=fmt)
                self.assertNotEqual(self.verify().returncode, 0)

    def test_checksum_and_full_sha_bindings(self):
        mutations = ("embedded-sha", "ci-sha", "duplicate-ci-sha", "conflicting-ci-sha", "nul-sha", "nul-ci-sha",
                     "wrong-checksum", "wrong-name", "trailing-checksum", "tamper", "truncated-gzip")
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                base = dict(BASE)
                if mutation == "embedded-sha":
                    base["RELEASE_SHA"] = ("a" * 7 + "b" * 33).encode()
                if mutation == "ci-sha":
                    base["CI_META"] = ("CI_SHA=" + "b" * 40).encode()
                if mutation == "duplicate-ci-sha":
                    base["CI_META"] += base["CI_META"]
                if mutation == "conflicting-ci-sha":
                    base["CI_META"] += ("CI_SHA=" + "b" * 40 + "\n").encode()
                if mutation == "nul-sha":
                    base["RELEASE_SHA"] = SHA.encode() + b"\x00\n"
                if mutation == "nul-ci-sha":
                    base["CI_META"] = b"CI_SHA=" + SHA.encode() + b"\x00\n"
                self.fixture(base=base)
                sidecar = Path(str(self.archive) + ".sha256")
                if mutation == "wrong-checksum":
                    sidecar.write_text("0" * 64 + "  " + NAME + "\n")
                if mutation == "wrong-name":
                    sidecar.write_text(sidecar.read_text().replace(NAME, "other.tar.gz"))
                if mutation == "trailing-checksum":
                    sidecar.write_text(sidecar.read_text() + CANARY.decode())
                if mutation == "tamper":
                    with self.archive.open("ab") as archive:
                        archive.write(CANARY)
                if mutation == "truncated-gzip":
                    self.archive.write_bytes(self.archive.read_bytes()[:-20])
                    self.digest()
                self.assertNotEqual(self.verify().returncode, 0)

    def test_producer_excludes_runtime_secrets_and_keeps_boot_files(self):
        source = self.root / "source"
        source.mkdir()
        files = {**BASE, **{name: CANARY for name in FORBIDDEN},
                 "custom/current-signing.data": KEY, "alternate/public.data": PUBLIC_KEY,
                 "custom/wrapped.data": KEY.replace(b"QUJD" * 24, b"QUJDQUJD\n" * 12),
                 "custom/padded.data": KEY.replace(b"KEY-----\n", b"KEY-----" + b" " * 70000 + b"\n"),
                 "custom/boundary.data": b"x" * (65536 - 27 - 1000) + KEY.replace(b"KEY-----\n", b"KEY-----" + b" " * 1000 + b"\n")}
        for name, data in files.items():
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        producer = ROOT / "scripts/release/build-release-artifact.sh"
        result = subprocess.run(["bash", str(producer), str(source), str(self.archive), SHA], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        with tarfile.open(self.archive) as archive:
            members = {member.name.removeprefix("./").rstrip("/") for member in archive}
            for name in FORBIDDEN + ["custom/current-signing.data", "alternate/public.data", "custom/wrapped.data", "custom/padded.data", "custom/boundary.data"]:
                self.assertNotIn(name, members, "producer bundled " + name)
            for name in BASE:
                self.assertIn(name, members, "producer removed required " + name)
        self.digest()
        self.assertEqual(self.verify().returncode, 0)

    def test_producer_rejects_unexpected_links_without_publishing(self):
        producer = ROOT / "scripts/release/build-release-artifact.sh"
        source = self.root / "source"
        source.mkdir()
        for name, data in BASE.items():
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        outside = self.root / "outside"
        outside.write_bytes(CANARY)
        for kind in ("symlink", "hardlink", "fifo"):
            with self.subTest(kind=kind):
                entry = source / "unexpected"
                if kind == "symlink":
                    entry.symlink_to(outside)
                elif kind == "hardlink":
                    os.link(outside, entry)
                else:
                    os.mkfifo(entry)
                result = subprocess.run(["bash", str(producer), str(source), str(self.archive), SHA], capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.archive.exists())
                self.assertFalse(Path(str(self.archive) + ".sha256").exists())
                self.assertEqual(outside.read_bytes(), CANARY)
                entry.unlink()

    def test_producer_is_deterministic_and_does_not_change_key_sources(self):
        source = self.root / "source"
        source.mkdir()
        files = {**BASE, "custom/unexpected-signing.data": KEY}
        for name, data in files.items():
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        key = source / "custom/unexpected-signing.data"
        key.chmod(0o600)
        producer = ROOT / "scripts/release/build-release-artifact.sh"
        digests = []
        for number in (1, 2):
            destination = self.root / str(number)
            destination.mkdir()
            archive = destination / NAME
            for name in files:
                os.utime(source / name, (number * 1000, number * 1000))
            result = subprocess.run(["bash", str(producer), str(source), str(archive), SHA], capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr.decode())
            digests.append(hashlib.sha256(archive.read_bytes()).hexdigest())
        self.assertEqual(digests[0], digests[1])
        self.assertEqual(key.read_bytes(), KEY)
        self.assertEqual(key.stat().st_mode & 0o777, 0o600)

    def test_producer_omits_the_expected_public_storage_symlink(self):
        source = self.root / "source"
        source.mkdir()
        for name, data in BASE.items():
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        (source / "public/storage").symlink_to("../../outside", target_is_directory=True)
        result = subprocess.run(["bash", str(ROOT / "scripts/release/build-release-artifact.sh"),
                                 str(source), str(self.archive), SHA], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        with tarfile.open(self.archive) as archive:
            self.assertNotIn("./public/storage", archive.getnames())

    def test_producer_fails_instead_of_removing_key_bearing_boot_source(self):
        source = self.root / "source"
        source.mkdir()
        for name, data in {**BASE, "config/passport-inline.php": b"<?php return '" + KEY + b"';"}.items():
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        result = subprocess.run(["bash", str(ROOT / "scripts/release/build-release-artifact.sh"),
                                 str(source), str(self.archive), SHA], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.archive.exists())
        self.assertNotIn(KEY, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=1)
