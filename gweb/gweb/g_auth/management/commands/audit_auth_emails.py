from collections import defaultdict

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


class Command(BaseCommand):
    help = "Audit auth_user emails for case-insensitive duplicates. Optionally resolve duplicates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Resolve duplicates by keeping one canonical account and moving others to *.invalid + inactive.",
        )

    def handle(self, *args, **options):
        grouped = defaultdict(list)
        for user in User.objects.all().only("id", "username", "email", "is_active", "last_login", "date_joined"):
            grouped[normalize_email(user.email)].append(user)

        duplicates = {k: v for k, v in grouped.items() if k and len(v) > 1}
        if not duplicates:
            self.stdout.write(self.style.SUCCESS("No duplicate non-empty emails found."))
            return

        self.stdout.write(self.style.WARNING(f"Found {len(duplicates)} duplicate email group(s)."))
        for email, users in duplicates.items():
            ids = ", ".join(str(u.id) for u in users)
            self.stdout.write(f"- {email}: user_ids=[{ids}]")

        if not options["fix"]:
            self.stdout.write("Run with --fix to resolve duplicates.")
            return

        fixed_users = 0
        for email, users in duplicates.items():
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
            keeper_email = normalize_email(keeper.email)
            if keeper.email != keeper_email:
                keeper.email = keeper_email
                keeper.save(update_fields=["email"])
                fixed_users += 1

            for duplicate in ordered[1:]:
                duplicate.email = f"duplicate+{duplicate.id}@qwikstudi.invalid"
                duplicate.is_active = False
                duplicate.save(update_fields=["email", "is_active"])
                fixed_users += 1

        self.stdout.write(self.style.SUCCESS(f"Resolved duplicates. Updated {fixed_users} user record(s)."))

