from collections import defaultdict

from django.db import migrations


def _normalize_email(value):
    return (value or "").strip().lower()


def normalize_and_dedupe_user_emails(apps, schema_editor):
    User = apps.get_model("auth", "User")
    duplicates = defaultdict(list)

    for user in User.objects.all().only("id", "email", "is_active", "last_login", "date_joined"):
        normalized = _normalize_email(user.email)
        if normalized != (user.email or ""):
            user.email = normalized
            user.save(update_fields=["email"])
        if normalized:
            duplicates[normalized].append(user)

    for email, users in duplicates.items():
        if len(users) < 2:
            continue
        # Keep the most likely primary account:
        # active users first, then most recent login, then most recent join date.
        ordered = sorted(
            users,
            key=lambda u: (
                int(bool(u.is_active)),
                int(bool(u.last_login)),
                u.last_login or u.date_joined,
                u.date_joined,
                -u.id,
            ),
            reverse=True,
        )
        keeper = ordered[0]
        for duplicate in ordered[1:]:
            duplicate.email = f"duplicate+{duplicate.id}@qwikstudi.invalid"
            duplicate.is_active = False
            duplicate.save(update_fields=["email", "is_active"])


class Migration(migrations.Migration):
    dependencies = [
        ("g_auth", "0004_alter_userprofile_user"),
    ]

    operations = [
        migrations.RunPython(
            normalize_and_dedupe_user_emails,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_ci_unique_idx
            ON auth_user (LOWER(email))
            WHERE email IS NOT NULL AND email <> '';
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS auth_user_email_ci_unique_idx;
            """,
        ),
    ]

