from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_alter_userpayment_user_userprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="userpayment",
            name="currency",
            field=models.CharField(default="GHS", max_length=10),
        ),
        migrations.AddField(
            model_name="userpayment",
            name="payment_method",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]

